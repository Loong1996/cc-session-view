import { Box, Text, useInput } from "ink"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  isActive: boolean
}

export function SearchBar({ value, onChange, onSubmit, onCancel, isActive }: SearchBarProps) {
  useInput((input, key) => {
    if (!isActive) return

    if (key.escape) {
      onCancel()
      return
    }
    if (key.return) {
      onSubmit()
      return
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1))
      return
    }
    if (input && !key.ctrl && !key.meta) {
      onChange(value + input)
    }
  })

  return (
    <Box>
      <Text color="cyan">Search: </Text>
      <Text>{value}</Text>
      {isActive && <Text color="cyan">|</Text>}
    </Box>
  )
}
