import type { BranchMessage, ExportOptions, Message, MessageType } from "./types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageGroup {
  type: "single" | "consecutive"
  messages: Message[]
  startIndex: number
}

// ─── Label/Abbr helpers ───────────────────────────────────────────────────────

export function getMessageLabel(type: MessageType | string): string {
  const labels: Record<string, string> = {
    user: "USER",
    assistant: "ASSISTANT",
    tool_use: "TOOL USE",
    tool_result: "TOOL RESULT",
    thinking: "THINKING",
  }
  return labels[type] ?? type.toUpperCase()
}

export function getMessageAbbr(type: MessageType | string): string {
  const abbrs: Record<string, string> = {
    user: "用户输入",
    assistant: "AI输出",
    tool_use: "工具调用",
    tool_result: "工具结果",
    thinking: "思考",
  }
  return abbrs[type] ?? "?"
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

export function groupConsecutiveAssistantMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]!

    if (msg.type === "assistant") {
      const consecutiveMessages: Message[] = [msg]
      let j = i + 1
      while (j < messages.length && messages[j]!.type === "assistant") {
        consecutiveMessages.push(messages[j]!)
        j++
      }

      if (consecutiveMessages.length >= 4) {
        groups.push({ type: "consecutive", messages: consecutiveMessages, startIndex: i })
      } else {
        for (let k = 0; k < consecutiveMessages.length; k++) {
          groups.push({ type: "single", messages: [consecutiveMessages[k]!], startIndex: i + k })
        }
      }
      i = j
    } else {
      groups.push({ type: "single", messages: [msg], startIndex: i })
      i++
    }
  }

  return groups
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export function filterMessages(messages: Message[], options: ExportOptions): Message[] {
  return messages.filter((msg) => {
    if (msg.isContextSummary && !options.includeContextSummary) return false
    if (msg.isSystemMessage && !options.includeSystemMessages) return false
    if (msg.type === "user" && !options.includeUser) return false
    if (msg.type === "assistant" && !options.includeAssistant) return false
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !options.includeToolUse)
      return false
    if (msg.type === "thinking" && !options.includeThinking) return false
    return true
  })
}

export function filterBranchMessages(
  messages: BranchMessage[],
  options: ExportOptions,
): BranchMessage[] {
  return messages.filter((msg) => {
    if (msg.isSystemMessage && !options.includeSystemMessages) return false
    if (msg.type === "user" && !options.includeUser) return false
    if (msg.type === "assistant" && !options.includeAssistant) return false
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !options.includeToolUse)
      return false
    if (msg.type === "thinking" && !options.includeThinking) return false
    return true
  })
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
