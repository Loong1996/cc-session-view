type AgentType = "claude-code" | "codex"

interface TabBarProps {
  activeTab: AgentType
  onTabChange: (tab: AgentType) => void
  counts: {
    claudeCode: number
    codex: number
  }
}

export function TabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div className="tabs">
      <button
        type="button"
        className={`tab ${activeTab === "claude-code" ? "active" : ""}`}
        onClick={() => onTabChange("claude-code")}
      >
        Claude Code
        <span className="tab-count">{counts.claudeCode}</span>
      </button>
      <button
        type="button"
        className={`tab ${activeTab === "codex" ? "active" : ""}`}
        onClick={() => onTabChange("codex")}
      >
        Codex CLI
        <span className="tab-count">{counts.codex}</span>
      </button>
    </div>
  )
}
