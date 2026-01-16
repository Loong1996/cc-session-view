import { Box, Text } from "ink"

interface FooterProps {
  hint: string
  statusMessage?: string | null
}

export function Footer({ hint, statusMessage }: FooterProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {statusMessage && (
        <Box>
          <Text color="green">{statusMessage}</Text>
        </Box>
      )}
      <Box>
        <Text dimColor>{hint}</Text>
      </Box>
    </Box>
  )
}
