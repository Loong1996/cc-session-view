import { useMemo, useState } from "react"
import { formatTimestamp } from "../../lib/format"

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
}

interface MessageRendererProps {
  messages: Message[]
}

interface MessageGroup {
  type: "single" | "consecutive"
  messages: Message[]
  startIndex: number
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  const groups = useMemo(() => groupConsecutiveAssistantMessages(messages), [messages])

  return (
    <div>
      {groups.map((group) => {
        if (group.type === "single") {
          return <SingleMessage key={`msg-${group.startIndex}`} message={group.messages[0]!} />
        }
        return (
          <ConsecutiveAssistantGroup
            key={`group-${group.startIndex}`}
            messages={group.messages}
            startIndex={group.startIndex}
          />
        )
      })}
    </div>
  )
}

function SingleMessage({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.content.length > 800
  const typeClass = message.type.replace("_", "-")
  const abbr = getMessageAbbr(message.type)

  const timestamp = message.timestamp
    ? message.timestamp instanceof Date
      ? formatTimestamp(message.timestamp)
      : formatTimestamp(new Date(message.timestamp))
    : null

  return (
    <article className={`message ${typeClass}`}>
      <div className="msg-indicator" title={getMessageLabel(message.type)}>
        <span className="msg-abbr">{abbr}</span>
      </div>
      <div className="msg-main">
        <div className="msg-meta">
          {timestamp && <span className="timestamp">{timestamp}</span>}
          {message.toolName && <code className="tool-tag">{message.toolName}</code>}
          {isLong && (
            <button
              type="button"
              className={`expand-btn ${expanded ? "expanded" : ""}`}
              onClick={() => setExpanded(!expanded)}
            >
              <span className="expand-icon">▼</span>
            </button>
          )}
        </div>
        <div className={`msg-text ${isLong && !expanded ? "collapsed" : ""}`}>
          <pre>{message.content}</pre>
        </div>
      </div>
    </article>
  )
}

function ConsecutiveAssistantGroup({
  messages,
  startIndex,
}: {
  messages: Message[]
  startIndex: number
}) {
  const [showHidden, setShowHidden] = useState(false)
  const hiddenCount = messages.length - 2
  const firstMsg = messages[0]!
  const lastMsg = messages[messages.length - 1]!
  const middleMessages = messages.slice(1, -1)

  return (
    <>
      <SingleMessage message={firstMsg} />

      <div className="hidden-messages-group">
        <button
          type="button"
          className={`show-hidden-btn ${showHidden ? "expanded" : ""}`}
          onClick={() => setShowHidden(!showHidden)}
        >
          <span className="hidden-icon">▶</span>
          <span className="hidden-count">
            {showHidden ? `Hide ${hiddenCount} messages` : `Show ${hiddenCount} messages`}
          </span>
        </button>
        <div className={`hidden-messages-container ${showHidden ? "visible" : ""}`}>
          {middleMessages.map((msg, idx) => (
            <SingleMessage key={`hidden-${startIndex + 1 + idx}`} message={msg} />
          ))}
        </div>
      </div>

      <SingleMessage message={lastMsg} />
    </>
  )
}

function groupConsecutiveAssistantMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]!

    if (msg.type === "assistant") {
      // Count consecutive assistant messages
      const consecutiveMessages: Message[] = [msg]
      let j = i + 1
      while (j < messages.length && messages[j]!.type === "assistant") {
        consecutiveMessages.push(messages[j]!)
        j++
      }

      if (consecutiveMessages.length >= 4) {
        groups.push({
          type: "consecutive",
          messages: consecutiveMessages,
          startIndex: i,
        })
      } else {
        for (let k = 0; k < consecutiveMessages.length; k++) {
          groups.push({
            type: "single",
            messages: [consecutiveMessages[k]!],
            startIndex: i + k,
          })
        }
      }
      i = j
    } else {
      groups.push({
        type: "single",
        messages: [msg],
        startIndex: i,
      })
      i++
    }
  }

  return groups
}

function getMessageLabel(type: string): string {
  const labels: Record<string, string> = {
    user: "USER",
    assistant: "ASSISTANT",
    tool_use: "TOOL USE",
    tool_result: "TOOL RESULT",
    thinking: "THINKING",
  }
  return labels[type] || type.toUpperCase()
}

function getMessageAbbr(type: string): string {
  const abbrs: Record<string, string> = {
    user: "用户输入",
    assistant: "AI输出",
    tool_use: "工具调用",
    tool_result: "工具结果",
    thinking: "思考",
  }
  return abbrs[type] || "?"
}
