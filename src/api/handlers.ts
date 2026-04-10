import { mkdir } from "node:fs/promises"
import { listClaudeCodeSessions, loadClaudeCodeSession } from "../lib/claude-code-parser"
import { listCodexSessions, loadCodexSession } from "../lib/codex-parser"
import {
  type BranchSession,
  exportBranchToHtml,
  exportBranchToMarkdown,
  exportBranchToText,
  exportToHtml,
  exportToMarkdown,
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
import { defaultExportOptions } from "../lib/types"

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
        format: "html" | "text" | "markdown"
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
        includeSkillFullContent: options?.includeSkillFullContent ?? false,
        includeContextSummary: options?.includeContextSummary ?? false,
      }

      // Export
      const content =
        format === "html"
          ? exportToHtml(session, exportOptions)
          : format === "markdown"
            ? exportToMarkdown(session, exportOptions)
            : exportToText(session, exportOptions)

      const contentType =
        format === "html" ? "text/html" : format === "markdown" ? "text/markdown" : "text/plain"
      const ext = format === "html" ? "html" : format === "markdown" ? "md" : "txt"
      const dateStr = session.timestamp.toISOString().slice(0, 10)
      const filename = `${agentType}--${dateStr}--${sessionId}.${ext}`

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

  /** POST /api/export/all */
  async exportAllSessions(req: Request): Promise<Response> {
    try {
      const body = await req.json()
      const { format, options } = body as {
        format: "html" | "text" | "markdown"
        options?: Partial<ExportOptions>
      }

      if (!format) {
        return Response.json({ error: "Missing format" }, { status: 400 })
      }

      const allSessions = await getAllSessions()
      const allList: SessionSummary[] = [...allSessions.claudeCode, ...allSessions.codex]

      // Create output directory
      const now = new Date()
      const dirTimestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14)
      const exportDir = `./exported/all-sessions-${dirTimestamp}`
      await mkdir(exportDir, { recursive: true })

      const exportOptions: ExportOptions = {
        ...defaultExportOptions,
        ...options,
      }

      const ext = format === "html" ? "html" : format === "markdown" ? "md" : "txt"
      const errors: Array<{ sessionId: string; error: string }> = []
      let exportedCount = 0

      // Collect unique project subdirectories and create them upfront
      const projectDirs = new Set<string>()
      for (const s of allList) {
        projectDirs.add(cwdToSubdir(s.cwd))
      }
      await Promise.all(
        [...projectDirs].map((sub) => mkdir(`${exportDir}/${sub}`, { recursive: true })),
      )

      // Process in batches of 10
      const BATCH_SIZE = 10
      for (let i = 0; i < allList.length; i += BATCH_SIZE) {
        const batch = allList.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (s) => {
            try {
              const session =
                s.agentType === "claude-code"
                  ? await loadClaudeCodeSession(s.filePath)
                  : await loadCodexSession(s.filePath)

              if (!session) {
                errors.push({ sessionId: s.id, error: "Failed to load session" })
                return
              }

              const content =
                format === "html"
                  ? exportToHtml(session, exportOptions)
                  : format === "markdown"
                    ? exportToMarkdown(session, exportOptions)
                    : exportToText(session, exportOptions)

              const dateStr = s.timestamp.toISOString().slice(0, 10)
              const filename = `${s.agentType}--${dateStr}--${s.id}.${ext}`
              const subdir = cwdToSubdir(s.cwd)
              await Bun.write(`${exportDir}/${subdir}/${filename}`, content)
              exportedCount++
            } catch (e) {
              errors.push({
                sessionId: s.id,
                error: e instanceof Error ? e.message : "Unknown error",
              })
            }
          }),
        )
      }

      return Response.json({
        directory: exportDir,
        totalCount: allList.length,
        exportedCount,
        errors,
      })
    } catch (error) {
      console.error("Export all error:", error)
      return Response.json({ error: "Export all failed" }, { status: 500 })
    }
  },

  /** POST /api/export/branch */
  async exportBranch(req: Request): Promise<Response> {
    try {
      const body = await req.json()
      const { branchName, agentType, format, options } = body as {
        branchName: string
        agentType?: AgentType
        format: "html" | "text" | "markdown"
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
        includeSkillFullContent: options?.includeSkillFullContent ?? false,
        includeContextSummary: options?.includeContextSummary ?? false,
      }

      // Export
      const content =
        format === "html"
          ? exportBranchToHtml(branchName, branchSessions, sortedMessages, exportOptions)
          : format === "markdown"
            ? exportBranchToMarkdown(branchName, branchSessions, sortedMessages, exportOptions)
            : exportBranchToText(branchName, branchSessions, sortedMessages, exportOptions)

      // Sanitize branch name for filename
      const safeBranchName = branchName.replace(/[/\\?%*:|"<>]/g, "-")
      const contentType =
        format === "html" ? "text/html" : format === "markdown" ? "text/markdown" : "text/plain"
      const ext = format === "html" ? "html" : format === "markdown" ? "md" : "txt"
      const filename = `branch-${safeBranchName}.${ext}`

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

/** Convert session cwd to a safe subdirectory name for export */
function cwdToSubdir(cwd: string | undefined): string {
  if (!cwd) return "_unknown"
  // Use the last directory component as the project name, sanitize for filesystem
  const parts = cwd.split("/").filter(Boolean)
  const projectName = parts[parts.length - 1] || "_unknown"
  return projectName.replace(/[/\\?%*:|"<>]/g, "-")
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
