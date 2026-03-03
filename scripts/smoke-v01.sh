#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/artifacts/v0.1"
mkdir -p "$ART"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "== Build/Test gate =="
cd "$ROOT/bridge"
npm test >/tmp/bridge-test.log 2>&1 || { cat /tmp/bridge-test.log; fail "bridge test"; }
pass "bridge test"

npm run build >/tmp/bridge-build.log 2>&1 || { cat /tmp/bridge-build.log; fail "bridge build"; }
pass "bridge build"

cd "$ROOT/gui"
npm run build >/tmp/gui-build.log 2>&1 || { cat /tmp/gui-build.log; fail "gui build"; }
pass "gui build"

echo "== Runtime checks (requires bridge running on :4000) =="

cd "$ROOT"
if ! curl -fsS http://127.0.0.1:4000/health >/dev/null; then
  fail "bridge not reachable on 127.0.0.1:4000 (start bridge dev server first)"
fi
pass "bridge health"

# 1) Dashboard payload
curl -fsS "http://127.0.0.1:4000/api/dashboard" | tee "$ART/dashboard.json" >/dev/null
pass "dashboard payload"

# 2) Dry-run action
curl -fsS -X POST "http://127.0.0.1:4000/api/run/action" \
  -H 'content-type: application/json' \
  -d '{"action":"retry","targetId":"demo-run","dryRun":true}' \
  | tee "$ART/dry-run.json" >/dev/null
pass "dry-run action"

# 3) Real action
curl -fsS -X POST "http://127.0.0.1:4000/api/run/action" \
  -H 'content-type: application/json' \
  -d '{"action":"retry","targetId":"demo-run","dryRun":false}' \
  | tee "$ART/real-action.json" >/dev/null
pass "real action"

# 4) Audit trail
curl -fsS "http://127.0.0.1:4000/api/audit?limit=10" | tee "$ART/audit.json" >/dev/null
pass "audit trail"

# 5) Discord topology
curl -fsS "http://127.0.0.1:4000/api/discord/topology" | tee "$ART/discord-topology.json" >/dev/null
pass "discord topology"

echo
echo "SMOKE v0.1 COMPLETE"
echo "Artifacts: $ART"
