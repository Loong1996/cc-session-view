import { beforeEach, describe, expect, test } from "bun:test"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement } from "react"
import { SessionDetailView } from "./SessionDetailView"

const noop = () => {}

const makeSession = () => ({
  id: "sess-abc",
  agentType: "claude-code",
  filePath: "/tmp/sess.jsonl",
  timestamp: "2024-01-15T10:00:00Z",
  messages: [
    { type: "thinking" as const, content: "internal reasoning" },
    { type: "user" as const, content: "Hello" },
    { type: "assistant" as const, content: "Hi there" },
  ],
})

function renderView() {
  return render(
    createElement(SessionDetailView, {
      session: makeSession(),
      loading: false,
      onExport: noop,
    }),
  )
}

function getChip(container: HTMLElement, label: RegExp) {
  const btns = container.querySelectorAll<HTMLButtonElement>("button.toggle-chip")
  for (const btn of btns) {
    if (label.test(btn.textContent ?? "")) return btn
  }
  return null
}

beforeEach(() => {
  localStorage.clear()
  cleanup()
})

describe("SessionDetailView toggle persistence", () => {
  test("thinking chip is inactive by default", () => {
    const { container } = renderView()
    const chip = getChip(container, /thinking/i)
    expect(chip).not.toBeNull()
    expect(chip!.className).not.toContain("active")
  })

  test("clicking Thinking chip marks it active", async () => {
    const { container } = renderView()
    const chip = getChip(container, /thinking/i)!
    await act(async () => {
      fireEvent.click(chip)
    })
    expect(chip.className).toContain("active")
  })

  test("toggle state persists across unmount and remount", async () => {
    const { container, unmount } = renderView()

    await act(async () => {
      fireEvent.click(getChip(container, /thinking/i)!)
    })

    unmount()
    cleanup()

    const { container: c2 } = renderView()
    // flush useEffect that reads localStorage
    await act(async () => {})

    const chip2 = getChip(c2, /thinking/i)!
    expect(chip2.className).toContain("active")
  })

  test("embedFonts checkbox persists across unmount and remount", async () => {
    const { container, unmount } = renderView()

    const checkbox = container.querySelector<HTMLInputElement>("input[type=checkbox]")!
    expect(checkbox.checked).toBe(false)

    await act(async () => {
      fireEvent.click(checkbox)
    })
    expect(checkbox.checked).toBe(true)

    unmount()
    cleanup()

    const { container: c2 } = renderView()
    await act(async () => {})

    const restored = c2.querySelector<HTMLInputElement>("input[type=checkbox]")!
    expect(restored.checked).toBe(true)
  })

  test("multiple toggles persist independently", async () => {
    const { container, unmount } = renderView()

    await act(async () => {
      fireEvent.click(getChip(container, /thinking/i)!)
      fireEvent.click(getChip(container, /tools/i)!)
    })

    unmount()
    cleanup()

    const { container: c2 } = renderView()
    await act(async () => {})

    expect(getChip(c2, /thinking/i)!.className).toContain("active")
    expect(getChip(c2, /tools/i)!.className).toContain("active")
    expect(getChip(c2, /system/i)!.className).not.toContain("active")
  })
})
