import { Box, Text, useInput } from "ink"
import { useMemo, useState } from "react"
import type { DateFilter } from "../lib/types"

interface DateFilterMenuProps {
  current: DateFilter
  onSelect: (filter: DateFilter) => void
  onCancel: () => void
  isActive?: boolean
}

const options: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "all", label: "All Time" },
]

export function DateFilterMenu({
  current,
  onSelect,
  onCancel,
  isActive = true,
}: DateFilterMenuProps) {
  const initialIndex = useMemo(
    () =>
      Math.max(
        0,
        options.findIndex((option) => option.value === current),
      ),
    [current],
  )
  const [index, setIndex] = useState(initialIndex)

  useInput((input, key) => {
    if (!isActive) return
    if (key.escape) {
      onCancel()
      return
    }
    if (key.upArrow || input === "k") {
      setIndex((prev) => Math.max(0, prev - 1))
      return
    }
    if (key.downArrow || input === "j") {
      setIndex((prev) => Math.min(options.length - 1, prev + 1))
      return
    }
    if (key.return) {
      const opt = options[index]
      if (opt) onSelect(opt.value)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1} paddingY={0}>
      <Text bold color="cyan">
        Date Filter
      </Text>
      {options.map((option, i) => (
        <Text key={option.value} color={i === index ? "cyan" : undefined}>
          {i === index ? ">" : " "} ({option.value === current ? "x" : " "}) {option.label}
        </Text>
      ))}
      <Text dimColor>[Up/Down] Navigate [Enter] Select [ESC] Cancel</Text>
    </Box>
  )
}
