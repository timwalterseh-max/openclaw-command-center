import test from "node:test";
import assert from "node:assert/strict";
import { buildApp, CONTRACT_VERSION } from "./app.js";

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
