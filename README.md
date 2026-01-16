# Agent Session View

A TUI tool for browsing and exporting session history from Claude Code and Codex CLI.

## Features

- **Session List**: Display Claude Code / Codex sessions sorted by timestamp
- **Tab Switching**: Switch between Claude Code and Codex using TAB key
- **Session Details**: View metadata (ID, date, working directory, Git branch, etc.) and conversation history
- **Export**: Export to plain text or HTML format

## Session File Locations

| Agent | Path | File Format |
|-------|------|-------------|
| Claude Code | `~/.claude/projects/<project>/` | `*.jsonl` |
| Codex CLI | `~/.codex/sessions/` | `rollout-*.jsonl`, `rollout-*.json` |

## Installation

```bash
git clone https://github.com/dotneet/agent-session-view.git
cd agent-session-view
bun install
```

## Usage

```bash
bun run start
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `↑` `↓` | Select session |
| `Enter` | View session details |
| `TAB` | Switch between Claude Code / Codex |
| `t` | Export as text |
| `h` | Export as HTML |
| `q` / `ESC` | Back / Exit |

### Export

Exported files are saved to the `./exported/` directory.

- **Text format**: `session-<id>.txt`
- **HTML format**: `session-<id>.html` - Styled with CSS, long messages are collapsible

#### Export Options (Default)

| Option | Default |
|--------|---------|
| User messages | Enabled |
| Assistant messages | Enabled |
| Tool use | Disabled |
| Thinking | Disabled |

## Tech Stack

- TypeScript
- Bun
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs

## Development

```bash
# Development mode (auto-restart on file changes)
bun run dev
```

## License

MIT
