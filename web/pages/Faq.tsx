import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";
import { POSTEL } from "../lib/links";

const CRON = `// Serverless / no long-lived process? Skip the dispatcher loop and
// drain a batch from a scheduled function (cron, Lambda, Cloud Run job):
await relay.dispatchOnce({ max: 50 });`;

const ACCEL = `import { Client } from "pg";
import { createPgAccelerator } from "commitcourier/accelerator/pg";

// Wake the dispatcher the instant an enqueue commits, via Postgres LISTEN/NOTIFY:
const accelerator = createPgAccelerator({
  pool,                                        // fires a transactional NOTIFY on COMMIT
  listen: async () => { const c = new Client(cfg); await c.connect(); return c; },
});
const relay = await createRelay({ store, accelerator });
// Best-effort: a missed NOTIFY only delays delivery — the poller still reclaims the row.`;

const ENDPOINTS = `// Register endpoints once, then target them by id instead of inlining { url, secret }:
const { id } = await relay.endpoints.register({
  url: "https://customer.example.com/webhooks",
  secret,
});
await relay.enqueue(trx, { eventType, payload, endpoint: { endpointId: id } });

// Rotate the signing key with zero downtime — deliveries are dual-signed with both keys:
await relay.endpoints.rotateSecret(id, newSecret);
await relay.endpoints.finalizeRotation(id); // once receivers have migrated to newSecret`;

const SINK = `import { Svix } from "svix";
import { svixSink } from "commitcourier/forward/svix";

// Experimental: keep the transactional outbox, but hand delivery off to your SaaS
// instead of CommitCourier sending the HTTP request itself.
const relay = await createRelay({
  store,
  delivery: { transport: "sink" },
  sink: svixSink({ svix: new Svix(process.env.SVIX_TOKEN), appId }),
});
// enqueue still rides your business TX; the dispatcher forwards each event to Svix,
// and your idempotencyKey maps onto Svix's dedup key.`;

/**
 * Anchor ids for the Q&A cards, so pages can deep-link the answer to the doubt they provoke (see the
 * feature cards and the comparison note on Landing).
 *
 * Locale-independent by construction: the id is the one part of an item that must NOT be translated,
 * because a link written once has to land in both locales. The union makes a typo a `tsc` error;
 * en/ja carrying the *same* ids in the same order is what test/web/pages/Faq.test.tsx checks against
 * this list, since no type can enforce that across two array literals.
 */
export const FAQ_IDS = [
  "exactly-once",
  "dedup",
  "ordering",
  "serverless",
  "poll-latency",
  "scale",
  "endpoints",
  "svix-sink",
  "vs-postel",
  "secrets-at-rest",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];

export interface QA {
  id: FaqId;
  q: string;
  a: ReactNode;
}

interface FaqCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  items: QA[];
  avoidTitle: string;
  avoidList: ReactNode;
}

const en: FaqCopy = {
  eyebrow: "FAQ",
  heading: "Questions a careful engineer asks",
  intro: (
    <>
      Honest answers about the guarantees — and the explicit non-goals. CommitCourier is
      deliberately scoped; knowing the edges is part of trusting it.
    </>
  ),
  items: [
    {
      id: "exactly-once",
      q: "Is delivery exactly-once?",
      a: (
        <>
          No — it's <b>at-least-once</b>. <code>FOR UPDATE SKIP LOCKED</code> means two dispatchers
          never claim the same row at once, but that's a claim guarantee, not a delivery count: a
          crash after a successful HTTP send but before the status commit causes one redelivery once
          the visibility-timeout reclaim fires. The dual-write guarantee (no phantom / lost
          webhooks) is exact; the <i>network delivery</i> is at-least-once, like every honest
          webhook system.
        </>
      ),
    },
    {
      id: "dedup",
      q: "Then how do I get exactly-once effects?",
      a: (
        <>
          Dedup on the receiver. Every delivery carries a stable <code>webhook-id</code> (and your
          optional <code>idempotency-key</code>); record it and ignore repeats. The id is the outbox
          row's own id, so it survives every retry <i>and</i> the crash-redelivery above — which is
          what makes at-least-once workable rather than merely honest. One exception worth knowing:{" "}
          <code>relay.replay()</code> re-enqueues as new rows with new ids, so a replayed event is
          deliberately not deduped by <code>webhook-id</code>. The <a href="/demo">live demo</a>{" "}
          shows the self-receiver doing exactly this.
        </>
      ),
    },
    {
      id: "ordering",
      q: "Are events ordered?",
      a: (
        <>
          <b>No, not by default</b> — the dispatcher claims a batch oldest-first and then delivers
          it concurrently, so deliveries race and can land out of order. Per-endpoint FIFO is opt-in
          via <code>createDispatcher(&#123; ordering: "per-endpoint" &#125;)</code>, with one catch
          that matters: it only serialises <b>registered</b> endpoints. If you enqueue with an
          inline <code>endpoint: &#123; url, secret &#125;</code> — the quick path shown in most of
          these examples, and what this demo itself uses — opting in changes nothing. Register the
          endpoint first (see <a href="#endpoints">targeting endpoints by id</a>), then opt in. For
          strict global ordering across an endpoint, design for it explicitly.
        </>
      ),
    },
    {
      id: "serverless",
      q: "I run serverless — no long-lived process. Can I still use it?",
      a: (
        <>
          Yes. The background dispatcher is one option; on serverless, drive delivery from a
          scheduled function instead:
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={CRON} />
          </div>
        </>
      ),
    },
    {
      id: "poll-latency",
      q: "Isn't a ~1s polling loop too slow?",
      a: (
        <>
          <code>pollIntervalMs</code> (default 1000) is a <i>ceiling</i>, not a tick. The idle sleep
          starts at ~50ms and only doubles toward the ceiling while the queue stays empty, resetting
          the moment a row is found — so a backlog drains at roughly 50ms per pass, and the full
          second is what you pay on an idle queue. When you want the first delivery not to wait for
          a poll at all, wire the optional <code>commitcourier/accelerator/pg</code> accelerator: a
          transactional <code>pg_notify</code> on COMMIT wakes a listening dispatcher at once via
          Postgres LISTEN/NOTIFY. It's best-effort — a missed wake only falls back to polling, never
          drops the row. (This site doesn't wire it: a demo is better served by showing the honest
          default.)
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ACCEL} />
          </div>
        </>
      ),
    },
    {
      id: "scale",
      q: "Does it scale? Can I run multiple dispatchers?",
      a: (
        <>
          Run as many as you like — <code>FOR UPDATE SKIP LOCKED</code> stops two dispatchers
          claiming the same row. It targets small-to-medium volume on the Postgres you already
          operate, not billions/sec. No Redis, no broker, no SaaS.
        </>
      ),
    },
    {
      id: "endpoints",
      q: "Do I have to inline the URL and secret on every enqueue?",
      a: (
        <>
          No — inline <code>endpoint: &#123; url, secret &#125;</code> is the quick path, but you
          can register endpoints once and target them by id. The registry also gives you
          zero-downtime <b>key rotation</b>: <code>rotateSecret</code> dual-signs with the old and
          new keys until every receiver has migrated, then <code>finalizeRotation</code> drops the
          old one.
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ENDPOINTS} />
          </div>
        </>
      ),
    },
    {
      id: "svix-sink",
      q: "I already use Svix / a webhook SaaS — can CommitCourier feed it instead of sending HTTP itself?",
      a: (
        <>
          Yes. Set <code>delivery.transport: "sink"</code> and pass a <code>Sink</code> — the
          official <code>svixSink</code> sample, or your own — and CommitCourier keeps the
          transactional outbox, retries, DLQ and ledger while handing each event off to your SaaS
          instead of delivering the HTTP request itself. Signing and SSRF are delegated to the SaaS,
          and your <code>idempotency-key</code> maps onto its dedup key. This is how you "keep your
          platform, close the transactional gap."{" "}
          <b>Experimental — this API may change in a minor release.</b>
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={SINK} />
          </div>
        </>
      ),
    },
    {
      id: "vs-postel",
      q: "Isn't this the same pitch as Postel?",
      a: (
        <>
          Largely, yes — and it's the comparison worth making, so here it is unprompted.{" "}
          <a href={POSTEL}>Postel</a> is an embedded library with a near-identical claim:
          transactional outbox, signing, retries, dead-letter, replay, no Redis and no broker. We
          aren't going to pretend it doesn't exist.
          <div style={{ marginTop: 10 }}>
            It casts wider than we do. It reaches beyond Postgres to SQLite, it does inbound webhook{" "}
            <i>receiving</i> and not just sending, it signs with Ed25519 and publishes JWKS where
            CommitCourier is HMAC-SHA256 only, and it has a polyglot roadmap while we are Node and
            nothing else. If you need any of those, use it — that's not a hedge.
          </div>
          <div style={{ marginTop: 10 }}>
            CommitCourier trades that reach for depth on one database: SSRF protection on by
            default, at-rest secret encryption, an endpoint circuit breaker, OpenTelemetry, the
            LISTEN/NOTIFY accelerator, <code>pg</code> / Knex / Drizzle / Prisma adapters, a{" "}
            <code>doctor</code> CLI, DLQ inspection and replay, and the{" "}
            <a href="#svix-sink">sink handoff</a> to a SaaS. On maturity neither of us should be
            oversold: Postel calls itself pre-alpha, we're <code>0.x</code> and a minor can still
            break you.
          </div>
        </>
      ),
    },
    {
      id: "secrets-at-rest",
      q: "How are signing secrets protected at rest?",
      a: (
        <>
          That's your precondition: DB disk encryption, column encryption, or a{" "}
          <code>cipher: createAesGcmCipher(key)</code>. Without one, <code>createRelay</code> warns
          at startup and you acknowledge with <code>unsafeAllowPlaintextSecrets: true</code> (this
          demo does, for visibility — don't in production).
        </>
      ),
    },
  ],
  avoidTitle: "When NOT to reach for it",
  avoidList: (
    <ul className="muted">
      <li>
        Ultra-low-latency fan-out — the LISTEN/NOTIFY accelerator trims the poll delay, but this
        isn't a sub-millisecond streaming bus.
      </li>
      <li>Hyperscale fan-out (millions/sec) — use a dedicated streaming/queue platform.</li>
      <li>Stacks with no PostgreSQL transaction to ride (the guarantee needs your business TX).</li>
    </ul>
  ),
};

/**
 * The English Q&A pairs, for the FAQPage JSON-LD that scripts/prerender.mjs bakes into faq.html.
 * Exported rather than duplicated as plain strings so the structured data cannot drift from the copy
 * a visitor actually reads — see web/seo/jsonld.tsx.
 */
export const FAQ_ITEMS_EN: readonly QA[] = en.items;

const ja: FaqCopy = {
  eyebrow: "FAQ",
  heading: "慎重なエンジニアが訊くこと",
  intro: (
    <>
      保証内容と、明示された non-goal への率直な回答。CommitCourier はあえてスコープを絞っています。
      その境界を知ることが、信頼して使う第一歩です。
    </>
  ),
  items: [
    {
      id: "exactly-once",
      q: "配信は exactly-once ですか？",
      a: (
        <>
          いいえ、<b>at-least-once</b> です。<code>FOR UPDATE SKIP LOCKED</code> により2つの
          dispatcher が同じ行を同時に掴むことはありませんが、それは「行の claim」の保証であって
          「配信回数」の保証ではありません。HTTP 送信成功後・ステータス確定前にクラッシュすると、
          可視性タイムアウトの再取得が走った時点で1回だけ再配信されます。二重書き込み防止（幻の/消えた
          Webhook が無い）は厳密ですが、<i>ネットワーク配信</i>は、誠実な Webhook システムと同様に
          at-least-once です。
        </>
      ),
    },
    {
      id: "dedup",
      q: "では exactly-once の「効果」はどう得る？",
      a: (
        <>
          受信側で重複排除します。各配信は安定した <code>webhook-id</code>（と任意の{" "}
          <code>idempotency-key</code>）を持つので、それを記録して再送を無視します。この id は
          outbox 行の id そのものなので、リトライでも上記のクラッシュ再配信でも変わりません —
          at-least-once が「正直なだけ」でなく実用に耐えるのはこのためです。1点だけ例外があり、
          <code>relay.replay()</code> は新しい id の行として再投入するので、リプレイされたイベントは
          意図的に <code>webhook-id</code> では重複排除されません。
          <a href="/demo">ライブデモ</a>では自前 receiver がまさにこれを行います。
        </>
      ),
    },
    {
      id: "ordering",
      q: "イベントは順序保証されますか？",
      a: (
        <>
          <b>既定では保証しません。</b>dispatcher は古い順にバッチで claim した後、それを並列に配信
          するので、配信はレースし順序が入れ替わり得ます。エンドポイント単位の FIFO は{" "}
          <code>createDispatcher(&#123; ordering: "per-endpoint" &#125;)</code>{" "}
          でオプトインできますが、重要な注意が1つ: 直列化されるのは<b>登録済み</b>
          エンドポイントだけです。インラインの <code>endpoint: &#123; url, secret &#125;</code> で
          enqueue している場合 — 本 FAQ の例の多くが使っている手軽な経路で、このデモ自身もそうです —
          オプトインしても何も変わりません。先にエンドポイントを登録し （
          <a href="#endpoints">id で指定する方法</a>を参照）、その上でオプトインしてください。
          厳密な全順序が要るなら明示的に設計してください。
        </>
      ),
    },
    {
      id: "serverless",
      q: "サーバレスで常駐プロセスがありません。使えますか？",
      a: (
        <>
          使えます。常駐 dispatcher は一手段で、サーバレスではスケジュール実行から配信を駆動します:
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={CRON} />
          </div>
        </>
      ),
    },
    {
      id: "poll-latency",
      q: "約1秒のポーリングは遅くないですか？",
      a: (
        <>
          <code>pollIntervalMs</code>（既定 1000）は<i>上限</i>であって、固定の刻みではありません。
          アイドル時の sleep は約 50ms から始まり、キューが空のままのときだけ上限に向かって倍増し、
          行が見つかった瞬間に元に戻ります。つまり滞留分は 1 パスあたり約 50ms
          で捌け、まるまる1秒を払うのはアイドルのときです。最初の1件すらポーリングを待たせたくない
          場合は、オプションの <code>commitcourier/accelerator/pg</code> アクセラレータを繋ぎます。
          COMMIT 時のトランザクショナルな <code>pg_notify</code> が Postgres の LISTEN/NOTIFY
          経由で待機中の dispatcher を即座に起こします。best-effort で、wake
          を取りこぼしてもポーリングにフォールバックするだけで、行は失われません。
          （このサイトは繋いでいません。デモでは正直な既定値を見せる方が有益なので。）
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ACCEL} />
          </div>
        </>
      ),
    },
    {
      id: "scale",
      q: "スケールしますか？ dispatcher を複数動かせますか？",
      a: (
        <>
          いくつでも動かせます — <code>FOR UPDATE SKIP LOCKED</code> が同一行の二重取得を防ぎます。
          想定は、すでに運用している Postgres
          上の中小規模ボリュームで、毎秒数十億ではありません。Redis もブローカーも SaaS も不要。
        </>
      ),
    },
    {
      id: "endpoints",
      q: "enqueue のたびに URL とシークレットを直書きする必要がありますか？",
      a: (
        <>
          いいえ。インラインの <code>endpoint: &#123; url, secret &#125;</code>{" "}
          は手軽な方法ですが、エンドポイントを一度登録して id で指定することもできます。レジストリは
          無停止の<b>鍵ローテーション</b>も提供します: <code>rotateSecret</code>{" "}
          が新旧の鍵で二重署名し、すべての受信側が移行したら <code>finalizeRotation</code>{" "}
          で旧鍵を破棄します。
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={ENDPOINTS} />
          </div>
        </>
      ),
    },
    {
      id: "svix-sink",
      q: "すでに Svix / Webhook SaaS を使っています。CommitCourier で自前 HTTP 送信の代わりに SaaS へ渡せますか？",
      a: (
        <>
          はい。<code>delivery.transport: "sink"</code> にして <code>Sink</code>（公式サンプルの{" "}
          <code>svixSink</code>、または自作）を渡すと、CommitCourier は
          トランザクショナルなアウトボックス・リトライ・DLQ・台帳を保ったまま、HTTP
          を自前で送る代わりに 各イベントを SaaS へハンドオフします。署名と SSRF は SaaS
          側へ委譲され、
          <code>idempotency-key</code> は SaaS の dedup キーへ対応します。これが「既存基盤を捨てずに
          transactional gap だけを塞ぐ」具体的な手段です。
          <b>実験的機能 — この API は minor リリースで変わる可能性があります。</b>
          <div style={{ marginTop: 10 }}>
            <CodeBlock code={SINK} />
          </div>
        </>
      ),
    },
    {
      id: "vs-postel",
      q: "これは Postel と同じ主張では？",
      a: (
        <>
          おおむねその通りです。そしてこれは比較する価値のある相手なので、訊かれる前に書いておきます。
          <a href={POSTEL}>Postel</a> は、ほぼ同一の主張を持つ埋め込み型ライブラリです:
          トランザクショナル outbox、署名、リトライ、dead-letter、リプレイ、Redis
          もブローカーも不要。存在しないふりはしません。
          <div style={{ marginTop: 10 }}>
            向こうの方が広く構えています。Postgres を超えて SQLite に届き、送信だけでなく inbound の
            <i>受信</i>も扱い、CommitCourier が HMAC-SHA256 のみなのに対して Ed25519 で署名し JWKS
            を公開し、こちらが Node 一本なのに対して polyglot のロードマップを持っています。
            これらが要るなら Postel を使ってください — 建前ではなく本心です。
          </div>
          <div style={{ marginTop: 10 }}>
            CommitCourier はその広さを捨てて、1つのデータベースへの深さと交換しています: 既定で ON
            の SSRF 保護、シークレットの at-rest 暗号化、エンドポイントのサーキット
            ブレーカー、OpenTelemetry、LISTEN/NOTIFY アクセラレータ、<code>pg</code> / Knex /
            Drizzle / Prisma アダプタ、<code>doctor</code> CLI、DLQ の調査とリプレイ、そして SaaS
            への<a href="#svix-sink">ハンドオフ</a>。成熟度についてはどちらも盛るべきではありません:
            Postel は自ら pre-alpha を名乗り、こちらは <code>0.x</code>
            で、minor リリースが壊す可能性があります。
          </div>
        </>
      ),
    },
    {
      id: "secrets-at-rest",
      q: "署名シークレットの at-rest 保護は？",
      a: (
        <>
          それは利用側の前提条件です: DB のディスク暗号化、カラム暗号化、または{" "}
          <code>cipher: createAesGcmCipher(key)</code>。無い場合 <code>createRelay</code>{" "}
          は起動時に警告し、<code>unsafeAllowPlaintextSecrets: true</code>{" "}
          で承認します（このデモは可視化のため承認済み。本番では避ける）。
        </>
      ),
    },
  ],
  avoidTitle: "使わない方がいい場面",
  avoidList: (
    <ul className="muted">
      <li>
        超低レイテンシのファンアウト — LISTEN/NOTIFY
        アクセラレータでポーリング遅延は縮められますが、サブミリ秒のストリーミング基盤ではありません。
      </li>
      <li>毎秒数百万規模の超大量ファンアウト — 専用のストリーミング/キュー基盤を使う。</li>
      <li>相乗りする PostgreSQL トランザクションが無いスタック（保証には業務 TX が必要）。</li>
    </ul>
  ),
};

const copy: Record<Locale, FaqCopy> = { en, ja };

export function Faq() {
  const t = useCopy(copy);
  return (
    <div className="container">
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="page-title">{t.heading}</h1>
      <p className="sub">{t.intro}</p>

      <div className="grid" style={{ gap: 14, marginTop: 8 }}>
        {t.items.map((item) => (
          // `id` is the anchor other pages deep-link (e.g. /faq#ordering) and the key: the question
          // text is localized, so keying on it would remount every card on a locale switch.
          <div className="card" id={item.id} key={item.id}>
            {/* Each Q&A is a top-level section of this page, so h2 — which also mirrors the
                FAQPage structured data built from these same items. */}
            <h2 className="card-title">{item.q}</h2>
            <div className="muted">{item.a}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
      <div className="card">
        <div className="eyebrow">{t.avoidTitle}</div>
        {t.avoidList}
      </div>
    </div>
  );
}
