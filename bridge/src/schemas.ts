import { z } from "zod";

export const ToolCallSchema = z.object({
  name: z.string().min(1),
  args: z.record(z.unknown()),
  status: z.enum(["queued", "running", "done", "failed", "canceled"]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  resultSummary: z.string().nullable()
});

export const SessionSchema = z.object({
  sessionKey: z.string().min(1),
  label: z.string().min(1),
  runtime: z.string().min(1),
  model: z.string().min(1),
  active: z.boolean(),
  lastMessageAt: z.string().datetime()
});

export const MessageSchema = z.object({
  id: z.string().min(1),
  sessionKey: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string().datetime(),
  toolCalls: z.array(ToolCallSchema)
});

export const JobSchema = z.object({
  jobId: z.string().min(1),
  name: z.string().min(1),
  schedule: z.string().min(1),
  enabled: z.boolean(),
  lastRunAt: z.string().datetime().nullable(),
  nextRunAt: z.string().datetime().nullable()
});

export const SystemStatusSchema = z.object({
  gateway: z.enum(["healthy", "degraded", "offline"]),
  host: z.string().min(1),
  model: z.string().min(1),
  workspace: z.string().min(1),
  uptimeSeconds: z.number().nonnegative(),
  contractVersion: z.literal(0)
});

export const PostMessageBodySchema = z.object({
  text: z.string().min(1)
});

export const CreateReminderBodySchema = z.object({
  when: z.string().datetime(),
  text: z.string().min(1),
  targetSession: z.string().min(1)
});

export const ListMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100)
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum([
      "TOOL_TIMEOUT",
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "NOT_FOUND",
      "INTERNAL"
    ]),
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.unknown())
  })
});

export const OpsStatusSchema = z.enum(["OK", "DEGRADED", "FAIL"]);

export const InboxItemSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  queuedAt: z.string().datetime(),
  summary: z.string().min(1),
  priority: z.number().int().min(1).max(5)
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  owner: z.string().min(1),
  priority: z.number().int().min(1).max(5),
  status: z.enum(["queued", "running", "blocked", "done"]),
  updatedAt: z.string().datetime()
});

export const RunStatusSchema = z.enum(["OK", "DEGRADED", "FAIL"]);

export const RunSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().datetime(),
  status: RunStatusSchema,
  summary: z.string().min(1),
  detail: z.string().min(1),
  recommendedNextAction: z.string().min(1),
  failingStep: z.string().nullable()
});

export const AuditEventSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  action: z.enum(["approve", "retry", "snooze", "escalate"]),
  dryRun: z.boolean(),
  actor: z.string().min(1),
  timestamp: z.string().datetime(),
  outcome: z.string().min(1)
});

export const DiscordStatusSchema = z.object({
  tokenPresent: z.boolean(),
  configuredChannelCount: z.number().int().nonnegative(),
  agentCount: z.number().int().nonnegative()
});

export const DashboardPayloadSchema = z.object({
  overallStatus: OpsStatusSchema,
  inboxQueue: z.array(InboxItemSchema),
  tasks: z.array(TaskSchema),
  runs: z.array(RunSchema),
  alerts: z.array(RunSchema),
  discord: DiscordStatusSchema
});

export const ListLimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10)
});

export const ActionBodySchema = z.object({
  action: z.enum(["approve", "retry", "snooze", "escalate"]),
  dryRun: z.boolean().optional().default(true)
});

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Job = z.infer<typeof JobSchema>;
export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type Run = z.infer<typeof RunSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type InboxItem = z.infer<typeof InboxItemSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type DiscordStatus = z.infer<typeof DiscordStatusSchema>;
