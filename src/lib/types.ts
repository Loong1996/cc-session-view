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

/** Conversation message */
export interface Message {
  type: MessageType
  content: string
  timestamp?: Date
  toolName?: string // For tool_use
  toolId?: string // For tool_use/tool_result
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
}

export const defaultExportOptions: ExportOptions = {
  includeUser: true,
  includeAssistant: true,
  includeToolUse: false,
  includeThinking: false,
}
