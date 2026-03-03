# Command Center Architecture (v0)

## Goal
Build a local Command Center GUI on top of OpenClaw with a stable typed bridge instead of parsing raw TUI output.

## Scope (Week 1)
- Display system/gateway health and active sessions
- Open a session, view history, send a message, stream response
- Run approved tool actions with audit trail
- Create and cancel reminders (cron)
- Handle auth/reconnect failure flow

## Components
1. GUI App (`/gui`)
- React + Vite + Tailwind + Zustand
- Presents session, chat, activity, and jobs surfaces
- Calls bridge HTTP APIs and subscribes to bridge WebSocket events

2. Bridge Service (`/bridge`)
- Node.js + Fastify + `ws`
- Converts GUI calls to OpenClaw-facing operations
- Normalizes errors and emits structured events
- Enforces allowlist and confirmation gates for mutating actions

3. OpenClaw Runtime (external)
- Provides sessions, tools, jobs, status, and messaging primitives
- Feeds streaming and state events back through bridge

## Data Flow
1. GUI sends action via HTTP to bridge
2. Bridge validates payload and authorization/allowlist
3. Bridge executes OpenClaw action
4. Bridge stores audit record and returns normalized response
5. Bridge emits live events over WebSocket for UI updates

## Reliability and Security Baseline
- Local bind only (`127.0.0.1`) for bridge and gateway in v0
- Distinct secrets for gateway token and hooks token
- Mutating actions require confirmation flag in API payload
- Standardized error envelope for retries/timeouts

## Open Questions
- Canonical remote repository URLs need final owner namespace assignment
- Final auth/token lifecycle for production-like usage is still pending
