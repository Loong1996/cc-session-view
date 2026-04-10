import { useMemo } from "react"

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  isSystemMessage?: boolean
  isSkillCall?: boolean
  isContextSummary?: boolean
}

interface SessionStatsProps {
  messages: Message[]
}

interface Stats {
  total: number
  byType: Record<string, number>
  toolUsage: Array<{ name: string; count: number }>
  duration: string | null
  totalChars: number
  avgCharsPerMessage: number
  systemCount: number
  skillCallCount: number
  contextSummaryCount: number
}

function computeStats(messages: Message[]): Stats {
  const byType: Record<string, number> = {}
  const toolMap = new Map<string, number>()
  let totalChars = 0
  let systemCount = 0
  let skillCallCount = 0
  let contextSummaryCount = 0

  for (const msg of messages) {
    byType[msg.type] = (byType[msg.type] || 0) + 1
    totalChars += msg.content.length
    if (msg.toolName) {
      toolMap.set(msg.toolName, (toolMap.get(msg.toolName) || 0) + 1)
    }
    if (msg.isSystemMessage) systemCount++
    if (msg.isSkillCall) skillCallCount++
    if (msg.isContextSummary) contextSummaryCount++
  }

  const toolUsage = Array.from(toolMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Duration from first to last message with timestamps
  let duration: string | null = null
  const timestamps = messages
    .filter((m) => m.timestamp)
    .map((m) => new Date(m.timestamp!).getTime())
    .filter((t) => !Number.isNaN(t))

  if (timestamps.length >= 2) {
    const minTs = Math.min(...timestamps)
    const maxTs = Math.max(...timestamps)
    const diffMs = maxTs - minTs
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)
    if (hours > 0) {
      duration = `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      duration = `${minutes}m ${seconds}s`
    } else {
      duration = `${seconds}s`
    }
  }

  return {
    total: messages.length,
    byType,
    toolUsage,
    duration,
    totalChars,
    avgCharsPerMessage: messages.length > 0 ? Math.round(totalChars / messages.length) : 0,
    systemCount,
    skillCallCount,
    contextSummaryCount,
  }
}

const TYPE_LABELS: Record<string, string> = {
  user: "User",
  assistant: "Assistant",
  tool_use: "Tool Use",
  tool_result: "Tool Result",
  thinking: "Thinking",
}

const TYPE_COLORS: Record<string, string> = {
  user: "#4ade80",
  assistant: "#60a5fa",
  tool_use: "#fb923c",
  tool_result: "#f472b6",
  thinking: "#94a3b8",
}

export function SessionStats({ messages }: SessionStatsProps) {
  const stats = useMemo(() => computeStats(messages), [messages])

  return (
    <div className="session-stats">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Messages</div>
        </div>
        {stats.duration && (
          <div className="stat-card">
            <div className="stat-value">{stats.duration}</div>
            <div className="stat-label">Duration</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-value">{(stats.totalChars / 1000).toFixed(1)}k</div>
          <div className="stat-label">Total Chars</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgCharsPerMessage}</div>
          <div className="stat-label">Avg Chars/Msg</div>
        </div>
      </div>

      <div className="stats-sections">
        <div className="stats-section">
          <div className="stats-section-title">Message Types</div>
          <div className="stats-bar-chart">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="stats-bar-row">
                  <span className="stats-bar-label">{TYPE_LABELS[type] || type}</span>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{
                        width: `${(count / stats.total) * 100}%`,
                        backgroundColor: TYPE_COLORS[type] || "#888",
                      }}
                    />
                  </div>
                  <span className="stats-bar-count">{count}</span>
                </div>
              ))}
          </div>
          {(stats.systemCount > 0 || stats.skillCallCount > 0 || stats.contextSummaryCount > 0) && (
            <div className="stats-extras">
              {stats.systemCount > 0 && (
                <span className="stats-tag">System: {stats.systemCount}</span>
              )}
              {stats.skillCallCount > 0 && (
                <span className="stats-tag">Skill Calls: {stats.skillCallCount}</span>
              )}
              {stats.contextSummaryCount > 0 && (
                <span className="stats-tag">Context Summaries: {stats.contextSummaryCount}</span>
              )}
            </div>
          )}
        </div>

        {stats.toolUsage.length > 0 && (
          <div className="stats-section">
            <div className="stats-section-title">Tool Usage (Top 10)</div>
            <div className="stats-tool-list">
              {stats.toolUsage.slice(0, 10).map(({ name, count }) => (
                <div key={name} className="stats-tool-row">
                  <code className="stats-tool-name">{name}</code>
                  <span className="stats-tool-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
