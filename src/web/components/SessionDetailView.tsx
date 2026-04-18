import { useEffect, useMemo, useState } from "react"
import { useTogglesState } from "../hooks/useLocalStorageState"
import { MessageRenderer } from "./MessageRenderer"
import { SessionStats } from "./SessionStats"

interface SkillCallMeta {
  skillName: string
  userInput: string
  fullContent: string
}

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSystemMessage?: boolean
  isSkillCall?: boolean
  skillMeta?: SkillCallMeta
  isContextSummary?: boolean
}

interface SessionDetail {
  id: string
  agentType: string
  filePath: string
  timestamp: string
  cwd?: string
  gitBranch?: string
  version?: string
  model?: string
  messages: Message[]
}

interface ExportOptions {
  includeUser: boolean
  includeAssistant: boolean
  includeToolUse: boolean
  includeThinking: boolean
  includeSystemMessages: boolean
  includeSkillFullContent: boolean
  includeContextSummary: boolean
  embedFonts?: boolean
  initialToggles?: {
    showSystem: boolean
    showThinking: boolean
    showTools: boolean
    showSkillFull: boolean
    showContextSummary: boolean
  }
}

interface SessionDetailViewProps {
  session: SessionDetail
  loading: boolean
  onExport: (format: "html" | "text" | "markdown", options: ExportOptions) => void
  onBranchClick?: (branchName: string) => void
}

export function SessionDetailView({
  session,
  loading,
  onExport,
  onBranchClick,
}: SessionDetailViewProps) {
  const [toggles, setToggles] = useTogglesState()
  const {
    showToolMessages,
    showSystemMessages,
    showThinkingMessages,
    includeSkillFullContent,
    showContextSummary,
    showStats,
    embedFonts,
  } = toggles

  // Message search state
  const [messageSearch, setMessageSearch] = useState("")
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Filter messages based on toggles
  const filteredMessages = useMemo(
    () =>
      session.messages.filter((m) => {
        if (m.isContextSummary && !showContextSummary) return false
        if (m.isSystemMessage && !showSystemMessages) return false
        if (!showToolMessages && (m.type === "tool_use" || m.type === "tool_result")) return false
        if (!showThinkingMessages && m.type === "thinking") return false
        return true
      }),
    [
      session.messages,
      showContextSummary,
      showSystemMessages,
      showToolMessages,
      showThinkingMessages,
    ],
  )

  // Count search matches
  const matchIndices = useMemo(() => {
    if (!messageSearch.trim()) return []
    const query = messageSearch.toLowerCase()
    const indices: number[] = []
    filteredMessages.forEach((m, i) => {
      if (m.content.toLowerCase().includes(query)) {
        indices.push(i)
      }
    })
    return indices
  }, [filteredMessages, messageSearch])

  // Auto-scroll to first match when search changes
  useEffect(() => {
    if (matchIndices.length > 0 && messageSearch.trim()) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-msg-index="${matchIndices[0]}"]`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [matchIndices, messageSearch])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"

  const scrollToMatch = (messageIndex: number) => {
    const el = document.querySelector(`[data-msg-index="${messageIndex}"]`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleSearchChange = (value: string) => {
    setMessageSearch(value)
    setCurrentMatchIndex(0)
  }

  const handlePrevMatch = () => {
    if (matchIndices.length === 0) return
    const next = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length
    setCurrentMatchIndex(next)
    scrollToMatch(matchIndices[next]!)
  }

  const handleNextMatch = () => {
    if (matchIndices.length === 0) return
    const next = (currentMatchIndex + 1) % matchIndices.length
    setCurrentMatchIndex(next)
    scrollToMatch(matchIndices[next]!)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        handlePrevMatch()
      } else {
        handleNextMatch()
      }
    }
    if (e.key === "Escape") {
      setMessageSearch("")
    }
  }

  const exportOptions: ExportOptions = {
    includeUser: true,
    includeAssistant: true,
    includeToolUse: showToolMessages,
    includeThinking: showThinkingMessages,
    includeSystemMessages: showSystemMessages,
    includeSkillFullContent,
    includeContextSummary: showContextSummary,
    embedFonts,
    initialToggles: {
      showSystem: showSystemMessages,
      showThinking: showThinkingMessages,
      showTools: showToolMessages,
      showSkillFull: includeSkillFullContent,
      showContextSummary: showContextSummary,
    },
  }

  return (
    <>
      <div className="detail-header">
        <div className="detail-title">
          <span className="detail-badge">{agentLabel}</span>
          <span className="detail-id">{session.id}</span>
        </div>
        <div className="detail-meta">
          <div>
            <span className="meta-label">Date </span>
            <span className="meta-value">{formatDate(session.timestamp)}</span>
          </div>
          {session.cwd && (
            <div>
              <span className="meta-label">CWD </span>
              <span className="meta-value" title={session.cwd}>
                {shortenPath(session.cwd)}
              </span>
            </div>
          )}
          {session.gitBranch && (
            <div>
              <span className="meta-label">Branch </span>
              {onBranchClick ? (
                <button
                  type="button"
                  className="branch-link"
                  onClick={() => onBranchClick(session.gitBranch!)}
                  title="View all sessions for this branch"
                >
                  {session.gitBranch}
                </button>
              ) : (
                <span className="meta-value">{session.gitBranch}</span>
              )}
            </div>
          )}
          {session.model && (
            <div>
              <span className="meta-label">Model </span>
              <span className="meta-value">{session.model}</span>
            </div>
          )}
          {session.version && (
            <div>
              <span className="meta-label">Version </span>
              <span className="meta-value">{session.version}</span>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <div className="toggle-chips">
            <button
              type="button"
              className={`toggle-chip ${showSystemMessages ? "active" : ""}`}
              onClick={() => setToggles({ showSystemMessages: !showSystemMessages })}
            >
              <span className="chip-icon">⚙</span>
              <span>System</span>
            </button>
            <button
              type="button"
              className={`toggle-chip ${showThinkingMessages ? "active" : ""}`}
              onClick={() => setToggles({ showThinkingMessages: !showThinkingMessages })}
            >
              <span className="chip-icon">💭</span>
              <span>Thinking</span>
            </button>
            <button
              type="button"
              className={`toggle-chip ${showToolMessages ? "active" : ""}`}
              onClick={() => setToggles({ showToolMessages: !showToolMessages })}
            >
              <span className="chip-icon">🔧</span>
              <span>Tools</span>
            </button>
            <button
              type="button"
              className={`toggle-chip ${includeSkillFullContent ? "active" : ""}`}
              onClick={() => setToggles({ includeSkillFullContent: !includeSkillFullContent })}
            >
              <span className="chip-icon">📜</span>
              <span>Skill Full</span>
            </button>
            <button
              type="button"
              className={`toggle-chip ${showContextSummary ? "active" : ""}`}
              onClick={() => setToggles({ showContextSummary: !showContextSummary })}
            >
              <span className="chip-icon">📋</span>
              <span>Context Summary</span>
            </button>
            <button
              type="button"
              className={`toggle-chip ${showStats ? "active" : ""}`}
              onClick={() => setToggles({ showStats: !showStats })}
            >
              <span className="chip-icon">📊</span>
              <span>Stats</span>
            </button>
          </div>
          <div className="export-btns">
            <label className="embed-fonts-label">
              <input
                type="checkbox"
                checked={embedFonts}
                onChange={(e) => setToggles({ embedFonts: e.target.checked })}
              />
              <span>内嵌字体（离线可用）</span>
            </label>
            <button
              type="button"
              className="action-btn"
              onClick={() => onExport("html", exportOptions)}
            >
              📄 HTML
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onExport("text", exportOptions)}
            >
              📝 Text
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => onExport("markdown", exportOptions)}
            >
              📋 Markdown
            </button>
          </div>
        </div>
      </div>

      {showStats && <SessionStats messages={session.messages} />}

      <div className="messages-toolbar">
        <div className="message-count">{filteredMessages.length} messages</div>
        <div className="message-search">
          <input
            type="text"
            className="message-search-input"
            placeholder="Search messages..."
            value={messageSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {messageSearch.trim() && (
            <div className="message-search-nav">
              <span className="message-search-count">
                {matchIndices.length > 0
                  ? `${currentMatchIndex + 1}/${matchIndices.length}`
                  : "0/0"}
              </span>
              <button
                type="button"
                className="message-search-btn"
                onClick={handlePrevMatch}
                disabled={matchIndices.length === 0}
                title="Previous (Shift+Enter)"
              >
                ▲
              </button>
              <button
                type="button"
                className="message-search-btn"
                onClick={handleNextMatch}
                disabled={matchIndices.length === 0}
                title="Next (Enter)"
              >
                ▼
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="messages-container">
        <MessageRenderer
          messages={filteredMessages}
          showSkillFullContent={includeSkillFullContent}
          searchQuery={messageSearch}
          highlightedMessageIndex={
            matchIndices.length > 0 ? matchIndices[currentMatchIndex] : undefined
          }
        />
      </div>
    </>
  )
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString()
}

function shortenPath(path: string): string {
  const parts = path.split("/")
  if (parts.length <= 4) return path
  return `.../${parts.slice(-3).join("/")}`
}
