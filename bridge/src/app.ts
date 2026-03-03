import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  ActionBodySchema,
  AuditEventSchema,
  CreateReminderBodySchema,
  DashboardPayloadSchema,
  DiscordStatusSchema,
  ListLimitQuerySchema,
  JobSchema,
  ListMessagesQuerySchema,
  MessageSchema,
  PostMessageBodySchema,
  RunSchema,
  RunStatusSchema,
  SessionSchema,
  SystemStatusSchema,
  TaskSchema,
  type AuditEvent,
  type InboxItem,
  type DiscordStatus,
  type Job,
  type Message,
  type Run,
  type Session,
  type SystemStatus,
  type Task
} from "./schemas.js";
import { configuredChannelCount, DISCORD_AGENT_TOPOLOGY } from "./discord-topology.js";

export const CONTRACT_VERSION = 0;
const demoSessionKey = "agent:domo-gui:main";

const errorEnvelope = (
  code: "TOOL_TIMEOUT" | "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL",
  message: string,
  retryable = false,
  details: Record<string, unknown> = {}
) => ({ error: { code, message, retryable, details } });

export function buildApp() {
  const app = Fastify({ logger: true });
  const startedAt = Date.now();
  const mutationToken = process.env.BRIDGE_MUTATION_TOKEN ?? "dev-ops-token";

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
  const inboxQueue: InboxItem[] = [
    {
      id: "inbox-1001",
      source: "discord",
      queuedAt: "2026-03-03T06:59:00.000Z",
      summary: "Deployment guardrail warning in release-control",
      priority: 4
    },
    {
      id: "inbox-1002",
      source: "cron",
      queuedAt: "2026-03-03T06:57:30.000Z",
      summary: "Nightly report delayed",
      priority: 3
    }
  ];
  const tasks: Task[] = [
    {
      id: "task-1",
      title: "Validate bridge token rotation",
      owner: "infra",
      priority: 5,
      status: "running",
      updatedAt: "2026-03-03T07:02:00.000Z"
    },
    {
      id: "task-2",
      title: "Backfill audit indexing",
      owner: "analytics",
      priority: 3,
      status: "queued",
      updatedAt: "2026-03-03T06:55:00.000Z"
    },
    {
      id: "task-3",
      title: "Patch discord webhook retries",
      owner: "dispatcher",
      priority: 4,
      status: "blocked",
      updatedAt: "2026-03-03T06:52:00.000Z"
    }
  ];
  const runs: Run[] = [
    {
      id: "run-901",
      source: "deploy-pipeline",
      timestamp: "2026-03-03T07:01:00.000Z",
      status: "DEGRADED",
      summary: "Rollout paused at canary health check",
      detail: "One canary shard returned elevated latency above threshold.",
      recommendedNextAction: "Retry canary validation after cache warmup.",
      failingStep: "canary-health-check"
    },
    {
      id: "run-900",
      source: "ops-daily",
      timestamp: "2026-03-03T06:45:00.000Z",
      status: "OK",
      summary: "Morning readiness checks passed",
      detail: "Gateway and bridge health checks completed successfully.",
      recommendedNextAction: "Proceed with queued approvals.",
      failingStep: null
    },
    {
      id: "run-899",
      source: "discord-sync",
      timestamp: "2026-03-03T06:33:00.000Z",
      status: "FAIL",
      summary: "Discord sync failed for notifier",
      detail: "Notifier worker failed token validation while posting digest.",
      recommendedNextAction: "Escalate to security and rotate notifier token.",
      failingStep: "discord-token-validation"
    }
  ];
  const auditTrail: AuditEvent[] = [];

  const discordStatus: DiscordStatus = {
    tokenPresent: Boolean(process.env.DISCORD_BOT_TOKEN),
    configuredChannelCount: configuredChannelCount(),
    agentCount: DISCORD_AGENT_TOPOLOGY.length
  };

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
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send(errorEnvelope("INTERNAL", "Internal error", false));
  });

  const requireMutatingAuth = (request: { headers: Record<string, unknown> }) => {
    const incoming = request.headers["x-bridge-token"];
    return typeof incoming === "string" && incoming.length > 0 && incoming === mutationToken;
  };

  const sortedInboxQueue = () =>
    [...inboxQueue].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.queuedAt !== a.queuedAt) return b.queuedAt.localeCompare(a.queuedAt);
      return a.id.localeCompare(b.id);
    });

  const sortedTasks = () =>
    [...tasks]
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (b.updatedAt !== a.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
        return a.id.localeCompare(b.id);
      })
      .slice(0, 10);

  const sortedRuns = () =>
    [...runs].sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp.localeCompare(a.timestamp);
      return b.id.localeCompare(a.id);
    });

  app.get("/health", async () => ({ ok: true, contractVersion: CONTRACT_VERSION }));

  app.get("/api/status", async () => {
    return SystemStatusSchema.parse({
      ...status,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
    });
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

  app.get("/api/dashboard", async () => {
    const runList = sortedRuns().slice(0, 10).map((run) => RunSchema.parse(run));
    const alerts = runList.filter((run) => run.status !== "OK");
    const overallStatus = alerts.some((run) => run.status === "FAIL")
      ? "FAIL"
      : alerts.length > 0
        ? "DEGRADED"
        : "OK";

    return DashboardPayloadSchema.parse({
      overallStatus,
      inboxQueue: sortedInboxQueue().slice(0, 10),
      tasks: sortedTasks(),
      runs: runList,
      alerts,
      discord: DiscordStatusSchema.parse(discordStatus)
    });
  });

  app.get("/api/runs", async (request, reply) => {
    const parsed = ListLimitQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorEnvelope("VALIDATION_ERROR", "Invalid query");
    }
    return sortedRuns().slice(0, parsed.data.limit).map((run) => RunSchema.parse(run));
  });

  app.get("/api/runs/:runId", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = runs.find((candidate) => candidate.id === runId);
    if (!run) {
      reply.code(404);
      return errorEnvelope("NOT_FOUND", "Run not found");
    }
    return RunSchema.parse(run);
  });

  app.get("/api/audit", async (request, reply) => {
    const parsed = ListLimitQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return errorEnvelope("VALIDATION_ERROR", "Invalid query");
    }
    return [...auditTrail]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, parsed.data.limit)
      .map((entry) => AuditEventSchema.parse(entry));
  });

  app.get("/api/discord/status", async () => DiscordStatusSchema.parse(discordStatus));

  app.post("/api/sessions/:sessionKey/messages", async (request, reply) => {
    if (!requireMutatingAuth(request)) {
      reply.code(401);
      return errorEnvelope("UNAUTHORIZED", "Missing or invalid credentials");
    }

    const parsed = PostMessageBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return errorEnvelope("VALIDATION_ERROR", parsed.error.message);
    }

    const { sessionKey } = request.params as { sessionKey: string };
    const session = sessions.find((s) => s.sessionKey === sessionKey);
    if (!session) {
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

    session.lastMessageAt = userMessage.createdAt;

    return { accepted: true, messageId: userMessage.id };
  });

  app.post("/api/jobs/reminders", async (request, reply) => {
    if (!requireMutatingAuth(request)) {
      reply.code(401);
      return errorEnvelope("UNAUTHORIZED", "Missing or invalid credentials");
    }

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
    if (!requireMutatingAuth(request)) {
      reply.code(401);
      return errorEnvelope("UNAUTHORIZED", "Missing or invalid credentials");
    }

    const { jobId } = request.params as { jobId: string };
    const index = jobs.findIndex((job) => job.jobId === jobId);
    if (index < 0) {
      reply.code(404);
      return errorEnvelope("NOT_FOUND", "Job not found");
    }

    jobs.splice(index, 1);
    return { deleted: true, jobId };
  });

  app.post("/api/runs/:runId/actions", async (request, reply) => {
    if (!requireMutatingAuth(request)) {
      reply.code(401);
      return errorEnvelope("UNAUTHORIZED", "Missing or invalid credentials");
    }

    const { runId } = request.params as { runId: string };
    const run = runs.find((candidate) => candidate.id === runId);
    if (!run) {
      reply.code(404);
      return errorEnvelope("NOT_FOUND", "Run not found");
    }

    const parsed = ActionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return errorEnvelope("VALIDATION_ERROR", "Invalid action payload");
    }

    const now = new Date().toISOString();
    let outcome = `Action ${parsed.data.action} recorded`;
    if (!parsed.data.dryRun) {
      if (parsed.data.action === "retry") {
        run.status = "DEGRADED";
        run.summary = `Retry initiated for ${run.id}`;
        run.detail = "Retry is in progress via operator action.";
        run.recommendedNextAction = "Monitor run health and approve if stable.";
        run.failingStep = run.failingStep ?? "retry-pipeline";
      }
      if (parsed.data.action === "approve") {
        run.status = "OK";
        run.failingStep = null;
        run.summary = `Run ${run.id} approved`;
        run.recommendedNextAction = "Continue to next queued run.";
      }
      if (parsed.data.action === "snooze") {
        run.status = "DEGRADED";
        run.recommendedNextAction = "Revisit this run after snooze window.";
      }
      if (parsed.data.action === "escalate") {
        run.status = "FAIL";
        run.recommendedNextAction = "Escalation sent. Wait for incident lead response.";
      }
      outcome = `Action ${parsed.data.action} applied`;
    }

    const auditEvent: AuditEvent = {
      id: `audit-${Date.now()}`,
      runId,
      action: parsed.data.action,
      dryRun: parsed.data.dryRun,
      actor: "ops-console",
      timestamp: now,
      outcome
    };
    auditTrail.push(auditEvent);

    return {
      run: RunSchema.parse(run),
      auditEvent: AuditEventSchema.parse(auditEvent)
    };
  });

  app.get("/ws/events", { websocket: true }, (socket) => {
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

      socket.send(
        JSON.stringify({
          type,
          ts: new Date().toISOString(),
          payload: {
            contractVersion: CONTRACT_VERSION,
            message: "Ops stream active",
            sessionKey: demoSessionKey
          }
        })
      );
    }, 3000);

    socket.on("close", () => clearInterval(timer));
  });

  return app;
}
