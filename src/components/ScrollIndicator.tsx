import { Box, Text } from "ink"

interface ScrollIndicatorProps {
  current: number
  total: number
  pageSize: number
  width?: number
}

export function ScrollIndicator({ current, total, pageSize, width = 40 }: ScrollIndicatorProps) {
  const percentage = total > 0 ? Math.round(((current + pageSize) / total) * 100) : 0
  const clamped = Math.min(percentage, 100)
  const filledWidth = Math.round((width * clamped) / 100)
  const emptyWidth = Math.max(0, width - filledWidth)

  return (
    <Box>
      <Text color="cyan">{"=".repeat(filledWidth)}</Text>
      <Text dimColor>{"-".repeat(emptyWidth)}</Text>
      <Text dimColor> {clamped}%</Text>
    </Box>
  )
}
