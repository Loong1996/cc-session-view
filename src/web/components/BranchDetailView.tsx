import { useState } from "react"
import { MessageRenderer } from "./MessageRenderer"

interface BranchMessage {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSystemMessage?: boolean
  sessionId: string
  sessionAgentType: "claude-code" | "codex"
  sessionTimestamp: string
  sessionIndex: number
}

interface BranchSession {
  id: string
  agentType: "claude-code" | "codex"
  timestamp: string
  cwd?: string
}

interface BranchSessionsData {
  branchName: string
  sessions: BranchSession[]
  messages: BranchMessage[]
}

interface BranchDetailViewProps {
  branchName: string
  data: BranchSessionsData | null
  loading: boolean
  onBack: () => void
}

export function BranchDetailView({ branchName, data, loading, onBack }: BranchDetailViewProps) {
  const [showToolMessages, setShowToolMessages] = useState(false)
  const [showSystemMessages, setShowSystemMessages] = useState(false)
  const [showThinkingMessages, setShowThinkingMessages] = useState(false)

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  if (!data) {
    return (
      <div className="placeholder">
        <h2>ブランチデータの読み込みに失敗しました</h2>
        <button type="button" className="back-button" onClick={onBack}>
          ← 戻る
        </button>
      </div>
    )
  }

  // Filter messages based on toggles
  const filteredMessages = data.messages.filter((m) => {
    // Filter system messages (hide by default)
    if (m.isSystemMessage && !showSystemMessages) return false
    // Filter tool messages
    if (!showToolMessages && (m.type === "tool_use" || m.type === "tool_result")) return false
    // Filter thinking/reasoning messages
    if (!showThinkingMessages && m.type === "thinking") return false
    return true
  })

  // Group messages by session for rendering with session boundaries
  const messagesWithBoundaries = renderMessagesWithBoundaries(filteredMessages, data.sessions)

  return (
    <>
      <div className="branch-header">
        <div className="branch-header-left">
          <button type="button" className="back-button" onClick={onBack}>
            ← 戻る
          </button>
          <div className="branch-title">
            <span className="branch-icon">🌿</span>
            <span className="branch-name">{branchName}</span>
          </div>
          <span className="session-count-badge">{data.sessions.length} sessions</span>
        </div>
        <div className="branch-header-right">
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
        </div>
      </div>
      <div className="messages-container">
        <div className="message-count">{filteredMessages.length} messages</div>
        {messagesWithBoundaries}
      </div>
    </>
  )
}

function renderMessagesWithBoundaries(messages: BranchMessage[], sessions: BranchSession[]) {
  if (messages.length === 0) {
    return <div className="empty-state">メッセージがありません</div>
  }

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const elements: React.ReactNode[] = []
  let currentSessionId: string | null = null
  let messageBuffer: BranchMessage[] = []

  const flushBuffer = () => {
    if (messageBuffer.length > 0) {
      // Project BranchMessage[] to Message[] for MessageRenderer
      const projectedMessages = messageBuffer.map((m) => ({
        type: m.type,
        content: m.content,
        timestamp: m.timestamp,
        toolName: m.toolName,
        toolId: m.toolId,
      }))
      elements.push(
        <MessageRenderer
          key={`msgs-${currentSessionId}-${elements.length}`}
          messages={projectedMessages}
        />,
      )
      messageBuffer = []
    }
  }

  let boundaryIndex = 0
  for (const msg of messages) {
    if (msg.sessionId !== currentSessionId) {
      // Flush previous session's messages
      flushBuffer()

      // Add session boundary
      const session = sessionMap.get(msg.sessionId)
      const agentLabel = msg.sessionAgentType === "claude-code" ? "Claude Code" : "Codex CLI"
      const timestamp = session ? formatDate(session.timestamp) : ""

      elements.push(
        <div key={`boundary-${boundaryIndex++}`} className="session-boundary">
          <span className="boundary-line" />
          <span className="boundary-label">
            {agentLabel} • {msg.sessionId.slice(0, 8)} • {timestamp}
          </span>
          <span className="boundary-line" />
        </div>,
      )

      currentSessionId = msg.sessionId
    }

    messageBuffer.push(msg)
  }

  // Flush remaining messages
  flushBuffer()

  return <>{elements}</>
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
