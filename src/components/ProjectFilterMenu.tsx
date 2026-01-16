import { Box, Text, useInput } from "ink"
import { useMemo, useState } from "react"

interface ProjectEntry {
  path: string
  count: number
}

interface ProjectFilterMenuProps {
  current: string | null
  projects: ProjectEntry[]
  onSelect: (projectPath: string | null) => void
  onCancel: () => void
  isActive?: boolean
}

export function ProjectFilterMenu({
  current,
  projects,
  onSelect,
  onCancel,
  isActive = true,
}: ProjectFilterMenuProps) {
  const items = useMemo(() => [{ path: "__all__", count: 0 }, ...projects], [projects])
  const initialIndex = useMemo(() => {
    if (current === null) return 0
    const idx = items.findIndex((item) => item.path === current)
    return idx === -1 ? 0 : idx
  }, [current, items])

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
      setIndex((prev) => Math.min(items.length - 1, prev + 1))
      return
    }
    if (key.return) {
      const selected = items[index]
      if (selected) onSelect(selected.path === "__all__" ? null : selected.path)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1} paddingY={0}>
      <Text bold color="cyan">
        Project Filter
      </Text>
      {items.map((item, i) => {
        const label = item.path === "__all__" ? "All Projects" : `${item.path} (${item.count})`
        const selected = item.path === "__all__" ? current === null : current === item.path
        return (
          <Text key={item.path} color={i === index ? "cyan" : undefined}>
            {i === index ? ">" : " "} ({selected ? "x" : " "}) {label}
          </Text>
        )
      })}
      <Text dimColor>[Up/Down] Navigate [Enter] Select [ESC] Cancel</Text>
    </Box>
  )
}
