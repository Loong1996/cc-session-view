# Agent Session View

A web-based session viewer for browsing, viewing, and exporting conversation history from **Claude Code** and **Codex CLI**.

## Features

- **Unified Session Browser**: View sessions from both Claude Code and Codex CLI in a single interface, sorted by timestamp (newest first)
- **Rich Session Metadata**: View session ID, timestamp, working directory, Git branch, model name, and CLI version
- **Full Conversation History**: Browse complete conversation threads with user messages, assistant responses, tool usage, and thinking blocks
- **Flexible Message Filtering**: Toggle visibility of system messages, thinking blocks, tool use/results, and skill call full content
- **Branch View**: View all sessions associated with a Git branch in chronological order
- **Multiple Export Formats**:
  - **Plain Text**: Clean, readable text format
  - **Styled HTML**: Color-coded messages, collapsible long content, responsive design
  - **Markdown**: Structured markdown with fenced code blocks
- **Bulk Export**: One-click export all sessions to local directory, organized by project subdirectories
- **Skill Call Support**: Parsed display of skill call messages with user input and optional full content

## Screenshots

![Screenshot of the web interface](./docs/screenshots/screen01.png)

## Installation

```bash
git clone https://github.com/dotneet/agent-session-view.git
cd agent-session-view
bun install
```

## Quick Start

```bash
# Start web server
bun run start

# Development mode (with hot module replacement)
bun run dev
```

Access http://localhost:3456 in your browser.

## Web Interface

- **Session List**: Browse sessions with real-time search and filtering
- **Search**: Filter sessions by keyword
- **Date Filter**: Filter by today, yesterday, this week, last week, this month, or all time
- **Project Filter**: Filter sessions by working directory
- **Session Detail View**: View full conversation history with toggleable message types
- **Branch View**: Click a branch name to see all related sessions merged chronologically
- **Export**: Download individual sessions as HTML, text, or markdown
- **Export All**: Bulk export all sessions to `./exported/` directory, organized by project

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List sessions with optional filters |
| `/api/sessions/:agentType/:sessionId` | GET | Get session detail |
| `/api/sessions/branch` | GET | Get all sessions for a Git branch |
| `/api/projects` | GET | List projects (working directories) |
| `/api/export` | POST | Export single session |
| `/api/export/all` | POST | Bulk export all sessions to local directory |
| `/api/export/branch` | POST | Export branch view |

## Export

### Single Session Export

Downloaded directly from the browser. File naming: `{agentType}--{YYYY-MM-DD}--{session_id}.{ext}`

### Bulk Export

Exported to `./exported/all-sessions-{timestamp}/` directory, organized by project subdirectories.

### Export Options

| Option | Default | Description |
|--------|---------|-------------|
| User messages | Enabled | Include user input messages |
| Assistant messages | Enabled | Include assistant responses |
| Tool use | Disabled | Include tool invocations and results |
| Thinking | Disabled | Include thinking/reasoning blocks |
| System messages | Disabled | Include system reminder messages |
| Skill Full | Disabled | Include full content of skill call messages |

### HTML Export Features

- Color-coded message types (user, assistant, tool use, tool result, thinking)
- Collapsible long messages (auto-collapsed for content > 800 characters)
- Consecutive assistant message grouping with expand/collapse
- Skill call messages with parsed display
- Responsive design for mobile viewing
- Print-friendly CSS styles

## Supported Session Data

### Claude Code Sessions
- User messages
- Assistant text responses
- Tool use (with input parameters)
- Tool results (truncated to 500 chars)
- Extended thinking blocks
- Skill call messages

### Codex CLI Sessions
- User messages
- Assistant responses
- Function calls (with arguments)
- Function call outputs
- Reasoning blocks

## Development

See [DEVELOPER.md](./DEVELOPER.md) for detailed setup instructions and development guide.

## License

MIT
