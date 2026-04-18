import { beforeEach, describe, expect, test } from "bun:test"
import { act, renderHook } from "@testing-library/react"
import { useTogglesState } from "./useLocalStorageState"

beforeEach(() => {
  localStorage.clear()
})

describe("useTogglesState", () => {
  test("returns defaults when localStorage is empty", () => {
    const { result } = renderHook(() => useTogglesState())
    // After mount effect runs, state should still be defaults (storage empty)
    const [state] = result.current
    expect(state.showThinkingMessages).toBe(false)
    expect(state.showToolMessages).toBe(false)
    expect(state.showSystemMessages).toBe(false)
    expect(state.includeSkillFullContent).toBe(false)
    expect(state.showContextSummary).toBe(false)
    expect(state.showStats).toBe(false)
    expect(state.embedFonts).toBe(false)
  })

  test("setState writes patch to localStorage", () => {
    const { result } = renderHook(() => useTogglesState())
    act(() => {
      result.current[1]({ showThinkingMessages: true })
    })
    const raw = localStorage.getItem("agent-session-view:toggles")
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw!)
    expect(stored.showThinkingMessages).toBe(true)
  })

  test("re-mount reads back stored value", () => {
    const { result: r1, unmount } = renderHook(() => useTogglesState())
    act(() => {
      r1.current[1]({ showToolMessages: true, embedFonts: true })
    })
    unmount()

    const { result: r2 } = renderHook(() => useTogglesState())
    // Trigger mount effect
    act(() => {})
    const [state] = r2.current
    expect(state.showToolMessages).toBe(true)
    expect(state.embedFonts).toBe(true)
  })

  test("missing fields in storage are filled with defaults", () => {
    // Store only a subset of fields
    localStorage.setItem("agent-session-view:toggles", JSON.stringify({ showStats: true }))
    const { result } = renderHook(() => useTogglesState())
    act(() => {})
    const [state] = result.current
    expect(state.showStats).toBe(true)
    // All other fields fall back to defaults
    expect(state.showThinkingMessages).toBe(false)
    expect(state.embedFonts).toBe(false)
  })

  test("invalid JSON in storage falls back to defaults and clears the key", () => {
    localStorage.setItem("agent-session-view:toggles", "not-json{{{")
    const { result } = renderHook(() => useTogglesState())
    act(() => {})
    const [state] = result.current
    expect(state.showThinkingMessages).toBe(false)
    // Key should have been removed
    expect(localStorage.getItem("agent-session-view:toggles")).toBeNull()
  })

  test("SSR guard: hook initial render (before effect) always returns defaults", () => {
    // The hook uses useState(DEFAULTS) as initial value, then hydrates from
    // localStorage in a useEffect. Before the effect fires, state must be
    // the safe server-renderable defaults regardless of storage content.
    localStorage.setItem("agent-session-view:toggles", JSON.stringify({ embedFonts: true }))

    let stateBeforeEffect: ReturnType<typeof useTogglesState>[0] | null = null
    renderHook(() => {
      const [state] = useTogglesState()
      // Capture on very first synchronous render (before any effect runs)
      if (stateBeforeEffect === null) stateBeforeEffect = state
      return [state]
    })

    // Initial render must be defaults (SSR-safe)
    expect(stateBeforeEffect!.embedFonts).toBe(false)
    expect(stateBeforeEffect!.showThinkingMessages).toBe(false)
  })
})
