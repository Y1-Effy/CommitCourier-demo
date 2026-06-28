import { CodeBlock } from "../components/CodeBlock";

const INSTALL = `npm install commitcourier pg`;

const STEP1 = `import { Pool } from "pg";
import { postgresStore } from "commitcourier/store/pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = postgresStore({ pool });

// Idempotent DDL — run once at deploy time.
await store.migrate();`;

const STEP2 = `import { createRelay, createConsoleLogger } from "commitcourier";

const relay = await createRelay({
  store,
  logger: createConsoleLogger(),
  retry: { maxAttempts: 6, backoff: "exponential", baseMs: 1_000, capMs: 30_000, jitter: 0.2 },
  delivery: { timeoutMs: 5_000 },
  ssrf: { blockPrivateRanges: true }, // ON by default
});`;

const STEP3 = `const client = await pool.connect();
try {
  await client.query("BEGIN");

  // ...your business writes on \`client\`...
  await client.query("INSERT INTO orders (id, amount) VALUES ($1, $2)", [orderId, amount]);

  // Rides the SAME transaction (fail-closed):
  await relay.enqueue(client, {
    eventType: "order.created",
    payload: { orderId, amount },
    endpoint: { url: "https://customer.example.com/webhooks", secret },
    idempotencyKey: orderId,
  });

  await client.query("COMMIT");   // order + webhook commit together
} catch (err) {
  await client.query("ROLLBACK"); // ...or vanish together
  throw err;
} finally {
  client.release();
}`;

const STEP4 = `const dispatcher = relay.createDispatcher({
  concurrency: 8,
  pollIntervalMs: 1_000,
  reclaimAfterMs: 300_000,
});
await dispatcher.start();
// graceful shutdown: await dispatcher.stop();`;

const RECEIVER = `import { verifySignature } from "commitcourier";

// On the receiving end — verify before trusting the body:
const ok = await verifySignature({
  id: req.headers["webhook-id"],
  timestamp: req.headers["webhook-timestamp"],
  payload: rawBody,                       // raw bytes, before JSON.parse
  header: req.headers["webhook-signature"],
  secrets: [process.env.WEBHOOK_SECRET],
});`;

function Step({ n, title, sub, code }: { n: number; title: string; sub: string; code: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <span
          className="pill delivered"
          style={{ fontFamily: "var(--mono)", fontSize: 13 }}
        >
          {n}
        </span>
        <h2 className="section" style={{ margin: 0 }}>
          {title}
        </h2>
      </div>
      <p className="sub" style={{ margin: "4px 0 10px" }}>
        {sub}
      </p>
      <CodeBlock code={code} />
    </div>
  );
}

export function Integrate() {
  return (
    <div className="container">
      <div className="eyebrow">Integration</div>
      <h2 className="section" style={{ fontSize: 32 }}>
        Add reliable webhooks in five steps
      </h2>
      <p className="sub">
        This is the exact integration powering the <a href="#/demo">live demo</a> — the same code
        lives in <span className="kbd">server/courier.ts</span> and{" "}
        <span className="kbd">server/routes.ts</span> of this repo. Framework-agnostic; works with
        Express, Fastify, Nest, or none.
      </p>

      <div className="callout" style={{ margin: "12px 0 24px" }}>
        Drivers: <span className="kbd">pg</span> and <span className="kbd">knex</span> are supported
        as optional peers (Drizzle / Prisma too). Install whichever you use.
      </div>

      <CodeBlock code={INSTALL} lang="bash" />
      <div style={{ height: 28 }} />

      <Step
        n={1}
        title="Create the tables"
        sub="One idempotent migration adds the outbox / attempts / endpoints tables to your existing database."
        code={STEP1}
      />
      <Step
        n={2}
        title="Create the relay"
        sub="Async: it validates config and fails fast if the tables are missing. All options shown with sane defaults."
        code={STEP2}
      />
      <Step
        n={3}
        title="Enqueue inside your transaction"
        sub="enqueue takes the transaction handle as its required first argument. This is the whole guarantee."
        code={STEP3}
      />
      <Step
        n={4}
        title="Run the dispatcher"
        sub="Delivers due rows in the background. Run it in-process or in a dedicated worker — several copies are safe."
        code={STEP4}
      />
      <Step
        n={5}
        title="Verify on the receiving end"
        sub="Standard Webhooks signatures — receivers verify with the bundled helper or any off-the-shelf library."
        code={RECEIVER}
      />

      <div className="card" style={{ textAlign: "center", marginTop: 12 }}>
        <p className="sub" style={{ margin: 0 }}>
          Watch every one of these steps execute against a real database on the{" "}
          <a href="#/demo">live demo →</a>
        </p>
      </div>
    </div>
  );
}
