import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { TabSelector } from "./components/TabSelector";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import { listClaudeCodeSessions, loadClaudeCodeSession } from "./lib/claude-code-parser";
import { listCodexSessions, loadCodexSession } from "./lib/codex-parser";
import { exportToText, exportToHtml } from "./lib/exporter";
import type {
  AgentType,
  SessionSummary,
  SessionDetail as SessionDetailType,
  ExportOptions,
} from "./lib/types";
import { defaultExportOptions } from "./lib/types";

type ViewMode = "list" | "detail";

export function App() {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<AgentType>("claude-code");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [claudeSessions, setClaudeSessions] = useState<SessionSummary[]>([]);
  const [codexSessions, setCodexSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load session list
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

  // Handle key input
  useInput((input, key) => {
    // Detail view has its own input handling
    if (viewMode === "detail") return;

    // TAB to switch tabs
    if (key.tab) {
      setActiveTab((prev) => (prev === "claude-code" ? "codex" : "claude-code"));
    }

    // q or Ctrl+C to exit
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
  });

  // Handle session selection
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

  // Return from detail view
  function handleBack() {
    setViewMode("list");
    setSelectedSession(null);
  }

  // Handle export
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
      // Create exported directory if it doesn't exist
      const fs = await import("node:fs/promises");
      await fs.mkdir(exportDir, { recursive: true });

      await Bun.write(filepath, content);
      setStatusMessage(`Exported to ${filepath}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export");
    }
  }

  // Handle viewing in browser
  async function handleViewInBrowser() {
    if (!selectedSession) return;

    const content = exportToHtml(selectedSession, exportOptions);
    const agentName = selectedSession.agentType === "claude-code" ? "claude" : "codex";
    const filename = `session-${agentName}-${selectedSession.id.slice(0, 8)}-${Date.now()}.html`;
    const tmpDir = process.env.TMPDIR || "/tmp";
    const filepath = `${tmpDir}/${filename}`;

    try {
      await Bun.write(filepath, content);
      // Open browser with open command
      const proc = Bun.spawn(["open", filepath]);
      await proc.exited;
      setStatusMessage(`Opened in browser: ${filepath}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open in browser");
    }
  }

  const currentSessions = activeTab === "claude-code" ? claudeSessions : codexSessions;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Agent Session Print</Text>
        <Text dimColor> - View Claude Code &amp; Codex sessions</Text>
      </Box>

      {/* Error display */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {/* Status message */}
      {statusMessage && (
        <Box marginBottom={1}>
          <Text color="green">{statusMessage}</Text>
        </Box>
      )}

      {/* Main content */}
      {loading ? (
        <Box>
          <Text dimColor>Loading...</Text>
        </Box>
      ) : viewMode === "list" ? (
        <>
          {/* Tab selector */}
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Session list */}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>
              {currentSessions.length} sessions found
            </Text>
            <SessionList
              sessions={currentSessions}
              onSelect={handleSelectSession}
              isActive={true}
            />
          </Box>

          {/* Help text */}
          <Box marginTop={1}>
            <Text dimColor>[↑↓] Navigate  [Enter] Select  [TAB] Switch tab  [q] Quit</Text>
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
        />
      ) : null}
    </Box>
  );
}
