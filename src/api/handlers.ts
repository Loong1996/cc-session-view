import { listClaudeCodeSessions, loadClaudeCodeSession } from "../lib/claude-code-parser"
import { listCodexSessions, loadCodexSession } from "../lib/codex-parser"
import {
  type BranchSession,
  exportBranchToHtml,
  exportBranchToText,
  exportToHtml,
  exportToText,
} from "../lib/exporter"
import { extractProjects, filterSessions } from "../lib/filter"
import type {
  AgentType,
  BranchMessage,
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
        includeSystemMessages: options?.includeSystemMessages ?? false,
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

  /** GET /api/sessions/branch?name=<branchName>&agent=<agentType> */
  async getSessionsByBranch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const branchName = url.searchParams.get("name")
    const agent = url.searchParams.get("agent") as AgentType | null

    if (!branchName) {
      return Response.json({ error: "Missing branch name" }, { status: 400 })
    }

    const allSessions = await getAllSessions()

    // Filter sessions by branch name and optionally by agent type
    const matchingSessions: SessionSummary[] = []
    if (!agent || agent === "claude-code") {
      matchingSessions.push(...allSessions.claudeCode.filter((s) => s.gitBranch === branchName))
    }
    if (!agent || agent === "codex") {
      matchingSessions.push(...allSessions.codex.filter((s) => s.gitBranch === branchName))
    }

    // Sort by timestamp (newest first for sessions list)
    matchingSessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Load session details in parallel
    const sessionDetails = await Promise.all(
      matchingSessions.map(async (s) => {
        const detail =
          s.agentType === "claude-code"
            ? await loadClaudeCodeSession(s.filePath)
            : await loadCodexSession(s.filePath)
        return { summary: s, detail }
      }),
    )

    // Build branch messages with session context
    const branchMessages: BranchMessage[] = []
    for (const { summary, detail } of sessionDetails) {
      if (!detail) continue

      detail.messages.forEach((msg, i) => {
        branchMessages.push({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          toolName: msg.toolName,
          toolId: msg.toolId,
          isSystemMessage: msg.isSystemMessage,
          sessionId: summary.id,
          sessionAgentType: summary.agentType,
          sessionTimestamp: summary.timestamp,
          sessionIndex: i,
        })
      })
    }

    // Sort messages by time with multi-level tiebreaker
    const sortedMessages = sortBranchMessages(branchMessages)

    // Serialize for JSON
    const serialized = {
      branchName,
      sessions: matchingSessions.map((s) => ({
        id: s.id,
        agentType: s.agentType,
        timestamp: s.timestamp.toISOString(),
        cwd: s.cwd,
      })),
      messages: sortedMessages.map((m) => ({
        ...m,
        timestamp: m.timestamp?.toISOString(),
        sessionTimestamp: m.sessionTimestamp.toISOString(),
      })),
    }

    return Response.json(serialized)
  },

  /** POST /api/export/branch */
  async exportBranch(req: Request): Promise<Response> {
    try {
      const body = await req.json()
      const { branchName, agentType, format, options } = body as {
        branchName: string
        agentType?: AgentType
        format: "html" | "text"
        options?: Partial<ExportOptions>
      }

      if (!branchName || !format) {
        return Response.json({ error: "Missing required fields" }, { status: 400 })
      }

      const allSessions = await getAllSessions()

      // Filter sessions by branch name and optionally by agent type
      const matchingSessions: SessionSummary[] = []
      if (!agentType || agentType === "claude-code") {
        matchingSessions.push(...allSessions.claudeCode.filter((s) => s.gitBranch === branchName))
      }
      if (!agentType || agentType === "codex") {
        matchingSessions.push(...allSessions.codex.filter((s) => s.gitBranch === branchName))
      }

      if (matchingSessions.length === 0) {
        return Response.json({ error: "No sessions found for this branch" }, { status: 404 })
      }

      // Sort by timestamp (oldest first for export)
      matchingSessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      // Load session details in parallel
      const sessionDetails = await Promise.all(
        matchingSessions.map(async (s) => {
          const detail =
            s.agentType === "claude-code"
              ? await loadClaudeCodeSession(s.filePath)
              : await loadCodexSession(s.filePath)
          return { summary: s, detail }
        }),
      )

      // Build branch sessions and messages
      const branchSessions: BranchSession[] = []
      const branchMessages: BranchMessage[] = []

      for (const { summary, detail } of sessionDetails) {
        if (!detail) continue

        branchSessions.push({
          id: summary.id,
          agentType: summary.agentType,
          timestamp: summary.timestamp,
          cwd: summary.cwd,
        })

        detail.messages.forEach((msg, i) => {
          branchMessages.push({
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            toolName: msg.toolName,
            toolId: msg.toolId,
            isSystemMessage: msg.isSystemMessage,
            sessionId: summary.id,
            sessionAgentType: summary.agentType,
            sessionTimestamp: summary.timestamp,
            sessionIndex: i,
          })
        })
      }

      // Sort messages
      const sortedMessages = sortBranchMessages(branchMessages)

      // Merge export options
      const exportOptions: ExportOptions = {
        includeUser: options?.includeUser ?? true,
        includeAssistant: options?.includeAssistant ?? true,
        includeToolUse: options?.includeToolUse ?? false,
        includeThinking: options?.includeThinking ?? false,
        includeSystemMessages: options?.includeSystemMessages ?? false,
      }

      // Export
      const content =
        format === "html"
          ? exportBranchToHtml(branchName, branchSessions, sortedMessages, exportOptions)
          : exportBranchToText(branchName, branchSessions, sortedMessages, exportOptions)

      // Sanitize branch name for filename
      const safeBranchName = branchName.replace(/[/\\?%*:|"<>]/g, "-")
      const contentType = format === "html" ? "text/html" : "text/plain"
      const filename = `branch-${safeBranchName}.${format === "html" ? "html" : "txt"}`

      return new Response(content, {
        headers: {
          "Content-Type": `${contentType}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error("Branch export error:", error)
      return Response.json({ error: "Branch export failed" }, { status: 500 })
    }
  },
}

/** Sort branch messages with multi-level tiebreaker for stable ordering */
function sortBranchMessages(messages: BranchMessage[]): BranchMessage[] {
  return messages.sort((a, b) => {
    // 1. effectiveTimestamp（messageにtimestampがあればそれ、なければsessionTimestamp）
    const aTime = a.timestamp?.getTime() ?? a.sessionTimestamp.getTime()
    const bTime = b.timestamp?.getTime() ?? b.sessionTimestamp.getTime()
    if (aTime !== bTime) return aTime - bTime

    // 2. sessionTimestamp（セッション開始時刻）
    const aSessionTime = a.sessionTimestamp.getTime()
    const bSessionTime = b.sessionTimestamp.getTime()
    if (aSessionTime !== bSessionTime) return aSessionTime - bSessionTime

    // 3. sessionId（安定化のためのタイブレーク）
    if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId)

    // 4. sessionIndex（セッション内順序）
    return a.sessionIndex - b.sessionIndex
  })
}
