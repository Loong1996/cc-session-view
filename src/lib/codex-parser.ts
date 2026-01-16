import { homedir } from "node:os"
import { join } from "node:path"
import type { Message, SessionDetail, SessionSummary } from "./types"

const CODEX_SESSIONS_DIR = join(homedir(), ".codex", "sessions")

/** Get Codex sessions directory */
export async function getCodexSessionsDir(): Promise<string> {
  return CODEX_SESSIONS_DIR
}

/** Get summaries of all Codex sessions */
export async function listCodexSessions(): Promise<SessionSummary[]> {
  const sessions: SessionSummary[] = []

  // New format (JSONL): YYYY/MM/DD/rollout-*.jsonl
  const jsonlGlob = new Bun.Glob("**/rollout-*.jsonl")
  // Old format (JSON): rollout-*.json
  const jsonGlob = new Bun.Glob("rollout-*.json")

  try {
    // New format sessions
    for await (const path of jsonlGlob.scan({ cwd: CODEX_SESSIONS_DIR, absolute: true })) {
      try {
        const summary = await parseCodexJsonlSessionSummary(path)
        if (summary) {
          sessions.push(summary)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Old format sessions
    for await (const path of jsonGlob.scan({ cwd: CODEX_SESSIONS_DIR, absolute: true })) {
      try {
        const summary = await parseCodexJsonSessionSummary(path)
        if (summary) {
          sessions.push(summary)
        }
      } catch {
        // Ignore parse errors
      }
    }
  } catch {
    // Directory doesn't exist, etc.
  }

  // Sort by timestamp descending
  return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

/** Extract summary information from Codex JSONL session file */
async function parseCodexJsonlSessionSummary(filePath: string): Promise<SessionSummary | null> {
  const file = Bun.file(filePath)
  const text = await file.text()
  const lines = text.trim().split("\n")

  let sessionId: string | undefined
  let timestamp: Date | undefined
  let cwd: string | undefined
  let gitBranch: string | undefined
  let firstUserMessage: string | undefined

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line)

      // Get metadata from session_meta
      if (record.type === "session_meta" && record.payload) {
        sessionId = record.payload.id
        timestamp = new Date(record.payload.timestamp || record.timestamp)
        cwd = record.payload.cwd
        if (record.payload.git) {
          gitBranch = record.payload.git.branch
        }
      }

      // Find the first user message (skip messages that shouldn't be used for title)
      if (record.type === "response_item" && record.payload?.role === "user" && !firstUserMessage) {
        const content = extractCodexMessageContent(record.payload)
        if (content && !shouldSkipForTitle(content)) {
          firstUserMessage = content
        }
      }

      // Also get user messages from event_msg
      if (
        record.type === "event_msg" &&
        record.payload?.type === "user_message" &&
        !firstUserMessage
      ) {
        const msg = record.payload.message
        if (msg && !shouldSkipForTitle(msg)) {
          firstUserMessage = msg
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  if (!sessionId || !timestamp) {
    return null
  }

  const title = firstUserMessage
    ? firstUserMessage.replace(/\n/g, " ").slice(0, 40)
    : "(No message)"

  return {
    id: sessionId,
    agentType: "codex",
    filePath,
    title,
    timestamp,
    cwd,
    gitBranch,
  }
}

/** Extract summary information from Codex JSON session file (old format) */
async function parseCodexJsonSessionSummary(filePath: string): Promise<SessionSummary | null> {
  const file = Bun.file(filePath)
  const text = await file.text()
  const data = JSON.parse(text)

  if (!data.session) return null

  const sessionId = data.session.id
  const timestamp = new Date(data.session.timestamp)
  let firstUserMessage: string | undefined

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.role === "user" && item.type === "message") {
        const content = extractCodexMessageContent(item)
        if (content && !shouldSkipForTitle(content)) {
          firstUserMessage = content
          break
        }
      }
    }
  }

  const title = firstUserMessage
    ? firstUserMessage.replace(/\n/g, " ").slice(0, 40)
    : "(No message)"

  return {
    id: sessionId,
    agentType: "codex",
    filePath,
    title,
    timestamp,
  }
}

/** Get Codex session details */
export async function loadCodexSession(filePath: string): Promise<SessionDetail | null> {
  const file = Bun.file(filePath)
  const text = await file.text()

  // Determine format by file extension
  if (filePath.endsWith(".jsonl")) {
    return parseCodexJsonlSessionDetail(filePath, text)
  }
  return parseCodexJsonSessionDetail(filePath, text)
}

/** Parse JSONL format session details */
function parseCodexJsonlSessionDetail(filePath: string, text: string): SessionDetail | null {
  const lines = text.trim().split("\n")

  let sessionId: string | undefined
  let timestamp: Date | undefined
  let cwd: string | undefined
  let gitBranch: string | undefined
  let version: string | undefined
  let model: string | undefined
  const messages: Message[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line)

      // Get metadata from session_meta
      if (record.type === "session_meta" && record.payload) {
        sessionId = record.payload.id
        timestamp = new Date(record.payload.timestamp || record.timestamp)
        cwd = record.payload.cwd
        version = record.payload.cli_version
        if (record.payload.git) {
          gitBranch = record.payload.git.branch
        }
      }

      // Get first model info from turn_context
      if (record.type === "turn_context" && record.payload?.model && !model) {
        model = record.payload.model
      }

      // Get messages from response_item
      if (record.type === "response_item" && record.payload) {
        const payload = record.payload
        const ts = record.timestamp ? new Date(record.timestamp) : undefined

        if (payload.type === "message" && payload.role === "user") {
          const content = extractCodexMessageContent(payload)
          if (content) {
            messages.push({ type: "user", content, timestamp: ts })
          }
        } else if (payload.type === "message" && payload.role === "assistant") {
          const content = extractCodexMessageContent(payload)
          if (content) {
            messages.push({ type: "assistant", content, timestamp: ts })
          }
        } else if (payload.type === "function_call") {
          messages.push({
            type: "tool_use",
            content: payload.arguments || "",
            toolName: payload.name,
            toolId: payload.call_id,
            timestamp: ts,
          })
        } else if (payload.type === "function_call_output") {
          messages.push({
            type: "tool_result",
            content: (payload.output || "").slice(0, 500),
            toolId: payload.call_id,
            timestamp: ts,
          })
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  if (!sessionId || !timestamp) {
    return null
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
  }
}

/** Parse JSON format session details (old format) */
function parseCodexJsonSessionDetail(filePath: string, text: string): SessionDetail | null {
  const data = JSON.parse(text)

  if (!data.session) return null

  const sessionId = data.session.id
  const timestamp = new Date(data.session.timestamp)
  const messages: Message[] = []

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.type === "message" && item.role === "user") {
        const content = extractCodexMessageContent(item)
        if (content) {
          messages.push({ type: "user", content })
        }
      } else if (item.type === "reasoning") {
        // Treat reasoning as thinking
        if (Array.isArray(item.summary) && item.summary.length > 0) {
          messages.push({
            type: "thinking",
            content: item.summary.join("\n"),
          })
        }
      } else if (item.type === "local_shell_call") {
        const command = Array.isArray(item.action?.command) ? item.action.command.join(" ") : ""
        messages.push({
          type: "tool_use",
          content: command,
          toolName: "shell_command",
          toolId: item.call_id,
        })
      } else if (item.type === "local_shell_call_output") {
        try {
          const output = JSON.parse(item.output || "{}")
          messages.push({
            type: "tool_result",
            content: (output.output || "").slice(0, 500),
            toolId: item.call_id,
          })
        } catch {
          messages.push({
            type: "tool_result",
            content: (item.output || "").slice(0, 500),
            toolId: item.call_id,
          })
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
  }
}

/** Extract content from Codex message */
function extractCodexMessageContent(message: Record<string, unknown>): string | null {
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      // user: input_text, assistant: output_text, both: text
      if (block.type === "input_text" && typeof block.text === "string") {
        return block.text
      }
      if (block.type === "output_text" && typeof block.text === "string") {
        return block.text
      }
      if (block.type === "text" && typeof block.text === "string") {
        return block.text
      }
    }
  }
  if (typeof message.content === "string") {
    return message.content
  }
  return null
}

/** Determine if message should not be used for title */
function shouldSkipForTitle(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith("# AGENTS.md") || trimmed.startsWith("<environment_context>")
}
