import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionSummary, SessionDetail, Message } from "./types";

const CODEX_SESSIONS_DIR = join(homedir(), ".codex", "sessions");

/** Codex セッションディレクトリを取得 */
export async function getCodexSessionsDir(): Promise<string> {
  return CODEX_SESSIONS_DIR;
}

/** すべての Codex セッションのサマリーを取得 */
export async function listCodexSessions(): Promise<SessionSummary[]> {
  const sessions: SessionSummary[] = [];

  // 新形式 (JSONL): YYYY/MM/DD/rollout-*.jsonl
  const jsonlGlob = new Bun.Glob("**/rollout-*.jsonl");
  // 旧形式 (JSON): rollout-*.json
  const jsonGlob = new Bun.Glob("rollout-*.json");

  try {
    // 新形式のセッション
    for await (const path of jsonlGlob.scan({ cwd: CODEX_SESSIONS_DIR, absolute: true })) {
      try {
        const summary = await parseCodexJsonlSessionSummary(path);
        if (summary) {
          sessions.push(summary);
        }
      } catch {
        // パースエラーは無視
      }
    }

    // 旧形式のセッション
    for await (const path of jsonGlob.scan({ cwd: CODEX_SESSIONS_DIR, absolute: true })) {
      try {
        const summary = await parseCodexJsonSessionSummary(path);
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

/** Codex JSONL セッションファイルからサマリー情報を抽出 */
async function parseCodexJsonlSessionSummary(filePath: string): Promise<SessionSummary | null> {
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

      // session_meta からメタデータを取得
      if (record.type === "session_meta" && record.payload) {
        sessionId = record.payload.id;
        timestamp = new Date(record.payload.timestamp || record.timestamp);
        cwd = record.payload.cwd;
        if (record.payload.git) {
          gitBranch = record.payload.git.branch;
        }
      }

      // 最初のユーザーメッセージを探す（タイトル用にスキップすべきものは除外）
      if (record.type === "response_item" && record.payload?.role === "user" && !firstUserMessage) {
        const content = extractCodexMessageContent(record.payload);
        if (content && !shouldSkipForTitle(content)) {
          firstUserMessage = content;
        }
      }

      // event_msg からもユーザーメッセージを取得
      if (record.type === "event_msg" && record.payload?.type === "user_message" && !firstUserMessage) {
        const msg = record.payload.message;
        if (msg && !shouldSkipForTitle(msg)) {
          firstUserMessage = msg;
        }
      }
    } catch {
      // JSON パースエラーは無視
    }
  }

  if (!sessionId || !timestamp) {
    return null;
  }

  const title = firstUserMessage
    ? firstUserMessage.replace(/\n/g, " ").slice(0, 40)
    : "(No message)";

  return {
    id: sessionId,
    agentType: "codex",
    filePath,
    title,
    timestamp,
    cwd,
    gitBranch,
  };
}

/** Codex JSON セッションファイルからサマリー情報を抽出（旧形式） */
async function parseCodexJsonSessionSummary(filePath: string): Promise<SessionSummary | null> {
  const file = Bun.file(filePath);
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.session) return null;

  const sessionId = data.session.id;
  const timestamp = new Date(data.session.timestamp);
  let firstUserMessage: string | undefined;

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.role === "user" && item.type === "message") {
        const content = extractCodexMessageContent(item);
        if (content && !shouldSkipForTitle(content)) {
          firstUserMessage = content;
          break;
        }
      }
    }
  }

  const title = firstUserMessage
    ? firstUserMessage.replace(/\n/g, " ").slice(0, 40)
    : "(No message)";

  return {
    id: sessionId,
    agentType: "codex",
    filePath,
    title,
    timestamp,
  };
}

/** Codex セッションの詳細を取得 */
export async function loadCodexSession(filePath: string): Promise<SessionDetail | null> {
  const file = Bun.file(filePath);
  const text = await file.text();

  // ファイル拡張子で形式を判断
  if (filePath.endsWith(".jsonl")) {
    return parseCodexJsonlSessionDetail(filePath, text);
  }
  return parseCodexJsonSessionDetail(filePath, text);
}

/** JSONL形式のセッション詳細をパース */
function parseCodexJsonlSessionDetail(filePath: string, text: string): SessionDetail | null {
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

      // session_meta からメタデータを取得
      if (record.type === "session_meta" && record.payload) {
        sessionId = record.payload.id;
        timestamp = new Date(record.payload.timestamp || record.timestamp);
        cwd = record.payload.cwd;
        version = record.payload.cli_version;
        if (record.payload.git) {
          gitBranch = record.payload.git.branch;
        }
      }

      // turn_context から最初のモデル情報を取得
      if (record.type === "turn_context" && record.payload?.model && !model) {
        model = record.payload.model;
      }

      // response_item からメッセージを取得
      if (record.type === "response_item" && record.payload) {
        const payload = record.payload;
        const ts = record.timestamp ? new Date(record.timestamp) : undefined;

        if (payload.type === "message" && payload.role === "user") {
          const content = extractCodexMessageContent(payload);
          if (content) {
            messages.push({ type: "user", content, timestamp: ts });
          }
        } else if (payload.type === "message" && payload.role === "assistant") {
          const content = extractCodexMessageContent(payload);
          if (content) {
            messages.push({ type: "assistant", content, timestamp: ts });
          }
        } else if (payload.type === "function_call") {
          messages.push({
            type: "tool_use",
            content: payload.arguments || "",
            toolName: payload.name,
            toolId: payload.call_id,
            timestamp: ts,
          });
        } else if (payload.type === "function_call_output") {
          messages.push({
            type: "tool_result",
            content: (payload.output || "").slice(0, 500),
            toolId: payload.call_id,
            timestamp: ts,
          });
        }
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
    agentType: "codex",
    filePath,
    timestamp,
    cwd,
    gitBranch,
    version,
    model,
    messages,
  };
}

/** JSON形式のセッション詳細をパース（旧形式） */
function parseCodexJsonSessionDetail(filePath: string, text: string): SessionDetail | null {
  const data = JSON.parse(text);

  if (!data.session) return null;

  const sessionId = data.session.id;
  const timestamp = new Date(data.session.timestamp);
  const messages: Message[] = [];

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.type === "message" && item.role === "user") {
        const content = extractCodexMessageContent(item);
        if (content) {
          messages.push({ type: "user", content });
        }
      } else if (item.type === "reasoning") {
        // reasoning は thinking として扱う
        if (Array.isArray(item.summary) && item.summary.length > 0) {
          messages.push({
            type: "thinking",
            content: item.summary.join("\n"),
          });
        }
      } else if (item.type === "local_shell_call") {
        const command = Array.isArray(item.action?.command)
          ? item.action.command.join(" ")
          : "";
        messages.push({
          type: "tool_use",
          content: command,
          toolName: "shell_command",
          toolId: item.call_id,
        });
      } else if (item.type === "local_shell_call_output") {
        try {
          const output = JSON.parse(item.output || "{}");
          messages.push({
            type: "tool_result",
            content: (output.output || "").slice(0, 500),
            toolId: item.call_id,
          });
        } catch {
          messages.push({
            type: "tool_result",
            content: (item.output || "").slice(0, 500),
            toolId: item.call_id,
          });
        }
      }
    }
  }

  return {
    id: sessionId,
    agentType: "codex",
    filePath,
    timestamp,
    messages,
  };
}

/** Codex メッセージからコンテンツを抽出 */
function extractCodexMessageContent(message: Record<string, unknown>): string | null {
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      // user: input_text, assistant: output_text, both: text
      if (block.type === "input_text" && typeof block.text === "string") {
        return block.text;
      }
      if (block.type === "output_text" && typeof block.text === "string") {
        return block.text;
      }
      if (block.type === "text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  return null;
}

/** タイトルに使用すべきでないメッセージかどうかを判定 */
function shouldSkipForTitle(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("# AGENTS.md") || trimmed.startsWith("<environment_context>");
}
