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
    const toolInfo = msg.toolName ? `<span class="tool-name">${escapeHtml(msg.toolName)}</span>` : "";
    const content = escapeHtml(msg.content);
    const isLong = msg.content.length > 500;

    return `
      <div class="message ${typeClass}" id="msg-${i}">
        <div class="message-header">
          <span class="message-type">${getMessageLabel(msg.type)}</span>
          ${toolInfo}
          ${isLong ? `<button class="toggle-btn" onclick="toggleMessage(${i})">展開</button>` : ""}
        </div>
        <div class="message-content ${isLong ? "collapsed" : ""}">
          <pre>${content}</pre>
        </div>
      </div>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session: ${escapeHtml(session.id)}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #1a1a2e;
      color: #eee;
    }
    .header {
      background: #16213e;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 15px 0;
      color: #4fc3f7;
      font-size: 1.5rem;
    }
    .meta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 5px 15px;
      font-size: 0.9rem;
    }
    .meta dt {
      color: #888;
    }
    .meta dd {
      margin: 0;
    }
    .message {
      background: #16213e;
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .message-header {
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #0f3460;
    }
    .message-type {
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .tool-name {
      color: #888;
      font-size: 0.85rem;
    }
    .toggle-btn {
      margin-left: auto;
      background: #0f3460;
      border: none;
      color: #4fc3f7;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .toggle-btn:hover {
      background: #1a4a7a;
    }
    .message-content {
      padding: 15px;
    }
    .message-content.collapsed {
      max-height: 150px;
      overflow: hidden;
      position: relative;
    }
    .message-content.collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: linear-gradient(transparent, #16213e);
    }
    .message-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    /* Message type colors */
    .user .message-type { background: #2e7d32; color: white; }
    .assistant .message-type { background: #1565c0; color: white; }
    .tool-use .message-type { background: #f57c00; color: white; }
    .tool-result .message-type { background: #7b1fa2; color: white; }
    .thinking .message-type { background: #455a64; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Session: ${escapeHtml(session.id)}</h1>
    <dl class="meta">
      <dt>Type</dt><dd>${escapeHtml(session.agentType)}</dd>
      <dt>Date</dt><dd>${session.timestamp.toLocaleString("ja-JP")}</dd>
      ${session.cwd ? `<dt>CWD</dt><dd>${escapeHtml(session.cwd)}</dd>` : ""}
      ${session.gitBranch ? `<dt>Branch</dt><dd>${escapeHtml(session.gitBranch)}</dd>` : ""}
      ${session.version ? `<dt>Version</dt><dd>${escapeHtml(session.version)}</dd>` : ""}
      ${session.model ? `<dt>Model</dt><dd>${escapeHtml(session.model)}</dd>` : ""}
    </dl>
  </div>

  <div class="messages">
    ${messagesHtml}
  </div>

  <script>
    function toggleMessage(index) {
      const content = document.querySelector('#msg-' + index + ' .message-content');
      const btn = document.querySelector('#msg-' + index + ' .toggle-btn');
      if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        btn.textContent = '折りたたむ';
      } else {
        content.classList.add('collapsed');
        btn.textContent = '展開';
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
