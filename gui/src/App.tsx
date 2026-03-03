import { useEffect, useMemo, useState } from "react";

type OpsStatus = "OK" | "DEGRADED" | "FAIL";
type RunStatus = "OK" | "DEGRADED" | "FAIL";
type ActionName = "approve" | "retry" | "snooze" | "escalate";

type InboxItem = {
  id: string;
  source: string;
  queuedAt: string;
  summary: string;
  priority: number;
};

type Task = {
  id: string;
  title: string;
  owner: string;
  priority: number;
  status: "queued" | "running" | "blocked" | "done";
  updatedAt: string;
};

type Run = {
  id: string;
  source: string;
  timestamp: string;
  status: RunStatus;
  summary: string;
  detail: string;
  recommendedNextAction: string;
  failingStep: string | null;
};

type AuditEvent = {
  id: string;
  runId: string;
  action: ActionName;
  dryRun: boolean;
  actor: string;
  timestamp: string;
  outcome: string;
};

type DashboardPayload = {
  overallStatus: OpsStatus;
  inboxQueue: InboxItem[];
  tasks: Task[];
  runs: Run[];
  alerts: Run[];
  discord: {
    tokenPresent: boolean;
    configuredChannelCount: number;
    agentCount: number;
  };
};

const API_ROOT = "http://127.0.0.1:4000";
const MUTATION_TOKEN = "dev-ops-token";

const statusClass: Record<OpsStatus, string> = {
  OK: "ok",
  DEGRADED: "degraded",
  FAIL: "fail"
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "x-contract-version": "0" }
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runBrief, setRunBrief] = useState<Run | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setError(null);
    const [dash, audit] = await Promise.all([
      fetchJson<DashboardPayload>(`${API_ROOT}/api/dashboard`),
      fetchJson<AuditEvent[]>(`${API_ROOT}/api/audit?limit=10`)
    ]);
    setDashboard({
      ...dash,
      inboxQueue: [...dash.inboxQueue].sort(
        (a, b) =>
          b.priority - a.priority ||
          b.queuedAt.localeCompare(a.queuedAt) ||
          a.id.localeCompare(b.id)
      ),
      tasks: [...dash.tasks].sort(
        (a, b) =>
          b.priority - a.priority ||
          b.updatedAt.localeCompare(a.updatedAt) ||
          a.id.localeCompare(b.id)
      ),
      runs: [...dash.runs].sort(
        (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
      ),
      alerts: [...dash.alerts].sort(
        (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
      )
    });
    setAuditTrail(audit);
  };

  const loadRunBrief = async (runId: string) => {
    const run = await fetchJson<Run>(`${API_ROOT}/api/runs/${encodeURIComponent(runId)}`);
    setRunBrief(run);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadDashboard();
      } catch {
        setError("Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    (async () => {
      try {
        await loadRunBrief(selectedRunId);
      } catch {
        setError("Unable to load run brief.");
      }
    })();
  }, [selectedRunId]);

  const highlightedAction = useMemo(() => {
    if (!runBrief) return null;
    if (runBrief.status === "FAIL" || runBrief.status === "DEGRADED") {
      return runBrief.recommendedNextAction;
    }
    return null;
  }, [runBrief]);

  const onRunAction = async (action: ActionName) => {
    if (!runBrief) return;
    setActionBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_ROOT}/api/runs/${encodeURIComponent(runBrief.id)}/actions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-bridge-token": MUTATION_TOKEN,
          "x-contract-version": "0"
        },
        body: JSON.stringify({ action, dryRun })
      });
      if (!response.ok) {
        throw new Error("Action failed");
      }
      await Promise.all([loadRunBrief(runBrief.id), loadDashboard()]);
    } catch {
      setError("Unable to execute action.");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="shell">
        <p className="loading">Loading ops console...</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>OpenClaw Ops Console</h1>
          <p>Thin vertical slice for queue, runs, and operator actions.</p>
        </div>
        <div className={`status-badge ${statusClass[dashboard?.overallStatus ?? "DEGRADED"]}`}>
          {dashboard?.overallStatus ?? "DEGRADED"}
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="grid">
        <article className="card">
          <h2>Inbox / Queue</h2>
          {dashboard && dashboard.inboxQueue.length > 0 ? (
            <ul className="list">
              {dashboard.inboxQueue.map((item) => (
                <li key={item.id}>
                  <div className="row-title">{item.summary}</div>
                  <div className="meta">
                    {item.source} • p{item.priority} • {new Date(item.queuedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Queue empty.</p>
          )}
        </article>

        <article className="card">
          <h2>Tasks (Top 10)</h2>
          {dashboard && dashboard.tasks.length > 0 ? (
            <ul className="list">
              {dashboard.tasks.slice(0, 10).map((task) => (
                <li key={task.id}>
                  <div className="row-title">{task.title}</div>
                  <div className="meta">
                    {task.owner} • {task.status} • p{task.priority}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No active tasks.</p>
          )}
        </article>

        <article className="card">
          <h2>Runs / Alerts (Last 10)</h2>
          {dashboard && dashboard.runs.length > 0 ? (
            <ul className="list">
              {dashboard.runs.slice(0, 10).map((run) => (
                <li key={run.id}>
                  <button className="run-link" onClick={() => setSelectedRunId(run.id)}>
                    <span className={`pill ${statusClass[run.status]}`}>{run.status}</span> {run.id}
                  </button>
                  <div className="meta">
                    {run.source} • {new Date(run.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No runs available.</p>
          )}
        </article>

        <article className="card">
          <h2>Discord 9-Agent Topology</h2>
          {dashboard ? (
            <div className="tile">
              <div>Agents: {dashboard.discord.agentCount}</div>
              <div>Configured channels: {dashboard.discord.configuredChannelCount}</div>
              <div>Token present: {dashboard.discord.tokenPresent ? "YES" : "NO"}</div>
            </div>
          ) : (
            <p className="empty">No discord status available.</p>
          )}
        </article>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>Run Brief</h2>
          {runBrief ? (
            <div className="run-brief">
              <div>
                <strong>run:</strong> {runBrief.id}
              </div>
              <div>
                <strong>source:</strong> {runBrief.source}
              </div>
              <div>
                <strong>timestamp:</strong> {new Date(runBrief.timestamp).toLocaleString()}
              </div>
              <div>
                <strong>status:</strong>{" "}
                <span className={`pill ${statusClass[runBrief.status]}`}>{runBrief.status}</span>
              </div>
              <div>
                <strong>summary:</strong> {runBrief.summary}
              </div>
              <div>
                <strong>detail:</strong> {runBrief.detail}
              </div>
              <div>
                <strong>recommended next action:</strong> {runBrief.recommendedNextAction}
              </div>
              {runBrief.status !== "OK" ? (
                <div className="fail-box">
                  <strong>Failing step:</strong> {runBrief.failingStep ?? "n/a"}
                  <br />
                  <strong>Concrete next action:</strong> {highlightedAction}
                </div>
              ) : null}

              <div className="action-row">
                <label className="dry-run">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(event) => setDryRun(event.target.checked)}
                  />
                  Dry-run
                </label>
                <button disabled={actionBusy} onClick={() => onRunAction("approve")}>
                  Approve
                </button>
                <button disabled={actionBusy} onClick={() => onRunAction("retry")}>
                  Retry
                </button>
                <button disabled={actionBusy} onClick={() => onRunAction("snooze")}>
                  Snooze
                </button>
                <button disabled={actionBusy} onClick={() => onRunAction("escalate")}>
                  Escalate
                </button>
              </div>
            </div>
          ) : (
            <p className="empty">Select a run from Runs / Alerts to view details.</p>
          )}
        </article>

        <article className="card">
          <h2>Audit Trail (Last 10)</h2>
          {auditTrail.length > 0 ? (
            <ul className="list">
              {auditTrail.map((entry) => (
                <li key={entry.id}>
                  <div className="row-title">
                    {entry.action.toUpperCase()} {entry.runId}
                  </div>
                  <div className="meta">
                    {entry.dryRun ? "DRY-RUN" : "LIVE"} • {entry.outcome} •{" "}
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No audit events yet.</p>
          )}
        </article>
      </section>
    </main>
  );
}
