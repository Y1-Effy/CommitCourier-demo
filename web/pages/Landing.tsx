import { CodeBlock } from "../components/CodeBlock";

const QUICKSTART = `import { Pool } from "pg";
import { postgresStore } from "commitcourier/store/pg";
import { createRelay } from "commitcourier";

const store = postgresStore({ pool: new Pool() });
const relay = await createRelay({ store });

// Inside YOUR business transaction — commits or rolls back atomically:
await relay.enqueue(trx, {
  eventType: "order.created",
  payload: { orderId, amount },
  endpoint: { url: "https://customer.example.com/webhooks", secret },
});`;

function Compare() {
  const rows: [string, string, string, string][] = [
    ["Rides your DB transaction", "✗", "✗", "✓"],
    ["HTTP webhook delivery", "✓", "✓", "✗"],
    ["Signing · retries · DLQ · ledger", "✓", "partial", "✗"],
    ["SSRF protection", "✓", "—", "—"],
    ["No extra infra (just Postgres)", "✗ (SaaS)", "✗ (Redis)", "✓"],
  ];
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Capability</th>
          <th>SaaS (Svix)</th>
          <th>Queue (BullMQ)</th>
          <th style={{ color: "var(--accent)" }}>CommitCourier</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <td style={{ fontFamily: "var(--sans)" }}>{r[0]}</td>
            <td>{r[1]}</td>
            <td>{r[2]}</td>
            <td style={{ color: "var(--green)" }}>{r[3]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Landing() {
  return (
    <>
      <div className="hero">
        <h1>
          Webhooks that can't lie
          <br />
          about your data.
        </h1>
        <p className="lead">
          CommitCourier writes the outbound webhook in the <b>same Postgres transaction</b> as your
          business change — so a webhook is sent <i>if and only if</i> the write committed. Then it
          delivers with signing, retries, a DLQ, a full ledger and SSRF protection.
        </p>
        <div className="badges">
          <img src="https://img.shields.io/npm/v/commitcourier.svg" alt="npm" />
          <img
            src="https://img.shields.io/badge/node-%3E%3D22.19-brightgreen"
            alt="node"
          />
          <img src="https://img.shields.io/badge/license-MIT-blue" alt="license" />
          <img
            src="https://img.shields.io/badge/postgres-12%2B-336791"
            alt="postgres"
          />
        </div>
        <div className="cta">
          <a className="btn primary" href="#/demo">
            ▶ See it run live
          </a>
          <a className="btn" href="#/integrate">
            View integration code
          </a>
        </div>
      </div>

      <div className="container">
        <div className="grid cols-2">
          <div className="card">
            <div className="eyebrow">The bug</div>
            <h2 className="section">Dual-write inconsistency</h2>
            <p className="sub">
              Updating state and sending a webhook are two actions. A crash or rollback between them
              breaks one of two ways:
            </p>
            <ul className="muted">
              <li>
                <b style={{ color: "var(--red)" }}>Phantom webhook</b> — you enqueue first, then the
                transaction rolls back. The customer gets <code>order.created</code> for an order
                that never existed.
              </li>
              <li>
                <b style={{ color: "var(--red)" }}>Lost webhook</b> — you commit first, then the
                process dies before enqueuing. The order is final, the notification never fires.
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="eyebrow">The fix</div>
            <h2 className="section">Ride the transaction</h2>
            <p className="sub">
              The outbox row is written on <i>your</i> transaction handle. It commits with your data
              or vanishes with your rollback — dual-write inconsistency becomes impossible{" "}
              <i>by construction</i>. A background dispatcher then handles webhook-grade delivery.
            </p>
            <div className="callout">
              No Redis. No SaaS. No extra broker. Just the PostgreSQL you already run.
            </div>
          </div>
        </div>

        <div style={{ height: 28 }} />
        <div className="eyebrow">60-second integration</div>
        <CodeBlock code={QUICKSTART} />

        <div style={{ height: 36 }} />
        <h2 className="section">How it compares</h2>
        <div className="card">
          <Compare />
        </div>

        <div style={{ height: 36 }} />
        <div className="grid cols-3">
          {[
            ["Atomic enqueue", "Rides your DB transaction (fail-closed)."],
            ["Background delivery", "Polling dispatcher, fail-open, single-delivery across instances."],
            ["Standard Webhooks", "HMAC-SHA256 signing receivers verify with off-the-shelf tools."],
            ["Retries + DLQ", "Exponential backoff with jitter; exhausted rows land in a dead-letter queue."],
            ["Delivery ledger", "Every attempt recorded: status, latency, response snippet."],
            ["SSRF protection", "Private / loopback / cloud-metadata ranges blocked by default."],
          ].map(([t, d]) => (
            <div className="card" key={t}>
              <b>{t}</b>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                {d}
              </p>
            </div>
          ))}
        </div>

        <div style={{ height: 40 }} />
        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="section">Everything on this page is real.</h2>
          <p className="sub">
            This site runs CommitCourier from npm against a live PostgreSQL database. The{" "}
            <a href="#/demo">live demo</a> enqueues real rows and delivers real signed HTTP
            webhooks; the <a href="#/stats">track record</a> shows its actual delivery counters.
          </p>
          <div className="cta">
            <a className="btn primary" href="#/demo">
              Open the live demo
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
