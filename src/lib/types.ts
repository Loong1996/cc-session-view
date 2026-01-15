// 共通の型定義

export type AgentType = "claude-code" | "codex";

/** セッションのサマリー情報（一覧表示用） */
export interface SessionSummary {
  id: string;
  agentType: AgentType;
  filePath: string;
  title: string; // 最初のユーザーメッセージの先頭40文字
  timestamp: Date;
  cwd?: string;
  gitBranch?: string;
}

/** メッセージの種類 */
export type MessageType = "user" | "assistant" | "tool_use" | "tool_result" | "thinking";

/** 会話メッセージ */
export interface Message {
  type: MessageType;
  content: string;
  timestamp?: Date;
  toolName?: string; // tool_use の場合
  toolId?: string; // tool_use/tool_result の場合
}

/** セッションの詳細情報 */
export interface SessionDetail {
  id: string;
  agentType: AgentType;
  filePath: string;
  timestamp: Date;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  model?: string;
  messages: Message[];
}

/** エクスポートオプション */
export interface ExportOptions {
  includeUser: boolean;
  includeAssistant: boolean;
  includeToolUse: boolean;
  includeThinking: boolean;
}

export const defaultExportOptions: ExportOptions = {
  includeUser: true,
  includeAssistant: true,
  includeToolUse: false,
  includeThinking: false,
};
