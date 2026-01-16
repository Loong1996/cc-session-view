import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { TabSelector } from "./components/TabSelector";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import { SearchBar } from "./components/SearchBar";
import { FilterBar } from "./components/FilterBar";
import { DateFilterMenu } from "./components/DateFilterMenu";
import { ProjectFilterMenu } from "./components/ProjectFilterMenu";
import { SessionPreview } from "./components/SessionPreview";
import { HelpOverlay } from "./components/HelpOverlay";
import { Footer } from "./components/Footer";
import { listClaudeCodeSessions, loadClaudeCodeSession } from "./lib/claude-code-parser";
import { listCodexSessions, loadCodexSession } from "./lib/codex-parser";
import { exportToHtml, exportToText } from "./lib/exporter";
import { filterSessions, extractProjects } from "./lib/filter";
import { useLayout } from "./lib/layout";
import { detailViewHelp, getFooterHint, listViewHelp } from "./lib/help";
import { usePreviewSession } from "./hooks/usePreviewSession";
import type {
  AgentType,
  SessionSummary,
  SessionDetail as SessionDetailType,
  ExportOptions,
  FilterState,
} from "./lib/types";
import { defaultExportOptions, defaultFilterState } from "./lib/types";

type ViewMode = "list" | "detail";

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rows = stdout?.rows ?? 24;
  const contentColumns = Math.max(20, columns - 2);
  const contentRows = Math.max(10, rows - 2);
  const helpHeight = Math.max(1, contentRows);
  const [activeTab, setActiveTab] = useState<AgentType>("claude-code");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [claudeSessions, setClaudeSessions] = useState<SessionSummary[]>([]);
  const [codexSessions, setCodexSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [filterMode, setFilterMode] = useState<"none" | "search" | "date" | "project">("none");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchBackup, setSearchBackup] = useState("");

  const [showHelp, setShowHelp] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [highlightedSession, setHighlightedSession] = useState<SessionSummary | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      setError(null);
      try {
        const [claude, codex] = await Promise.all([
          listClaudeCodeSessions(),
          listCodexSessions(),
        ]);
        setClaudeSessions(claude);
        setCodexSessions(codex);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  const currentSessions = activeTab === "claude-code" ? claudeSessions : codexSessions;
  const filteredSessions = useMemo(
    () => filterSessions(currentSessions, filterState),
    [currentSessions, filterState]
  );
  const projects = useMemo(() => extractProjects(currentSessions), [currentSessions]);

  const layout = useLayout(previewEnabled, contentColumns);
  const { previewSession, loading: previewLoading } = usePreviewSession(highlightedSession);

  useInput((input, key) => {
    if (input === "?") {
      setShowHelp((prev) => !prev);
      return;
    }
    if (showHelp) {
      if (input === "q" || key.escape) {
        setShowHelp(false);
      }
      return;
    }

    if (viewMode === "detail") return;
    if (filterMode !== "none") return;

    if (key.tab) {
      setActiveTab((prev) => (prev === "claude-code" ? "codex" : "claude-code"));
      return;
    }

    if (input === "/") {
      setSearchBackup(filterState.searchQuery);
      setSearchDraft(filterState.searchQuery);
      setFilterMode("search");
      return;
    }

    if (input === "d") {
      setFilterMode("date");
      return;
    }

    if (input === "p") {
      setFilterMode("project");
      return;
    }

    if (key.ctrl && input === "l") {
      setFilterState(defaultFilterState);
      setSearchDraft("");
      setSearchBackup("");
      return;
    }

    if (input === "P") {
      setPreviewEnabled((prev) => !prev);
      return;
    }

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
  });

  async function handleSelectSession(summary: SessionSummary) {
    setLoading(true);
    try {
      const detail =
        summary.agentType === "claude-code"
          ? await loadClaudeCodeSession(summary.filePath)
          : await loadCodexSession(summary.filePath);

      if (detail) {
        setSelectedSession(detail);
        setViewMode("detail");
      } else {
        setError("Failed to load session details");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setViewMode("list");
    setSelectedSession(null);
  }

  async function handleExport(format: "text" | "html") {
    if (!selectedSession) return;

    const content =
      format === "text"
        ? exportToText(selectedSession, exportOptions)
        : exportToHtml(selectedSession, exportOptions);

    const ext = format === "text" ? "txt" : "html";
    const agentName = selectedSession.agentType === "claude-code" ? "claude" : "codex";
    const filename = `session-${agentName}-${selectedSession.id.slice(0, 8)}.${ext}`;
    const exportDir = "./exported";
    const filepath = `${exportDir}/${filename}`;

    try {
      const fs = await import("node:fs/promises");
      await fs.mkdir(exportDir, { recursive: true });

      await Bun.write(filepath, content);
      setStatusMessage(`Exported to ${filepath}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export");
    }
  }

  async function handleViewInBrowser() {
    if (!selectedSession) return;

    const content = exportToHtml(selectedSession, exportOptions);
    const agentName = selectedSession.agentType === "claude-code" ? "claude" : "codex";
    const filename = `session-${agentName}-${selectedSession.id.slice(0, 8)}-${Date.now()}.html`;
    const tmpDir = process.env.TMPDIR || "/tmp";
    const filepath = `${tmpDir}/${filename}`;

    try {
      await Bun.write(filepath, content);
      const proc = Bun.spawn(["open", filepath]);
      await proc.exited;
      setStatusMessage(`Opened in browser: ${filepath}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open in browser");
    }
  }

  const currentHelp = viewMode === "list" ? listViewHelp : detailViewHelp;
  const footerHint = getFooterHint(viewMode);
  const filterCountLabel =
    filteredSessions.length === currentSessions.length
      ? `${filteredSessions.length} sessions found`
      : `${filteredSessions.length} sessions found (filtered from ${currentSessions.length})`;

  return (
    <Box flexDirection="column" padding={1} width={columns} height={rows}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Agent Session Print</Text>
        <Text dimColor> - View Claude Code &amp; Codex sessions</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {showHelp ? (
        <Box height={helpHeight} width={contentColumns} justifyContent="center" alignItems="center">
          <HelpOverlay helpData={currentHelp} onClose={() => setShowHelp(false)} />
        </Box>
      ) : loading ? (
        <Box>
          <Text dimColor>Loading...</Text>
        </Box>
      ) : viewMode === "list" ? (
        <>
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

          <Box marginTop={1} flexDirection="column">
            {filterMode === "search" && (
              <SearchBar
                value={searchDraft}
                onChange={(value) => {
                  setSearchDraft(value);
                  setFilterState((prev) => ({ ...prev, searchQuery: value }));
                }}
                onSubmit={() => setFilterMode("none")}
                onCancel={() => {
                  setFilterState((prev) => ({ ...prev, searchQuery: searchBackup }));
                  setSearchDraft(searchBackup);
                  setFilterMode("none");
                }}
                isActive={true}
              />
            )}
            <FilterBar filter={filterState} />
          </Box>

          {filterMode === "date" && (
            <Box marginTop={1}>
              <DateFilterMenu
                current={filterState.dateFilter}
                onSelect={(value) => {
                  setFilterState((prev) => ({ ...prev, dateFilter: value }));
                  setFilterMode("none");
                }}
                onCancel={() => setFilterMode("none")}
                isActive={true}
              />
            </Box>
          )}

          {filterMode === "project" && (
            <Box marginTop={1}>
              <ProjectFilterMenu
                current={filterState.projectPath}
                projects={projects}
                onSelect={(value) => {
                  setFilterState((prev) => ({ ...prev, projectPath: value }));
                  setFilterMode("none");
                }}
                onCancel={() => setFilterMode("none")}
                isActive={true}
              />
            </Box>
          )}

          <Box marginTop={1} flexDirection="row">
            <Box flexDirection="column" width={layout.listWidth} marginRight={layout.showPreview ? 1 : 0}>
              <Text dimColor>{filterCountLabel}</Text>
              <SessionList
                sessions={filteredSessions}
                onSelect={handleSelectSession}
                onHighlight={setHighlightedSession}
                isActive={filterMode === "none"}
                width={layout.listWidth}
              />
            </Box>

            {layout.showPreview && (
              <SessionPreview
                session={previewSession}
                summary={highlightedSession}
                loading={previewLoading}
                width={layout.previewWidth}
              />
            )}
          </Box>
        </>
      ) : selectedSession ? (
        <SessionDetail
          session={selectedSession}
          exportOptions={exportOptions}
          onChangeOptions={setExportOptions}
          onBack={handleBack}
          onExport={handleExport}
          onViewInBrowser={handleViewInBrowser}
          isActive={true}
        />
      ) : null}

      {!showHelp && <Footer hint={footerHint} statusMessage={statusMessage} />}
    </Box>
  );
}
