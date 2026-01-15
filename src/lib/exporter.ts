import type { SessionDetail, ExportOptions, Message } from "./types";

/** プレーンテキスト形式でエクスポート */
export function exportToText(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push("=".repeat(60));
  lines.push(`Session: ${session.id}`);
  lines.push(`Type: ${session.agentType}`);
  lines.push(`Date: ${session.timestamp.toLocaleString("ja-JP")}`);
  if (session.cwd) lines.push(`CWD: ${session.cwd}`);
  if (session.gitBranch) lines.push(`Branch: ${session.gitBranch}`);
  if (session.version) lines.push(`Version: ${session.version}`);
  if (session.model) lines.push(`Model: ${session.model}`);
  lines.push("=".repeat(60));
  lines.push("");

  // メッセージ
  const filteredMessages = filterMessages(session.messages, options);
  for (const msg of filteredMessages) {
    const label = getMessageLabel(msg.type);
    lines.push(`[${label}]`);
    if (msg.toolName) {
      lines.push(`Tool: ${msg.toolName}`);
    }
    lines.push(msg.content);
    lines.push("");
    lines.push("-".repeat(40));
    lines.push("");
  }

  return lines.join("\n");
}

/** HTML形式でエクスポート */
export function exportToHtml(session: SessionDetail, options: ExportOptions): string {
  const filteredMessages = filterMessages(session.messages, options);

  const messagesHtml = filteredMessages.map((msg, i) => {
    const typeClass = msg.type.replace("_", "-");
    const toolInfo = msg.toolName ? `<code class="tool-tag">${escapeHtml(msg.toolName)}</code>` : "";
    const content = escapeHtml(msg.content);
    const isLong = msg.content.length > 800;
    const typeLabel = getMessageLabel(msg.type);
    const typeAbbr = getMessageAbbr(msg.type);

    return `
      <article class="msg ${typeClass}" id="msg-${i}">
        <div class="msg-indicator" title="${typeLabel}">
          <span class="msg-abbr">${typeAbbr}</span>
        </div>
        <div class="msg-main">
          <div class="msg-meta">
            ${toolInfo}
            ${isLong ? `<button class="expand-btn" onclick="toggleMsg(${i})" data-expanded="false">
              <span class="expand-icon">▼</span>
            </button>` : ""}
          </div>
          <div class="msg-text ${isLong ? "is-collapsed" : ""}">
            <pre>${content}</pre>
          </div>
        </div>
      </article>
    `;
  }).join("\n");

  const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agentLabel} Session</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #1a1a2e;
      --ink-soft: #2d2d44;
      --ink-muted: #6b6b8a;
      --paper: #fafafa;
      --paper-warm: #f5f4f0;
      --paper-cool: #f0f4f8;

      --accent-user: #2d6a4f;
      --accent-assistant: #1d4ed8;
      --accent-tool: #b45309;
      --accent-result: #7c3aed;
      --accent-thinking: #64748b;

      --user-bg: #d8f3dc;
      --assistant-bg: #dbeafe;
      --tool-bg: #fef3c7;
      --result-bg: #ede9fe;
      --thinking-bg: #f1f5f9;

      --font-sans: 'IBM Plex Sans', -apple-system, sans-serif;
      --font-mono: 'IBM Plex Mono', 'SF Mono', monospace;

      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 16px;
      --space-lg: 24px;
      --space-xl: 40px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 15px;
    }

    body {
      font-family: var(--font-sans);
      background: var(--paper);
      color: var(--ink);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--space-xl) var(--space-lg);
    }

    /* === HEADER === */
    .hdr {
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 2px solid var(--ink);
    }

    .hdr-top {
      display: flex;
      align-items: baseline;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    .hdr-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: var(--space-xs) var(--space-sm);
      background: var(--ink);
      color: var(--paper);
    }

    .hdr-title {
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink);
    }

    .hdr-id {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--ink-muted);
      margin-bottom: var(--space-lg);
    }

    /* Meta Info - Horizontal scroll for long values */
    .meta-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm) var(--space-lg);
      font-size: 0.85rem;
    }

    .meta-item {
      display: flex;
      align-items: baseline;
      gap: var(--space-sm);
      max-width: 100%;
    }

    .meta-key {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
      flex-shrink: 0;
    }

    .meta-val {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--ink);
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: thin;
      max-width: calc(100vw - 200px);
    }

    .meta-val::-webkit-scrollbar {
      height: 4px;
    }

    .meta-val::-webkit-scrollbar-thumb {
      background: var(--ink-muted);
      border-radius: 2px;
    }

    /* === MESSAGES === */
    .msg-section {
      position: relative;
    }

    .msg-count {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-muted);
      margin-bottom: var(--space-md);
      padding: var(--space-xs) 0;
      border-bottom: 1px solid var(--ink-soft);
    }

    .msg {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: var(--space-sm);
      margin-bottom: 2px;
      position: relative;
    }

    .msg + .msg {
      border-top: 1px dashed rgba(0,0,0,0.08);
      padding-top: 2px;
    }

    .msg-indicator {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: var(--space-xs);
    }

    .msg-abbr {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 2px 4px;
      border-radius: 2px;
      line-height: 1;
    }

    .msg-main {
      min-width: 0;
    }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      min-height: 20px;
      margin-bottom: 2px;
    }

    .tool-tag {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      padding: 1px 6px;
      background: rgba(0,0,0,0.06);
      border-radius: 2px;
      color: var(--ink-soft);
    }

    .expand-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      margin-left: auto;
      background: transparent;
      border: 1px solid var(--ink-muted);
      border-radius: 2px;
      color: var(--ink-muted);
      font-size: 0.6rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .expand-btn:hover {
      background: var(--ink);
      color: var(--paper);
      border-color: var(--ink);
    }

    .expand-btn[data-expanded="true"] .expand-icon {
      transform: rotate(180deg);
    }

    .expand-icon {
      transition: transform 0.2s ease;
    }

    .msg-text {
      padding: var(--space-xs) var(--space-sm);
      border-radius: 3px;
      transition: max-height 0.3s ease;
    }

    .msg-text.is-collapsed {
      max-height: 120px;
      overflow: hidden;
      position: relative;
    }

    .msg-text.is-collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, transparent, var(--paper));
      pointer-events: none;
    }

    .msg-text pre {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: var(--ink);
      margin: 0;
    }

    /* === MESSAGE TYPE STYLES === */
    .user .msg-abbr {
      background: var(--user-bg);
      color: var(--accent-user);
    }
    .user .msg-text {
      background: var(--user-bg);
    }
    .user .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--user-bg));
    }

    .assistant .msg-abbr {
      background: var(--assistant-bg);
      color: var(--accent-assistant);
    }
    .assistant .msg-text {
      background: var(--assistant-bg);
    }
    .assistant .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--assistant-bg));
    }

    .tool-use .msg-abbr {
      background: var(--tool-bg);
      color: var(--accent-tool);
    }
    .tool-use .msg-text {
      background: var(--tool-bg);
    }
    .tool-use .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--tool-bg));
    }

    .tool-result .msg-abbr {
      background: var(--result-bg);
      color: var(--accent-result);
    }
    .tool-result .msg-text {
      background: var(--result-bg);
    }
    .tool-result .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--result-bg));
    }

    .thinking .msg-abbr {
      background: var(--thinking-bg);
      color: var(--accent-thinking);
    }
    .thinking .msg-text {
      background: var(--thinking-bg);
    }
    .thinking .msg-text pre {
      color: var(--ink-muted);
      font-style: italic;
    }
    .thinking .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--thinking-bg));
    }

    /* === SCROLLBAR === */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--ink-muted);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--ink-soft);
    }

    /* === FOOTER === */
    .ftr {
      margin-top: var(--space-xl);
      padding-top: var(--space-md);
      border-top: 1px solid var(--ink-muted);
      text-align: center;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--ink-muted);
    }

    /* === RESPONSIVE === */
    @media (max-width: 640px) {
      html {
        font-size: 14px;
      }
      .page {
        padding: var(--space-lg) var(--space-md);
      }
      .hdr-title {
        font-size: 1.4rem;
      }
      .meta-list {
        flex-direction: column;
        gap: var(--space-xs);
      }
      .meta-val {
        max-width: calc(100vw - 120px);
      }
    }

    /* === PRINT === */
    @media print {
      .expand-btn {
        display: none;
      }
      .msg-text.is-collapsed {
        max-height: none;
      }
      .msg-text.is-collapsed::after {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hdr">
      <div class="hdr-top">
        <span class="hdr-badge">${agentLabel}</span>
        <h1 class="hdr-title">Session Log</h1>
      </div>
      <p class="hdr-id">${escapeHtml(session.id)}</p>

      <div class="meta-list">
        <div class="meta-item">
          <span class="meta-key">Date</span>
          <span class="meta-val">${session.timestamp.toLocaleString("ja-JP")}</span>
        </div>
        ${session.cwd ? `
        <div class="meta-item">
          <span class="meta-key">CWD</span>
          <span class="meta-val" title="${escapeHtml(session.cwd)}">${escapeHtml(session.cwd)}</span>
        </div>
        ` : ""}
        ${session.gitBranch ? `
        <div class="meta-item">
          <span class="meta-key">Branch</span>
          <span class="meta-val">${escapeHtml(session.gitBranch)}</span>
        </div>
        ` : ""}
        ${session.model ? `
        <div class="meta-item">
          <span class="meta-key">Model</span>
          <span class="meta-val">${escapeHtml(session.model)}</span>
        </div>
        ` : ""}
        ${session.version ? `
        <div class="meta-item">
          <span class="meta-key">Version</span>
          <span class="meta-val">${escapeHtml(session.version)}</span>
        </div>
        ` : ""}
      </div>
    </header>

    <section class="msg-section">
      <div class="msg-count">${filteredMessages.length} messages</div>
      ${messagesHtml}
    </section>

    <footer class="ftr">
      Generated by Agent Session Print
    </footer>
  </div>

  <script>
    function toggleMsg(index) {
      const text = document.querySelector('#msg-' + index + ' .msg-text');
      const btn = document.querySelector('#msg-' + index + ' .expand-btn');
      const isCollapsed = text.classList.contains('is-collapsed');

      if (isCollapsed) {
        text.classList.remove('is-collapsed');
        btn.setAttribute('data-expanded', 'true');
      } else {
        text.classList.add('is-collapsed');
        btn.setAttribute('data-expanded', 'false');
      }
    }
  </script>
</body>
</html>`;
}

function filterMessages(messages: Message[], options: ExportOptions): Message[] {
  return messages.filter((msg) => {
    if (msg.type === "user" && !options.includeUser) return false;
    if (msg.type === "assistant" && !options.includeAssistant) return false;
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !options.includeToolUse) return false;
    if (msg.type === "thinking" && !options.includeThinking) return false;
    return true;
  });
}

function getMessageLabel(type: string): string {
  const labels: Record<string, string> = {
    user: "USER",
    assistant: "ASSISTANT",
    tool_use: "TOOL USE",
    tool_result: "TOOL RESULT",
    thinking: "THINKING",
  };
  return labels[type] || type.toUpperCase();
}

function getMessageIcon(type: string): string {
  const icons: Record<string, string> = {
    user: "👤",
    assistant: "🤖",
    tool_use: "⚡",
    tool_result: "📋",
    thinking: "💭",
  };
  return icons[type] || "💬";
}

function getMessageAbbr(type: string): string {
  const abbrs: Record<string, string> = {
    user: "U",
    assistant: "A",
    tool_use: "T",
    tool_result: "R",
    thinking: "?",
  };
  return abbrs[type] || "?";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
