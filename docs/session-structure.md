# Session File Structure Details

This document describes the detailed structure of session files for Claude Code and Codex CLI.

## 1. Claude Code

### File Storage Location

```
~/.claude/projects/<project-path-encoded>/
```

The project path is encoded with `-` separators (e.g., `/Users/username/projects/myapp` → `-Users-username-projects-myapp`).

### File Format

- **Format**: JSONL (JSON Lines)
- **Filename**: `<UUID>.jsonl` or `agent-<hash>.jsonl`
- **Example**: `7fdbec67-bddd-4dcf-960b-14fa16a2fb44.jsonl`

### Record Types

Each line is an independent JSON object, with the type determined by the `type` field.

#### 1.1 file-history-snapshot

Snapshot of file change history.

```json
{
  "type": "file-history-snapshot",
  "messageId": "c3b9f6d5-50da-44b0-ac5b-1bb9614b724e",
  "snapshot": {
    "messageId": "c3b9f6d5-50da-44b0-ac5b-1bb9614b724e",
    "trackedFileBackups": {},
    "timestamp": "2026-01-14T09:18:22.689Z"
  },
  "isSnapshotUpdate": false
}
```

#### 1.2 user

Message from the user.

```json
{
  "type": "user",
  "parentUuid": null,
  "uuid": "c3b9f6d5-50da-44b0-ac5b-1bb9614b724e",
  "sessionId": "7fdbec67-bddd-4dcf-960b-14fa16a2fb44",
  "timestamp": "2026-01-14T09:18:22.684Z",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/username/projects/myapp",
  "version": "2.1.7",
  "gitBranch": "main",
  "message": {
    "role": "user",
    "content": "Please perform the refactoring.\ntasks/refactor01.md"
  },
  "thinkingMetadata": {
    "level": "high",
    "disabled": false,
    "triggers": []
  },
  "todos": []
}
```

**Main Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"user"` |
| `parentUuid` | string \| null | UUID of parent message (conversation tree structure) |
| `uuid` | string | Unique identifier for this message |
| `sessionId` | string | Session ID |
| `timestamp` | string | ISO 8601 format timestamp |
| `isSidechain` | boolean | Whether this is a sidechain (branched conversation) |
| `userType` | string | User type (e.g., `"external"`) |
| `cwd` | string | Working directory |
| `version` | string | Claude Code version |
| `gitBranch` | string | Git branch name |
| `message` | object | Message body |
| `message.role` | string | `"user"` |
| `message.content` | string \| array | Message content (string or content blocks array) |
| `thinkingMetadata` | object | Thinking level settings |
| `todos` | array | Todo list |

#### 1.3 assistant

Response from the assistant.

```json
{
  "type": "assistant",
  "parentUuid": "c3b9f6d5-50da-44b0-ac5b-1bb9614b724e",
  "uuid": "3c825d7c-eeaf-4ce6-9009-cbc22fc7990d",
  "sessionId": "7fdbec67-bddd-4dcf-960b-14fa16a2fb44",
  "timestamp": "2026-01-14T09:18:26.300Z",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/username/projects/myapp",
  "version": "2.1.7",
  "gitBranch": "main",
  "requestId": "req_011CX729h7ECLMNMAQEp3YZ5",
  "message": {
    "model": "claude-opus-4-5-20251101",
    "id": "msg_01YN9ViHJgJzZVWEGCA8eg7k",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "thinking",
        "thinking": "The user is requesting a refactoring...",
        "signature": "..."
      },
      {
        "type": "text",
        "text": "Understood. I will start the refactoring."
      },
      {
        "type": "tool_use",
        "id": "toolu_01GkFFLi3j5PxyAnQmRgbs3v",
        "name": "Read",
        "input": {
          "file_path": "/Users/username/projects/myapp/tasks/refactor01.md"
        }
      }
    ],
    "stop_reason": "end_turn",
    "stop_sequence": null,
    "usage": {
      "input_tokens": 10,
      "cache_creation_input_tokens": 9609,
      "cache_read_input_tokens": 14590,
      "output_tokens": 155,
      "service_tier": "standard"
    }
  }
}
```

**Content block types in message.content:**

| Type | Description |
|------|-------------|
| `thinking` | Model's thought process (extended thinking) |
| `text` | Text output |
| `tool_use` | Tool invocation |
| `tool_result` | Tool execution result (returned with user role) |

**tool_use structure:**

```json
{
  "type": "tool_use",
  "id": "toolu_01GkFFLi3j5PxyAnQmRgbs3v",
  "name": "Read",
  "input": {
    "file_path": "/path/to/file"
  }
}
```

**tool_result structure (within user message):**

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01GkFFLi3j5PxyAnQmRgbs3v",
  "content": "File contents..."
}
```

### Conversation Tree Structure

Claude Code builds a conversation tree using `parentUuid` and `uuid`:

```
user (uuid: A, parentUuid: null)
  └── assistant (uuid: B, parentUuid: A)
       └── user (uuid: C, parentUuid: B)  ← tool_result
            └── assistant (uuid: D, parentUuid: C)
```

When `isSidechain: true`, it indicates a branched conversation flow.

### Subagent Data Structure

Claude Code can spawn subagents (child agents) to handle specific tasks. These subagents have their own session files stored in a dedicated directory.

#### Directory Structure

```
~/.claude/projects/<project-path-encoded>/
├── <session-uuid>.jsonl           # Main session file
└── <session-uuid>/
    └── subagents/
        ├── agent-<agent-id>.jsonl # Subagent session file
        ├── agent-<agent-id>.jsonl
        └── ...
```

**Example:**

```
~/.claude/projects/-Users-username-projects-myapp/
├── a9371efd-83f2-4781-96de-dfec40f1b4f2.jsonl
└── a9371efd-83f2-4781-96de-dfec40f1b4f2/
    └── subagents/
        └── agent-a750744.jsonl
```

#### Subagent File Format

Subagent files use the same JSONL format as main session files, with additional fields:

```json
{
  "parentUuid": null,
  "isSidechain": true,
  "userType": "external",
  "cwd": "/Users/username/projects/myapp",
  "sessionId": "a9371efd-83f2-4781-96de-dfec40f1b4f2",
  "version": "2.1.9",
  "gitBranch": "main",
  "agentId": "a750744",
  "type": "user",
  "message": {
    "role": "user",
    "content": "Task description for the subagent..."
  },
  "uuid": "e5cf7612-4d9b-41bb-8b5a-02ba61ffd62e",
  "timestamp": "2026-01-16T07:18:14.317Z"
}
```

#### Key Differences from Main Session

| Field | Main Session | Subagent |
|-------|-------------|----------|
| `agentId` | Not present | Present (e.g., `"a750744"`) |
| `isSidechain` | `false` (typically) | `true` |
| `sessionId` | Own UUID | **Same as parent session** |
| `model` | User-configured model | May differ (e.g., `claude-haiku-4-5-20251001`) |

#### Important Notes

1. **Shared sessionId**: Subagents share the same `sessionId` as their parent session. This is intentional for tracking purposes but can cause issues if not handled properly during session listing.

2. **isSidechain flag**: Subagent messages always have `isSidechain: true`, indicating they are branched conversations.

3. **agentId**: Each subagent has a unique `agentId` (short hash), which is also reflected in the filename (`agent-<agentId>.jsonl`).

4. **Model flexibility**: Subagents may use different models than the parent session (e.g., using Haiku for faster, simpler tasks).

#### Parsing Considerations

When listing sessions, **exclude subagent files** to avoid duplicates:

```typescript
// Correct: Only match project-level .jsonl files
const glob = new Bun.Glob("*/*.jsonl")

// Incorrect: This includes subagent files and causes duplicates
const glob = new Bun.Glob("**/*.jsonl")
```

To identify subagent files programmatically:
- Check if the path contains `/subagents/`
- Check for the presence of `agentId` field in records
- Check if `isSidechain` is `true` for all records

---

## 2. Codex CLI

Codex CLI has two file formats (old and new versions).

### 2.1 New Version (JSONL Format)

#### File Storage Location

```
~/.codex/sessions/YYYY/MM/DD/
```

Organized in a year/month/day directory structure.

#### File Format

- **Format**: JSONL (JSON Lines)
- **Filename**: `rollout-YYYY-MM-DDThh-mm-ss-<UUID>.jsonl`
- **Example**: `rollout-2026-01-16T00-42-48-019bc252-da71-7dc3-9acb-55c6b5993c62.jsonl`

#### Record Types

Each line has `type` and `payload`.

##### session_meta

Session metadata. Appears once at the beginning of the file.

```json
{
  "timestamp": "2026-01-15T15:42:48.449Z",
  "type": "session_meta",
  "payload": {
    "id": "019bc252-da71-7dc3-9acb-55c6b5993c62",
    "timestamp": "2026-01-15T15:42:48.433Z",
    "cwd": "/Users/username/projects/myapp",
    "originator": "codex_cli_rs",
    "cli_version": "0.80.0",
    "instructions": "...",
    "source": "cli",
    "model_provider": "openai",
    "git": {
      "commit_hash": "eb88330832b4424757e82b404e0ff98e65be4fa7",
      "branch": "main",
      "repository_url": "git@github.com:username/myapp.git"
    }
  }
}
```

##### response_item

Message (user or assistant).

**User message:**

```json
{
  "timestamp": "2026-01-15T15:43:38.571Z",
  "type": "response_item",
  "payload": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "Please suggest refactoring with a focus on long-term maintainability."
      }
    ]
  }
}
```

**Assistant message (function call):**

```json
{
  "timestamp": "2026-01-15T15:43:46.173Z",
  "type": "response_item",
  "payload": {
    "type": "function_call",
    "name": "shell_command",
    "arguments": "{\"command\":\"ls\",\"workdir\":\"/Users/username/projects/myapp\"}",
    "call_id": "call_cVqbFjeh33qqmk9AXzyf6DYc"
  }
}
```

**Function call result:**

```json
{
  "timestamp": "2026-01-15T15:43:56.202Z",
  "type": "response_item",
  "payload": {
    "type": "function_call_output",
    "call_id": "call_cVqbFjeh33qqmk9AXzyf6DYc",
    "output": "Exit code: 0\nOutput:\nfile1.ts\nfile2.ts\n..."
  }
}
```

##### event_msg

User action event.

```json
{
  "timestamp": "2026-01-15T15:43:38.571Z",
  "type": "event_msg",
  "payload": {
    "type": "user_message",
    "message": "Please suggest refactoring with a focus on long-term maintainability.",
    "images": []
  }
}
```

**payload.type varieties:**

| Type | Description |
|------|-------------|
| `message` | Regular message |
| `function_call` | Function (tool) invocation |
| `function_call_output` | Function execution result |
| `input_text` | User input text |
| `user_message` | User message event |

---

### 2.2 Old Version (JSON Format)

#### File Storage Location

```
~/.codex/sessions/
```

Saved directly in the root directory.

#### File Format

- **Format**: JSON (single object)
- **Filename**: `rollout-YYYY-MM-DD-<UUID>.json`
- **Example**: `rollout-2025-05-16-0247c761-2a5b-4e01-bbf1-82a18d786ad6.json`

#### Structure

```json
{
  "session": {
    "timestamp": "2025-05-16T15:57:38.848Z",
    "id": "0247c761-2a5b-4e01-bbf1-82a18d786ad6",
    "instructions": ""
  },
  "items": [
    { ... },
    { ... }
  ]
}
```

#### Object Types in items Array

##### message (User Message)

```json
{
  "role": "user",
  "type": "message",
  "content": [
    {
      "type": "input_text",
      "text": "User input text"
    }
  ]
}
```

##### reasoning

Model's reasoning process.

```json
{
  "id": "rs_68276016ffd88198adf4713f1b062e3b0b96c850c376c347",
  "type": "reasoning",
  "summary": [],
  "duration_ms": 3736
}
```

##### local_shell_call

Shell command execution.

```json
{
  "id": "lsh_682760191dcc81988d6fd264a28a7e420b96c850c376c347",
  "type": "local_shell_call",
  "status": "completed",
  "action": {
    "type": "exec",
    "command": ["bash", "-lc", "ls -la"],
    "env": {},
    "timeout_ms": 120000,
    "user": "root",
    "working_directory": "/Users/username/projects/"
  },
  "call_id": "call_xyxnTM81oQySE18Oqkjuhfrq"
}
```

##### local_shell_call_output

Shell command output.

```json
{
  "type": "local_shell_call_output",
  "call_id": "call_xyxnTM81oQySE18Oqkjuhfrq",
  "output": "{\"output\":\"...\",\"metadata\":{\"exit_code\":0,\"duration_seconds\":6.6}}"
}
```

---

## 3. Comparison Table

| Item | Claude Code | Codex CLI (New) | Codex CLI (Old) |
|------|-------------|-----------------|-----------------|
| **File format** | JSONL | JSONL | JSON |
| **Storage location** | `~/.claude/projects/<project>/` | `~/.codex/sessions/YYYY/MM/DD/` | `~/.codex/sessions/` |
| **Filename** | `<UUID>.jsonl` | `rollout-<datetime>-<UUID>.jsonl` | `rollout-<date>-<UUID>.json` |
| **Message structure** | Nested (content blocks) | Flat (payload) | items array |
| **Conversation tree** | `parentUuid` / `uuid` | None (chronological) | None (chronological) |
| **Thinking process** | `thinking` content block | `reasoning` item | `reasoning` item |
| **Tool invocation** | `tool_use` / `tool_result` | `function_call` / `function_call_output` | `local_shell_call` / `local_shell_call_output` |
| **Session metadata** | Included in each record | `session_meta` record | `session` object |

---

## 4. Parsing Considerations

### Claude Code

1. **Reconstructing conversation tree**: Need to trace `parentUuid` to reconstruct the conversation flow
2. **Processing content blocks**: `message.content` can be either a string or an array
3. **tool_result location**: Tool results are recorded as `user` type messages
4. **Sidechains**: Messages with `isSidechain: true` should be treated as separate flows

### Codex CLI

1. **Version detection**: Can be determined by file extension (`.jsonl` vs `.json`)
2. **JSONL processing**: Parse JSON line by line
3. **Sort by timestamp**: Records are stored in chronological order
4. **Parsing output**: `local_shell_call_output.output` may be embedded as a JSON string
