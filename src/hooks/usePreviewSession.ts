import { useEffect, useRef, useState } from "react"
import { loadClaudeCodeSession } from "../lib/claude-code-parser"
import { loadCodexSession } from "../lib/codex-parser"
import type { SessionDetail, SessionSummary } from "../lib/types"

const DEBOUNCE_MS = 150

export function usePreviewSession(selectedSummary: SessionSummary | null) {
  const [previewSession, setPreviewSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadedPath = useRef<string | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!selectedSummary) {
      setPreviewSession(null)
      setLoading(false)
      lastLoadedPath.current = null
      return
    }

    if (lastLoadedPath.current === selectedSummary.filePath && previewSession) {
      setLoading(false)
      return
    }

    setLoading(true)

    timeoutRef.current = setTimeout(async () => {
      try {
        const detail =
          selectedSummary.agentType === "claude-code"
            ? await loadClaudeCodeSession(selectedSummary.filePath)
            : await loadCodexSession(selectedSummary.filePath)

        if (detail) {
          setPreviewSession(detail)
          lastLoadedPath.current = selectedSummary.filePath
        }
      } catch (e) {
        console.error("Failed to load preview:", e)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [selectedSummary?.filePath, previewSession, selectedSummary])

  return { previewSession, loading }
}
