import type { SessionDetail, ExportOptions, Message } from "./types";

/** Export to plain text format */
export function exportToText(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = [];

  // Header
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

  // Messages
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

/** Export to HTML format */
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agentLabel} Session</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Theme colors */
      --peko-blue: #00BFFF;
      --peko-blue-light: #E6F9FF;
      --peko-blue-soft: rgba(0, 191, 255, 0.15);
      --carrot-orange: #FFA500;
      --carrot-orange-light: #FFF5E6;
      --usa-white: #FFFFFF;
      --peko-pink: #FFC0CB;
      --peko-pink-deep: #FF8FA3;
      --peko-pink-light: #FFF0F3;
      --leaf-green: #228B22;
      --leaf-green-light: #E8F5E8;

      /* UI colors */
      --bg-base: #FAFCFD;
      --bg-surface: var(--usa-white);
      --text-primary: #2D3748;
      --text-secondary: #5A6A7A;
      --text-muted: #8899AA;
      --border-light: rgba(0, 191, 255, 0.2);

      /* Message colors */
      --user-accent: var(--leaf-green);
      --user-bg: var(--leaf-green-light);
      --assistant-accent: var(--peko-blue);
      --assistant-bg: var(--peko-blue-light);
      --tool-accent: var(--carrot-orange);
      --tool-bg: var(--carrot-orange-light);
      --result-accent: var(--peko-pink-deep);
      --result-bg: var(--peko-pink-light);
      --thinking-accent: #94A3B8;
      --thinking-bg: #F1F5F9;

      --font-sans: 'Nunito', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', monospace;

      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 16px;
      --space-lg: 24px;
      --space-xl: 40px;
      --radius-sm: 6px;
      --radius-md: 10px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 16px;
    }

    body {
      font-family: var(--font-sans);
      background: var(--bg-base);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    /* Subtle background pattern */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 15% 25%, rgba(0, 191, 255, 0.04) 0%, transparent 40%),
        radial-gradient(circle at 85% 75%, rgba(255, 192, 203, 0.05) 0%, transparent 40%);
      pointer-events: none;
      z-index: 0;
    }

    .page {
      position: relative;
      z-index: 1;
      max-width: 1000px;
      margin: 0 auto;
      padding: var(--space-xl) var(--space-lg);
    }

    /* === HEADER === */
    .hdr {
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-lg);
      border-bottom: 2px solid var(--border-light);
    }

    .hdr-top {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-sm);
    }

    .hdr-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 12px;
      background: linear-gradient(135deg, var(--peko-blue) 0%, #00A0D0 100%);
      color: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 191, 255, 0.25);
    }

    .hdr-badge::before {
      content: '🐰';
      font-size: 0.9rem;
    }

    .hdr-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .hdr-id {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: var(--space-md);
    }

    /* Meta Info */
    .meta-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm) var(--space-lg);
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
      color: var(--peko-blue);
      flex-shrink: 0;
    }

    .meta-val {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-primary);
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: thin;
      max-width: calc(100vw - 200px);
    }

    .meta-val::-webkit-scrollbar {
      height: 4px;
    }

    .meta-val::-webkit-scrollbar-thumb {
      background: var(--peko-blue-soft);
      border-radius: 2px;
    }

    /* === MESSAGES === */
    .msg-section {
      position: relative;
    }

    .msg-count {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--peko-pink-deep);
      margin-bottom: var(--space-md);
      padding: 4px 12px;
      background: var(--peko-pink-light);
      border-radius: 12px;
    }

    .msg-count::before {
      content: '💬';
      font-size: 0.8rem;
    }

    .msg {
      display: grid;
      grid-template-columns: 32px 1fr;
      gap: var(--space-sm);
      margin-bottom: 3px;
      position: relative;
    }

    .msg + .msg {
      padding-top: 3px;
    }

    .msg-indicator {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 6px;
    }

    .msg-abbr {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 6px;
      border-radius: var(--radius-sm);
      line-height: 1;
    }

    .msg-main {
      min-width: 0;
    }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      min-height: 22px;
      margin-bottom: 2px;
    }

    .tool-tag {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 8px;
      background: rgba(255, 165, 0, 0.15);
      border-radius: var(--radius-sm);
      color: var(--carrot-orange);
    }

    .expand-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-left: auto;
      background: var(--peko-blue-light);
      border: 1px solid var(--peko-blue);
      border-radius: var(--radius-sm);
      color: var(--peko-blue);
      font-size: 0.65rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .expand-btn:hover {
      background: var(--peko-blue);
      color: white;
      transform: scale(1.05);
    }

    .expand-btn[data-expanded="true"] .expand-icon {
      transform: rotate(180deg);
    }

    .expand-icon {
      transition: transform 0.2s ease;
    }

    .msg-text {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      transition: max-height 0.3s ease;
      border-left: 3px solid transparent;
    }

    .msg-text.is-collapsed {
      max-height: 140px;
      overflow: hidden;
      position: relative;
    }

    .msg-text.is-collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: linear-gradient(to bottom, transparent, var(--bg-base));
      pointer-events: none;
    }

    .msg-text pre {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: var(--text-primary);
      margin: 0;
    }

    /* === MESSAGE TYPE STYLES === */
    .user .msg-abbr {
      background: var(--user-bg);
      color: var(--user-accent);
    }
    .user .msg-text {
      background: var(--user-bg);
      border-left-color: var(--user-accent);
    }
    .user .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--user-bg));
    }

    .assistant .msg-abbr {
      background: var(--assistant-bg);
      color: var(--assistant-accent);
    }
    .assistant .msg-text {
      background: var(--assistant-bg);
      border-left-color: var(--assistant-accent);
    }
    .assistant .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--assistant-bg));
    }

    .tool-use .msg-abbr {
      background: var(--tool-bg);
      color: var(--tool-accent);
    }
    .tool-use .msg-text {
      background: var(--tool-bg);
      border-left-color: var(--tool-accent);
    }
    .tool-use .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--tool-bg));
    }

    .tool-result .msg-abbr {
      background: var(--result-bg);
      color: var(--result-accent);
    }
    .tool-result .msg-text {
      background: var(--result-bg);
      border-left-color: var(--result-accent);
    }
    .tool-result .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--result-bg));
    }

    .thinking .msg-abbr {
      background: var(--thinking-bg);
      color: var(--thinking-accent);
    }
    .thinking .msg-text {
      background: var(--thinking-bg);
      border-left-color: var(--thinking-accent);
    }
    .thinking .msg-text pre {
      color: var(--text-muted);
      font-style: italic;
    }
    .thinking .msg-text.is-collapsed::after {
      background: linear-gradient(to bottom, transparent, var(--thinking-bg));
    }

    /* === SCROLLBAR === */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: var(--peko-blue-light);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, var(--peko-blue), var(--peko-pink));
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--peko-blue);
    }

    /* === FOOTER === */
    .ftr {
      margin-top: var(--space-xl);
      padding-top: var(--space-md);
      border-top: 2px dashed var(--border-light);
      text-align: center;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .ftr::before {
      content: '🐰🥕';
      display: block;
      font-size: 1.2rem;
      margin-bottom: 6px;
    }

    /* === RESPONSIVE === */
    @media (max-width: 640px) {
      html {
        font-size: 15px;
      }
      .page {
        padding: var(--space-lg) var(--space-md);
      }
      .hdr-title {
        font-size: 1.3rem;
      }
      .meta-list {
        flex-direction: column;
        gap: var(--space-xs);
      }
      .meta-val {
        max-width: calc(100vw - 120px);
      }
      .msg {
        grid-template-columns: 28px 1fr;
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
      body::before {
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
