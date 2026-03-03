# Phase 0 - Source Intake and Alignment

## Objective
Establish a shared source-of-truth before implementation begins.

## Inputs from Major Domo
- OpenClaw core repo: `https://github.com/openclaw/openclaw`
- Local OpenClaw docs path: `/opt/homebrew/lib/node_modules/openclaw/docs`
- Current command-center working repo: `/Users/majordomo/Documents/New project`
- Preferred stack: TypeScript, React/Vite/Tailwind/Zustand, Node/Fastify/ws
- Preferred transport: local HTTP + WebSocket
- Recommended remote setup:
  - `origin` -> `git@github.com:majordomo/openclaw-command-center.git`
  - optional read-only reference remote:
    - `openclaw-core` -> `https://github.com/openclaw/openclaw.git`

## Acceptance Criteria
1. Canonical repos are explicitly listed and owner namespaces confirmed
2. Architecture and contract docs exist in this repository
3. Week-1 board exists with P0 workflows and testable outcomes
4. Security plan includes token rotation order and verification commands

## Security Fix Order (P0)
1. Rotate `gateway.auth.token` to a long random value (32+ chars)
2. Rotate `hooks.token` to a different long random value
3. Keep local bind on `127.0.0.1` unless remote access is required
4. Update clients/bridge with rotated gateway token
5. Verify using `openclaw status` and `openclaw security audit`

### Command Sequence (from Major Domo)
```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d-%H%M%S)
NEW_GATEWAY_TOKEN="$(openssl rand -hex 32)"
NEW_HOOKS_TOKEN="$(openssl rand -hex 32)"
openclaw config set --strict-json gateway.auth.token "\"$NEW_GATEWAY_TOKEN\""
openclaw config set --strict-json hooks.token "\"$NEW_HOOKS_TOKEN\""
openclaw config set --strict-json gateway.bind "\"loopback\""
export OPENCLAW_GATEWAY_TOKEN="$NEW_GATEWAY_TOKEN"
openclaw gateway restart
openclaw gateway probe --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw status
openclaw security audit
```

## Known Risks
- Gateway token mismatch currently blocks direct gateway path
- Repository remotes are not yet created/verified in this workspace
- No app scaffold exists yet (`/gui`, `/bridge` pending)

## Next Step
Start Day 1 tasks in `WEEK1.md` and scaffold `/gui` and `/bridge`.
