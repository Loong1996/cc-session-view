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
| `bun run start` | Start in TUI mode |
| `bun run dev` | TUI mode with auto-restart on file changes |
| `bun run web` | Start web server mode |
| `bun run web:dev` | Web server mode with HMR enabled |

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
├── index.tsx           # Entry point (TUI/Web mode switch)
├── App.tsx             # TUI main application
├── server.ts           # Web server
├── api/
│   └── handlers.ts     # API handlers
├── components/         # TUI Ink components
│   ├── SessionList.tsx
│   ├── SessionDetail.tsx
│   ├── SessionPreview.tsx
│   ├── FilterBar.tsx
│   ├── SearchBar.tsx
│   ├── TabSelector.tsx
│   └── ...
├── hooks/
│   └── usePreviewSession.ts
├── lib/                # Utilities and parsers
│   ├── types.ts        # Type definitions
│   ├── claude-code-parser.ts  # Claude Code session parser
│   ├── codex-parser.ts # Codex CLI session parser
│   ├── exporter.ts     # Export functionality
│   ├── filter.ts       # Filtering logic
│   └── ...
└── web/                # Web UI
    ├── frontend.tsx    # React frontend
    └── components/     # Web components
```

## Tech Stack

- **Runtime**: Bun
- **TUI**: React + [Ink](https://github.com/vadimdemedes/ink)
- **Web**: Bun.serve + React
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

### Manual Setup (New Project)

If you want to set up Lefthook in a new project from scratch:

1. Install Lefthook as a dev dependency:

```bash
bun add -d lefthook
```

2. Create `lefthook.yml` in the project root:

```yaml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{js,ts,jsx,tsx,json}"
      run: bunx biome check --staged --no-errors-on-unmatched --colors=off
      stage_fixed: true
    biome-format:
      glob: "*.{js,ts,jsx,tsx,json}"
      run: bunx biome format --staged --no-errors-on-unmatched --write --colors=off
      stage_fixed: true
```

3. Add the prepare script to `package.json`:

```json
{
  "scripts": {
    "prepare": "lefthook install"
  }
}
```

4. Install the git hooks:

```bash
bun run prepare
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `parallel` | Run commands in parallel |
| `glob` | File patterns to match |
| `run` | Command to execute |
| `stage_fixed` | Automatically stage files fixed by the command |
| `--staged` | Only check staged files |
| `--no-errors-on-unmatched` | Don't error if no files match |

### Skipping Hooks

To skip pre-commit hooks temporarily:

```bash
git commit --no-verify -m "commit message"
```

## Architecture

### Operating Modes

1. **TUI Mode** (`bun run start`): Interactive terminal UI using Ink
2. **Web Mode** (`bun run web`): Browser-accessible web interface

### Session Data

Session data is loaded from the following directories:

- **Claude Code**: `~/.claude/projects/*/sessions/*.jsonl`
- **Codex CLI**: `~/.codex/sessions/*.jsonl`

### Export

Exported files are saved to the `./exported/` directory.
