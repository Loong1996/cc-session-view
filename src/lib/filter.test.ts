import { describe, expect, test } from "bun:test"
import { extractProjects, filterSessions } from "./filter"
import type { FilterState, SessionSummary } from "./types"

const createSession = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "test-session-id",
  agentType: "claude-code",
  filePath: "/path/to/session.jsonl",
  title: "Test session",
  timestamp: new Date("2024-01-15T10:00:00Z"),
  cwd: "/Users/test/project",
  gitBranch: "main",
  ...overrides,
})

const createFilter = (overrides: Partial<FilterState> = {}): FilterState => ({
  searchQuery: "",
  dateFilter: "all",
  projectPath: null,
  ...overrides,
})

describe("filterSessions", () => {
  describe("searchQuery filter", () => {
    test("returns all sessions when searchQuery is empty", () => {
      const sessions = [createSession({ title: "foo" }), createSession({ title: "bar" })]
      const filter = createFilter()
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(2)
    })

    test("filters by title", () => {
      const sessions = [
        createSession({ title: "fix: bug" }),
        createSession({ title: "feat: new feature" }),
      ]
      const filter = createFilter({ searchQuery: "fix" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("fix: bug")
    })

    test("filters by cwd", () => {
      const sessions = [
        createSession({ cwd: "/Users/test/project-a" }),
        createSession({ cwd: "/Users/test/project-b" }),
      ]
      const filter = createFilter({ searchQuery: "project-a" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
      expect(result[0]?.cwd).toBe("/Users/test/project-a")
    })

    test("filters by gitBranch", () => {
      const sessions = [
        createSession({ gitBranch: "main" }),
        createSession({ gitBranch: "feature/xyz" }),
      ]
      const filter = createFilter({ searchQuery: "feature" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
      expect(result[0]?.gitBranch).toBe("feature/xyz")
    })

    test("search is case-insensitive", () => {
      const sessions = [createSession({ title: "FIX: Important Bug" })]
      const filter = createFilter({ searchQuery: "fix" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
    })

    test("handles sessions without cwd or gitBranch", () => {
      const sessions = [createSession({ title: "hello", cwd: undefined, gitBranch: undefined })]
      const filter = createFilter({ searchQuery: "project" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(0)
    })
  })

  describe("projectPath filter", () => {
    test("returns all sessions when projectPath is null", () => {
      const sessions = [createSession({ cwd: "/path/a" }), createSession({ cwd: "/path/b" })]
      const filter = createFilter({ projectPath: null })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(2)
    })

    test("filters by exact projectPath", () => {
      const sessions = [
        createSession({ cwd: "/Users/test/project-a" }),
        createSession({ cwd: "/Users/test/project-b" }),
      ]
      const filter = createFilter({ projectPath: "/Users/test/project-a" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
      expect(result[0]?.cwd).toBe("/Users/test/project-a")
    })
  })

  describe("dateFilter", () => {
    test("returns all sessions when dateFilter is 'all'", () => {
      const sessions = [
        createSession({ timestamp: new Date("2020-01-01") }),
        createSession({ timestamp: new Date("2024-01-01") }),
      ]
      const filter = createFilter({ dateFilter: "all" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(2)
    })
  })

  describe("combined filters", () => {
    test("applies multiple filters together", () => {
      const sessions = [
        createSession({ title: "fix: bug", cwd: "/path/a" }),
        createSession({ title: "fix: other", cwd: "/path/b" }),
        createSession({ title: "feat: new", cwd: "/path/a" }),
      ]
      const filter = createFilter({ searchQuery: "fix", projectPath: "/path/a" })
      const result = filterSessions(sessions, filter)
      expect(result).toHaveLength(1)
      expect(result[0]?.title).toBe("fix: bug")
    })
  })
})

describe("extractProjects", () => {
  test("returns empty array for empty sessions", () => {
    const result = extractProjects([])
    expect(result).toEqual([])
  })

  test("extracts unique projects with counts", () => {
    const sessions = [
      createSession({ cwd: "/path/a" }),
      createSession({ cwd: "/path/a" }),
      createSession({ cwd: "/path/b" }),
    ]
    const result = extractProjects(sessions)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ path: "/path/a", count: 2 })
    expect(result).toContainEqual({ path: "/path/b", count: 1 })
  })

  test("sorts by count descending", () => {
    const sessions = [
      createSession({ cwd: "/path/a" }),
      createSession({ cwd: "/path/b" }),
      createSession({ cwd: "/path/b" }),
      createSession({ cwd: "/path/b" }),
    ]
    const result = extractProjects(sessions)
    expect(result[0]).toEqual({ path: "/path/b", count: 3 })
    expect(result[1]).toEqual({ path: "/path/a", count: 1 })
  })

  test("ignores sessions without cwd", () => {
    const sessions = [createSession({ cwd: "/path/a" }), createSession({ cwd: undefined })]
    const result = extractProjects(sessions)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ path: "/path/a", count: 1 })
  })
})
