import { useEffect, useState } from "react"

const STORAGE_KEY = "agent-session-view:toggles"

interface TogglesState {
  showSystemMessages: boolean
  showThinkingMessages: boolean
  showToolMessages: boolean
  includeSkillFullContent: boolean
  showContextSummary: boolean
  showStats: boolean
  embedFonts: boolean
}

const DEFAULTS: TogglesState = {
  showSystemMessages: false,
  showThinkingMessages: false,
  showToolMessages: false,
  includeSkillFullContent: false,
  showContextSummary: false,
  showStats: false,
  embedFonts: false,
}

function readStorage(): TogglesState {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<TogglesState>
    return { ...DEFAULTS, ...parsed }
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return DEFAULTS
  }
}

function writeStorage(state: TogglesState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function useTogglesState(): [TogglesState, (patch: Partial<TogglesState>) => void] {
  // SSR-safe: first render uses defaults, mount hydrates from storage
  const [state, setState] = useState<TogglesState>(DEFAULTS)

  useEffect(() => {
    setState(readStorage())
  }, [])

  function update(patch: Partial<TogglesState>) {
    setState((prev) => {
      const next = { ...prev, ...patch }
      writeStorage(next)
      return next
    })
  }

  return [state, update]
}
