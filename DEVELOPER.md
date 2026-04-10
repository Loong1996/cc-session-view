# Developer Guide

Setup and development guide for contributors.

## Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Setup

```bash
# Clone the repository
git clone https://github.com/dotneet/agent-session-view.git
cd agent-session-view

# Install dependencies (pre-commit hooks are automatically configured)
bun install
```

## Development Commands

### Application

| Command | Description |
|---------|-------------|
| `bun run start` | Start web server |
| `bun run dev` | Web server with HMR enabled |

### Code Quality

| Command | Description |
|---------|-------------|
| `bun run lint` | Run linter |
| `bun run lint:fix` | Auto-fix lint warnings |
| `bun run format` | Format code |
| `bun run format:check` | Check formatting without changes |
| `bun run check` | Run lint + format check |
| `bun run check:fix` | Auto-fix lint + format issues |

## Project Structure

```
src/
├── index.tsx           # Entry point (starts web server)
├── server.ts           # Web server (Bun.serve)
├── api/
│   └── handlers.ts     # API handlers
├── lib/                # Utilities and parsers
│   ├── types.ts        # Type definitions
│   ├── claude-code-parser.ts  # Claude Code session parser
│   ├── codex-parser.ts # Codex CLI session parser
│   ├── exporter.ts     # Export functionality (HTML/text/markdown)
│   ├── filter.ts       # Filtering logic
│   └── format.ts       # Timestamp formatting
└── web/                # Web UI
    ├── index.html      # HTML entry point
    ├── frontend.tsx     # React frontend app
    ├── styles.css       # Styles
    └── components/      # React DOM components
        ├── SessionListView.tsx
        ├── SessionDetailView.tsx
        ├── MessageRenderer.tsx
        ├── BranchDetailView.tsx
        ├── SearchFilterBar.tsx
        ├── ExportAllBar.tsx
        └── TabBar.tsx
```

## Tech Stack

- **Runtime**: Bun
- **Web**: Bun.serve + React DOM
- **Linter/Formatter**: [Biome](https://biomejs.dev/)
- **Git Hooks**: [Lefthook](https://github.com/evilmartians/lefthook)

## Code Style

- Auto-formatting and linting by Biome
- Indentation: 2 spaces
- Semicolons: omitted
- Quotes: double quotes
- Line width: 100 characters

## Pre-commit Hooks

### Automatic Setup

Lefthook is automatically configured when running `bun install`. The following checks run before each commit:

- `biome check`: Lint + format check
- `biome format`: Auto-format

To manually reconfigure:

```bash
bun run prepare
```

### Skipping Hooks

To skip pre-commit hooks temporarily:

```bash
git commit --no-verify -m "commit message"
```

## Architecture

### Session Data

Session data is loaded from the following directories:

- **Claude Code**: `~/.claude/projects/*/sessions/*.jsonl`
- **Codex CLI**: `~/.codex/sessions/*.jsonl`

### Export

- **Single session**: Downloaded from the browser as HTML/text/markdown
- **Bulk export**: Saved to `./exported/all-sessions-{timestamp}/` directory, organized by project subdirectories
- **File naming**: `{agentType}--{YYYY-MM-DD}--{session_id}.{ext}`
