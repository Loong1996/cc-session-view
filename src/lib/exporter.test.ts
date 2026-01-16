import { describe, expect, test } from "bun:test"
import { exportToHtml, exportToText } from "./exporter"
import type { ExportOptions, Message, SessionDetail } from "./types"

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  type: "user",
  content: "Test message",
  ...overrides,
})

const createSession = (overrides: Partial<SessionDetail> = {}): SessionDetail => ({
  id: "test-session-id",
  agentType: "claude-code",
  filePath: "/path/to/session.jsonl",
  timestamp: new Date("2024-01-15T10:00:00Z"),
  cwd: "/Users/test/project",
  gitBranch: "main",
  version: "1.0.0",
  model: "claude-3-opus",
  messages: [],
  ...overrides,
})

const defaultOptions: ExportOptions = {
  includeUser: true,
  includeAssistant: true,
  includeToolUse: true,
  includeThinking: true,
  includeSystemMessages: true,
}

describe("exportToText", () => {
  test("exports session header correctly", () => {
    const session = createSession()
    const result = exportToText(session, defaultOptions)

    expect(result).toContain("Session: test-session-id")
    expect(result).toContain("Type: claude-code")
    expect(result).toContain("CWD: /Users/test/project")
    expect(result).toContain("Branch: main")
    expect(result).toContain("Version: 1.0.0")
    expect(result).toContain("Model: claude-3-opus")
  })

  test("exports user messages", () => {
    const session = createSession({
      messages: [createMessage({ type: "user", content: "Hello world" })],
    })
    const result = exportToText(session, defaultOptions)

    expect(result).toContain("[USER]")
    expect(result).toContain("Hello world")
  })

  test("exports assistant messages", () => {
    const session = createSession({
      messages: [createMessage({ type: "assistant", content: "Response here" })],
    })
    const result = exportToText(session, defaultOptions)

    expect(result).toContain("[ASSISTANT]")
    expect(result).toContain("Response here")
  })

  test("exports tool_use with tool name", () => {
    const session = createSession({
      messages: [
        createMessage({ type: "tool_use", content: '{"file": "test.ts"}', toolName: "Read" }),
      ],
    })
    const result = exportToText(session, defaultOptions)

    expect(result).toContain("[TOOL USE]")
    expect(result).toContain("Tool: Read")
    expect(result).toContain('{"file": "test.ts"}')
  })

  test("filters out user messages when includeUser is false", () => {
    const session = createSession({
      messages: [
        createMessage({ type: "user", content: "User message" }),
        createMessage({ type: "assistant", content: "Assistant message" }),
      ],
    })
    const result = exportToText(session, { ...defaultOptions, includeUser: false })

    expect(result).not.toContain("User message")
    expect(result).toContain("Assistant message")
  })

  test("filters out system messages when includeSystemMessages is false", () => {
    const session = createSession({
      messages: [
        createMessage({ type: "user", content: "Normal message", isSystemMessage: false }),
        createMessage({ type: "user", content: "<system-reminder>", isSystemMessage: true }),
      ],
    })
    const result = exportToText(session, { ...defaultOptions, includeSystemMessages: false })

    expect(result).toContain("Normal message")
    expect(result).not.toContain("<system-reminder>")
  })
})

describe("exportToHtml", () => {
  test("generates valid HTML structure", () => {
    const session = createSession()
    const result = exportToHtml(session, defaultOptions)

    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html")
    expect(result).toContain("</html>")
  })

  test("escapes HTML in content", () => {
    const session = createSession({
      messages: [createMessage({ type: "user", content: "<script>alert('xss')</script>" })],
    })
    const result = exportToHtml(session, defaultOptions)

    expect(result).not.toContain("<script>alert('xss')</script>")
    expect(result).toContain("&lt;script&gt;")
  })

  test("includes session metadata", () => {
    const session = createSession()
    const result = exportToHtml(session, defaultOptions)

    expect(result).toContain("test-session-id")
    expect(result).toContain("Claude Code")
  })

  test("filters messages based on options", () => {
    const session = createSession({
      messages: [
        createMessage({ type: "thinking", content: "Thinking content" }),
        createMessage({ type: "assistant", content: "Response" }),
      ],
    })
    const result = exportToHtml(session, { ...defaultOptions, includeThinking: false })

    expect(result).not.toContain("Thinking content")
    expect(result).toContain("Response")
  })
})
