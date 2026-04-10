import { formatTimestamp } from "./format"
import type { BranchMessage, ExportOptions, Message, SessionDetail } from "./types"

/** Branch session info for export */
export interface BranchSession {
  id: string
  agentType: "claude-code" | "codex"
  timestamp: Date
  cwd?: string
}

/** Export to plain text format */
export function exportToText(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = []

  // Header
  lines.push("=".repeat(60))
  lines.push(`Session: ${session.id}`)
  lines.push(`Type: ${session.agentType}`)
  lines.push(`Date: ${session.timestamp.toLocaleString("ja-JP")}`)
  if (session.cwd) lines.push(`CWD: ${session.cwd}`)
  if (session.gitBranch) lines.push(`Branch: ${session.gitBranch}`)
  if (session.version) lines.push(`Version: ${session.version}`)
  if (session.model) lines.push(`Model: ${session.model}`)
  lines.push("=".repeat(60))
  lines.push("")

  // Messages
  const filteredMessages = filterMessages(session.messages, options)
  for (const msg of filteredMessages) {
    const label = getMessageLabel(msg.type)
    const timestamp = msg.timestamp
      ? msg.timestamp instanceof Date
        ? formatTimestamp(msg.timestamp)
        : formatTimestamp(new Date(msg.timestamp))
      : ""
    lines.push(`[${timestamp}] [${label}]`)
    if (msg.toolName) {
      lines.push(`Tool: ${msg.toolName}`)
    }
    lines.push(msg.content)
    lines.push("")
    lines.push("-".repeat(40))
    lines.push("")
  }

  return lines.join("\n")
}

/** Wrap content in a fenced code block with adaptive backtick count */
function fenceContent(content: string): string {
  const matches = [...content.matchAll(/`+/g)].map((m) => m[0].length)
  const maxTicks = matches.length > 0 ? Math.max(3, ...matches) : 3
  const fence = "`".repeat(maxTicks + 1)
  return `${fence}\n${content}\n${fence}`
}

/** Get message icon for markdown export */
function getMessageIcon(type: string): string {
  const icons: Record<string, string> = {
    user: "👤",
    assistant: "🤖",
    tool_use: "⚡",
    tool_result: "📋",
    thinking: "💭",
  }
  return icons[type] || "💬"
}

/** Export to Markdown format */
export function exportToMarkdown(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = []

  // Header
  lines.push(`# Session: ${session.id}`)
  lines.push("")
  lines.push("| Field | Value |")
  lines.push("|-------|-------|")
  lines.push(`| Type | ${session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"} |`)
  lines.push(`| Date | ${session.timestamp.toLocaleString("ja-JP")} |`)
  if (session.cwd) lines.push(`| CWD | ${session.cwd} |`)
  if (session.gitBranch) lines.push(`| Branch | ${session.gitBranch} |`)
  if (session.version) lines.push(`| Version | ${session.version} |`)
  if (session.model) lines.push(`| Model | ${session.model} |`)
  lines.push("")

  // Messages
  const filteredMessages = filterMessages(session.messages, options)
  for (const msg of filteredMessages) {
    lines.push("---")
    lines.push("")

    const label = getMessageLabel(msg.type)
    const icon = getMessageIcon(msg.type)
    const timestamp = msg.timestamp
      ? msg.timestamp instanceof Date
        ? formatTimestamp(msg.timestamp)
        : formatTimestamp(new Date(msg.timestamp))
      : ""
    const timeSuffix = timestamp ? ` <sub>${timestamp}</sub>` : ""

    // Skill call messages
    if (msg.isSkillCall && msg.skillMeta) {
      const meta = msg.skillMeta
      lines.push(`### ${icon} ${label}${timeSuffix}`)
      lines.push("")
      lines.push(`> **调用Skill: ${meta.skillName}**`)
      lines.push("")
      if (meta.userInput) {
        lines.push(fenceContent(meta.userInput))
      }
      if (options.includeSkillFullContent) {
        lines.push("")
        lines.push("<details>")
        lines.push("<summary>完整内容</summary>")
        lines.push("")
        lines.push(fenceContent(meta.fullContent))
        lines.push("")
        lines.push("</details>")
      }
      lines.push("")
      continue
    }

    if (msg.isContextSummary) {
      lines.push(`### 📋 Context Summary${timeSuffix}`)
      lines.push("")
      lines.push("> *Continued from previous conversation (context compaction)*")
      lines.push("")
    } else {
      lines.push(`### ${icon} ${label}${timeSuffix}`)
      lines.push("")
    }
    if (msg.toolName) {
      lines.push(`> Tool: ${msg.toolName}`)
      lines.push("")
    }
    lines.push(fenceContent(msg.content))
    lines.push("")
  }

  return lines.join("\n")
}

/** Export to HTML format */
export function exportToHtml(session: SessionDetail, options: ExportOptions): string {
  const filteredMessages = filterMessages(session.messages, options)

  // Group consecutive assistant messages
  const messageGroups = groupConsecutiveAssistantMessages(filteredMessages)

  const messagesHtml = messageGroups
    .map((group) => {
      if (group.type === "single") {
        return renderSingleMessage(group.message, group.index, options)
      } else {
        return renderConsecutiveAssistantGroup(group.messages, group.startIndex)
      }
    })
    .join("\n")

  const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"

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
      display: flex;
      gap: var(--space-sm);
      margin-bottom: 3px;
      position: relative;
      max-width: 85%;
    }

    .msg + .msg {
      padding-top: 3px;
    }

    /* User messages align to the right */
    .msg.user {
      margin-left: auto;
      flex-direction: row-reverse;
    }

    /* Assistant and other messages align to the left */
    .msg.assistant,
    .msg.tool-use,
    .msg.tool-result,
    .msg.thinking {
      margin-right: auto;
    }

    .msg-indicator {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 0px;
      flex-shrink: 0;
      width: 60px;
    }

    .msg-abbr {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 6px;
      border-radius: var(--radius-sm);
      line-height: 1;
      /* 核心代码 */
      white-space: nowrap; 
      display: inline-block; /* 确保 padding 表现正常且不会被轻易挤压 */
    }

    .msg-main {
      min-width: 0;
      flex: 1;
    }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      min-height: 22px;
      margin-bottom: 2px;
    }

    .timestamp {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-family: var(--font-mono);
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
      border-left: none;
      border-right: 3px solid var(--user-accent);
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

    /* === SKILL CALL === */
    .skill-call {
      margin-left: auto;
      flex-direction: row-reverse;
    }
    .skill-call .msg-abbr {
      background: rgba(255, 200, 0, 0.2);
      color: #ffc800;
    }
    .skill-call .msg-text {
      background: rgba(255, 200, 0, 0.1);
      border-left: none;
      border-right: 3px solid #ffc800;
    }
    .skill-call-content {
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      background: rgba(255, 200, 0, 0.1);
      border-left: none;
      border-right: 3px solid #ffc800;
    }
    .skill-call-header {
      font-weight: bold;
      color: #ffc800;
      margin-bottom: var(--space-sm);
    }
    .skill-call-input {
      margin-top: var(--space-sm);
    }
    .skill-call-input-label {
      color: var(--peko-blue);
      font-size: 0.85rem;
    }
    .skill-call-input-content {
      background: rgba(0, 0, 0, 0.2);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      margin-top: 4px;
      white-space: pre-wrap;
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }
    .skill-call-divider {
      color: var(--text-muted);
      margin: var(--space-sm) 0;
      font-family: var(--font-mono);
    }
    .skill-call-full {
      margin-top: var(--space-sm);
    }
    .skill-call-full summary {
      cursor: pointer;
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: var(--space-xs) 0;
    }
    .skill-call-full summary:hover {
      color: var(--peko-blue);
    }
    .skill-call-full-content {
      background: rgba(0, 0, 0, 0.2);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      margin-top: var(--space-xs);
      white-space: pre-wrap;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      max-height: 400px;
      overflow-y: auto;
    }

    /* === CONTEXT SUMMARY === */
    .msg.context-summary {
      margin-left: auto;
      margin-right: auto;
      max-width: 90%;
      flex-direction: column;
      align-items: center;
    }
    .msg.context-summary .msg-indicator { display: none; }
    .msg.context-summary .msg-main { width: 100%; }
    .msg.context-summary .msg-text {
      background: rgba(139, 92, 246, 0.08);
      border-left: 3px solid #8b5cf6;
      border-right: 3px solid #8b5cf6;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
    }
    .msg.context-summary .msg-text::before {
      content: "📋 Context Summary (continued from previous conversation)";
      display: block;
      font-weight: bold;
      color: #8b5cf6;
      margin-bottom: var(--space-sm);
      font-family: var(--font-sans);
    }

    /* === HIDDEN MESSAGES GROUP === */
    .hidden-messages-group {
      margin: var(--space-sm) 0;
      margin-left: var(--space-xl);
      max-width: calc(85% - var(--space-xl));
    }

    .show-hidden-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: var(--peko-blue-soft);
      border: 1px dashed var(--peko-blue);
      border-radius: var(--radius-md);
      color: var(--peko-blue);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .show-hidden-btn:hover {
      background: var(--peko-blue);
      color: white;
      border-style: solid;
    }

    .hidden-icon {
      font-size: 0.7rem;
      transition: transform 0.2s ease;
    }

    .show-hidden-btn[data-expanded="true"] .hidden-icon {
      transform: rotate(90deg);
    }

    .show-hidden-btn[data-expanded="true"] .hidden-count::before {
      content: '';
    }

    .hidden-messages-container {
      display: none;
      margin-top: var(--space-sm);
      padding-left: var(--space-md);
      border-left: 2px dashed var(--peko-blue-soft);
    }

    .hidden-messages-container.is-visible {
      display: block;
    }

    .hidden-messages-container .msg {
      margin-left: 0;
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
        max-width: 95%;
      }
      .msg-indicator {
        width: 28px;
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
        ${
          session.cwd
            ? `
        <div class="meta-item">
          <span class="meta-key">CWD</span>
          <span class="meta-val" title="${escapeHtml(session.cwd)}">${escapeHtml(session.cwd)}</span>
        </div>
        `
            : ""
        }
        ${
          session.gitBranch
            ? `
        <div class="meta-item">
          <span class="meta-key">Branch</span>
          <span class="meta-val">${escapeHtml(session.gitBranch)}</span>
        </div>
        `
            : ""
        }
        ${
          session.model
            ? `
        <div class="meta-item">
          <span class="meta-key">Model</span>
          <span class="meta-val">${escapeHtml(session.model)}</span>
        </div>
        `
            : ""
        }
        ${
          session.version
            ? `
        <div class="meta-item">
          <span class="meta-key">Version</span>
          <span class="meta-val">${escapeHtml(session.version)}</span>
        </div>
        `
            : ""
        }
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
      if (!text || !btn) return;
      const isCollapsed = text.classList.contains('is-collapsed');

      if (isCollapsed) {
        text.classList.remove('is-collapsed');
        btn.setAttribute('data-expanded', 'true');
      } else {
        text.classList.add('is-collapsed');
        btn.setAttribute('data-expanded', 'false');
      }
    }

    function toggleHiddenGroup(groupId) {
      const group = document.getElementById(groupId);
      if (!group) return;
      const btn = group.querySelector('.show-hidden-btn');
      const container = group.querySelector('.hidden-messages-container');
      const countSpan = group.querySelector('.hidden-count');
      if (!btn || !container || !countSpan) return;

      const isExpanded = btn.getAttribute('data-expanded') === 'true';
      const hiddenCount = container.querySelectorAll('.msg').length;

      if (isExpanded) {
        container.classList.remove('is-visible');
        btn.setAttribute('data-expanded', 'false');
        countSpan.textContent = 'Show ' + hiddenCount + ' messages';
      } else {
        container.classList.add('is-visible');
        btn.setAttribute('data-expanded', 'true');
        countSpan.textContent = 'Hide ' + hiddenCount + ' messages';
      }
    }
  </script>
</body>
</html>`
}

type SingleMessageGroup = {
  type: "single"
  message: Message
  index: number
}

type ConsecutiveAssistantGroup = {
  type: "consecutive"
  messages: Message[]
  startIndex: number
}

type MessageGroup = SingleMessageGroup | ConsecutiveAssistantGroup

function groupConsecutiveAssistantMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]!

    if (msg.type === "assistant") {
      // Count consecutive assistant messages
      const consecutiveMessages: Message[] = [msg]
      let j = i + 1
      while (j < messages.length && messages[j]!.type === "assistant") {
        consecutiveMessages.push(messages[j]!)
        j++
      }

      if (consecutiveMessages.length >= 4) {
        // Group them together
        groups.push({
          type: "consecutive",
          messages: consecutiveMessages,
          startIndex: i,
        })
      } else {
        // Add them as individual messages
        for (let k = 0; k < consecutiveMessages.length; k++) {
          groups.push({
            type: "single",
            message: consecutiveMessages[k]!,
            index: i + k,
          })
        }
      }
      i = j
    } else {
      groups.push({
        type: "single",
        message: msg,
        index: i,
      })
      i++
    }
  }

  return groups
}

function renderSingleMessage(msg: Message, i: number, options?: ExportOptions): string {
  const typeClass = msg.type.replace("_", "-")
  const toolInfo = msg.toolName ? `<code class="tool-tag">${escapeHtml(msg.toolName)}</code>` : ""
  const content = escapeHtml(msg.content)
  const isLong = msg.content.length > 800
  const typeLabel = getMessageLabel(msg.type)
  const typeAbbr = getMessageAbbr(msg.type)
  const timestamp = msg.timestamp
    ? msg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(msg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(msg.timestamp))}</span>`
    : ""

  // Handle skill call messages specially
  if (msg.isSkillCall && msg.skillMeta) {
    return renderSkillCallMessage(msg, i, options)
  }

  const extraClass = msg.isContextSummary ? " context-summary" : ""

  return `
    <article class="msg ${typeClass}${extraClass}" id="msg-${i}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${msg.isContextSummary ? "📋" : typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${timestamp}
          ${toolInfo}
          ${
            isLong
              ? `<button class="expand-btn" onclick="toggleMsg(${i})" data-expanded="false">
            <span class="expand-icon">▼</span>
          </button>`
              : ""
          }
        </div>
        <div class="msg-text ${isLong ? "is-collapsed" : ""}">
          <pre>${content}</pre>
        </div>
      </div>
    </article>
  `
}

function renderSkillCallMessage(msg: Message, i: number, options?: ExportOptions): string {
  const meta = msg.skillMeta!
  const timestamp = msg.timestamp
    ? msg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(msg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(msg.timestamp))}</span>`
    : ""
  const fullContent = escapeHtml(meta.fullContent)
  const userInput = escapeHtml(meta.userInput)
  const typeLabel = getMessageLabel(msg.type)
  const typeAbbr = getMessageAbbr(msg.type)
  const typeClass = msg.type.replace("_", "-")
  const includeFullContent = options?.includeSkillFullContent ?? true

  return `
    <article class="msg ${typeClass} skill-call" id="msg-${i}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${timestamp}
        </div>
        <div class="skill-call-content">
          <div class="skill-call-header">调用Skill: ${escapeHtml(meta.skillName)}</div>
          <div class="skill-call-input">
            <span class="skill-call-input-label">用户输入内容:</span>
            <pre class="skill-call-input-content">${userInput}</pre>
          </div>
          ${
            includeFullContent
              ? `<details class="skill-call-full">
            <summary>完整内容</summary>
            <pre class="skill-call-full-content">${fullContent}</pre>
          </details>`
              : ""
          }
        </div>
      </div>
    </article>
  `
}

function renderConsecutiveAssistantGroup(messages: Message[], startIndex: number): string {
  const groupId = `assistant-group-${startIndex}`
  const hiddenCount = messages.length - 2 // First and last are shown
  const typeLabel = getMessageLabel("assistant")
  const typeAbbr = getMessageAbbr("assistant")

  // First message (always visible)
  const firstMsg = messages[0]!
  const firstContent = escapeHtml(firstMsg.content)
  const firstIsLong = firstMsg.content.length > 800
  const firstIndex = startIndex
  const firstTimestamp = firstMsg.timestamp
    ? firstMsg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(firstMsg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(firstMsg.timestamp))}</span>`
    : ""

  // Last message (always visible)
  const lastMsg = messages[messages.length - 1]!
  const lastContent = escapeHtml(lastMsg.content)
  const lastIsLong = lastMsg.content.length > 800
  const lastIndex = startIndex + messages.length - 1
  const lastTimestamp = lastMsg.timestamp
    ? lastMsg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(lastMsg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(lastMsg.timestamp))}</span>`
    : ""

  // Middle messages (hidden by default)
  const middleMessages = messages.slice(1, -1)
  const middleHtml = middleMessages
    .map((msg, idx) => {
      const content = escapeHtml(msg.content)
      const isLong = msg.content.length > 800
      const msgIndex = startIndex + 1 + idx
      const msgTimestamp = msg.timestamp
        ? msg.timestamp instanceof Date
          ? `<span class="timestamp">${formatTimestamp(msg.timestamp)}</span>`
          : `<span class="timestamp">${formatTimestamp(new Date(msg.timestamp))}</span>`
        : ""

      return `
      <article class="msg assistant hidden-msg" id="msg-${msgIndex}">
        <div class="msg-indicator" title="${typeLabel}">
          <span class="msg-abbr">${typeAbbr}</span>
        </div>
        <div class="msg-main">
          <div class="msg-meta">
            ${msgTimestamp}
            ${
              isLong
                ? `<button class="expand-btn" onclick="toggleMsg(${msgIndex})" data-expanded="false">
              <span class="expand-icon">▼</span>
            </button>`
                : ""
            }
          </div>
          <div class="msg-text ${isLong ? "is-collapsed" : ""}">
            <pre>${content}</pre>
          </div>
        </div>
      </article>
    `
    })
    .join("\n")

  return `
    <article class="msg assistant" id="msg-${firstIndex}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${firstTimestamp}
          ${
            firstIsLong
              ? `<button class="expand-btn" onclick="toggleMsg(${firstIndex})" data-expanded="false">
            <span class="expand-icon">▼</span>
          </button>`
              : ""
          }
        </div>
        <div class="msg-text ${firstIsLong ? "is-collapsed" : ""}">
          <pre>${firstContent}</pre>
        </div>
      </div>
    </article>

    <div class="hidden-messages-group" id="${groupId}">
      <button class="show-hidden-btn" onclick="toggleHiddenGroup('${groupId}')" data-expanded="false">
        <span class="hidden-icon">▶</span>
        <span class="hidden-count">Show ${hiddenCount} messages</span>
      </button>
      <div class="hidden-messages-container">
        ${middleHtml}
      </div>
    </div>

    <article class="msg assistant" id="msg-${lastIndex}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${lastTimestamp}
          ${
            lastIsLong
              ? `<button class="expand-btn" onclick="toggleMsg(${lastIndex})" data-expanded="false">
            <span class="expand-icon">▼</span>
          </button>`
              : ""
          }
        </div>
        <div class="msg-text ${lastIsLong ? "is-collapsed" : ""}">
          <pre>${lastContent}</pre>
        </div>
      </div>
    </article>
  `
}

function filterMessages(messages: Message[], options: ExportOptions): Message[] {
  return messages.filter((msg) => {
    // Filter context summary messages
    if (msg.isContextSummary && !options.includeContextSummary) return false
    // Filter system messages
    if (msg.isSystemMessage && !options.includeSystemMessages) return false
    if (msg.type === "user" && !options.includeUser) return false
    if (msg.type === "assistant" && !options.includeAssistant) return false
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !options.includeToolUse)
      return false
    if (msg.type === "thinking" && !options.includeThinking) return false
    return true
  })
}

function getMessageLabel(type: string): string {
  const labels: Record<string, string> = {
    user: "USER",
    assistant: "ASSISTANT",
    tool_use: "TOOL USE",
    tool_result: "TOOL RESULT",
    thinking: "THINKING",
  }
  return labels[type] || type.toUpperCase()
}

function getMessageAbbr(type: string): string {
  const abbrs: Record<string, string> = {
    user: "用户输入",
    assistant: "AI输出",
    tool_use: "工具调用",
    tool_result: "工具结果",
    thinking: "思考",
  }
  return abbrs[type] || "?"
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/** Export branch to plain text format */
export function exportBranchToText(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): string {
  const lines: string[] = []

  // Header
  lines.push("=".repeat(60))
  lines.push(`Branch: ${branchName}`)
  lines.push(`Sessions: ${sessions.length}`)
  lines.push("=".repeat(60))
  lines.push("")

  // Group messages by session
  const messagesBySession = new Map<string, BranchMessage[]>()
  for (const msg of messages) {
    const existing = messagesBySession.get(msg.sessionId)
    if (existing) {
      existing.push(msg)
    } else {
      messagesBySession.set(msg.sessionId, [msg])
    }
  }

  // Render each session's messages
  let isFirst = true
  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) || []
    const filteredMessages = filterBranchMessages(sessionMessages, options)

    if (filteredMessages.length === 0) continue

    if (!isFirst) {
      lines.push("")
      lines.push("-".repeat(40))
      lines.push("")
    }
    isFirst = false

    const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"
    lines.push(`===== SESSION: ${session.id.slice(0, 8)} =====`)
    lines.push(`Type: ${agentLabel}`)
    lines.push(`Date: ${session.timestamp.toLocaleString("ja-JP")}`)
    if (session.cwd) lines.push(`CWD: ${session.cwd}`)
    lines.push("")

    for (const msg of filteredMessages) {
      const label = getMessageLabel(msg.type)
      const timestamp = msg.timestamp
        ? msg.timestamp instanceof Date
          ? formatTimestamp(msg.timestamp)
          : formatTimestamp(new Date(msg.timestamp))
        : ""
      lines.push(`[${timestamp}] [${label}]`)
      if (msg.toolName) {
        lines.push(`Tool: ${msg.toolName}`)
      }
      lines.push(msg.content)
      lines.push("")
    }
  }

  return lines.join("\n")
}

/** Export branch to Markdown format */
export function exportBranchToMarkdown(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): string {
  const lines: string[] = []

  // Header
  lines.push(`# Branch: ${branchName}`)
  lines.push("")
  lines.push(`**Sessions:** ${sessions.length}`)
  lines.push("")

  // Group messages by session
  const messagesBySession = new Map<string, BranchMessage[]>()
  for (const msg of messages) {
    const existing = messagesBySession.get(msg.sessionId)
    if (existing) {
      existing.push(msg)
    } else {
      messagesBySession.set(msg.sessionId, [msg])
    }
  }

  // Render each session's messages
  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) || []
    const filteredMessages = filterBranchMessages(sessionMessages, options)

    if (filteredMessages.length === 0) continue

    const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"
    lines.push("---")
    lines.push("")
    lines.push(`## SESSION: ${session.id.slice(0, 8)}`)
    lines.push("")
    lines.push(`| Field | Value |`)
    lines.push(`|-------|-------|`)
    lines.push(`| Type | ${agentLabel} |`)
    lines.push(`| Date | ${session.timestamp.toLocaleString("ja-JP")} |`)
    if (session.cwd) lines.push(`| CWD | ${session.cwd} |`)
    lines.push("")

    for (const msg of filteredMessages) {
      const label = getMessageLabel(msg.type)
      const icon = getMessageIcon(msg.type)
      const timestamp = msg.timestamp
        ? msg.timestamp instanceof Date
          ? formatTimestamp(msg.timestamp)
          : formatTimestamp(new Date(msg.timestamp))
        : ""
      const timeSuffix = timestamp ? ` <sub>${timestamp}</sub>` : ""

      lines.push(`### ${icon} ${label}${timeSuffix}`)
      lines.push("")
      if (msg.toolName) {
        lines.push(`> Tool: ${msg.toolName}`)
        lines.push("")
      }
      lines.push(fenceContent(msg.content))
      lines.push("")
    }
  }

  return lines.join("\n")
}

/** Export branch to HTML format */
export function exportBranchToHtml(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): string {
  // Group messages by session
  const messagesBySession = new Map<string, BranchMessage[]>()
  for (const msg of messages) {
    const existing = messagesBySession.get(msg.sessionId)
    if (existing) {
      existing.push(msg)
    } else {
      messagesBySession.set(msg.sessionId, [msg])
    }
  }

  // Build HTML for all sessions
  let allMessagesHtml = ""
  let globalIndex = 0

  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) || []
    const filteredMessages = filterBranchMessages(sessionMessages, options)

    if (filteredMessages.length === 0) continue

    const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"
    const timestamp = session.timestamp.toLocaleString("ja-JP")

    // Session boundary
    allMessagesHtml += `
      <div class="session-boundary">
        <span class="boundary-line"></span>
        <span class="boundary-label">${agentLabel} • ${escapeHtml(session.id.slice(0, 8))} • ${timestamp}</span>
        <span class="boundary-line"></span>
      </div>
    `

    // Project BranchMessage to Message for reuse
    const projectedMessages: Message[] = filteredMessages.map((m) => ({
      type: m.type,
      content: m.content,
      timestamp: m.timestamp,
      toolName: m.toolName,
      toolId: m.toolId,
    }))

    // Group consecutive assistant messages
    const messageGroups = groupConsecutiveAssistantMessages(projectedMessages)

    for (const group of messageGroups) {
      if (group.type === "single") {
        allMessagesHtml += renderSingleMessage(group.message, globalIndex)
        globalIndex++
      } else {
        allMessagesHtml += renderConsecutiveAssistantGroupForBranch(group.messages, globalIndex)
        globalIndex += group.messages.length
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Branch: ${escapeHtml(branchName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${getBranchHtmlStyles()}
  </style>
</head>
<body>
  <div class="page">
    <header class="hdr">
      <div class="hdr-top">
        <span class="hdr-badge">🌿 Branch</span>
        <h1 class="hdr-title">${escapeHtml(branchName)}</h1>
      </div>
      <div class="meta-list">
        <div class="meta-item">
          <span class="meta-key">Sessions</span>
          <span class="meta-val">${sessions.length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-key">Messages</span>
          <span class="meta-val">${messages.length}</span>
        </div>
      </div>
    </header>

    <section class="msg-section">
      ${allMessagesHtml}
    </section>

    <footer class="ftr">
      Generated by Agent Session Print
    </footer>
  </div>

  <script>
    function toggleMsg(index) {
      const text = document.querySelector('#msg-' + index + ' .msg-text');
      const btn = document.querySelector('#msg-' + index + ' .expand-btn');
      if (!text || !btn) return;
      const isCollapsed = text.classList.contains('is-collapsed');

      if (isCollapsed) {
        text.classList.remove('is-collapsed');
        btn.setAttribute('data-expanded', 'true');
      } else {
        text.classList.add('is-collapsed');
        btn.setAttribute('data-expanded', 'false');
      }
    }

    function toggleHiddenGroup(groupId) {
      const group = document.getElementById(groupId);
      if (!group) return;
      const btn = group.querySelector('.show-hidden-btn');
      const container = group.querySelector('.hidden-messages-container');
      const countSpan = group.querySelector('.hidden-count');
      if (!btn || !container || !countSpan) return;

      const isExpanded = btn.getAttribute('data-expanded') === 'true';
      const hiddenCount = container.querySelectorAll('.msg').length;

      if (isExpanded) {
        container.classList.remove('is-visible');
        btn.setAttribute('data-expanded', 'false');
        countSpan.textContent = 'Show ' + hiddenCount + ' messages';
      } else {
        container.classList.add('is-visible');
        btn.setAttribute('data-expanded', 'true');
        countSpan.textContent = 'Hide ' + hiddenCount + ' messages';
      }
    }
  </script>
</body>
</html>`
}

function renderConsecutiveAssistantGroupForBranch(messages: Message[], startIndex: number): string {
  const groupId = `assistant-group-${startIndex}`
  const hiddenCount = messages.length - 2
  const typeLabel = getMessageLabel("assistant")
  const typeAbbr = getMessageAbbr("assistant")

  const firstMsg = messages[0]!
  const firstContent = escapeHtml(firstMsg.content)
  const firstIsLong = firstMsg.content.length > 800
  const firstIndex = startIndex
  const firstTimestamp = firstMsg.timestamp
    ? firstMsg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(firstMsg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(firstMsg.timestamp))}</span>`
    : ""

  const lastMsg = messages[messages.length - 1]!
  const lastContent = escapeHtml(lastMsg.content)
  const lastIsLong = lastMsg.content.length > 800
  const lastIndex = startIndex + messages.length - 1
  const lastTimestamp = lastMsg.timestamp
    ? lastMsg.timestamp instanceof Date
      ? `<span class="timestamp">${formatTimestamp(lastMsg.timestamp)}</span>`
      : `<span class="timestamp">${formatTimestamp(new Date(lastMsg.timestamp))}</span>`
    : ""

  const middleMessages = messages.slice(1, -1)
  const middleHtml = middleMessages
    .map((msg, idx) => {
      const content = escapeHtml(msg.content)
      const isLong = msg.content.length > 800
      const msgIndex = startIndex + 1 + idx
      const msgTimestamp = msg.timestamp
        ? msg.timestamp instanceof Date
          ? `<span class="timestamp">${formatTimestamp(msg.timestamp)}</span>`
          : `<span class="timestamp">${formatTimestamp(new Date(msg.timestamp))}</span>`
        : ""

      return `
      <article class="msg assistant hidden-msg" id="msg-${msgIndex}">
        <div class="msg-indicator" title="${typeLabel}">
          <span class="msg-abbr">${typeAbbr}</span>
        </div>
        <div class="msg-main">
          <div class="msg-meta">
            ${msgTimestamp}
            ${
              isLong
                ? `<button class="expand-btn" onclick="toggleMsg(${msgIndex})" data-expanded="false">
              <span class="expand-icon">▼</span>
            </button>`
                : ""
            }
          </div>
          <div class="msg-text ${isLong ? "is-collapsed" : ""}">
            <pre>${content}</pre>
          </div>
        </div>
      </article>
    `
    })
    .join("\n")

  return `
    <article class="msg assistant" id="msg-${firstIndex}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${firstTimestamp}
          ${
            firstIsLong
              ? `<button class="expand-btn" onclick="toggleMsg(${firstIndex})" data-expanded="false">
            <span class="expand-icon">▼</span>
          </button>`
              : ""
          }
        </div>
        <div class="msg-text ${firstIsLong ? "is-collapsed" : ""}">
          <pre>${firstContent}</pre>
        </div>
      </div>
    </article>

    <div class="hidden-messages-group" id="${groupId}">
      <button class="show-hidden-btn" onclick="toggleHiddenGroup('${groupId}')" data-expanded="false">
        <span class="hidden-icon">▶</span>
        <span class="hidden-count">Show ${hiddenCount} messages</span>
      </button>
      <div class="hidden-messages-container">
        ${middleHtml}
      </div>
    </div>

    <article class="msg assistant" id="msg-${lastIndex}">
      <div class="msg-indicator" title="${typeLabel}">
        <span class="msg-abbr">${typeAbbr}</span>
      </div>
      <div class="msg-main">
        <div class="msg-meta">
          ${lastTimestamp}
          ${
            lastIsLong
              ? `<button class="expand-btn" onclick="toggleMsg(${lastIndex})" data-expanded="false">
            <span class="expand-icon">▼</span>
          </button>`
              : ""
          }
        </div>
        <div class="msg-text ${lastIsLong ? "is-collapsed" : ""}">
          <pre>${lastContent}</pre>
        </div>
      </div>
    </article>
  `
}

function filterBranchMessages(messages: BranchMessage[], options: ExportOptions): BranchMessage[] {
  return messages.filter((msg) => {
    // Filter system messages first
    if (msg.isSystemMessage && !options.includeSystemMessages) return false
    if (msg.type === "user" && !options.includeUser) return false
    if (msg.type === "assistant" && !options.includeAssistant) return false
    if ((msg.type === "tool_use" || msg.type === "tool_result") && !options.includeToolUse)
      return false
    if (msg.type === "thinking" && !options.includeThinking) return false
    return true
  })
}

function getBranchHtmlStyles(): string {
  return `
    :root {
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
      --bg-base: #FAFCFD;
      --bg-surface: var(--usa-white);
      --text-primary: #2D3748;
      --text-secondary: #5A6A7A;
      --text-muted: #8899AA;
      --border-light: rgba(0, 191, 255, 0.2);
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; }
    body {
      font-family: var(--font-sans);
      background: var(--bg-base);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
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
      background: linear-gradient(135deg, var(--leaf-green) 0%, #1a6b1a 100%);
      color: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(34, 139, 34, 0.25);
    }
    .hdr-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .meta-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm) var(--space-lg);
    }
    .meta-item {
      display: flex;
      align-items: baseline;
      gap: var(--space-sm);
    }
    .meta-key {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--peko-blue);
    }
    .meta-val {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-primary);
    }
    .msg-section { position: relative; }
    .session-boundary {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin: var(--space-lg) 0;
      padding: var(--space-sm) 0;
    }
    .boundary-line {
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--leaf-green), transparent);
    }
    .boundary-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--leaf-green);
      padding: 4px 12px;
      background: var(--leaf-green-light);
      border-radius: 12px;
      white-space: nowrap;
    }
    .msg {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: 3px;
      position: relative;
      max-width: 85%;
    }
    .msg + .msg { padding-top: 3px; }
    /* User messages align to the right */
    .msg.user {
      margin-left: auto;
      flex-direction: row-reverse;
    }
    /* Assistant and other messages align to the left */
    .msg.assistant,
    .msg.tool-use,
    .msg.tool-result,
    .msg.thinking {
      margin-right: auto;
    }
    .msg-indicator {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 0px;
      flex-shrink: 0;
      width: 60px;
    }
    .msg-abbr {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 6px;
      border-radius: var(--radius-sm);
      line-height: 1;
      /* 核心代码 */
      white-space: nowrap; 
      display: inline-block; /* 确保 padding 表现正常且不会被轻易挤压 */
    }
    .msg-main { min-width: 0; flex: 1; }
    .msg-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      min-height: 22px;
      margin-bottom: 2px;
    }
    .timestamp {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-family: var(--font-mono);
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
    .expand-btn[data-expanded="true"] .expand-icon { transform: rotate(180deg); }
    .expand-icon { transition: transform 0.2s ease; }
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
    .user .msg-abbr { background: var(--user-bg); color: var(--user-accent); }
    .user .msg-text { background: var(--user-bg); border-left: none; border-right: 3px solid var(--user-accent); }
    .user .msg-text.is-collapsed::after { background: linear-gradient(to bottom, transparent, var(--user-bg)); }
    .assistant .msg-abbr { background: var(--assistant-bg); color: var(--assistant-accent); }
    .assistant .msg-text { background: var(--assistant-bg); border-left-color: var(--assistant-accent); }
    .assistant .msg-text.is-collapsed::after { background: linear-gradient(to bottom, transparent, var(--assistant-bg)); }
    .tool-use .msg-abbr { background: var(--tool-bg); color: var(--tool-accent); }
    .tool-use .msg-text { background: var(--tool-bg); border-left-color: var(--tool-accent); }
    .tool-use .msg-text.is-collapsed::after { background: linear-gradient(to bottom, transparent, var(--tool-bg)); }
    .tool-result .msg-abbr { background: var(--result-bg); color: var(--result-accent); }
    .tool-result .msg-text { background: var(--result-bg); border-left-color: var(--result-accent); }
    .tool-result .msg-text.is-collapsed::after { background: linear-gradient(to bottom, transparent, var(--result-bg)); }
    .thinking .msg-abbr { background: var(--thinking-bg); color: var(--thinking-accent); }
    .thinking .msg-text { background: var(--thinking-bg); border-left-color: var(--thinking-accent); }
    .thinking .msg-text pre { color: var(--text-muted); font-style: italic; }
    .thinking .msg-text.is-collapsed::after { background: linear-gradient(to bottom, transparent, var(--thinking-bg)); }
    .skill-call { margin-left: auto; flex-direction: row-reverse; }
    .skill-call .msg-abbr { background: rgba(255, 200, 0, 0.2); color: #ffc800; }
    .skill-call .msg-text { background: rgba(255, 200, 0, 0.1); border-left: none; border-right: 3px solid #ffc800; }
    .skill-call-content { padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); background: rgba(255, 200, 0, 0.1); border-left: none; border-right: 3px solid #ffc800; }
    .skill-call-header { font-weight: bold; color: #ffc800; margin-bottom: var(--space-sm); }
    .skill-call-input { margin-top: var(--space-sm); }
    .skill-call-input-label { color: var(--peko-blue); font-size: 0.85rem; }
    .skill-call-input-content { background: rgba(0, 0, 0, 0.2); padding: var(--space-sm); border-radius: var(--radius-sm); margin-top: 4px; white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.875rem; }
    .skill-call-divider { color: var(--text-muted); margin: var(--space-sm) 0; font-family: var(--font-mono); }
    .skill-call-full { margin-top: var(--space-sm); }
    .skill-call-full summary { cursor: pointer; color: var(--text-muted); font-size: 0.85rem; padding: var(--space-xs) 0; }
    .skill-call-full summary:hover { color: var(--peko-blue); }
    .skill-call-full-content { background: rgba(0, 0, 0, 0.2); padding: var(--space-sm); border-radius: var(--radius-sm); margin-top: var(--space-xs); white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.8rem; max-height: 400px; overflow-y: auto; }
    .msg.context-summary { margin-left: auto; margin-right: auto; max-width: 90%; flex-direction: column; align-items: center; }
    .msg.context-summary .msg-indicator { display: none; }
    .msg.context-summary .msg-main { width: 100%; }
    .msg.context-summary .msg-text { background: rgba(139, 92, 246, 0.08); border-left: 3px solid #8b5cf6; border-right: 3px solid #8b5cf6; border-radius: var(--radius-md); font-size: 0.85rem; }
    .msg.context-summary .msg-text::before { content: "📋 Context Summary (continued from previous conversation)"; display: block; font-weight: bold; color: #8b5cf6; margin-bottom: var(--space-sm); font-family: var(--font-sans); }
    .hidden-messages-group { margin: var(--space-sm) 0; margin-left: var(--space-xl); max-width: calc(85% - var(--space-xl)); }
    .show-hidden-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: var(--peko-blue-soft);
      border: 1px dashed var(--peko-blue);
      border-radius: var(--radius-md);
      color: var(--peko-blue);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .show-hidden-btn:hover {
      background: var(--peko-blue);
      color: white;
      border-style: solid;
    }
    .hidden-icon { font-size: 0.7rem; transition: transform 0.2s ease; }
    .show-hidden-btn[data-expanded="true"] .hidden-icon { transform: rotate(90deg); }
    .hidden-messages-container {
      display: none;
      margin-top: var(--space-sm);
      padding-left: var(--space-md);
      border-left: 2px dashed var(--peko-blue-soft);
    }
    .hidden-messages-container.is-visible { display: block; }
    .hidden-messages-container .msg { margin-left: 0; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--peko-blue-light); border-radius: 4px; }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, var(--peko-blue), var(--peko-pink));
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover { background: var(--peko-blue); }
    .ftr {
      margin-top: var(--space-xl);
      padding-top: var(--space-md);
      border-top: 2px dashed var(--border-light);
      text-align: center;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .ftr::before { content: '🐰🥕'; display: block; font-size: 1.2rem; margin-bottom: 6px; }
    @media (max-width: 640px) {
      html { font-size: 15px; }
      .page { padding: var(--space-lg) var(--space-md); }
      .hdr-title { font-size: 1.3rem; }
      .meta-list { flex-direction: column; gap: var(--space-xs); }
      .msg { max-width: 95%; }
      .msg-indicator { width: 28px; }
    }
    @media print {
      .expand-btn { display: none; }
      .msg-text.is-collapsed { max-height: none; }
      .msg-text.is-collapsed::after { display: none; }
      body::before { display: none; }
    }
  `
}
