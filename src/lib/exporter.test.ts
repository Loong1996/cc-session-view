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
  test("generates valid HTML structure", async () => {
    const session = createSession()
    const result = await exportToHtml(session, defaultOptions)

    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html")
    expect(result).toContain("</html>")
  })

  test("escapes HTML in content", async () => {
    const session = createSession({
      messages: [createMessage({ type: "user", content: "<script>alert('xss')</script>" })],
    })
    const result = await exportToHtml(session, defaultOptions)

    expect(result).not.toContain("<script>alert('xss')</script>")
    expect(result).toContain("&lt;script&gt;")
  })

  test("includes session metadata", async () => {
    const session = createSession()
    const result = await exportToHtml(session, defaultOptions)

    expect(result).toContain("test-session-id")
    expect(result).toContain("Claude Code")
  })

  test("renders all messages with data-msg-type for interactive filtering", async () => {
    const session = createSession({
      messages: [
        createMessage({ type: "thinking", content: "Thinking content" }),
        createMessage({ type: "assistant", content: "Response" }),
      ],
    })
    // Full SSR: all messages rendered; CSS uses data-msg-type + body dataset to hide/show
    const result = await exportToHtml(session, { ...defaultOptions, includeThinking: false })

    expect(result).toContain("Thinking content")
    expect(result).toContain('data-msg-type="thinking"')
    expect(result).toContain("Response")
    // Initial body dataset reflects the passed options
    expect(result).toContain('data-show-thinking="false"')
  })

  test("includes interactive filter bar chips", async () => {
    const session = createSession()
    const result = await exportToHtml(session, defaultOptions)

    expect(result).toContain("data-filter-toggle")
    expect(result).toContain("export-filter-bar")
  })

  test("embeds font faces when embedFonts is true", async () => {
    const session = createSession()
    const result = await exportToHtml(session, { ...defaultOptions, embedFonts: true })

    expect(result).toContain("@font-face")
    expect(result).toContain("data:font/woff2;base64,")
    expect(result).not.toContain("fonts.googleapis.com")
  })

  test("links to google fonts when embedFonts is false", async () => {
    const session = createSession()
    const result = await exportToHtml(session, { ...defaultOptions, embedFonts: false })

    expect(result).toContain("fonts.googleapis.com")
    expect(result).not.toContain("data:font/woff2;base64,")
  })

  test("filter bar contains exactly 5 chip buttons", async () => {
    const session = createSession()
    const result = await exportToHtml(session, defaultOptions)

    const matches = [...result.matchAll(/data-filter-toggle="/g)]
    expect(matches.length).toBe(5)
  })

  test("body dataset reflects all 5 initialToggles fields", async () => {
    const session = createSession()
    const result = await exportToHtml(session, {
      ...defaultOptions,
      initialToggles: {
        showSystem: true,
        showThinking: false,
        showTools: true,
        showSkillFull: false,
        showContextSummary: true,
      },
    })

    expect(result).toContain('data-show-system="true"')
    expect(result).toContain('data-show-thinking="false"')
    expect(result).toContain('data-show-tools="true"')
    expect(result).toContain('data-show-skill-full="false"')
    expect(result).toContain('data-show-context-summary="true"')
  })

  test("embedFonts=true produces no https:// external links", async () => {
    const session = createSession({
      messages: [createMessage({ type: "user", content: "hello" })],
    })
    const result = await exportToHtml(session, { ...defaultOptions, embedFonts: true })

    // Strip data: URIs and in-page anchors, then check no http(s):// remain
    const stripped = result.replace(/url\('data:[^']*'\)/g, "").replace(/href="#[^"]*"/g, "")
    expect(stripped).not.toMatch(/https?:\/\//)
  })

  test("chip click toggles body dataset and message visibility", async () => {
    const session = createSession({
      messages: [
        createMessage({ type: "thinking", content: "Inner thought" }),
        createMessage({ type: "user", content: "Hi" }),
      ],
    })
    const html = await exportToHtml(session, {
      ...defaultOptions,
      initialToggles: {
        showSystem: false,
        showThinking: false,
        showTools: false,
        showSkillFull: false,
        showContextSummary: false,
      },
    })

    // Load the exported HTML into a happy-dom document
    document.open()
    document.write(html)
    document.close()

    // Initial state: thinking hidden (data-show-thinking="false")
    expect(document.body.dataset.showThinking).toBe("false")

    const thinkingChip = document.querySelector(
      '[data-filter-toggle="showThinking"]',
    ) as HTMLButtonElement
    expect(thinkingChip).not.toBeNull()

    // Execute the embedded filter script so event listeners are attached
    const scriptContent = html.match(
      /\(function\(\)\s*\{[\s\S]*?chip\.addEventListener[\s\S]*?\}\)\(\);/,
    )?.[0]
    if (scriptContent) {
      // biome-ignore lint/security/noGlobalEval: test only
      eval(scriptContent)
    }

    thinkingChip.click()
    expect(document.body.dataset.showThinking).toBe("true")

    thinkingChip.click()
    expect(document.body.dataset.showThinking).toBe("false")
  })
})
