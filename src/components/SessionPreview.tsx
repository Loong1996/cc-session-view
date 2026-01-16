import { Box, Text } from "ink"
import type { Message, SessionDetail, SessionSummary } from "../lib/types"

interface SessionPreviewProps {
  session: SessionDetail | null
  summary: SessionSummary | null
  loading: boolean
  width: number
}

export function SessionPreview({ session, summary, loading, width }: SessionPreviewProps) {
  if (!summary) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        width={width}
        paddingX={1}
      >
        <Text bold color="cyan">
          Preview
        </Text>
        <Text dimColor>Select a session to preview</Text>
      </Box>
    )
  }

  if (loading || !session) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        width={width}
        paddingX={1}
      >
        <Text bold color="cyan">
          Preview
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text dimColor>Date: </Text>
            {summary.timestamp.toLocaleString("ja-JP")}
          </Text>
          {summary.cwd && (
            <Text>
              <Text dimColor>CWD: </Text>
              {truncatePath(summary.cwd, width - 6)}
            </Text>
          )}
          {summary.gitBranch && (
            <Text>
              <Text dimColor>Branch: </Text>
              {summary.gitBranch}
            </Text>
          )}
        </Box>
        <Text dimColor marginTop={1}>
          Loading messages...
        </Text>
      </Box>
    )
  }

  const previewMessages = session.messages
    .filter((message) => message.type === "user" || message.type === "assistant")
    .slice(0, 5)

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" width={width} paddingX={1}>
      <Text bold color="cyan">
        Preview
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text dimColor>ID: </Text>
          {session.id.slice(0, 12)}...
        </Text>
        <Text>
          <Text dimColor>Date: </Text>
          {session.timestamp.toLocaleString("ja-JP")}
        </Text>
        {session.cwd && (
          <Text>
            <Text dimColor>CWD: </Text>
            {truncatePath(session.cwd, width - 6)}
          </Text>
        )}
        {session.gitBranch && (
          <Text>
            <Text dimColor>Branch: </Text>
            {session.gitBranch}
          </Text>
        )}
        {session.model && (
          <Text>
            <Text dimColor>Model: </Text>
            {session.model}
          </Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{"-".repeat(Math.max(0, width - 4))}</Text>
        {previewMessages.map((message, i) => (
          <PreviewMessageItem key={i} message={message} maxWidth={width - 4} />
        ))}
        {session.messages.length > 5 && (
          <Text dimColor>... ({session.messages.length - 5} more messages)</Text>
        )}
      </Box>
    </Box>
  )
}

function truncatePath(path: string, maxWidth: number): string {
  if (maxWidth <= 3) return path.slice(0, maxWidth)
  if (path.length <= maxWidth) return path
  return `...${path.slice(-(maxWidth - 3))}`
}

function PreviewMessageItem({ message, maxWidth }: { message: Message; maxWidth: number }) {
  const roleColors: Record<string, string> = {
    user: "green",
    assistant: "blue",
    tool_use: "yellow",
    tool_result: "magenta",
    thinking: "gray",
  }
  const roleLabels: Record<string, string> = {
    user: "USER",
    assistant: "ASST",
    tool_use: "TOOL",
    tool_result: "RSLT",
    thinking: "THNK",
  }

  const color = roleColors[message.type] || "white"
  const label = roleLabels[message.type] || "????"
  const content = message.content.replace(/\n/g, " ").slice(0, Math.max(0, maxWidth - 10))

  return (
    <Box>
      <Text color={color}>[{label}] </Text>
      <Text wrap="truncate">{content}</Text>
    </Box>
  )
}
