import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionSummary, SessionDetail, Message, MessageType } from "./types";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

/** Get Claude Code sessions directory */
export async function getClaudeCodeSessionsDir(): Promise<string> {
  return CLAUDE_PROJECTS_DIR;
}

/** Get summaries of all Claude Code sessions */
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
        // Ignore parse errors
      }
    }
  } catch {
    // Directory doesn't exist, etc.
  }

  // Sort by timestamp descending
  return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Extract summary information from Claude Code session file */
async function parseClaudeCodeSessionSummary(filePath: string): Promise<SessionSummary | null> {
  const file = Bun.file(filePath);
  const text = await file.text();
  const lines = text.trim().split("\n");

  let sessionId: string | undefined;
  let timestamp: Date | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  const userMessages: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);

      // Get session ID and metadata
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

      // Collect user messages
      if (record.type === "user") {
        const content = extractMessageContent(record.message);
        if (content) {
          userMessages.push(content);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  if (!sessionId || !timestamp) {
    return null;
  }

  // Select title: prefer messages not starting with "<", fallback to first message
  const preferredMessage = userMessages.find((msg) => !msg.startsWith("<"));
  const titleSource = preferredMessage ?? userMessages[0];

  // Generate title (40 chars, convert newlines to spaces)
  const title = titleSource
    ? titleSource.replace(/\n/g, " ").slice(0, 40)
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

/** Get Claude Code session details */
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

      // Get metadata
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

      // Process messages
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
      // Ignore JSON parse errors
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

/** Extract message content */
function extractMessageContent(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const msg = message as Record<string, unknown>;

  // If content is a string
  if (typeof msg.content === "string") {
    return msg.content;
  }

  // If content is an array (content blocks)
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

/** Extract messages from user record */
function extractUserMessages(record: Record<string, unknown>): Message[] {
  const messages: Message[] = [];
  const ts = record.timestamp ? new Date(record.timestamp as string) : undefined;

  if (!record.message || typeof record.message !== "object") return messages;
  const msg = record.message as Record<string, unknown>;

  // If content is a string
  if (typeof msg.content === "string") {
    messages.push({
      type: "user",
      content: msg.content,
      timestamp: ts,
    });
    return messages;
  }

  // If content is an array
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
          content: content.slice(0, 500), // Truncate long results
          toolId: block.tool_use_id,
          timestamp: ts,
        });
      }
    }
  }

  return messages;
}

/** Extract messages from assistant record */
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
