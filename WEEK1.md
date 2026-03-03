# Week 1 Execution Board

## Day 1 - Foundation
- [x] Create `/gui` and `/bridge` directories
- [x] Add root `README.md`, `.gitignore`, and `CONTRIBUTING.md`
- [x] Document high-level architecture in `docs/architecture.md`
- [x] Commit baseline project scaffold

## Day 2 - Contract and Stubs
- [x] Finalize `docs/gui-tui-contract-v0.md`
- [x] Add schemas for `Session`, `Message`, `ToolCall`, `Job`
- [x] Implement bridge stub endpoints (`status`, `sessions`, `messages`, `jobs`)
- [x] Add fake WebSocket event emitter for GUI development

## Day 3 - GUI Shell
- [ ] Build 3-pane layout: session list, conversation, activity log
- [ ] Add system status widget
- [ ] Wire GUI to stub bridge endpoints
- [ ] Add loading, empty, and error states

## Day 4 - First Real Integration
- [ ] Connect `status`, `sessions`, and `history` to real OpenClaw operations
- [ ] Implement end-to-end send message flow
- [ ] Capture structured audit entries for mutating actions
- [ ] Track integration issues in `docs/integration-issues.md`

## Day 5 - Jobs and Reminders
- [ ] Implement list/create/cancel reminder UI flow
- [ ] Show next-run preview and confirmation for deletions
- [ ] Validate and normalize reminder payloads in bridge
- [ ] Add incident banner for gateway/auth failures

## Day 6 - Hardening
- [ ] Enforce tool allowlist and payload validation
- [ ] Add timeout + retry strategy by endpoint
- [ ] Add contract-level tests
- [ ] Run failure drills (timeouts, malformed payloads, disconnects)

## Day 7 - Demo and Sprint 2 Prep
- [ ] Run end-to-end demo with 5 P0 workflows
- [ ] Produce sprint-2 backlog with priorities
- [ ] Tag `v0.1-demo`
- [ ] Document local setup and runbook

## P0 Workflows to Demo
1. Dashboard health and recent errors
2. Session list -> open history -> send message -> stream reply
3. Run approved tool action -> show structured result and audit log
4. Create and cancel reminder with next-run preview
5. Recover from auth mismatch and re-run health checks
