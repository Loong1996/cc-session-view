import { useMemo, useState } from "react"
import { formatTimestamp } from "../../lib/format"
import {
  getMessageAbbr,
  getMessageLabel,
  groupConsecutiveAssistantMessages,
} from "../../lib/message-utils"
import type { Message } from "../../lib/types"

// Re-export for consumers that import from here
export type { Message }

interface MessageRendererProps {
  messages: Message[]
  showSkillFullContent?: boolean
  searchQuery?: string
  highlightedMessageIndex?: number
  /**
   * When true, renders static HTML suitable for standalone export:
   *   - No React state (useState not used for interactions)
   *   - Expand/collapse driven by data-toggle-msg / data-toggle-group attributes
   *   - No search highlighting
   *   - Adds id="msg-{N}" on each article for the embedded toggle script
   */
  staticMode?: boolean
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
  staticMode = false,
}: MessageRendererProps) {
  const groups = useMemo(
    () => groupConsecutiveAssistantMessages(messages),
    [messages],
  ) as MessageGroup[]

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
              staticMode={staticMode}
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
            staticMode={staticMode}
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

function resolveTimestamp(ts: Date | string | undefined): string | null {
  if (!ts) return null
  return formatTimestamp(ts instanceof Date ? ts : new Date(ts))
}

function SingleMessage({
  message,
  messageIndex,
  showSkillFullContent,
  searchQuery,
  isHighlighted,
  staticMode,
}: {
  message: Message
  messageIndex: number
  showSkillFullContent?: boolean
  searchQuery?: string
  isHighlighted?: boolean
  staticMode?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.content.length > 800
  const typeClass = message.type.replace("_", "-")
  const abbr = getMessageAbbr(message.type)
  const timestamp = resolveTimestamp(message.timestamp)

  if (message.isSkillCall && message.skillMeta) {
    return (
      <SkillCallMessage
        message={message}
        messageIndex={messageIndex}
        showFullContent={showSkillFullContent}
        staticMode={staticMode}
      />
    )
  }

  const extraClass = message.isContextSummary ? " context-summary" : ""

  if (staticMode) {
    // Compute data-msg-type for interactive toggle filtering in exported HTML
    let msgType: string = message.type
    if (message.isSystemMessage) msgType = "system"
    else if (message.isContextSummary) msgType = "context-summary"
    else if (message.isSkillCall) msgType = "skill-full"

    // Static export: driven by data attributes + event delegation script in HTML shell
    return (
      <article
        className={`message ${typeClass}${extraClass}`}
        id={`msg-${messageIndex}`}
        data-msg-type={msgType}
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
                className="expand-btn"
                data-toggle-msg={String(messageIndex)}
                data-expanded="false"
              >
                <span className="expand-icon">▼</span>
              </button>
            )}
          </div>
          <div className={`msg-text${isLong ? " collapsed" : ""}`}>
            <pre>{message.content}</pre>
          </div>
        </div>
      </article>
    )
  }

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
  staticMode,
}: {
  message: Message
  messageIndex: number
  showFullContent?: boolean
  staticMode?: boolean
}) {
  const meta = message.skillMeta!
  const timestamp = resolveTimestamp(message.timestamp)
  const typeClass = message.type.replace("_", "-")
  const abbr = getMessageAbbr(message.type)

  return (
    <article
      className={`message ${typeClass} skill-call`}
      id={staticMode ? `msg-${messageIndex}` : undefined}
      data-msg-index={staticMode ? undefined : messageIndex}
      data-msg-type={staticMode ? "skill-full" : undefined}
    >
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
  staticMode,
}: {
  messages: Message[]
  startIndex: number
  showSkillFullContent?: boolean
  searchQuery?: string
  highlightedMessageIndex?: number
  staticMode?: boolean
}) {
  const [showHidden, setShowHidden] = useState(false)
  const hiddenCount = messages.length - 2
  const firstMsg = messages[0]!
  const lastMsg = messages[messages.length - 1]!
  const middleMessages = messages.slice(1, -1)
  const groupId = `assistant-group-${startIndex}`

  if (staticMode) {
    return (
      <>
        <SingleMessage
          message={firstMsg}
          messageIndex={startIndex}
          showSkillFullContent={showSkillFullContent}
          staticMode
        />
        <div className="hidden-messages-group" id={groupId}>
          <button
            type="button"
            className="show-hidden-btn"
            data-toggle-group={groupId}
            data-expanded="false"
          >
            <span className="hidden-icon">▶</span>
            <span className="hidden-count">Show {hiddenCount} messages</span>
          </button>
          <div className="hidden-messages-container">
            {middleMessages.map((msg, idx) => (
              <SingleMessage
                key={`hidden-${startIndex + 1 + idx}`}
                message={msg}
                messageIndex={startIndex + 1 + idx}
                showSkillFullContent={showSkillFullContent}
                staticMode
              />
            ))}
          </div>
        </div>
        <SingleMessage
          message={lastMsg}
          messageIndex={startIndex + messages.length - 1}
          showSkillFullContent={showSkillFullContent}
          staticMode
        />
      </>
    )
  }

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
