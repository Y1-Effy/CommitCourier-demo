import { Fragment, useEffect, useState } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { api, useLiveSnapshot, type Attempt, type OutboxItem } from "../lib/api";

const ENQUEUE_CODE = `await client.query("BEGIN");
await client.query("INSERT INTO orders ...");      // business write
await relay.enqueue(client, {                       // rides the SAME tx
  eventType, payload, endpoint: { url, secret },
});
commit ? await client.query("COMMIT")
       : await client.query("ROLLBACK");            // both vanish`;

function age(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s / 60).toFixed(0)}m`;
  return `${(s / 3600).toFixed(0)}h`;
}

function Pill({ status }: { status: string }) {
  return <span className={`pill ${status}`}>{status.replace("_", " ")}</span>;
}

function EnqueuePanel({ onAction }: { onAction: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const enqueue = async (commit: boolean) => {
    setBusy(true);
    try {
      const r = await api<{ eventType: string; committed: boolean }>("/enqueue", {
        body: { commit },
      });
      onAction(
        commit
          ? `Enqueued ${r.eventType} (committed → will be delivered)`
          : `Rolled back ${r.eventType} (no row written — dual-write safe)`,
      );
    } finally {
      setBusy(false);
    }
  };
  const ssrf = async () => {
    setBusy(true);
    try {
      await api("/enqueue-ssrf", { body: {} });
      onAction("Enqueued a delivery to the cloud-metadata IP — watch it get SSRF-blocked.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card">
      <div className="eyebrow">1 · Enqueue</div>
      <h2 className="section">Send an event</h2>
      <p className="sub">
        Each enqueue runs inside a real DB transaction. <b>Commit</b> and it is delivered;{" "}
        <b>roll back</b> and the row never exists.
      </p>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn primary" disabled={busy} onClick={() => enqueue(true)}>
          ✓ Enqueue &amp; COMMIT
        </button>
        <button className="btn danger" disabled={busy} onClick={() => enqueue(false)}>
          ⤺ Enqueue &amp; ROLLBACK
        </button>
        <button className="btn ghost" disabled={busy} onClick={ssrf} title="Targets 169.254.169.254">
          ⚠ Try SSRF target
        </button>
      </div>
      <CodeBlock code={ENQUEUE_CODE} />
    </div>
  );
}

function ReceiverControl({ mode, recent }: { mode: string; recent: { eventType: string; verified: boolean; responded: number; at: string }[] }) {
  const set = (m: string) => api("/receiver/mode", { body: { mode: m } });
  const modes: [string, string, string][] = [
    ["ok", "200 OK", "Deliver successfully"],
    ["fail", "500", "Force retries → DLQ"],
    ["slow", "timeout", "Exceed 5s timeout"],
  ];
  return (
    <div className="card">
      <div className="eyebrow">2 · Receiver</div>
      <h2 className="section">Flaky endpoint simulator</h2>
      <p className="sub">
        Flip how the customer's endpoint responds. Switch to <b>500</b>, enqueue, and watch the
        retries climb until the row lands in the DLQ.
      </p>
      <div className="seg" role="group">
        {modes.map(([m, label]) => (
          <button key={m} className={mode === m ? "active" : ""} onClick={() => set(m)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {modes.find((x) => x[0] === mode)?.[2]}
      </p>
      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Recently received (signature verified server-side):
        </div>
        {recent.length === 0 && <div className="muted">— nothing yet —</div>}
        {recent.map((r, i) => (
          <div key={i} className="row" style={{ fontSize: 12, gap: 8 }}>
            <span className="mono">{r.eventType}</span>
            <span className={r.verified ? "pill delivered" : "pill dead"}>
              {r.verified ? "sig ✓" : "sig ✗"}
            </span>
            <span className="muted">→ {r.responded}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptsDrawer({ id }: { id: string }) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => api<Attempt[]>(`/attempts/${id}`).then((a) => live && setAttempts(a));
    load();
    const t = setInterval(load, 1500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [id]);
  if (!attempts) return <div className="muted">Loading ledger…</div>;
  if (attempts.length === 0) return <div className="muted">No attempts yet (still pending).</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>#</th>
          <th>Response</th>
          <th>Duration</th>
          <th>Error</th>
          <th>At</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a) => (
          <tr key={a.id}>
            <td>{a.attemptNo}</td>
            <td>{a.responseStatus ?? "—"}</td>
            <td>{a.durationMs}ms</td>
            <td style={{ color: a.error ? "var(--red)" : "var(--muted)" }}>{a.error ?? "ok"}</td>
            <td className="muted">{new Date(a.attemptedAt).toLocaleTimeString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OutboxTable({ rows }: { rows: OutboxItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const replayDlq = () => api("/replay", { body: {} });
  const cancel = (id: string) => api(`/cancel/${id}`, { body: {} });
  const deadCount = rows.filter((r) => r.status === "dead").length;
  return (
    <div className="card">
      <div className="row">
        <div>
          <div className="eyebrow">3 · Outbox &amp; ledger</div>
          <h2 className="section" style={{ margin: 0 }}>
            Live delivery state
          </h2>
        </div>
        <div className="spacer" />
        <button className="btn sm" disabled={deadCount === 0} onClick={replayDlq}>
          ↻ Replay DLQ ({deadCount})
        </button>
      </div>
      <p className="sub">Click a row to open its delivery ledger (every attempt, recorded).</p>
      <div style={{ maxHeight: 420, overflow: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>seq</th>
              <th>event</th>
              <th>status</th>
              <th>tries</th>
              <th>last error</th>
              <th>age</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Empty — enqueue something above.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: "pointer" }}>
                  <td>{r.seq}</td>
                  <td>{r.eventType}</td>
                  <td>
                    <Pill status={r.status} />
                  </td>
                  <td>{r.attempts}</td>
                  <td style={{ color: "var(--red)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.lastError ?? ""}
                  </td>
                  <td className="muted">{age(r.createdAt)}</td>
                  <td>
                    {r.status === "pending" && (
                      <button
                        className="btn ghost sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancel(r.id);
                        }}
                      >
                        cancel
                      </button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--bg-soft)" }}>
                      <AttemptsDrawer id={r.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LiveDemo() {
  const { snapshot, feed } = useLiveSnapshot();
  const [toast, setToast] = useState<string>("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const rows = snapshot?.outbox ?? [];
  const mode = snapshot?.receiver.mode ?? "ok";
  const recent = snapshot?.receiver.recent ?? [];

  return (
    <div className="container wide">
      <div className="eyebrow">Live demo</div>
      <h2 className="section" style={{ fontSize: 30 }}>
        Drive CommitCourier in real time
      </h2>
      <p className="sub">
        Every action below hits a live PostgreSQL database and delivers real signed HTTP webhooks to
        this site's own receiver. Updates stream in over Server-Sent Events.
        {!snapshot && <span style={{ color: "var(--amber)" }}> · connecting…</span>}
      </p>

      {toast && (
        <div className="callout flash" style={{ marginBottom: 16 }}>
          {toast}
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <EnqueuePanel onAction={setToast} />
        <ReceiverControl mode={mode} recent={recent} />
      </div>

      <OutboxTable rows={rows} />

      <div style={{ height: 18 }} />
      <div className="card">
        <div className="eyebrow">Delivery feed</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          Outcomes as they happen
        </h2>
        {feed.length === 0 && <p className="muted">Hook events (delivered / retry / dead) appear here.</p>}
        <div style={{ maxHeight: 200, overflow: "auto", fontFamily: "var(--mono)", fontSize: 13 }}>
          {feed.map((f, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <span className={`pill ${f.outcome === "delivered" ? "delivered" : f.outcome === "dead" ? "dead" : "in_flight"}`}>
                {f.outcome}
              </span>
              <span>{f.event.eventType}</span>
              <span className="muted">attempt {f.event.attempt}</span>
              <span className="muted">{f.event.status ?? f.event.error ?? ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
