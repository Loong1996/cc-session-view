# AI Agent Guidance

This file provides guidance to AI Agent when working with code in this repository.

## Project Overview

Agent Session View is a web application for browsing conversation history from Claude Code and Codex CLI.

## Commands

```bash
# Development
bun run dev          # Web server with HMR (http://localhost:3456)

# Production
bun run start        # Web server mode

# Testing
bun test             # Run all tests
bun test --watch     # Watch mode
bun test src/lib/filter.test.ts  # Run single test file

# Code Quality
bun run check:fix    # Fix lint + format issues (recommended)
bun run lint:fix     # Auto-fix lint warnings only
```

## Architecture

### Web Server

Bun.serve HTTP server in [server.ts](src/server.ts) with React frontend in [web/frontend.tsx](src/web/frontend.tsx). Entry point: [index.tsx](src/index.tsx).

### Session Data Flow

```
Session Files (JSONL)          Parsers                    UI
~/.claude/projects/*/sessions/  →  claude-code-parser.ts  →  Web components
~/.codex/sessions/              →  codex-parser.ts        →
```

**Key difference in session formats:**
- Claude Code: Nested content blocks with tool use and thinking blocks
- Codex CLI: Flat message structure with function calls

### Core Libraries ([src/lib/](src/lib/))

- **types.ts**: SessionSummary, SessionDetail, Message types
- **claude-code-parser.ts / codex-parser.ts**: Parse JSONL session files
- **filter.ts**: Search, date filtering, project filtering logic
- **exporter.ts**: Export to HTML/text/markdown with styling

### Component Structure

Web components in [src/web/components/](src/web/components/) use React DOM.

## Code Style

Enforced by Biome (pre-commit hooks auto-fix):
- 2 spaces, double quotes, no semicolons
- Line width: 100 characters

**Language**: Always use English for:
- Code comments
- Documentation (README, CLAUDE.md, etc.)
- Commit messages
- Variable/function names

## Testing

Tests use Bun's built-in test runner:

```typescript
import { describe, expect, test } from "bun:test"
```

## Tech Constraints

- **Use Bun APIs**: Bun.serve, Bun.file, Bun.Glob (not Express, fs, etc.)
- **No external build tools**: Bun handles bundling, transpilation, HMR
