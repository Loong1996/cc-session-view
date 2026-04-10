import { useMemo, useState } from "react"
import { formatTimestamp } from "../../lib/format"

interface SkillCallMeta {
  skillName: string
  userInput: string
  fullContent: string
}

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSkillCall?: boolean
  skillMeta?: SkillCallMeta
  isContextSummary?: boolean
}

interface MessageRendererProps {
  messages: Message[]
  showSkillFullContent?: boolean
  searchQuery?: string
  highlightedMessageIndex?: number
}

interface MessageGroup {
  type: "single" | "consecutive"
  messages: Message[]
  startIndex: number
}

export function MessageRenderer({
  messages,
  showSkillFullContent,
  searchQuery,
  highlightedMessageIndex,
}: MessageRendererProps) {
  const groups = useMemo(() => groupConsecutiveAssistantMessages(messages), [messages])

  return (
    <div>
      {groups.map((group) => {
        if (group.type === "single") {
          return (
            <SingleMessage
              key={`msg-${group.startIndex}`}
              message={group.messages[0]!}
              messageIndex={group.startIndex}
              showSkillFullContent={showSkillFullContent}
              searchQuery={searchQuery}
              isHighlighted={highlightedMessageIndex === group.startIndex}
            />
          )
        }
        return (
          <ConsecutiveAssistantGroup
            key={`group-${group.startIndex}`}
            messages={group.messages}
            startIndex={group.startIndex}
            showSkillFullContent={showSkillFullContent}
            searchQuery={searchQuery}
            highlightedMessageIndex={highlightedMessageIndex}
          />
        )
      })}
    </div>
  )
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const parts: Array<{ text: string; highlight: boolean }> = []
  let lastIndex = 0

  let pos = lowerText.indexOf(lowerQuery, lastIndex)
  while (pos !== -1) {
    if (pos > lastIndex) {
      parts.push({ text: text.slice(lastIndex, pos), highlight: false })
    }
    parts.push({ text: text.slice(pos, pos + query.length), highlight: true })
    lastIndex = pos + query.length
    pos = lowerText.indexOf(lowerQuery, lastIndex)
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false })
  }

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="search-highlight">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

function SingleMessage({
  message,
  messageIndex,
  showSkillFullContent,
  searchQuery,
  isHighlighted,
}: {
  message: Message
  messageIndex: number
  showSkillFullContent?: boolean
  searchQuery?: string
  isHighlighted?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.content.length > 800
  const typeClass = message.type.replace("_", "-")
  const abbr = getMessageAbbr(message.type)

  const timestamp = message.timestamp
    ? message.timestamp instanceof Date
      ? formatTimestamp(message.timestamp)
      : formatTimestamp(new Date(message.timestamp))
    : null

  // Render skill call messages specially
  if (message.isSkillCall && message.skillMeta) {
    return (
      <SkillCallMessage
        message={message}
        messageIndex={messageIndex}
        showFullContent={showSkillFullContent}
      />
    )
  }

  const extraClass = message.isContextSummary ? " context-summary" : ""
  const highlightClass = isHighlighted ? " search-active" : ""

  return (
    <article
      className={`message ${typeClass}${extraClass}${highlightClass}`}
      data-msg-index={messageIndex}
    >
      <div className="msg-indicator" title={getMessageLabel(message.type)}>
        <span className="msg-abbr">{message.isContextSummary ? "📋" : abbr}</span>
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
          <pre>
            <HighlightedText text={message.content} query={searchQuery} />
          </pre>
        </div>
      </div>
    </article>
  )
}

function SkillCallMessage({
  message,
  messageIndex,
  showFullContent,
}: {
  message: Message
  messageIndex: number
  showFullContent?: boolean
}) {
  const meta = message.skillMeta!
  const timestamp = message.timestamp
    ? message.timestamp instanceof Date
      ? formatTimestamp(message.timestamp)
      : formatTimestamp(new Date(message.timestamp))
    : null

  // Keep original type (user/assistant) but add skill-call class for special styling
  const typeClass = message.type.replace("_", "-")
  const abbr = getMessageAbbr(message.type)

  return (
    <article className={`message ${typeClass} skill-call`} data-msg-index={messageIndex}>
      <div className="msg-indicator" title={getMessageLabel(message.type)}>
        <span className="msg-abbr">{abbr}</span>
      </div>
      <div className="msg-main">
        <div className="msg-meta">
          {timestamp && <span className="timestamp">{timestamp}</span>}
        </div>
        <div className="skill-call-content">
          <div className="skill-call-header">调用Skill: {meta.skillName}</div>
          <div className="skill-call-input">
            <span className="skill-call-input-label">用户输入内容:</span>
            <pre className="skill-call-input-content">{meta.userInput}</pre>
          </div>
          {showFullContent && (
            <details className="skill-call-full">
              <summary>完整内容</summary>
              <pre className="skill-call-full-content">{meta.fullContent}</pre>
            </details>
          )}
        </div>
      </div>
    </article>
  )
}

function ConsecutiveAssistantGroup({
  messages,
  startIndex,
  showSkillFullContent,
  searchQuery,
  highlightedMessageIndex,
}: {
  messages: Message[]
  startIndex: number
  showSkillFullContent?: boolean
  searchQuery?: string
  highlightedMessageIndex?: number
}) {
  const [showHidden, setShowHidden] = useState(false)
  const hiddenCount = messages.length - 2
  const firstMsg = messages[0]!
  const lastMsg = messages[messages.length - 1]!
  const middleMessages = messages.slice(1, -1)

  return (
    <>
      <SingleMessage
        message={firstMsg}
        messageIndex={startIndex}
        showSkillFullContent={showSkillFullContent}
        searchQuery={searchQuery}
        isHighlighted={highlightedMessageIndex === startIndex}
      />

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
            <SingleMessage
              key={`hidden-${startIndex + 1 + idx}`}
              message={msg}
              messageIndex={startIndex + 1 + idx}
              showSkillFullContent={showSkillFullContent}
              searchQuery={searchQuery}
              isHighlighted={highlightedMessageIndex === startIndex + 1 + idx}
            />
          ))}
        </div>
      </div>

      <SingleMessage
        message={lastMsg}
        messageIndex={startIndex + messages.length - 1}
        showSkillFullContent={showSkillFullContent}
        searchQuery={searchQuery}
        isHighlighted={highlightedMessageIndex === startIndex + messages.length - 1}
      />
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
