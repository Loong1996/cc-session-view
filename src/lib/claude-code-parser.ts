import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionSummary, SessionDetail, Message, MessageType } from "./types";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

/** Claude Code セッションディレクトリを取得 */
export async function getClaudeCodeSessionsDir(): Promise<string> {
  return CLAUDE_PROJECTS_DIR;
}

/** すべての Claude Code セッションのサマリーを取得 */
export async function listClaudeCodeSessions(): Promise<SessionSummary[]> {
  const sessions: SessionSummary[] = [];
  const glob = new Bun.Glob("**/*.jsonl");

  try {
    for await (const path of glob.scan({ cwd: CLAUDE_PROJECTS_DIR, absolute: true })) {
      try {
        const summary = await parseClaudeCodeSessionSummary(path);
        if (summary) {
          sessions.push(summary);
        }
      } catch {
        // パースエラーは無視
      }
    }
  } catch {
    // ディレクトリが存在しない場合など
  }

  // タイムスタンプで降順ソート
  return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Claude Code セッションファイルからサマリー情報を抽出 */
async function parseClaudeCodeSessionSummary(filePath: string): Promise<SessionSummary | null> {
  const file = Bun.file(filePath);
  const text = await file.text();
  const lines = text.trim().split("\n");

  let sessionId: string | undefined;
  let timestamp: Date | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let firstUserMessage: string | undefined;

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);

      // セッションIDとメタデータを取得
      if (record.sessionId && !sessionId) {
        sessionId = record.sessionId;
      }
      if (record.timestamp && !timestamp) {
        timestamp = new Date(record.timestamp);
      }
      if (record.cwd && !cwd) {
        cwd = record.cwd;
      }
      if (record.gitBranch && !gitBranch) {
        gitBranch = record.gitBranch;
      }

      // 最初のユーザーメッセージを探す
      if (record.type === "user" && !firstUserMessage) {
        const content = extractMessageContent(record.message);
        if (content) {
          firstUserMessage = content;
          break; // 最初のユーザーメッセージを見つけたら終了
        }
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  if (!sessionId || !timestamp) {
    return null;
  }

  // タイトルを生成（40文字、改行をスペースに変換）
  const title = firstUserMessage
    ? firstUserMessage.replace(/\n/g, " ").slice(0, 40)
    : "(No message)";

  return {
    id: sessionId,
    agentType: "claude-code",
    filePath,
    title,
    timestamp,
    cwd,
    gitBranch,
  };
}

/** Claude Code セッションの詳細を取得 */
export async function loadClaudeCodeSession(filePath: string): Promise<SessionDetail | null> {
  const file = Bun.file(filePath);
  const text = await file.text();
  const lines = text.trim().split("\n");

  let sessionId: string | undefined;
  let timestamp: Date | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let version: string | undefined;
  let model: string | undefined;
  const messages: Message[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);

      // メタデータを取得
      if (record.sessionId && !sessionId) {
        sessionId = record.sessionId;
      }
      if (record.timestamp && !timestamp) {
        timestamp = new Date(record.timestamp);
      }
      if (record.cwd && !cwd) {
        cwd = record.cwd;
      }
      if (record.gitBranch && !gitBranch) {
        gitBranch = record.gitBranch;
      }
      if (record.version && !version) {
        version = record.version;
      }

      // メッセージを処理
      if (record.type === "user") {
        const userMessages = extractUserMessages(record);
        messages.push(...userMessages);
      } else if (record.type === "assistant") {
        if (record.message?.model && !model) {
          model = record.message.model;
        }
        const assistantMessages = extractAssistantMessages(record);
        messages.push(...assistantMessages);
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  if (!sessionId || !timestamp) {
    return null;
  }

  return {
    id: sessionId,
    agentType: "claude-code",
    filePath,
    timestamp,
    cwd,
    gitBranch,
    version,
    model,
    messages,
  };
}

/** メッセージコンテンツを抽出 */
function extractMessageContent(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const msg = message as Record<string, unknown>;

  // content が文字列の場合
  if (typeof msg.content === "string") {
    return msg.content;
  }

  // content が配列の場合（content blocks）
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === "text" && typeof block.text === "string") {
        return block.text;
      }
      if (block.type === "input_text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }

  return null;
}

/** user レコードからメッセージを抽出 */
function extractUserMessages(record: Record<string, unknown>): Message[] {
  const messages: Message[] = [];
  const ts = record.timestamp ? new Date(record.timestamp as string) : undefined;

  if (!record.message || typeof record.message !== "object") return messages;
  const msg = record.message as Record<string, unknown>;

  // content が文字列の場合
  if (typeof msg.content === "string") {
    messages.push({
      type: "user",
      content: msg.content,
      timestamp: ts,
    });
    return messages;
  }

  // content が配列の場合
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === "text" && typeof block.text === "string") {
        messages.push({
          type: "user",
          content: block.text,
          timestamp: ts,
        });
      } else if (block.type === "tool_result") {
        const content = typeof block.content === "string"
          ? block.content
          : JSON.stringify(block.content);
        messages.push({
          type: "tool_result",
          content: content.slice(0, 500), // 長すぎる結果は切り詰め
          toolId: block.tool_use_id,
          timestamp: ts,
        });
      }
    }
  }

  return messages;
}

/** assistant レコードからメッセージを抽出 */
function extractAssistantMessages(record: Record<string, unknown>): Message[] {
  const messages: Message[] = [];
  const ts = record.timestamp ? new Date(record.timestamp as string) : undefined;

  if (!record.message || typeof record.message !== "object") return messages;
  const msg = record.message as Record<string, unknown>;

  if (!Array.isArray(msg.content)) return messages;

  for (const block of msg.content) {
    if (block.type === "thinking" && typeof block.thinking === "string") {
      messages.push({
        type: "thinking",
        content: block.thinking,
        timestamp: ts,
      });
    } else if (block.type === "text" && typeof block.text === "string") {
      messages.push({
        type: "assistant",
        content: block.text,
        timestamp: ts,
      });
    } else if (block.type === "tool_use") {
      messages.push({
        type: "tool_use",
        content: JSON.stringify(block.input, null, 2),
        toolName: block.name,
        toolId: block.id,
        timestamp: ts,
      });
    }
  }

  return messages;
}
