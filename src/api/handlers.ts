import { listClaudeCodeSessions, loadClaudeCodeSession } from "../lib/claude-code-parser"
import { listCodexSessions, loadCodexSession } from "../lib/codex-parser"
import { exportToHtml, exportToText } from "../lib/exporter"
import { extractProjects, filterSessions } from "../lib/filter"
import type {
  AgentType,
  DateFilter,
  ExportOptions,
  FilterState,
  SessionSummary,
} from "../lib/types"

// Cache for sessions
let sessionsCache: {
  claudeCode: SessionSummary[]
  codex: SessionSummary[]
  lastFetch: number
} | null = null

const CACHE_TTL = 5000 // 5 seconds

async function getAllSessions(): Promise<{
  claudeCode: SessionSummary[]
  codex: SessionSummary[]
}> {
  const now = Date.now()
  if (sessionsCache && now - sessionsCache.lastFetch < CACHE_TTL) {
    return sessionsCache
  }

  const [claudeCode, codex] = await Promise.all([listClaudeCodeSessions(), listCodexSessions()])

  sessionsCache = { claudeCode, codex, lastFetch: now }
  return sessionsCache
}

export const apiHandlers = {
  /** GET /api/sessions */
  async getSessions(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const agent = url.searchParams.get("agent") as AgentType | null
    const search = url.searchParams.get("search") || ""
    const date = (url.searchParams.get("date") || "all") as DateFilter
    const project = url.searchParams.get("project") || null

    const allSessions = await getAllSessions()

    let sessions: SessionSummary[]
    if (agent === "claude-code") {
      sessions = allSessions.claudeCode
    } else if (agent === "codex") {
      sessions = allSessions.codex
    } else {
      // Return both with agent type info
      sessions = [...allSessions.claudeCode, ...allSessions.codex].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )
    }

    // Apply filters
    const filterState: FilterState = {
      searchQuery: search,
      dateFilter: date,
      projectPath: project,
    }
    const filtered = filterSessions(sessions, filterState)

    // Serialize for JSON
    const serialized = filtered.map((s) => ({
      ...s,
      timestamp: s.timestamp.toISOString(),
    }))

    return Response.json({
      sessions: serialized,
      counts: {
        claudeCode: allSessions.claudeCode.length,
        codex: allSessions.codex.length,
      },
    })
  },

  /** GET /api/sessions/:agentType/:sessionId */
  async getSessionDetail(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const pathParts = url.pathname.split("/")
    const agentType = pathParts[3] as AgentType
    const sessionId = pathParts[4]

    if (!agentType || !sessionId) {
      return Response.json({ error: "Missing agentType or sessionId" }, { status: 400 })
    }

    // Find session file path
    const allSessions = await getAllSessions()
    const sessions = agentType === "claude-code" ? allSessions.claudeCode : allSessions.codex
    const sessionSummary = sessions.find((s) => s.id === sessionId)

    if (!sessionSummary) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    // Load full session
    const session =
      agentType === "claude-code"
        ? await loadClaudeCodeSession(sessionSummary.filePath)
        : await loadCodexSession(sessionSummary.filePath)

    if (!session) {
      return Response.json({ error: "Failed to load session" }, { status: 500 })
    }

    // Serialize for JSON
    const serialized = {
      ...session,
      timestamp: session.timestamp.toISOString(),
      messages: session.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp?.toISOString(),
      })),
    }

    return Response.json({ session: serialized })
  },

  /** GET /api/projects */
  async getProjects(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const agent = url.searchParams.get("agent") as AgentType | null

    const allSessions = await getAllSessions()

    let sessions: SessionSummary[]
    if (agent === "claude-code") {
      sessions = allSessions.claudeCode
    } else if (agent === "codex") {
      sessions = allSessions.codex
    } else {
      sessions = [...allSessions.claudeCode, ...allSessions.codex]
    }

    const projects = extractProjects(sessions)
    return Response.json({ projects })
  },

  /** POST /api/export */
  async exportSession(req: Request): Promise<Response> {
    try {
      const body = await req.json()
      const { agentType, sessionId, format, options } = body as {
        agentType: AgentType
        sessionId: string
        format: "html" | "text"
        options?: Partial<ExportOptions>
      }

      if (!agentType || !sessionId || !format) {
        return Response.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Find session file path
      const allSessions = await getAllSessions()
      const sessions = agentType === "claude-code" ? allSessions.claudeCode : allSessions.codex
      const sessionSummary = sessions.find((s) => s.id === sessionId)

      if (!sessionSummary) {
        return Response.json({ error: "Session not found" }, { status: 404 })
      }

      // Load full session
      const session =
        agentType === "claude-code"
          ? await loadClaudeCodeSession(sessionSummary.filePath)
          : await loadCodexSession(sessionSummary.filePath)

      if (!session) {
        return Response.json({ error: "Failed to load session" }, { status: 500 })
      }

      // Merge export options
      const exportOptions: ExportOptions = {
        includeUser: options?.includeUser ?? true,
        includeAssistant: options?.includeAssistant ?? true,
        includeToolUse: options?.includeToolUse ?? false,
        includeThinking: options?.includeThinking ?? false,
      }

      // Export
      const content =
        format === "html"
          ? exportToHtml(session, exportOptions)
          : exportToText(session, exportOptions)

      const contentType = format === "html" ? "text/html" : "text/plain"
      const filename = `session-${sessionId.slice(0, 8)}.${format === "html" ? "html" : "txt"}`

      return new Response(content, {
        headers: {
          "Content-Type": `${contentType}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error("Export error:", error)
      return Response.json({ error: "Export failed" }, { status: 500 })
    }
  },
}
