import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

import { SearchFilterBar } from "./components/SearchFilterBar"
import { SessionDetailView } from "./components/SessionDetailView"
import { SessionListView } from "./components/SessionListView"
import { TabBar } from "./components/TabBar"

type AgentType = "claude-code" | "codex"
type DateFilter = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "all"

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
}

interface Project {
  path: string
  count: number
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

  // Effects
  useEffect(() => {
    fetchSessions()
    fetchProjects()
  }, [fetchSessions, fetchProjects])

  // Handle session selection
  const handleSessionSelect = (session: SessionSummary) => {
    setSelectedSession(session)
    fetchSessionDetail(session)
  }

  // Handle tab change
  const handleTabChange = (tab: AgentType) => {
    setActiveTab(tab)
    setSelectedSession(null)
    setSessionDetail(null)
    setProjectFilter(null)
  }

  // Handle export
  const handleExport = async (format: "html" | "text") => {
    if (!selectedSession) return

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedSession.agentType,
          sessionId: selectedSession.id,
          format,
          options: {
            includeUser: true,
            includeAssistant: true,
            includeToolUse: true,
            includeThinking: false,
          },
        }),
      })

      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `session-${selectedSession.id.slice(0, 8)}.${format === "html" ? "html" : "txt"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed")
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
            onSearchChange={setSearchQuery}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            projects={projects}
            projectFilter={projectFilter}
            onProjectFilterChange={setProjectFilter}
          />
          <SessionListView
            sessions={sessions}
            selectedSession={selectedSession}
            onSessionSelect={handleSessionSelect}
            loading={loading}
          />
        </aside>

        <section className="content">
          {selectedSession && sessionDetail ? (
            <SessionDetailView
              session={sessionDetail}
              loading={detailLoading}
              onExport={handleExport}
            />
          ) : (
            <div className="placeholder">
              <h2>セッションを選択してください</h2>
              <p>左のリストからセッションを選択すると、詳細が表示されます</p>
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
