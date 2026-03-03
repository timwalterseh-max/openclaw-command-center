# GUI <-> TUI Bridge Contract (v0)

## Decision
Use local HTTP for request/response actions plus WebSocket for streaming events.

Rationale:
- Stable typed surface for GUI
- Better streaming UX than CLI output parsing
- Easier retries, timeout handling, and observability

## Versioning
- Contract version header: `x-contract-version: 0`
- Backward-compatible additions allowed in v0
- Breaking changes require version bump

## Canonical Objects

### Session
```json
{
  "sessionKey": "agent:domo-gui:main",
  "label": "Main",
  "runtime": "openclaw",
  "model": "gpt-5.3-codex",
  "active": true,
  "lastMessageAt": "2026-03-03T06:30:00Z"
}
```

### Message
```json
{
  "id": "msg_123",
  "sessionKey": "agent:domo-gui:main",
  "role": "user",
  "content": "Summarize status",
  "createdAt": "2026-03-03T06:30:01Z",
  "toolCalls": []
}
```

### ToolCall
```json
{
  "name": "sessions_list",
  "args": {"limit": 20},
  "status": "running",
  "startedAt": "2026-03-03T06:30:02Z",
  "endedAt": null,
  "resultSummary": null
}
```

### Job
```json
{
  "jobId": "job_abc",
  "name": "Daily reminder",
  "schedule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=0",
  "enabled": true,
  "lastRunAt": null,
  "nextRunAt": "2026-03-03T14:00:00Z"
}
```

### SystemStatus
```json
{
  "gateway": "healthy",
  "host": "127.0.0.1:18789",
  "model": "gpt-5.3-codex",
  "workspace": "/Users/majordomo/Documents/New project",
  "uptimeSeconds": 3600
}
```

## Read APIs
- `GET /api/status` -> `SystemStatus`
- `GET /api/sessions` -> `Session[]`
- `GET /api/sessions/:sessionKey/messages?limit=100` -> `Message[]`
- `GET /api/jobs` -> `Job[]`

## Action APIs
- `POST /api/sessions/:sessionKey/messages`
  - body: `{ "text": "..." }`
- `POST /api/sessions/spawn`
  - body: `{ "runtime": "...", "agentId": "...", "task": "...", "mode": "..." }`
- `POST /api/tools/run`
  - body: `{ "toolName": "...", "args": {}, "confirmExternal": false }`
- `POST /api/jobs/reminders`
  - body: `{ "when": "...", "text": "...", "targetSession": "..." }`
- `DELETE /api/jobs/:jobId`

## Event Stream (WebSocket)
Server emits:
- `system.alert`
- `session.updated`
- `message.created`
- `toolcall.updated`
- `job.updated`

Event envelope:
```json
{
  "type": "message.created",
  "ts": "2026-03-03T06:31:00Z",
  "payload": {}
}
```

## Error Envelope
All non-2xx responses follow:
```json
{
  "error": {
    "code": "TOOL_TIMEOUT|VALIDATION_ERROR|UNAUTHORIZED|INTERNAL",
    "message": "human-readable",
    "retryable": true,
    "details": {}
  }
}
```

## Guardrails
- Tool allowlist enforced in bridge for `/api/tools/run`
- Redact secrets from logs/events
- Require `confirmExternal=true` for externally visible actions
- Audit every mutating request with actor, timestamp, request, result
