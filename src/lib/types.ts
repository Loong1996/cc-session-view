// Common type definitions

export type AgentType = "claude-code" | "codex"

/** Session summary information (for list display) */
export interface SessionSummary {
  id: string
  agentType: AgentType
  filePath: string
  title: string // First 40 characters of the first user message
  timestamp: Date
  cwd?: string
  gitBranch?: string
}

/** Date filter types */
export type DateFilter = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "all"

/** Filter state for session list */
export interface FilterState {
  searchQuery: string
  dateFilter: DateFilter
  projectPath: string | null
}

export const defaultFilterState: FilterState = {
  searchQuery: "",
  dateFilter: "all",
  projectPath: null,
}

/** Message types */
export type MessageType = "user" | "assistant" | "tool_use" | "tool_result" | "thinking"

/** Skill call metadata */
export interface SkillCallMeta {
  skillName: string
  userInput: string
  fullContent: string
}

/** Conversation message */
export interface Message {
  type: MessageType
  content: string
  /** Date when parsed server-side; string when received via JSON API */
  timestamp?: Date | string
  toolName?: string // For tool_use
  toolId?: string // For tool_use/tool_result
  isSystemMessage?: boolean // System messages (e.g., <system-reminder>, <environment>)
  isSkillCall?: boolean // Skill call messages
  skillMeta?: SkillCallMeta // Parsed skill call metadata
  isContextSummary?: boolean // Context compaction summary message
}

/** Session detail information */
export interface SessionDetail {
  id: string
  agentType: AgentType
  filePath: string
  timestamp: Date
  cwd?: string
  gitBranch?: string
  version?: string
  model?: string
  messages: Message[]
}

/** Export options */
export interface ExportOptions {
  includeUser: boolean
  includeAssistant: boolean
  includeToolUse: boolean
  includeThinking: boolean
  includeSystemMessages: boolean
  includeSkillFullContent: boolean
  includeContextSummary: boolean
  /** When true, embed Nunito + JetBrains Mono fonts as base64 @font-face (offline-capable) */
  embedFonts?: boolean
  /** Initial toggle state for interactive HTML export; keys match the toggle chips */
  initialToggles?: {
    showSystem: boolean
    showThinking: boolean
    showTools: boolean
    showSkillFull: boolean
    showContextSummary: boolean
  }
}

export const defaultExportOptions: ExportOptions = {
  includeUser: true,
  includeAssistant: true,
  includeToolUse: false,
  includeThinking: false,
  includeSystemMessages: false,
  includeSkillFullContent: false,
  includeContextSummary: false,
  embedFonts: false,
}

/** ブランチ統合表示用のメッセージ */
export interface BranchMessage extends Message {
  sessionId: string
  sessionAgentType: AgentType
  sessionTimestamp: Date // セッション開始時刻（ソート用フォールバック）
  sessionIndex: number // セッション内でのメッセージ順序（0始まり）
  // Note: isSystemMessage is inherited from Message
}

/** ブランチ別セッション統合レスポンス */
export interface BranchSessionsData {
  branchName: string
  sessions: Array<{
    id: string
    agentType: AgentType
    timestamp: Date
    cwd?: string
  }>
  messages: BranchMessage[]
}
