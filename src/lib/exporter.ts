import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MessageRenderer } from "../web/components/MessageRenderer"
import { exportStyles } from "./css-utils"
import { formatTimestamp } from "./format"
import { escapeHtml, filterBranchMessages, filterMessages, getMessageLabel } from "./message-utils"
import type { BranchMessage, ExportOptions, SessionDetail } from "./types"

// ─── Font embedding ────────────────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  let bin = ""
  const bytes = new Uint8Array(buf)
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function buildFontFaceCSS(): Promise<string> {
  const nunitoFile = Bun.file(new URL("../web/fonts/nunito-latin.woff2", import.meta.url).pathname)
  const jbFile = Bun.file(
    new URL("../web/fonts/jetbrains-mono-latin.woff2", import.meta.url).pathname,
  )
  const [nunitoBuf, jbBuf] = await Promise.all([nunitoFile.arrayBuffer(), jbFile.arrayBuffer()])
  const nunitoB64 = toBase64(nunitoBuf)
  const jbB64 = toBase64(jbBuf)
  const nunitoSrc = `url('data:font/woff2;base64,${nunitoB64}') format('woff2')`
  const jbSrc = `url('data:font/woff2;base64,${jbB64}') format('woff2')`
  return `
@font-face { font-family: 'Nunito'; font-weight: 400 700; font-style: normal; src: ${nunitoSrc}; }
@font-face { font-family: 'JetBrains Mono'; font-weight: 400 600; font-style: normal; src: ${jbSrc}; }
`
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Branch session info for export */
export interface BranchSession {
  id: string
  agentType: "claude-code" | "codex"
  timestamp: Date
  cwd?: string
}

// ─── Text export ──────────────────────────────────────────────────────────────

/** Export to plain text format */
export function exportToText(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = []

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

  const filteredMessages = filterMessages(session.messages, options)
  for (const msg of filteredMessages) {
    const label = getMessageLabel(msg.type)
    const ts = msg.timestamp
      ? msg.timestamp instanceof Date
        ? formatTimestamp(msg.timestamp)
        : formatTimestamp(new Date(msg.timestamp))
      : ""
    lines.push(`[${ts}] [${label}]`)
    if (msg.toolName) lines.push(`Tool: ${msg.toolName}`)
    lines.push(msg.content)
    lines.push("")
    lines.push("-".repeat(40))
    lines.push("")
  }

  return lines.join("\n")
}

// ─── Markdown export ──────────────────────────────────────────────────────────

/** Wrap content in a fenced code block with adaptive backtick count */
function fenceContent(content: string): string {
  const matches = [...content.matchAll(/`+/g)].map((m) => m[0].length)
  const maxTicks = matches.length > 0 ? Math.max(3, ...matches) : 3
  const fence = "`".repeat(maxTicks + 1)
  return `${fence}\n${content}\n${fence}`
}

function getMessageIcon(type: string): string {
  const icons: Record<string, string> = {
    user: "👤",
    assistant: "🤖",
    tool_use: "⚡",
    tool_result: "📋",
    thinking: "💭",
  }
  return icons[type] ?? "💬"
}

/** Export to Markdown format */
export function exportToMarkdown(session: SessionDetail, options: ExportOptions): string {
  const lines: string[] = []

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

  const filteredMessages = filterMessages(session.messages, options)
  for (const msg of filteredMessages) {
    lines.push("---")
    lines.push("")

    const label = getMessageLabel(msg.type)
    const icon = getMessageIcon(msg.type)
    const ts = msg.timestamp
      ? msg.timestamp instanceof Date
        ? formatTimestamp(msg.timestamp)
        : formatTimestamp(new Date(msg.timestamp))
      : ""
    const timeSuffix = ts ? ` <sub>${ts}</sub>` : ""

    if (msg.isSkillCall && msg.skillMeta) {
      const meta = msg.skillMeta
      lines.push(`### ${icon} ${label}${timeSuffix}`)
      lines.push("")
      lines.push(`> **调用Skill: ${meta.skillName}**`)
      lines.push("")
      if (meta.userInput) lines.push(fenceContent(meta.userInput))
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

// ─── HTML export ──────────────────────────────────────────────────────────────

/**
 * Event-delegation script embedded in exported HTML.
 * Handles expand/collapse for long messages and hidden message groups.
 * Works with data-toggle-msg and data-toggle-group attributes produced by
 * MessageRenderer in staticMode.
 */
const TOGGLE_SCRIPT = `
document.addEventListener('click', function(e) {
  var expandBtn = e.target.closest('[data-toggle-msg]');
  if (expandBtn) {
    var article = expandBtn.closest('article');
    var msgText = article && article.querySelector('.msg-text');
    if (msgText) {
      var collapsed = msgText.classList.toggle('collapsed');
      expandBtn.classList.toggle('expanded', !collapsed);
    }
    return;
  }

  var groupBtn = e.target.closest('[data-toggle-group]');
  if (groupBtn) {
    var groupId = groupBtn.getAttribute('data-toggle-group');
    var group = document.getElementById(groupId);
    var container = group && group.querySelector('.hidden-messages-container');
    var countSpan = group && group.querySelector('.hidden-count');
    if (container && countSpan) {
      var visible = container.classList.toggle('visible');
      groupBtn.classList.toggle('expanded', visible);
      var count = container.querySelectorAll('.message').length;
      countSpan.textContent = (visible ? 'Hide ' : 'Show ') + count + ' messages';
    }
  }
});
`

/**
 * Interactive filter toggle script. Reads chip buttons with data-filter-toggle
 * and reflects state onto document.body dataset, which CSS uses to show/hide messages.
 */
const FILTER_TOGGLE_SCRIPT = `
(function() {
  var chips = document.querySelectorAll('[data-filter-toggle]');
  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var key = chip.getAttribute('data-filter-toggle');
      var active = chip.classList.toggle('active');
      document.body.dataset[key] = String(active);
    });
  });
})();
`

/** CSS rules to hide messages based on body dataset toggles set by FILTER_TOGGLE_SCRIPT. */
const FILTER_TOGGLE_CSS = `
body:not([data-show-system="true"]) [data-msg-type="system"] { display: none; }
body:not([data-show-thinking="true"]) [data-msg-type="thinking"] { display: none; }
body:not([data-show-tools="true"]) [data-msg-type="tool_use"],
body:not([data-show-tools="true"]) [data-msg-type="tool_result"] { display: none; }
body:not([data-show-skill-full="true"]) [data-msg-type="skill-full"] { display: none; }
body:not([data-show-context-summary="true"]) [data-msg-type="context-summary"] { display: none; }
`

/** Inline toggle bar HTML inserted at the top of the exported page. */
function buildFilterBar(opts: {
  showSystem: boolean
  showThinking: boolean
  showTools: boolean
  showSkillFull: boolean
  showContextSummary: boolean
}): string {
  const chip = (key: string, icon: string, label: string, active: boolean) =>
    `<button type="button" class="toggle-chip${active ? " active" : ""}" data-filter-toggle="${key}">${icon} ${label}</button>`

  return `<div class="toggle-chips export-filter-bar">
  ${chip("showSystem", "⚙", "System", opts.showSystem)}
  ${chip("showThinking", "💭", "Thinking", opts.showThinking)}
  ${chip("showTools", "🔧", "Tools", opts.showTools)}
  ${chip("showSkillFull", "📜", "Skill Full", opts.showSkillFull)}
  ${chip("showContextSummary", "📋", "Context Summary", opts.showContextSummary)}
</div>`
}

/** Build body dataset attributes for initial toggle state. */
function buildBodyDataset(opts: {
  showSystem: boolean
  showThinking: boolean
  showTools: boolean
  showSkillFull: boolean
  showContextSummary: boolean
}): string {
  return [
    `data-show-system="${opts.showSystem}"`,
    `data-show-thinking="${opts.showThinking}"`,
    `data-show-tools="${opts.showTools}"`,
    `data-show-skill-full="${opts.showSkillFull}"`,
    `data-show-context-summary="${opts.showContextSummary}"`,
  ].join(" ")
}

/** Page-shell CSS not present in styles.css (specific to standalone export layout). */
const SHELL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
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
    background: linear-gradient(135deg, var(--peko-blue) 0%, #0099cc 100%);
    color: white;
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 191, 255, 0.25);
  }
  .hdr-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  .hdr-id {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 4px;
  }
  .meta-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm) var(--space-lg);
    margin-top: var(--space-md);
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
  .msg-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--peko-pink-deep);
    padding: 4px 12px;
    background: var(--peko-pink-light);
    border-radius: 12px;
    margin-bottom: var(--space-md);
  }
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
  @media print {
    .expand-btn { display: none; }
    .msg-text.collapsed { max-height: none; }
    .msg-text.collapsed::after { display: none; }
  }
`

function htmlShell(opts: {
  title: string
  headerHtml: string
  messagesHtml: string
  messageCount: number
  fontFaceCSS?: string
  filterBarHtml?: string
  bodyDataset?: string
}): string {
  const fontLinks = opts.fontFaceCSS
    ? ""
    : `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`
  const fontFaceBlock = opts.fontFaceCSS ? opts.fontFaceCSS : ""
  const bodyAttrs = opts.bodyDataset ? ` ${opts.bodyDataset}` : ""
  const filterBar = opts.filterBarHtml ?? ""
  const filterScript = opts.filterBarHtml ? `<script>${FILTER_TOGGLE_SCRIPT}</script>` : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
${fontLinks}
  <style>
${fontFaceBlock}
${exportStyles}
${SHELL_CSS}
${FILTER_TOGGLE_CSS}
  </style>
</head>
<body${bodyAttrs}>
  <div class="page">
    ${opts.headerHtml}
    ${filterBar}
    <section class="msg-section">
      <div class="msg-count">${opts.messageCount} messages</div>
      ${opts.messagesHtml}
    </section>
    <footer class="ftr">Generated by Agent Session Viewer</footer>
  </div>
  <script>${TOGGLE_SCRIPT}</script>
  ${filterScript}
</body>
</html>`
}

/** Export to HTML format */
export async function exportToHtml(
  session: SessionDetail,
  options: ExportOptions,
): Promise<string> {
  const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"

  // Resolve toggle initial state (defaults: all hidden)
  const toggles = options.initialToggles ?? {
    showSystem: options.includeSystemMessages,
    showThinking: options.includeThinking,
    showTools: options.includeToolUse,
    showSkillFull: options.includeSkillFullContent,
    showContextSummary: options.includeContextSummary,
  }

  // Full SSR: render all messages; CSS + JS will handle visibility toggling
  const messagesHtml = renderToStaticMarkup(
    createElement(MessageRenderer, {
      messages: session.messages,
      staticMode: true,
      showSkillFullContent: true,
    }),
  )

  const fontFaceCSS = options.embedFonts ? await buildFontFaceCSS() : undefined

  const headerHtml = `
    <header class="hdr">
      <div class="hdr-top">
        <span class="hdr-badge">${escapeHtml(agentLabel)}</span>
        <h1 class="hdr-title">Session Log</h1>
      </div>
      <p class="hdr-id">${escapeHtml(session.id)}</p>
      <div class="meta-list">
        <div class="meta-item">
          <span class="meta-key">Date</span>
          <span class="meta-val">${session.timestamp.toLocaleString("ja-JP")}</span>
        </div>
        ${session.cwd ? `<div class="meta-item"><span class="meta-key">CWD</span><span class="meta-val" title="${escapeHtml(session.cwd)}">${escapeHtml(session.cwd)}</span></div>` : ""}
        ${session.gitBranch ? `<div class="meta-item"><span class="meta-key">Branch</span><span class="meta-val">${escapeHtml(session.gitBranch)}</span></div>` : ""}
        ${session.model ? `<div class="meta-item"><span class="meta-key">Model</span><span class="meta-val">${escapeHtml(session.model)}</span></div>` : ""}
        ${session.version ? `<div class="meta-item"><span class="meta-key">Version</span><span class="meta-val">${escapeHtml(session.version)}</span></div>` : ""}
      </div>
    </header>`

  return htmlShell({
    title: `${agentLabel} Session`,
    headerHtml,
    messagesHtml,
    messageCount: session.messages.length,
    fontFaceCSS,
    filterBarHtml: buildFilterBar(toggles),
    bodyDataset: buildBodyDataset(toggles),
  })
}

// ─── Branch text export ───────────────────────────────────────────────────────

/** Export branch to plain text format */
export function exportBranchToText(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): string {
  const lines: string[] = []

  lines.push("=".repeat(60))
  lines.push(`Branch: ${branchName}`)
  lines.push(`Sessions: ${sessions.length}`)
  lines.push("=".repeat(60))
  lines.push("")

  const messagesBySession = groupBySession(messages)
  let isFirst = true

  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) ?? []
    const filtered = filterBranchMessages(sessionMessages, options)
    if (filtered.length === 0) continue

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

    for (const msg of filtered) {
      const label = getMessageLabel(msg.type)
      const ts = msg.timestamp
        ? msg.timestamp instanceof Date
          ? formatTimestamp(msg.timestamp)
          : formatTimestamp(new Date(msg.timestamp))
        : ""
      lines.push(`[${ts}] [${label}]`)
      if (msg.toolName) lines.push(`Tool: ${msg.toolName}`)
      lines.push(msg.content)
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ─── Branch Markdown export ───────────────────────────────────────────────────

/** Export branch to Markdown format */
export function exportBranchToMarkdown(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): string {
  const lines: string[] = []

  lines.push(`# Branch: ${branchName}`)
  lines.push("")
  lines.push(`**Sessions:** ${sessions.length}`)
  lines.push("")

  const messagesBySession = groupBySession(messages)

  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) ?? []
    const filtered = filterBranchMessages(sessionMessages, options)
    if (filtered.length === 0) continue

    const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"
    lines.push("---")
    lines.push("")
    lines.push(`## SESSION: ${session.id.slice(0, 8)}`)
    lines.push("")
    lines.push("| Field | Value |")
    lines.push("|-------|-------|")
    lines.push(`| Type | ${agentLabel} |`)
    lines.push(`| Date | ${session.timestamp.toLocaleString("ja-JP")} |`)
    if (session.cwd) lines.push(`| CWD | ${session.cwd} |`)
    lines.push("")

    for (const msg of filtered) {
      const label = getMessageLabel(msg.type)
      const icon = getMessageIcon(msg.type)
      const ts = msg.timestamp
        ? msg.timestamp instanceof Date
          ? formatTimestamp(msg.timestamp)
          : formatTimestamp(new Date(msg.timestamp))
        : ""
      const timeSuffix = ts ? ` <sub>${ts}</sub>` : ""

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

// ─── Branch HTML export ───────────────────────────────────────────────────────

const BRANCH_BOUNDARY_CSS = `
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
`

/** Export branch to HTML format */
export async function exportBranchToHtml(
  branchName: string,
  sessions: BranchSession[],
  messages: BranchMessage[],
  options: ExportOptions,
): Promise<string> {
  const messagesBySession = groupBySession(messages)
  let totalCount = 0
  const sectionParts: string[] = []

  const toggles = options.initialToggles ?? {
    showSystem: options.includeSystemMessages,
    showThinking: options.includeThinking,
    showTools: options.includeToolUse,
    showSkillFull: options.includeSkillFullContent,
    showContextSummary: options.includeContextSummary,
  }

  for (const session of sessions) {
    const sessionMessages = messagesBySession.get(session.id) ?? []
    // Full SSR: render all messages; CSS toggles handle visibility
    if (sessionMessages.length === 0) continue

    const agentLabel = session.agentType === "claude-code" ? "Claude Code" : "Codex CLI"
    const ts = session.timestamp.toLocaleString("ja-JP")

    const boundaryHtml = `
      <div class="session-boundary">
        <span class="boundary-line"></span>
        <span class="boundary-label">${escapeHtml(agentLabel)} • ${escapeHtml(session.id.slice(0, 8))} • ${escapeHtml(ts)}</span>
        <span class="boundary-line"></span>
      </div>`

    const msgsHtml = renderToStaticMarkup(
      createElement(MessageRenderer, {
        messages: sessionMessages,
        staticMode: true,
        showSkillFullContent: true,
      }),
    )

    sectionParts.push(boundaryHtml + msgsHtml)
    totalCount += sessionMessages.length
  }

  const fontFaceCSS = options.embedFonts ? await buildFontFaceCSS() : undefined
  const fontLinks = fontFaceCSS
    ? ""
    : `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`

  const branchBadgeCss = `
    .hdr-badge { background: linear-gradient(135deg, var(--leaf-green) 0%, #1a6b1a 100%); box-shadow: 0 2px 8px rgba(34,139,34,0.25); }
  `

  const headerHtml = `
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
    </header>`

  const bodyDataset = buildBodyDataset(toggles)
  const filterBar = buildFilterBar(toggles)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Branch: ${escapeHtml(branchName)}</title>
${fontLinks}
  <style>
${fontFaceCSS ?? ""}
${exportStyles}
${SHELL_CSS}
${BRANCH_BOUNDARY_CSS}
${FILTER_TOGGLE_CSS}
${branchBadgeCss}
  </style>
</head>
<body ${bodyDataset}>
  <div class="page">
    ${headerHtml}
    ${filterBar}
    <section class="msg-section">
      <div class="msg-count">${totalCount} messages</div>
      ${sectionParts.join("\n")}
    </section>
    <footer class="ftr">Generated by Agent Session Viewer</footer>
  </div>
  <script>${TOGGLE_SCRIPT}</script>
  <script>${FILTER_TOGGLE_SCRIPT}</script>
</body>
</html>`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBySession<T extends { sessionId: string }>(messages: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const msg of messages) {
    const existing = map.get(msg.sessionId)
    if (existing) {
      existing.push(msg)
    } else {
      map.set(msg.sessionId, [msg])
    }
  }
  return map
}
