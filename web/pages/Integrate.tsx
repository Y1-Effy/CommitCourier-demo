import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";
import type { ReactNode } from "react";

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
  retry: { maxAttempts: 6, backoff: "exponential", baseMs: 1_000, capMs: 60_000, jitter: 0.2 },
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
  concurrency: 4,
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

const STEP_CODE = [STEP1, STEP2, STEP3, STEP4, RECEIVER] as const;

interface IntegrateCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  callout: ReactNode;
  steps: [string, string][];
  footer: ReactNode;
}

const en: IntegrateCopy = {
  eyebrow: "Integration",
  heading: "Add reliable webhooks in five steps",
  intro: (
    <>
      This is the exact integration powering the <a href="/demo">live demo</a> — the same code lives
      in <span className="kbd">server/courier.ts</span> and{" "}
      <span className="kbd">server/routes.ts</span> of this repo. Framework-agnostic; works with
      Express, Fastify, Nest, or none.
    </>
  ),
  callout: (
    <>
      Drivers: <span className="kbd">pg</span> and <span className="kbd">knex</span> are supported
      as optional peers (Drizzle / Prisma too). Install whichever you use. Optional extensions:{" "}
      <span className="kbd">commitcourier/otel</span> for traces &amp; metrics, and{" "}
      <span className="kbd">commitcourier/accelerator/pg</span> for LISTEN/NOTIFY low-latency
      wakeups.
    </>
  ),
  steps: [
    [
      "Create the tables",
      "One idempotent migration adds the outbox / attempts / endpoints tables to your existing database.",
    ],
    [
      "Create the relay",
      "Async: it validates config and fails fast if the tables are missing. All options shown with sane defaults.",
    ],
    [
      "Enqueue inside your transaction",
      "enqueue takes the transaction handle as its required first argument. This is the whole guarantee.",
    ],
    [
      "Run the dispatcher",
      "Delivers due rows in the background. Run it in-process or in a dedicated worker — several copies are safe.",
    ],
    [
      "Verify on the receiving end",
      "Standard Webhooks signatures — receivers verify with the bundled helper or any off-the-shelf library.",
    ],
  ],
  footer: (
    <>
      Watch every one of these steps execute against a real database on the{" "}
      <a href="/demo">live demo →</a>
    </>
  ),
};

const ja: IntegrateCopy = {
  eyebrow: "組み込み方",
  heading: "信頼できる Webhook を5ステップで追加",
  intro: (
    <>
      これは<a href="/demo">ライブデモ</a>を動かしているのとまったく同じ組み込みコードです —
      同じものが このリポジトリの <span className="kbd">server/courier.ts</span> と{" "}
      <span className="kbd">server/routes.ts</span>{" "}
      にあります。フレームワーク非依存で、Express・Fastify・ Nest でも、何もなくても動きます。
    </>
  ),
  callout: (
    <>
      ドライバ: <span className="kbd">pg</span> と <span className="kbd">knex</span> をオプションの
      peer として対応 (Drizzle / Prisma も)。使うものだけインストールしてください。オプション拡張:{" "}
      <span className="kbd">commitcourier/otel</span> でトレース＆メトリクス、
      <span className="kbd">commitcourier/accelerator/pg</span> で LISTEN/NOTIFY による低遅延 wake。
    </>
  ),
  steps: [
    [
      "テーブルを作成",
      "冪等なマイグレーション1つで、既存のデータベースに outbox / attempts / endpoints テーブルを追加します。",
    ],
    [
      "relay を作成",
      "非同期: 設定を検証し、テーブルが無ければ即座に失敗します。全オプションを妥当な既定値つきで掲載。",
    ],
    [
      "トランザクション内で enqueue",
      "enqueue は第1引数（必須）にトランザクションハンドルを取ります。これが保証のすべてです。",
    ],
    [
      "dispatcher を起動",
      "期限の来た行をバックグラウンドで配信します。同一プロセスでも専用ワーカーでも、複数起動しても安全です。",
    ],
    [
      "受信側で検証",
      "Standard Webhooks の署名 — 受信側は同梱ヘルパーや任意の既製ライブラリで検証できます。",
    ],
  ],
  footer: (
    <>
      これら全ステップが実際のデータベースに対して動く様子を<a href="/demo">ライブデモ →</a>
      で確認できます。
    </>
  ),
};

const copy: Record<Locale, IntegrateCopy> = { en, ja };

function Step({ n, title, sub, code }: { n: number; title: string; sub: string; code: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <span className="pill delivered" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
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
  const t = useCopy(copy);
  return (
    <div className="container">
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="page-title">{t.heading}</h1>
      <p className="sub">{t.intro}</p>

      <div className="callout" style={{ margin: "12px 0 24px" }}>
        {t.callout}
      </div>

      <CodeBlock code={INSTALL} lang="bash" />
      <div style={{ height: 28 }} />

      {t.steps.map(([title, sub], i) => (
        <Step key={title} n={i + 1} title={title} sub={sub} code={STEP_CODE[i] ?? ""} />
      ))}

      <div className="card" style={{ textAlign: "center", marginTop: 12 }}>
        <p className="sub" style={{ margin: 0 }}>
          {t.footer}
        </p>
      </div>
    </div>
  );
}
