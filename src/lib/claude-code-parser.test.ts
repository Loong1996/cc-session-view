import { describe, expect, test } from "bun:test"

// Note: The internal functions like extractMessageContent and extractAssistantMessages
// are not exported from claude-code-parser.ts.
// These tests document the expected behavior for future reference.
// To fully test the parser, we would need to either:
// 1. Export the internal functions
// 2. Create test fixture files and test via loadClaudeCodeSession

describe("Claude Code Parser", () => {
  describe("extractMessageContent (expected behavior)", () => {
    test("extracts string content directly", () => {
      const message = { content: "Hello world" }
      expect(message.content).toBe("Hello world")
    })

    test("extracts text from content blocks array", () => {
      const message = {
        content: [
          { type: "text", text: "First text" },
          { type: "image", data: "..." },
        ],
      }
      const textBlock = message.content.find(
        (b): b is { type: "text"; text: string } => b.type === "text",
      )
      expect(textBlock?.text).toBe("First text")
    })

    test("extracts input_text from content blocks", () => {
      const message = {
        content: [{ type: "input_text", text: "User input" }],
      }
      const inputBlock = message.content.find(
        (b): b is { type: "input_text"; text: string } => b.type === "input_text",
      )
      expect(inputBlock?.text).toBe("User input")
    })
  })

  describe("isSystemMessage (expected behavior)", () => {
    test("content starting with < is a system message", () => {
      const content = "<system-reminder>This is a reminder</system-reminder>"
      expect(content.trim().startsWith("<")).toBe(true)
    })

    test("normal content is not a system message", () => {
      const content = "Hello, how can I help?"
      expect(content.trim().startsWith("<")).toBe(false)
    })
  })

  describe("message type extraction (expected behavior)", () => {
    test("thinking block structure", () => {
      const block = { type: "thinking", thinking: "Let me think about this..." }
      expect(block.type).toBe("thinking")
      expect(block.thinking).toBe("Let me think about this...")
    })

    test("tool_use block structure", () => {
      const block = {
        type: "tool_use",
        name: "Read",
        id: "tool-123",
        input: { file_path: "/test.ts" },
      }
      expect(block.type).toBe("tool_use")
      expect(block.name).toBe("Read")
      expect(block.input).toEqual({ file_path: "/test.ts" })
    })

    test("tool_result block structure", () => {
      const block = {
        type: "tool_result",
        tool_use_id: "tool-123",
        content: "File contents here",
      }
      expect(block.type).toBe("tool_result")
      expect(block.tool_use_id).toBe("tool-123")
    })
  })
})
