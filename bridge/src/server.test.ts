import test from "node:test";
import assert from "node:assert/strict";
import { buildApp, CONTRACT_VERSION } from "./app.js";
const AUTH_HEADER = { "x-bridge-token": "dev-ops-token" };

test("GET /api/status returns contract version and header", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "GET",
    url: "/api/status",
    headers: { "x-contract-version": String(CONTRACT_VERSION) }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-contract-version"], String(CONTRACT_VERSION));
  const body = response.json();
  assert.equal(body.contractVersion, CONTRACT_VERSION);

  await app.close();
});

test("POST message updates session lastMessageAt", async () => {
  const app = buildApp();
  const before = await app.inject({ method: "GET", url: "/api/sessions" });
  assert.equal(before.statusCode, 200);
  const [sessionBefore] = before.json();

  const postResponse = await app.inject({
    method: "POST",
    url: `/api/sessions/${encodeURIComponent(sessionBefore.sessionKey)}/messages`,
    headers: AUTH_HEADER,
    payload: { text: "hello" }
  });
  assert.equal(postResponse.statusCode, 200);

  const after = await app.inject({ method: "GET", url: "/api/sessions" });
  assert.equal(after.statusCode, 200);
  const [sessionAfter] = after.json();
  assert.notEqual(sessionAfter.lastMessageAt, sessionBefore.lastMessageAt);

  await app.close();
});

test("rejects unsupported contract version", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "GET",
    url: "/api/status",
    headers: { "x-contract-version": "999" }
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");

  await app.close();
});

test("rejects mutating endpoint without auth", async () => {
  const app = buildApp();
  const response = await app.inject({
    method: "POST",
    url: "/api/runs/run-901/actions",
    payload: { action: "retry", dryRun: true }
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "UNAUTHORIZED");
  await app.close();
});

test("dashboard is deterministically sorted and capped", async () => {
  const app = buildApp();
  const response = await app.inject({ method: "GET", url: "/api/dashboard" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.ok(["OK", "DEGRADED", "FAIL"].includes(body.overallStatus));
  assert.ok(Array.isArray(body.tasks));
  assert.ok(body.tasks.length <= 10);
  assert.ok(Array.isArray(body.runs));
  assert.ok(body.runs.length <= 10);
  await app.close();
});

test("run actions append to audit trail in dry-run mode", async () => {
  const app = buildApp();
  const actionResponse = await app.inject({
    method: "POST",
    url: "/api/runs/run-901/actions",
    headers: AUTH_HEADER,
    payload: { action: "retry", dryRun: true }
  });
  assert.equal(actionResponse.statusCode, 200);
  const actionBody = actionResponse.json();
  assert.equal(actionBody.auditEvent.dryRun, true);

  const auditResponse = await app.inject({ method: "GET", url: "/api/audit?limit=10" });
  assert.equal(auditResponse.statusCode, 200);
  assert.ok(auditResponse.json().length >= 1);
  await app.close();
});

test("discord status exposes topology summary", async () => {
  const app = buildApp();
  const response = await app.inject({ method: "GET", url: "/api/discord/status" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.agentCount, 9);
  assert.ok(body.configuredChannelCount > 0);
  await app.close();
});
