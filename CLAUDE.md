# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Session View is a dual-interface application for browsing conversation history from Claude Code and Codex CLI. It provides both a Terminal UI (TUI) and a web interface.

## Commands

```bash
# Development
bun run dev          # TUI with auto-restart
bun run web:dev      # Web server with HMR (http://localhost:3456)

# Production
bun run start        # TUI mode
bun run web          # Web server mode

# Testing
bun test             # Run all tests
bun test --watch     # Watch mode
bun test src/lib/filter.test.ts  # Run single test file

# Code Quality
bun run check:fix    # Fix lint + format issues (recommended)
bun run lint:fix     # Auto-fix lint warnings only
```

## Architecture

### Dual-Mode Design

The application runs in two modes, switched via the `web` subcommand in [index.tsx](src/index.tsx):

1. **TUI Mode**: React + Ink renders to terminal. Main component in [App.tsx](src/App.tsx)
2. **Web Mode**: Bun.serve HTTP server in [server.ts](src/server.ts) with React frontend in [web/frontend.tsx](src/web/frontend.tsx)

### Session Data Flow

```
Session Files (JSONL)          Parsers                    UI
~/.claude/projects/*/sessions/  →  claude-code-parser.ts  →  SessionList/SessionDetail
~/.codex/sessions/              →  codex-parser.ts        →  (TUI or Web components)
```

**Key difference in session formats:**
- Claude Code: Nested content blocks with tool use and thinking blocks
- Codex CLI: Flat message structure with function calls

### Core Libraries ([src/lib/](src/lib/))

- **types.ts**: SessionSummary, SessionDetail, Message types
- **claude-code-parser.ts / codex-parser.ts**: Parse JSONL session files
- **filter.ts**: Search, date filtering, project filtering logic
- **exporter.ts**: Export to HTML/text with styling

### Component Structure

TUI components ([src/components/](src/components/)) use Ink, web components ([src/web/components/](src/web/components/)) use React DOM. They share similar structure but are separate implementations.

## Code Style

Enforced by Biome (pre-commit hooks auto-fix):
- 2 spaces, double quotes, no semicolons
- Line width: 100 characters

## Testing

Tests use Bun's built-in test runner:

```typescript
import { describe, expect, test } from "bun:test"
```

## Tech Constraints

- **Use Bun APIs**: Bun.serve, Bun.file, Bun.Glob (not Express, fs, etc.)
- **TUI components must use Ink**: All text in `<Text>`, layouts with `<Box>`
- **No external build tools**: Bun handles bundling, transpilation, HMR
