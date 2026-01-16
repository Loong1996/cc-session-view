import { Box, Text, useInput } from "ink"
import type { HelpData, HelpSection } from "../lib/help"

interface HelpOverlayProps {
  helpData: HelpData
  onClose: () => void
}

export function HelpOverlay({ helpData, onClose }: HelpOverlayProps) {
  useInput((input, key) => {
    if (input === "?" || input === "q" || key.escape) {
      onClose()
    }
  })

  const leftSections = helpData.sections.slice(0, 2)
  const rightSections = helpData.sections.slice(2)

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2} paddingY={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          Keyboard Shortcuts
        </Text>
      </Box>
      <Box flexDirection="row">
        <Box flexDirection="column" marginRight={4}>
          {leftSections.map((section) => (
            <HelpSectionBlock key={section.title} section={section} />
          ))}
        </Box>
        <Box>
          <Text dimColor>|</Text>
        </Box>
        <Box flexDirection="column" marginLeft={4}>
          {rightSections.map((section) => (
            <HelpSectionBlock key={section.title} section={section} />
          ))}
        </Box>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Press ? or ESC to close this help</Text>
      </Box>
    </Box>
  )
}

function HelpSectionBlock({ section }: { section: HelpSection }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">
        {section.title}
      </Text>
      <Text dimColor>{"-".repeat(30)}</Text>
      {section.bindings.map((binding) => (
        <Box key={binding.key}>
          <Box width={18}>
            <Text color="green">{binding.key}</Text>
          </Box>
          <Text>{binding.description}</Text>
        </Box>
      ))}
    </Box>
  )
}
