# OpenClaw Command Center — Acceptance Checklist (v0.1)

Date: 2026-03-03
Owner: Major Domo

## Smoke Gate (must all PASS)

- [ ] 1) Dashboard loads
  - Expected: Header shows `OK|DEGRADED|FAIL` + Inbox/Queue + Tasks + Runs/Alerts panels.
  - Evidence: screenshot `artifacts/v0.1/dashboard.png`

- [ ] 2) Dry-run action works
  - Expected: `approve|retry|snooze|escalate` in dry-run mode returns no mutation and clear preview.
  - Evidence: response/log capture `artifacts/v0.1/dry-run.txt`

- [ ] 3) Real action works
  - Expected: one real action succeeds and returns success envelope.
  - Evidence: response/log capture `artifacts/v0.1/real-action.txt`

- [ ] 4) Audit event recorded
  - Expected: new entry appears in audit trail with timestamp, status, summary, detail.
  - Evidence: `artifacts/v0.1/audit-tail.txt`

- [ ] 5) Discord topology visible
  - Expected: topology tile/API reports token presence + configured channel count + 9 agents.
  - Evidence: `artifacts/v0.1/discord-topology.json`

## Security/Trust Gate (must PASS)

- [ ] Mutating endpoints require auth token
- [ ] Side-effect routes are POST-only
- [ ] Error envelopes are sanitized (no raw provider internals)
- [ ] Dry-run available for operator actions

## Build/Test Gate (must PASS)

- [ ] `bridge test` green
- [ ] `bridge build` green
- [ ] `gui build` green

## Release Decision

- [ ] **PASS all above → Tag baseline as `v0.1` and freeze scope**
- [ ] **Any FAIL → fix + rerun smoke gate before tagging**
