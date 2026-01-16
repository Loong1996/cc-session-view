interface SessionSummary {
  id: string
  agentType: string
  filePath: string
  title: string
  timestamp: string
  cwd?: string
  gitBranch?: string
}

interface SessionListViewProps {
  sessions: SessionSummary[]
  selectedSession: SessionSummary | null
  onSessionSelect: (session: SessionSummary) => void
  loading: boolean
}

export function SessionListView({
  sessions,
  selectedSession,
  onSessionSelect,
  loading,
}: SessionListViewProps) {
  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <p>セッションが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <button
          type="button"
          key={session.filePath}
          className={`session-item ${selectedSession?.id === session.id ? "selected" : ""}`}
          onClick={() => onSessionSelect(session)}
        >
          <div className="session-title">{session.title}</div>
          <div className="session-meta">
            <span className="session-meta-item">📅 {formatDate(session.timestamp)}</span>
            {session.cwd && (
              <span className="session-meta-item session-cwd" title={session.cwd}>
                📁 {shortenPath(session.cwd)}
              </span>
            )}
            {session.gitBranch && <span className="session-meta-item">🌿 {session.gitBranch}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function shortenPath(path: string): string {
  const parts = path.split("/")
  if (parts.length <= 3) return path
  return `.../${parts.slice(-2).join("/")}`
}
