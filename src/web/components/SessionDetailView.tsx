import { useState } from "react"
import { MessageRenderer } from "./MessageRenderer"

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSystemMessage?: boolean
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
}

interface SessionDetailViewProps {
  session: SessionDetail
  loading: boolean
  onExport: (format: "html" | "text", options: ExportOptions) => void
  onBranchClick?: (branchName: string) => void
}

export function SessionDetailView({
  session,
  loading,
  onExport,
  onBranchClick,
}: SessionDetailViewProps) {
  const [showToolMessages, setShowToolMessages] = useState(false)
  const [showSystemMessages, setShowSystemMessages] = useState(false)
  const [showThinkingMessages, setShowThinkingMessages] = useState(false)

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"

  // Filter messages based on toggles
  const filteredMessages = session.messages.filter((m) => {
    // Filter system messages (hide by default)
    if (m.isSystemMessage && !showSystemMessages) return false
    // Filter tool messages
    if (!showToolMessages && (m.type === "tool_use" || m.type === "tool_result")) return false
    // Filter thinking/reasoning messages
    if (!showThinkingMessages && m.type === "thinking") return false
    return true
  })

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
                  title="このブランチの全セッションを表示"
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
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showSystemMessages}
              onChange={(e) => setShowSystemMessages((e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
              システムメッセージを表示
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showThinkingMessages}
              onChange={(e) => setShowThinkingMessages((e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>推論を表示</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showToolMessages}
              onChange={(e) => setShowToolMessages((e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
              ツール呼び出しを表示
            </span>
          </label>
          <button
            type="button"
            className="action-btn"
            onClick={() =>
              onExport("html", {
                includeUser: true,
                includeAssistant: true,
                includeToolUse: showToolMessages,
                includeThinking: showThinkingMessages,
                includeSystemMessages: showSystemMessages,
              })
            }
          >
            📄 HTML
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() =>
              onExport("text", {
                includeUser: true,
                includeAssistant: true,
                includeToolUse: showToolMessages,
                includeThinking: showThinkingMessages,
                includeSystemMessages: showSystemMessages,
              })
            }
          >
            📝 Text
          </button>
        </div>
      </div>
      <div className="messages-container">
        <div className="message-count">{filteredMessages.length} messages</div>
        <MessageRenderer messages={filteredMessages} />
      </div>
    </>
  )
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("ja-JP")
}

function shortenPath(path: string): string {
  const parts = path.split("/")
  if (parts.length <= 4) return path
  return `.../${parts.slice(-3).join("/")}`
}
