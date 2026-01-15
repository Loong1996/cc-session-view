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
  const [exportOptions] = useState<ExportOptions>(defaultExportOptions);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // セッション一覧を読み込み
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

  // キー入力ハンドリング
  useInput((input, key) => {
    // 詳細画面では別途ハンドリング
    if (viewMode === "detail") return;

    // TAB でタブ切り替え
    if (key.tab) {
      setActiveTab((prev) => (prev === "claude-code" ? "codex" : "claude-code"));
    }

    // q または Ctrl+C で終了
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
  });

  // セッション選択ハンドラ
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

  // 詳細画面から戻る
  function handleBack() {
    setViewMode("list");
    setSelectedSession(null);
  }

  // エクスポートハンドラ
  async function handleExport(format: "text" | "html") {
    if (!selectedSession) return;

    const content =
      format === "text"
        ? exportToText(selectedSession, exportOptions)
        : exportToHtml(selectedSession, exportOptions);

    const ext = format === "text" ? "txt" : "html";
    const filename = `session-${selectedSession.id.slice(0, 8)}.${ext}`;
    const exportDir = "./exported";
    const filepath = `${exportDir}/${filename}`;

    try {
      // exportedディレクトリが存在しない場合は作成
      const fs = await import("node:fs/promises");
      await fs.mkdir(exportDir, { recursive: true });

      await Bun.write(filepath, content);
      setStatusMessage(`Exported to ${filepath}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export");
    }
  }

  const currentSessions = activeTab === "claude-code" ? claudeSessions : codexSessions;

  return (
    <Box flexDirection="column" padding={1}>
      {/* ヘッダー */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Agent Session Print</Text>
        <Text dimColor> - View Claude Code &amp; Codex sessions</Text>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {/* ステータスメッセージ */}
      {statusMessage && (
        <Box marginBottom={1}>
          <Text color="green">{statusMessage}</Text>
        </Box>
      )}

      {/* メインコンテンツ */}
      {loading ? (
        <Box>
          <Text dimColor>Loading...</Text>
        </Box>
      ) : viewMode === "list" ? (
        <>
          {/* タブセレクター */}
          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

          {/* セッション一覧 */}
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

          {/* 操作説明 */}
          <Box marginTop={1}>
            <Text dimColor>[↑↓] Navigate  [Enter] Select  [TAB] Switch tab  [q] Quit</Text>
          </Box>
        </>
      ) : selectedSession ? (
        <SessionDetail
          session={selectedSession}
          exportOptions={exportOptions}
          onBack={handleBack}
          onExport={handleExport}
        />
      ) : null}
    </Box>
  );
}
