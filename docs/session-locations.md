Session Search Mechanism

  1. Session File Storage Locations
  ┌─────────────┬───────────────────────────────┬────────────────────────────────────────┐
  │    Agent    │             Path              │              File Format               │
  ├─────────────┼───────────────────────────────┼────────────────────────────────────────┤
  │ Claude Code │ ~/.claude/projects/<project>/ │ *.jsonl, *.ndjson                      │
  ├─────────────┼───────────────────────────────┼────────────────────────────────────────┤
  │ Codex CLI   │ ~/.codex/sessions/            │ rollout-YYYY-MM-DDThh-mm-ss-UUID.jsonl │
  └─────────────┴───────────────────────────────┴────────────────────────────────────────┘

  Flow:
  1. Filesystem scan (identify by extension/prefix)
  2. Lightweight parse (metadata extraction)
  3. Full-text search with SQLite FTS
  4. Full parse on demand (lazy loading)

  3. Key Differences Between Claude Code and Codex
  ┌────────────────────┬────────────────────────┬────────────────────────────────────────┐
  │        Item        │         Codex          │              Claude Code               │
  ├────────────────────┼────────────────────────┼────────────────────────────────────────┤
  │ Filename           │ rollout- prefix        │ UUID format                            │
  ├────────────────────┼────────────────────────┼────────────────────────────────────────┤
  │ Message structure  │ Flat (role, text)      │ Nested (message.content[] blocks)      │
  ├────────────────────┼────────────────────────┼────────────────────────────────────────┤
  │ Initial scan       │ Full file read         │ Lightweight metadata extraction        │
  ├────────────────────┼────────────────────────┼────────────────────────────────────────┤
  │ Lazy loading       │ None                   │ Full parse via reloadSession()         │
  ├────────────────────┼────────────────────────┼────────────────────────────────────────┤
  │ Cache              │ Individual impl        │ Top 256 cached via TranscriptCache     │
  └────────────────────┴────────────────────────┴────────────────────────────────────────┘
