import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

import { BranchDetailView } from "./components/BranchDetailView"
import { ExportAllBar } from "./components/ExportAllBar"
import { SearchFilterBar } from "./components/SearchFilterBar"
import { SessionDetailView } from "./components/SessionDetailView"
import { SessionListView } from "./components/SessionListView"
import { TabBar } from "./components/TabBar"

type AgentType = "claude-code" | "codex"
type DateFilter = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "all"

const DATE_FILTERS: DateFilter[] = [
  "today",
  "yesterday",
  "this-week",
  "last-week",
  "this-month",
  "all",
]

interface UrlState {
  agentType: AgentType
  sessionId: string | null
  searchQuery: string
  dateFilter: DateFilter
  projectFilter: string | null
  valid: boolean
}

// URL解析関数
function parseUrl(pathname: string, search: string): UrlState {
  const parts = pathname.split("/").filter(Boolean)
  const params = new URLSearchParams(search)

  // Parse query parameters
  const searchQuery = params.get("q") || ""
  const dateParam = params.get("date")
  const dateFilter: DateFilter =
    dateParam && DATE_FILTERS.includes(dateParam as DateFilter) ? (dateParam as DateFilter) : "all"
  const projectFilter = params.get("project") || null

  if (parts[0] === "codex") {
    const sessionId = parts[1] ? decodeURIComponent(parts[1]) : null
    return { agentType: "codex", sessionId, searchQuery, dateFilter, projectFilter, valid: true }
  }
  if (parts[0] === "claude" || parts.length === 0) {
    const sessionId = parts[1] ? decodeURIComponent(parts[1]) : null
    return {
      agentType: "claude-code",
      sessionId,
      searchQuery,
      dateFilter,
      projectFilter,
      valid: true,
    }
  }
  return {
    agentType: "claude-code",
    sessionId: null,
    searchQuery,
    dateFilter,
    projectFilter,
    valid: false,
  }
}

// Build URL with query parameters
function buildUrl(
  agentType: AgentType,
  sessionId: string | null,
  searchQuery: string,
  dateFilter: DateFilter,
  projectFilter: string | null,
): string {
  const base = agentType === "codex" ? "/codex" : "/claude"
  const path = sessionId ? `${base}/${encodeURIComponent(sessionId)}` : base

  const params = new URLSearchParams()
  if (searchQuery) params.set("q", searchQuery)
  if (dateFilter !== "all") params.set("date", dateFilter)
  if (projectFilter) params.set("project", projectFilter)

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

// URL更新関数（履歴に追加）
function navigateTo(
  agentType: AgentType,
  sessionId: string | null,
  searchQuery = "",
  dateFilter: DateFilter = "all",
  projectFilter: string | null = null,
) {
  const url = buildUrl(agentType, sessionId, searchQuery, dateFilter, projectFilter)
  history.pushState({ agentType, sessionId, searchQuery, dateFilter, projectFilter }, "", url)
}

// URL同期関数（履歴に追加しない）
function syncUrl(
  agentType: AgentType,
  sessionId: string | null,
  searchQuery = "",
  dateFilter: DateFilter = "all",
  projectFilter: string | null = null,
) {
  const url = buildUrl(agentType, sessionId, searchQuery, dateFilter, projectFilter)
  history.replaceState({ agentType, sessionId, searchQuery, dateFilter, projectFilter }, "", url)
}

interface SessionSummary {
  id: string
  agentType: string
  filePath: string
  title: string
  timestamp: string
  cwd?: string
  gitBranch?: string
}

interface SessionDetail {
  id: string
  agentType: string
  filePath: string
  timestamp: string
  cwd?: string
  gitBranch?: string
  version?: string
  model?: string
  messages: Message[]
}

interface Message {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSystemMessage?: boolean
}

interface Project {
  path: string
  count: number
}

interface BranchMessage {
  type: "user" | "assistant" | "tool_use" | "tool_result" | "thinking"
  content: string
  timestamp?: string
  toolName?: string
  toolId?: string
  isSystemMessage?: boolean
  sessionId: string
  sessionAgentType: AgentType
  sessionTimestamp: string
  sessionIndex: number
}

interface BranchSessionsData {
  branchName: string
  sessions: Array<{
    id: string
    agentType: AgentType
    timestamp: string
    cwd?: string
  }>
  messages: BranchMessage[]
}

function App() {
  const [activeTab, setActiveTab] = useState<AgentType>("claude-code")
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [counts, setCounts] = useState({ claudeCode: 0, codex: 0 })
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // Branch view state
  const [viewMode, setViewMode] = useState<"session" | "branch">("session")
  const [branchData, setBranchData] = useState<BranchSessionsData | null>(null)
  const [branchLoading, setBranchLoading] = useState(false)
  const [currentBranchName, setCurrentBranchName] = useState<string>("")

  // Export all state
  const [exportAllStatus, setExportAllStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  )
  const [exportAllResult, setExportAllResult] = useState<{
    directory: string
    totalCount: number
    exportedCount: number
    errors: Array<{ sessionId: string; error: string }>
  } | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [projectFilter, setProjectFilter] = useState<string | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        agent: activeTab,
        search: searchQuery,
        date: dateFilter,
      })
      if (projectFilter) {
        params.set("project", projectFilter)
      }

      const res = await fetch(`/api/sessions?${params}`)
      const data = await res.json()
      setSessions(data.sessions)
      setCounts(data.counts)
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery, dateFilter, projectFilter])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?agent=${activeTab}`)
      const data = await res.json()
      setProjects(data.projects)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    }
  }, [activeTab])

  // Fetch session detail
  const fetchSessionDetail = useCallback(async (session: SessionSummary) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/sessions/${session.agentType}/${session.id}`)
      const data = await res.json()
      setSessionDetail(data.session)
    } catch (error) {
      console.error("Failed to fetch session detail:", error)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // URL-based initialization and popstate handling
  useEffect(() => {
    const urlState = parseUrl(window.location.pathname, window.location.search)

    // Redirect invalid paths
    if (!urlState.valid) {
      syncUrl(
        "claude-code",
        null,
        urlState.searchQuery,
        urlState.dateFilter,
        urlState.projectFilter,
      )
    }

    setActiveTab(urlState.agentType)
    setSearchQuery(urlState.searchQuery)
    setDateFilter(urlState.dateFilter)
    setProjectFilter(urlState.projectFilter)

    if (urlState.sessionId) {
      const session = { id: urlState.sessionId, agentType: urlState.agentType } as SessionSummary
      setSelectedSession(session)
      fetchSessionDetail(session)
    }

    const handlePopState = () => {
      const newState = parseUrl(window.location.pathname, window.location.search)
      setActiveTab(newState.agentType)
      setSearchQuery(newState.searchQuery)
      setDateFilter(newState.dateFilter)
      setProjectFilter(newState.projectFilter)

      if (newState.sessionId) {
        const session = { id: newState.sessionId, agentType: newState.agentType } as SessionSummary
        setSelectedSession(session)
        fetchSessionDetail(session)
      } else {
        setSelectedSession(null)
        setSessionDetail(null)
      }
      // Reset branch view on navigation
      setViewMode("session")
      setBranchData(null)
      setCurrentBranchName("")
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [fetchSessionDetail])

  // Effects
  useEffect(() => {
    fetchSessions()
    fetchProjects()
  }, [fetchSessions, fetchProjects])

  // Handle session selection
  const handleSessionSelect = (session: SessionSummary) => {
    setSelectedSession(session)
    fetchSessionDetail(session)
    // Exit branch view when selecting a session
    setViewMode("session")
    setBranchData(null)
    setCurrentBranchName("")
    // Update URL (preserve current filters)
    navigateTo(session.agentType as AgentType, session.id, searchQuery, dateFilter, projectFilter)
  }

  // Handle tab change
  const handleTabChange = (tab: AgentType) => {
    setActiveTab(tab)
    setSelectedSession(null)
    setSessionDetail(null)
    setProjectFilter(null)
    // Update URL (reset project filter, keep search and date)
    navigateTo(tab, null, searchQuery, dateFilter, null)
  }

  // Filter change handlers with URL sync
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    syncUrl(activeTab, selectedSession?.id ?? null, value, dateFilter, projectFilter)
  }

  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value)
    syncUrl(activeTab, selectedSession?.id ?? null, searchQuery, value, projectFilter)
  }

  const handleProjectFilterChange = (value: string | null) => {
    setProjectFilter(value)
    syncUrl(activeTab, selectedSession?.id ?? null, searchQuery, dateFilter, value)
  }

  // Handle branch click
  // Always fetch all agents' data, filtering is done in BranchDetailView
  const handleBranchClick = async (branchName: string) => {
    setBranchLoading(true)
    setViewMode("branch")
    setCurrentBranchName(branchName)
    try {
      const params = new URLSearchParams({ name: branchName })
      const res = await fetch(`/api/sessions/branch?${params}`)
      const data = await res.json()
      setBranchData(data)
    } catch (error) {
      console.error("Failed to fetch branch data:", error)
      setBranchData(null)
    } finally {
      setBranchLoading(false)
    }
  }

  // Handle back from branch view
  const handleBackFromBranch = () => {
    setViewMode("session")
    setBranchData(null)
    setCurrentBranchName("")
  }

  // Handle export
  interface ExportOptions {
    includeUser: boolean
    includeAssistant: boolean
    includeToolUse: boolean
    includeThinking: boolean
    includeSystemMessages: boolean
    includeSkillFullContent: boolean
  }

  const handleExport = async (format: "html" | "text" | "markdown", options: ExportOptions) => {
    if (!selectedSession) return

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedSession.agentType,
          sessionId: selectedSession.id,
          format,
          options,
        }),
      })

      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "html" ? "html" : format === "markdown" ? "md" : "txt"
      const dateStr = (sessionDetail?.timestamp ?? selectedSession.timestamp ?? "").slice(0, 10)
      a.download = `${selectedSession.agentType}--${dateStr}--${selectedSession.id}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed")
    }
  }

  // Handle export all sessions
  const handleExportAll = async (format: "html" | "text" | "markdown") => {
    setExportAllStatus("loading")
    setExportAllResult(null)
    try {
      const res = await fetch("/api/export/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      })
      if (!res.ok) throw new Error("Export failed")
      const result = await res.json()
      setExportAllResult(result)
      setExportAllStatus("success")
    } catch {
      setExportAllStatus("error")
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">Agent Session Viewer</div>
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} counts={counts} />
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            dateFilter={dateFilter}
            onDateFilterChange={handleDateFilterChange}
            projects={projects}
            projectFilter={projectFilter}
            onProjectFilterChange={handleProjectFilterChange}
          />
          <ExportAllBar
            onExportAll={handleExportAll}
            status={exportAllStatus}
            result={exportAllResult}
          />
          <SessionListView
            sessions={sessions}
            selectedSession={selectedSession}
            onSessionSelect={handleSessionSelect}
            loading={loading}
          />
        </aside>

        <section className="content">
          {viewMode === "branch" ? (
            <BranchDetailView
              branchName={currentBranchName}
              data={branchData}
              loading={branchLoading}
              onBack={handleBackFromBranch}
              currentAgentType={activeTab}
            />
          ) : selectedSession && sessionDetail ? (
            <SessionDetailView
              session={sessionDetail}
              loading={detailLoading}
              onExport={handleExport}
              onBranchClick={handleBranchClick}
            />
          ) : (
            <div className="placeholder">
              <h2>Select a session</h2>
              <p>Choose a session from the list on the left to view details</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const container = document.getElementById("root")
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
