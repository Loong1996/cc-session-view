import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"
import type { SessionSummary } from "../lib/types"

interface SessionListProps {
  sessions: SessionSummary[]
  onSelect: (session: SessionSummary) => void
  onHighlight?: (session: SessionSummary | null) => void
  isActive: boolean
  width?: number
  highlightIndex?: number
  onHighlightIndexChange?: (index: number) => void
}

const PAGE_SIZE = 15

export function SessionList({
  sessions,
  onSelect,
  onHighlight,
  isActive,
  width,
  highlightIndex: controlledIndex,
  onHighlightIndexChange,
}: SessionListProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Use controlled index if provided, otherwise use internal state
  const isControlled = controlledIndex !== undefined
  const highlightIndex = isControlled ? controlledIndex : internalIndex

  const setHighlightIndex = (newIndex: number | ((prev: number) => number)) => {
    const resolvedIndex = typeof newIndex === "function" ? newIndex(highlightIndex) : newIndex
    if (isControlled && onHighlightIndexChange) {
      onHighlightIndexChange(resolvedIndex)
    } else {
      setInternalIndex(resolvedIndex)
    }
  }

  // Reset only internal state when sessions change (for uncontrolled mode)
  useEffect(() => {
    if (!isControlled) {
      setInternalIndex(0)
      setScrollOffset(0)
    }
  }, [isControlled])

  // Adjust highlight index if it's out of bounds
  // biome-ignore lint/correctness/useExhaustiveDependencies: setHighlightIndex is stable
  useEffect(() => {
    if (sessions.length > 0 && highlightIndex >= sessions.length) {
      setHighlightIndex(sessions.length - 1)
    }
  }, [sessions.length, highlightIndex])

  useEffect(() => {
    if (!onHighlight) return
    onHighlight(sessions[highlightIndex] ?? null)
  }, [highlightIndex, sessions, onHighlight])

  useEffect(() => {
    if (sessions.length === 0) return
    if (highlightIndex < scrollOffset) {
      setScrollOffset(highlightIndex)
    } else if (highlightIndex >= scrollOffset + PAGE_SIZE) {
      setScrollOffset(Math.max(0, highlightIndex - PAGE_SIZE + 1))
    }
  }, [highlightIndex, scrollOffset, sessions.length])

  useInput((input, key) => {
    if (!isActive) return
    if (sessions.length === 0) return

    const maxIndex = sessions.length - 1

    if (key.upArrow || input === "k") {
      setHighlightIndex((prev) => Math.max(0, prev - 1))
      return
    }
    if (key.downArrow || input === "j") {
      setHighlightIndex((prev) => Math.min(maxIndex, prev + 1))
      return
    }
    if (key.pageUp || (key.ctrl && input === "u")) {
      setHighlightIndex((prev) => Math.max(0, prev - PAGE_SIZE))
      return
    }
    if (key.pageDown || (key.ctrl && input === "d")) {
      setHighlightIndex((prev) => Math.min(maxIndex, prev + PAGE_SIZE))
      return
    }
    if ((key as unknown as { home?: boolean }).home || input === "g") {
      setHighlightIndex(0)
      return
    }
    if ((key as unknown as { end?: boolean }).end || input === "G") {
      setHighlightIndex(maxIndex)
      return
    }
    if (key.return) {
      const selected = sessions[highlightIndex]
      if (selected) {
        onSelect(selected)
      }
    }
  })

  const visibleSessions = useMemo(
    () => sessions.slice(scrollOffset, scrollOffset + PAGE_SIZE),
    [sessions, scrollOffset],
  )

  if (sessions.length === 0) {
    return (
      <Box>
        <Text dimColor>No sessions found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {visibleSessions.map((session, i) => {
        const index = scrollOffset + i
        const isHighlighted = index === highlightIndex
        const label = formatSessionLabel(session)
        const maxWidth = width ? Math.max(10, width - 4) : undefined
        const displayLabel = maxWidth ? truncateLabel(label, maxWidth) : label

        return (
          <Text key={session.filePath} color={isHighlighted ? "cyan" : undefined}>
            {isHighlighted ? ">" : " "} {displayLabel}
          </Text>
        )
      })}
      {sessions.length > PAGE_SIZE && (
        <Text dimColor>
          {scrollOffset + 1}-{Math.min(scrollOffset + PAGE_SIZE, sessions.length)}/{sessions.length}
        </Text>
      )}
    </Box>
  )
}

function formatSessionLabel(session: SessionSummary): string {
  const date = session.timestamp.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date} ${session.title}`
}

function truncateLabel(label: string, maxWidth: number): string {
  if (label.length <= maxWidth) return label
  if (maxWidth <= 3) return label.slice(0, maxWidth)
  return `${label.slice(0, maxWidth - 3)}...`
}
