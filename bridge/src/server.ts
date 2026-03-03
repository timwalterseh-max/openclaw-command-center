import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  CreateReminderBodySchema,
  JobSchema,
  ListMessagesQuerySchema,
  MessageSchema,
  PostMessageBodySchema,
  SessionSchema,
  SystemStatusSchema,
  type Job,
  type Message,
  type Session,
  type SystemStatus
} from "./schemas.js";

const app = Fastify({ logger: true });
const CONTRACT_VERSION = 0;
const demoSessionKey = "agent:domo-gui:main";
const startedAt = Date.now();

const status: SystemStatus = {
  gateway: "degraded",
  host: "127.0.0.1:18789",
  model: "gpt-5.3-codex",
  workspace: "/Users/majordomo/Documents/New project",
  uptimeSeconds: 0,
  contractVersion: CONTRACT_VERSION
};

const sessions: Session[] = [
  {
    sessionKey: demoSessionKey,
    label: "domo-gui main",
    runtime: "openclaw",
    model: "gpt-5.3-codex",
    active: true,
    lastMessageAt: new Date().toISOString()
  }
];

const messages: Message[] = [
  {
    id: "msg_bootstrap_1",
    sessionKey: demoSessionKey,
    role: "assistant",
    content: "Bridge scaffold online.",
    createdAt: new Date().toISOString(),
    toolCalls: []
  }
];

const jobs: Job[] = [];

const errorEnvelope = (
  code: "TOOL_TIMEOUT" | "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL",
  message: string,
  retryable = false,
  details: Record<string, unknown> = {}
) => ({ error: { code, message, retryable, details } });

app.register(websocket);

app.addHook("onRequest", async (request, reply) => {
  reply.header("x-contract-version", String(CONTRACT_VERSION));
  const requested = request.headers["x-contract-version"];
  if (requested !== undefined && Number(requested) !== CONTRACT_VERSION) {
    reply.code(400);
    return reply.send(
      errorEnvelope(
        "VALIDATION_ERROR",
        `Unsupported contract version: ${String(requested)}. Expected ${CONTRACT_VERSION}.`
      )
    );
  }
});

app.get("/health", async () => ({ ok: true, contractVersion: CONTRACT_VERSION }));

app.get("/api/status", async () => {
  status.uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return SystemStatusSchema.parse(status);
});

app.get("/api/sessions", async () => sessions.map((s) => SessionSchema.parse(s)));

app.get("/api/sessions/:sessionKey/messages", async (request, reply) => {
  const { sessionKey } = request.params as { sessionKey: string };
  const queryParsed = ListMessagesQuerySchema.safeParse(request.query ?? {});
  if (!queryParsed.success) {
    reply.code(400);
    return errorEnvelope("VALIDATION_ERROR", queryParsed.error.message);
  }

  if (!sessions.find((s) => s.sessionKey === sessionKey)) {
    reply.code(404);
    return errorEnvelope("NOT_FOUND", "Session not found");
  }

  return messages
    .filter((m) => m.sessionKey === sessionKey)
    .slice(-queryParsed.data.limit)
    .map((m) => MessageSchema.parse(m));
});

app.get("/api/jobs", async () => jobs.map((job) => JobSchema.parse(job)));

app.post("/api/sessions/:sessionKey/messages", async (request, reply) => {
  const parsed = PostMessageBodySchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return errorEnvelope("VALIDATION_ERROR", parsed.error.message);
  }

  const { sessionKey } = request.params as { sessionKey: string };
  if (!sessions.find((s) => s.sessionKey === sessionKey)) {
    reply.code(404);
    return errorEnvelope("NOT_FOUND", "Session not found");
  }

  const ts = new Date().toISOString();
  const userMessage: Message = {
    id: `msg_user_${Date.now()}`,
    sessionKey,
    role: "user",
    content: parsed.data.text,
    createdAt: ts,
    toolCalls: []
  };
  messages.push(userMessage);

  const assistantMessage: Message = {
    id: `msg_assistant_${Date.now() + 1}`,
    sessionKey,
    role: "assistant",
    content: "Stub response from bridge. Day 4 will connect real OpenClaw calls.",
    createdAt: new Date().toISOString(),
    toolCalls: []
  };
  messages.push(assistantMessage);

  return { accepted: true, messageId: userMessage.id };
});

app.post("/api/jobs/reminders", async (request, reply) => {
  const parsed = CreateReminderBodySchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return errorEnvelope("VALIDATION_ERROR", parsed.error.message);
  }

  const job: Job = {
    jobId: `job_${Date.now()}`,
    name: `Reminder: ${parsed.data.text.slice(0, 40)}`,
    schedule: parsed.data.when,
    enabled: true,
    lastRunAt: null,
    nextRunAt: parsed.data.when
  };
  jobs.push(job);
  return JobSchema.parse(job);
});

app.delete("/api/jobs/:jobId", async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  const index = jobs.findIndex((job) => job.jobId === jobId);
  if (index < 0) {
    reply.code(404);
    return errorEnvelope("NOT_FOUND", "Job not found");
  }

  jobs.splice(index, 1);
  return { deleted: true, jobId };
});

app.get("/ws/events", { websocket: true }, (connection) => {
  const eventTypes = [
    "system.alert",
    "session.updated",
    "message.created",
    "toolcall.updated",
    "job.updated"
  ] as const;

  let tick = 0;
  const timer = setInterval(() => {
    const type = eventTypes[tick % eventTypes.length];
    tick += 1;

    connection.send(
      JSON.stringify({
        type,
        ts: new Date().toISOString(),
        payload: {
          contractVersion: CONTRACT_VERSION,
          message: "Stub stream active",
          sessionKey: demoSessionKey
        }
      })
    );
  }, 3000);

  connection.on("close", () => clearInterval(timer));
});

const start = async () => {
  try {
    await app.listen({ host: "127.0.0.1", port: 4000 });
    app.log.info("Bridge listening on http://127.0.0.1:4000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
