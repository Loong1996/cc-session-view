import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"
import { formatTimestamp } from "../lib/format"
import type { ExportOptions, SessionDetail as SessionDetailType } from "../lib/types"
import { ScrollIndicator } from "./ScrollIndicator"

interface SessionDetailProps {
  session: SessionDetailType
  exportOptions: ExportOptions
  onChangeOptions: (options: ExportOptions) => void
  onBack: () => void
  onExport: (format: "text" | "html" | "markdown") => void
  onViewInBrowser: () => void
  isActive?: boolean
}

type OptionKey = "includeUser" | "includeAssistant" | "includeToolUse" | "includeThinking"

const optionLabels: Record<OptionKey, string> = {
  includeUser: "User messages",
  includeAssistant: "Assistant messages",
  includeToolUse: "Tool use/result",
  includeThinking: "Thinking blocks",
}

const optionKeys: OptionKey[] = [
  "includeUser",
  "includeAssistant",
  "includeToolUse",
  "includeThinking",
]

export function SessionDetail({
  session,
  exportOptions,
  onChangeOptions,
  onBack,
  onExport,
  onViewInBrowser,
  isActive = true,
}: SessionDetailProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [optionIndex, setOptionIndex] = useState(0)
  const [pagination, setPagination] = useState({ scrollOffset: 0, pageSize: 10 })

  const filteredMessages = useMemo(
    () =>
      session.messages.filter((msg) => {
        if (msg.type === "user" && !exportOptions.includeUser) return false
        if (msg.type === "assistant" && !exportOptions.includeAssistant) return false
        if (
          (msg.type === "tool_use" || msg.type === "tool_result") &&
          !exportOptions.includeToolUse
        ) {
          return false
        }
        if (msg.type === "thinking" && !exportOptions.includeThinking) return false
        return true
      }),
    [exportOptions, session.messages],
  )

  useEffect(() => {
    const maxOffset = Math.max(0, filteredMessages.length - pagination.pageSize)
    if (pagination.scrollOffset > maxOffset) {
      setPagination((prev) => ({ ...prev, scrollOffset: maxOffset }))
    }
  }, [filteredMessages.length, pagination.pageSize, pagination.scrollOffset])

  useInput((input, key) => {
    if (!isActive) return

    if (showOptions) {
      if (key.escape || input === "o") {
        setShowOptions(false)
        return
      }
      if (key.upArrow || input === "k") {
        setOptionIndex((prev) => Math.max(0, prev - 1))
        return
      }
      if (key.downArrow || input === "j") {
        setOptionIndex((prev) => Math.min(optionKeys.length - 1, prev + 1))
        return
      }
      if (key.return || input === " ") {
        const optKey = optionKeys[optionIndex]
        if (optKey) {
          onChangeOptions({
            ...exportOptions,
            [optKey]: !exportOptions[optKey],
          })
        }
        return
      }
      return
    }

    const maxOffset = Math.max(0, filteredMessages.length - pagination.pageSize)

    if (key.escape || input === "q") {
      onBack()
      return
    }
    if (input === "t") {
      onExport("text")
      return
    }
    if (input === "h") {
      onExport("html")
      return
    }
    if (input === "m") {
      onExport("markdown")
      return
    }
    if (input === "v") {
      onViewInBrowser()
      return
    }
    if (input === "o") {
      setShowOptions(true)
      return
    }

    if (input === "j" || key.downArrow) {
      setPagination((prev) => ({
        ...prev,
        scrollOffset: Math.min(prev.scrollOffset + 1, maxOffset),
      }))
      return
    }
    if (input === "k" || key.upArrow) {
      setPagination((prev) => ({
        ...prev,
        scrollOffset: Math.max(prev.scrollOffset - 1, 0),
      }))
      return
    }
    if (key.pageDown || (key.ctrl && input === "d")) {
      setPagination((prev) => ({
        ...prev,
        scrollOffset: Math.min(prev.scrollOffset + prev.pageSize, maxOffset),
      }))
      return
    }
    if (key.pageUp || (key.ctrl && input === "u")) {
      setPagination((prev) => ({
        ...prev,
        scrollOffset: Math.max(prev.scrollOffset - prev.pageSize, 0),
      }))
      return
    }
    if (input === "g" || (key as unknown as { home?: boolean }).home) {
      setPagination((prev) => ({ ...prev, scrollOffset: 0 }))
      return
    }
    if (input === "G" || (key as unknown as { end?: boolean }).end) {
      setPagination((prev) => ({ ...prev, scrollOffset: maxOffset }))
      return
    }
  })

  const visibleMessages = filteredMessages.slice(
    pagination.scrollOffset,
    pagination.scrollOffset + pagination.pageSize,
  )
  const rangeStart = filteredMessages.length === 0 ? 0 : pagination.scrollOffset + 1
  const rangeEnd = Math.min(pagination.scrollOffset + pagination.pageSize, filteredMessages.length)

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="gray" flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          Session Info
        </Text>
        <Text>
          <Text dimColor>ID: </Text>
          <Text>{session.id}</Text>
        </Text>
        <Text>
          <Text dimColor>Type: </Text>
          <Text>{session.agentType}</Text>
        </Text>
        <Text>
          <Text dimColor>Date: </Text>
          <Text>{session.timestamp.toLocaleString("ja-JP")}</Text>
        </Text>
        {session.cwd && (
          <Text>
            <Text dimColor>CWD: </Text>
            <Text>{session.cwd}</Text>
          </Text>
        )}
        {session.gitBranch && (
          <Text>
            <Text dimColor>Branch: </Text>
            <Text>{session.gitBranch}</Text>
          </Text>
        )}
        {session.version && (
          <Text>
            <Text dimColor>Version: </Text>
            <Text>{session.version}</Text>
          </Text>
        )}
        {session.model && (
          <Text>
            <Text dimColor>Model: </Text>
            <Text>{session.model}</Text>
          </Text>
        )}
      </Box>

      {showOptions && (
        <Box
          borderStyle="round"
          borderColor="yellow"
          flexDirection="column"
          paddingX={1}
          marginY={1}
        >
          <Text bold color="yellow">
            Export Options
          </Text>
          <Text dimColor>[Up/Down] Navigate [Enter/Space] Toggle [o/ESC] Close</Text>
          <Box flexDirection="column" marginTop={1}>
            {optionKeys.map((key, i) => (
              <Box key={key}>
                <Text color={i === optionIndex ? "cyan" : undefined}>
                  {i === optionIndex ? ">" : " "} [{exportOptions[key] ? "x" : " "}]{" "}
                  {optionLabels[key]}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            Messages [{rangeStart}-{rangeEnd}/{filteredMessages.length}]
          </Text>
          <Text dimColor>[j/k] Scroll</Text>
        </Box>
        {visibleMessages.map((msg, i) => (
          <MessageItem key={`${pagination.scrollOffset}-${i}`} message={msg} />
        ))}
        {filteredMessages.length === 0 && <Text dimColor>No messages</Text>}
        <ScrollIndicator
          current={pagination.scrollOffset}
          total={filteredMessages.length}
          pageSize={pagination.pageSize}
        />
      </Box>
    </Box>
  )
}

interface MessageItemProps {
  message: {
    type: string
    content: string
    timestamp?: Date
    toolName?: string
    isSkillCall?: boolean
    skillMeta?: {
      skillName: string
      userInput: string
      fullContent: string
    }
  }
}

function MessageItem({ message }: MessageItemProps) {
  const roleColors: Record<string, string> = {
    user: "green",
    assistant: "blue",
    tool_use: "yellow",
    tool_result: "magenta",
    thinking: "gray",
    skill_call: "yellow",
  }

  const roleLabels: Record<string, string> = {
    user: "USER",
    assistant: "ASST",
    tool_use: "TOOL",
    tool_result: "RESULT",
    thinking: "THINK",
    skill_call: "SKILL",
  }

  const color = roleColors[message.type] || "white"
  const label = roleLabels[message.type] || message.type.toUpperCase()

  // Handle skill call messages specially
  if (message.isSkillCall && message.skillMeta) {
    const shortInput = message.skillMeta.userInput.replace(/\n/g, " ").slice(0, 60)
    return (
      <Box flexDirection="column" key={message.type}>
        <Box>
          <Box width={12}>
            {message.timestamp && <Text dimColor>{formatTimestamp(message.timestamp)} </Text>}
            <Text color={color} bold>
              [{label}]
            </Text>
          </Box>
          <Box flexShrink={1}>
            <Text wrap="truncate" bold color="yellow">
              调用Skill: {message.skillMeta.skillName}
            </Text>
          </Box>
        </Box>
        <Box paddingLeft={12}>
          <Text dimColor>用户输入: {shortInput}</Text>
          {message.skillMeta.userInput.length > 60 && <Text dimColor>...</Text>}
        </Box>
      </Box>
    )
  }

  const shortContent = message.content.replace(/\n/g, " ").slice(0, 80)

  return (
    <Box>
      <Box width={12}>
        {message.timestamp && <Text dimColor>{formatTimestamp(message.timestamp)} </Text>}
        <Text color={color} bold>
          [{label}]
        </Text>
      </Box>
      <Box flexShrink={1}>
        <Text wrap="truncate">
          {message.toolName && <Text dimColor>{message.toolName}: </Text>}
          {shortContent}
          {message.content.length > 80 && <Text dimColor>...</Text>}
        </Text>
      </Box>
    </Box>
  )
}
