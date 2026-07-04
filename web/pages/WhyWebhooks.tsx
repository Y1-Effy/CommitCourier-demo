import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Flow, PartHeader, PageNav } from "../components/Explainer";
import { useCopy, type Locale } from "../i18n";

// The dual-write snippet is code, so it is never translated (kept as a module constant).
const DUAL_WRITE = `// Two separate steps — not one atomic unit:
await db.orders.insert(order);
await webhookProvider.send(event);`;

interface WhyCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  navLabel: string;

  // パート見出し / ページ内ナビ
  partProblem: string;
  partSolution: string;
  partApply: string;

  // 1. 二重書き込み問題
  dualEyebrow: string;
  dualTitle: string;
  dualSub: ReactNode;
  lostTitle: string;
  lostFlow: string[];
  lostResult: ReactNode;
  phantomTitle: string;
  phantomFlow: string[];
  phantomResult: ReactNode;
  dualKey: ReactNode;

  // 2. コスト（業務影響 + 損失を統合）
  costEyebrow: string;
  costTitle: string;
  costSub: ReactNode;
  impactList: string[];
  directTitle: string;
  directList: string[];
  indirectTitle: string;
  indirectList: string[];

  // 3. リカバリ
  recoveryEyebrow: string;
  recoveryTitle: string;
  recoverySub: ReactNode;
  recoveryList: string[];
  recoveryKey: ReactNode;

  // 4. 既存 SaaS が解決していること
  saasEyebrow: string;
  saasTitle: string;
  saasSub: ReactNode;
  saasList: string[];

  // 5. 残る最後の穴
  gapEyebrow: string;
  gapTitle: string;
  gapSub: ReactNode;
  gapFlow: string[];
  gapPoints: ReactNode;
  gapKey: ReactNode;

  // 6. CommitCourier がふさぐ部分
  fixEyebrow: string;
  fixTitle: string;
  fixSub: ReactNode;
  fixFlow: string[];
  fixKey: ReactNode;
  deliveryTitle: string;
  deliveryPills: string[];
  deliveryRef: ReactNode;

  // 7. 2 つの利用パターン
  useEyebrow: string;
  useTitle: string;
  useSub: ReactNode;
  soloTitle: string;
  soloFlow: string[];
  soloDesc: ReactNode;
  forLabel: string;
  soloFor: string[];
  comboTitle: string;
  comboFlow: string[];
  comboDesc: ReactNode;
  comboFor: string[];
  useCallout: ReactNode;

  // 8. 解決しないこと
  scopeEyebrow: string;
  scopeTitle: string;
  scopeSub: ReactNode;
  scopeNote: ReactNode;

  // 末尾 CTA
  ctaTitle: string;
  ctaSub: ReactNode;
  ctaDemo: string;
  ctaIntegrate: string;
  ctaPath: string[];
}

const en: WhyCopy = {
  eyebrow: "Start here",
  heading: "Why webhook delivery is hard",
  intro: (
    <>
      Webhook delivery isn't just sending an HTTP request. You have to keep two facts in agreement —{" "}
      <b>your business data changed</b> and <b>the webhook event was registered</b> — even if the
      process crashes or rolls back in between. When those are two separate writes, that in-between
      moment is where systems break. This page walks the failure, what it costs, what existing
      services already solve, and the one seam they can leave open.
    </>
  ),
  navLabel: "On this page:",

  partProblem: "The problem",
  partSolution: "The fix",
  partApply: "Using it",

  dualEyebrow: "Dual write",
  dualTitle: "Two writes that can't be made atomic",
  dualSub: (
    <>
      A typical implementation does these in sequence. If they can't share one atomic transaction,
      there are two ways for it to break:
    </>
  ),
  lostTitle: "Pattern A — the lost webhook",
  lostFlow: [
    "Save the order to the DB (success)",
    "COMMIT the DB",
    "Process dies / network fails",
    "The webhook event is never registered",
  ],
  lostResult: (
    <ul className="muted">
      <li>The order exists.</li>
      <li>The delivery layer never learned the event existed.</li>
      <li>
        So it can't retry or redeliver —{" "}
        <b>a delivery layer can't resend an event it never received.</b>
      </li>
    </ul>
  ),
  phantomTitle: "Pattern B — the phantom webhook",
  phantomFlow: [
    "Register the webhook event with the provider (success)",
    "The business transaction fails",
    "The order data is rolled back",
  ],
  phantomResult: (
    <ul className="muted">
      <li>The order does not exist.</li>
      <li>An external system is told an order was created.</li>
      <li>The two systems now disagree about reality.</li>
    </ul>
  ),
  dualKey: (
    <>
      The same names are used on the <a href="#/">home page</a>: <b>lost webhook</b> (committed but
      never enqueued) and <b>phantom webhook</b> (enqueued but rolled back).
    </>
  ),

  costEyebrow: "Cost",
  costTitle: "What it costs the business",
  costSub: (
    <>
      An inconsistency rarely stays contained. Here's what actually happens — and the bill that
      follows:
    </>
  ),
  impactList: [
    "An order is confirmed, but the warehouse is never notified, so it never ships.",
    "A payment fails, yet an external service receives a success notification.",
    "CRM, accounting, and inventory systems drift out of agreement.",
    "The same event is processed twice — double billing or double shipment.",
  ],
  directTitle: "Direct loss",
  directList: [
    "Double billing or refunds",
    "Missed or duplicated shipments",
    "Service that was never delivered",
    "Engineer-hours spent on manual recovery",
    "Data repair across external systems",
  ],
  indirectTitle: "Indirect loss",
  indirectList: [
    "Erosion of customer trust",
    "More support tickets to handle",
    "Engineers pulled into incident triage",
    "Gaps in audit trail and accountability",
    "Planned work slips while you firefight",
  ],

  recoveryEyebrow: "Recovery",
  recoveryTitle: "Recovery needs people, not just a retry",
  recoverySub: (
    <>
      Once an inconsistency exists, a simple resend is rarely enough. A human has to reconstruct
      what really happened:
    </>
  ),
  recoveryList: [
    "Comb through application logs to reconstruct what happened.",
    "Reconcile business rows in the DB against the delivery history.",
    "Identify the events that were never sent, and resend them without double-sending.",
    "Check and repair state on the external system's side.",
    "Reach out to customers — refund, re-ship, or repair data.",
  ],
  recoveryKey: (
    <>
      The real problem isn't that one webhook failed. It's that{" "}
      <b>after the incident, you no longer know which system holds the correct state.</b>
    </>
  ),

  saasEyebrow: "Credit where due",
  saasTitle: "What existing webhook services already solve",
  saasSub: (
    <>
      Modern webhook delivery services solve a great deal of the hard part — everything about
      delivering an event <i>after it has been received</i>. This is genuinely difficult work, and
      they do it well:
    </>
  ),
  saasList: [
    "HTTP delivery",
    "Retries",
    "Exponential backoff",
    "Signing",
    "Delivery history",
    "Dead-letter queue (DLQ)",
    "Endpoint management",
    "Monitoring",
    "Customer-facing dashboards",
    "Delivery-result visibility",
  ],

  gapEyebrow: "The last gap",
  gapTitle: "The seam that can still remain",
  gapSub: (
    <>
      This is the same dual-write failure from the top of this page — only now the second write is{" "}
      <b>registering the event with your webhook service</b>. A delivery service can only retry
      events it has already received, so a gap remains whenever that registration is a separate step
      from committing the business transaction:
    </>
  ),
  gapFlow: [
    "COMMIT to the business DB",
    "The application stops",
    "Registering with the webhook service fails",
    "The delivery service never learned the event exists",
  ],
  gapPoints: (
    <ul className="muted">
      <li>A delivery service's retry only applies to events it received.</li>
      <li>An event it never received appears in neither the delivery history nor the DLQ.</li>
      <li>
        This is not a shortcoming of the webhook service — it is a seam left at the boundary between
        the application and the delivery layer.
      </li>
    </ul>
  ),
  gapKey: (
    <>
      This doesn't apply to every service or every setup. The inconsistency remains specifically{" "}
      <b>when event registration happens outside the business transaction</b>. We'll call this the{" "}
      <i>transactional gap</i> (or handoff gap).
    </>
  ),

  fixEyebrow: "The fix",
  fixTitle: "How CommitCourier closes the gap",
  fixSub: (
    <>
      CommitCourier writes the business data update and the webhook outbox row in the{" "}
      <b>same PostgreSQL transaction</b>:
    </>
  ),
  fixFlow: [
    "One PostgreSQL transaction",
    "Save business data + save webhook outbox row",
    "Commit together, or roll back together",
  ],
  fixKey: (
    <>
      This prevents the state where only one side succeeded — business data without an event, or an
      event without business data. CommitCourier doesn't claim to prevent every webhook failure; it{" "}
      <b>
        structurally prevents the inconsistency between the business transaction and event
        registration.
      </b>
    </>
  ),
  deliveryTitle: "And the delivery after that",
  deliveryPills: [
    "Background delivery",
    "Signing",
    "Retries + backoff",
    "DLQ + ledger",
    "Replay",
    "SSRF protection",
  ],
  deliveryRef: (
    <>
      The full capability list lives on the <a href="#/">home page</a>; runnable code for each is on{" "}
      <a href="#/integrate">Integrate</a>.
    </>
  ),

  useEyebrow: "Two ways to use it",
  useTitle: "On its own, or alongside the platform you already run",
  useSub: (
    <>
      CommitCourier can be your webhook delivery layer — or secure the handoff to the one you
      already use.
    </>
  ),
  soloTitle: "Pattern 1 — CommitCourier on its own",
  soloFlow: ["Your business logic", "CommitCourier", "Webhook receiver"],
  soloDesc: (
    <>
      With just PostgreSQL, you get enqueue, delivery, retries, DLQ, and history end to end — no
      extra infrastructure.
    </>
  ),
  forLabel: "A good fit when you:",
  soloFor: [
    "Don't run a webhook SaaS today",
    "Want to manage delivery inside your own environment",
    "Already operate PostgreSQL",
    "Don't want to add another external service",
  ],
  comboTitle: "Pattern 2 — alongside an existing webhook service",
  comboFlow: [
    "Your business logic",
    "CommitCourier",
    "Existing webhook delivery service",
    "Webhook receiver",
  ],
  comboDesc: (
    <>
      Keep your webhook service as is, and use CommitCourier to close the handoff gap between the
      business transaction and the delivery layer.
    </>
  ),
  comboFor: [
    "Already run a webhook SaaS",
    "Want the SaaS to keep handling portals and advanced monitoring",
    "Don't want to restructure your setup",
    "Only need to prevent the DB-to-provider inconsistency",
  ],
  useCallout: <>Keep your webhook platform. Close the transactional gap.</>,

  scopeEyebrow: "Non-goals",
  scopeTitle: "What CommitCourier does not solve",
  scopeSub: (
    <>
      To stay honest about scope: CommitCourier owns the consistency between the business
      transaction and event registration, plus delivery, tracking, and retries after that. It does{" "}
      <b>not</b> remove every webhook-related failure — receiver bugs, receiver-side idempotency,
      your own application logic, and PostgreSQL's own availability all stay yours.
    </>
  ),
  scopeNote: (
    <>
      The full responsibility boundary — what CommitCourier owns versus what you still own — is laid
      out on <a href="#/safe-adoption">Built for safe adoption →</a>.
    </>
  ),

  ctaTitle: "Understand the problem, then watch it happen",
  ctaSub: (
    <>
      You've seen the problem and the fix — now watch the failure and retry behavior play out in the
      live demo, then read the integration code.
    </>
  ),
  ctaDemo: "▶ See it run live",
  ctaIntegrate: "View integration code",
  ctaPath: [
    "Understand the problem",
    "Watch it run in the live demo",
    "Read the integration code",
    "GitHub / npm",
  ],
};

const ja: WhyCopy = {
  eyebrow: "はじめに",
  heading: "なぜ Webhook 配信は難しいのか",
  intro: (
    <>
      Webhook 配信の難しさは、HTTP リクエストを送ることだけではありません。
      <b>業務データの更新</b>と <b>Webhook イベントの登録</b>を、間でクラッシュやロールバックが
      起きても矛盾なく揃えておく必要があります。この 2
      つが別々の書き込みになっていると、ちょうどその合間でシステムは破綻します。
      このページでは、その失敗の構造・損失・既存サービスがすでに解決している範囲、そして
      それでも残りうる「最後の穴」を順番に見ていきます。
    </>
  ),
  navLabel: "このページの流れ:",

  partProblem: "問題",
  partSolution: "解決策",
  partApply: "使い方",

  dualEyebrow: "二重書き込み",
  dualTitle: "原子的にできない 2 つの書き込み",
  dualSub: (
    <>
      通常の実装はこの 2 つを順番に実行します。1 つの原子的なトランザクションとして扱えない場合、
      次の 2 通りで壊れます:
    </>
  ),
  lostTitle: "パターンA — 消えた Webhook",
  lostFlow: [
    "注文を DB に保存（成功）",
    "DB を COMMIT",
    "プロセス停止 / ネットワーク障害",
    "Webhook イベントを登録できない",
  ],
  lostResult: (
    <ul className="muted">
      <li>注文は存在する。</li>
      <li>配信基盤はイベントの存在を知らない。</li>
      <li>
        そのためリトライも再送もできない —{" "}
        <b>配信基盤は、受け取っていないイベントを再送できません。</b>
      </li>
    </ul>
  ),
  phantomTitle: "パターンB — 幻の Webhook",
  phantomFlow: [
    "Webhook イベントを外部サービスへ登録（成功）",
    "業務トランザクションが失敗",
    "注文データは rollback",
  ],
  phantomResult: (
    <ul className="muted">
      <li>注文は存在しない。</li>
      <li>外部システムには注文が作成されたという通知が届く。</li>
      <li>システム間で状態が食い違う。</li>
    </ul>
  ),
  dualKey: (
    <>
      <a href="#/">トップページ</a>と同じ呼び方を使っています: <b>消えた Webhook</b>（commit したが
      enqueue されない）と <b>幻の Webhook</b>（enqueue したが rollback された）。
    </>
  ),

  costEyebrow: "コスト",
  costTitle: "業務にかかるコスト",
  costSub: <>不整合はたいてい一箇所では収まりません。実際に何が起こり、どんな損失につながるのか:</>,
  impactList: [
    "注文は確定したのに、倉庫へ通知されず出荷されない。",
    "決済が失敗したのに、外部サービスには成功通知が届く。",
    "CRM・会計・在庫システムの状態が食い違う。",
    "同じイベントが複数回処理され、二重請求や二重出荷につながる。",
  ],
  directTitle: "直接的な損失",
  directList: [
    "二重請求や返金",
    "出荷漏れや二重出荷",
    "提供されなかったサービス",
    "手動復旧に費やす人件費",
    "外部システムとのデータ修正",
  ],
  indirectTitle: "間接的な損失",
  indirectList: [
    "顧客からの信用低下",
    "問い合わせ対応の増加",
    "開発者が障害調査に拘束される",
    "監査ログや説明責任の不足",
    "本来の開発作業の遅延",
  ],

  recoveryEyebrow: "リカバリ",
  recoveryTitle: "復旧には再送だけでなく人手が要る",
  recoverySub: (
    <>
      いったん不整合が生じると、単純な再送だけでは足りません。何が本当に起きたのかを、人間が
      組み立て直す必要があります:
    </>
  ),
  recoveryList: [
    "アプリケーションログを掘り起こし、何が起きたか再構成する。",
    "DB の業務データと配信履歴を突合する。",
    "送信されなかったイベントを特定し、二重送信せずに再送する。",
    "外部システム側の状態を確認し、修復する。",
    "顧客へ連絡し、返金・再出荷・データ修正を行う。",
  ],
  recoveryKey: (
    <>
      本当の問題は、Webhook が 1 件失敗することではありません。
      <b>障害後に、どのシステムの状態が正しいのか分からなくなることです。</b>
    </>
  ),

  saasEyebrow: "正当な評価",
  saasTitle: "既存の Webhook サービスが解決していること",
  saasSub: (
    <>
      現代の Webhook 配信サービスは、難しい部分の多くを解決しています —{" "}
      <i>イベントを受け取った後の配信</i>に関するすべてです。これは本当に難しい仕事で、
      多くのサービスがしっかり実現しています:
    </>
  ),
  saasList: [
    "HTTP 配信",
    "再試行",
    "指数バックオフ",
    "署名",
    "配信履歴",
    "DLQ（dead-letter queue）",
    "エンドポイント管理",
    "監視",
    "顧客向け管理画面",
    "配信結果の可視化",
  ],

  gapEyebrow: "最後の穴",
  gapTitle: "それでも残りうる継ぎ目",
  gapSub: (
    <>
      これはこのページ冒頭の二重書き込みと同じ失敗です。ただし今度の 2 つ目の書き込みは{" "}
      <b>Webhook 配信サービスへのイベント登録</b>です。配信サービスが再試行できるのは
      すでに受け取ったイベントだけなので、その登録が業務トランザクションの commit と
      別ステップになっている限り、穴が残ります:
    </>
  ),
  gapFlow: [
    "業務 DB へ COMMIT",
    "アプリケーション停止",
    "Webhook サービスへの登録失敗",
    "配信サービスはイベントの存在を知らない",
  ],
  gapPoints: (
    <ul className="muted">
      <li>配信サービスの再試行は、受け取ったイベントに対してのみ機能する。</li>
      <li>受け取られていないイベントは、配信履歴にも DLQ にも残らない。</li>
      <li>
        これは Webhook
        サービスの性能不足ではなく、アプリケーションと配信基盤の境界に残る問題である。
      </li>
    </ul>
  ),
  gapKey: (
    <>
      すべてのサービス・すべての構成にこの問題があるわけではありません。
      <b>イベント登録が業務トランザクションの外で行われている場合</b>に限り、この不整合が残ります。
      本ページではこれを <i>transactional gap</i>（または handoff gap）と呼びます。
    </>
  ),

  fixEyebrow: "解決策",
  fixTitle: "CommitCourier が穴をどうふさぐか",
  fixSub: (
    <>
      CommitCourier は、業務データの更新と Webhook の outbox 行登録を、
      <b>同じ PostgreSQL トランザクション</b>内で行います:
    </>
  ),
  fixFlow: [
    "1 つの PostgreSQL トランザクション",
    "業務データを保存 + Webhook outbox 行を保存",
    "同時に commit、または同時に rollback",
  ],
  fixKey: (
    <>
      これにより、片方だけが成功する状態 — 業務データだけ／イベントだけ — を防ぎます。 CommitCourier
      はすべての Webhook 障害を防ぐとは謳いません。
      <b>業務トランザクションとイベント登録の間に残る不整合を、構造的に防ぎます。</b>
    </>
  ),
  deliveryTitle: "その後の配信について",
  deliveryPills: [
    "バックグラウンド配信",
    "署名",
    "再試行 + バックオフ",
    "DLQ + 台帳",
    "replay",
    "SSRF 防御",
  ],
  deliveryRef: (
    <>
      機能の全体は<a href="#/">トップページ</a>に、それぞれの動くコードは
      <a href="#/integrate">組み込み方</a>にあります。
    </>
  ),

  useEyebrow: "2 つの使い方",
  useTitle: "単体でも、既存の配信基盤との併用でも",
  useSub: (
    <>
      CommitCourier は、それ自体を Webhook 配信基盤としても、既存の配信基盤へ安全に渡す前段としても
      使えます。
    </>
  ),
  soloTitle: "パターン1 — CommitCourier だけで完結",
  soloFlow: ["業務処理", "CommitCourier", "Webhook 受信先"],
  soloDesc: (
    <>
      PostgreSQL だけで、イベントの enqueue から配信・再試行・DLQ・履歴管理まで完結できます —
      追加インフラは不要です。
    </>
  ),
  forLabel: "向いている利用者:",
  soloFor: [
    "Webhook SaaS を導入していない",
    "自分の環境内で Webhook 配信を管理したい",
    "PostgreSQL をすでに利用している",
    "外部サービスを増やしたくない",
  ],
  comboTitle: "パターン2 — 既存の Webhook 配信サービスと併用",
  comboFlow: ["業務処理", "CommitCourier", "既存の Webhook 配信サービス", "Webhook 受信先"],
  comboDesc: (
    <>
      既存の Webhook サービスはそのまま利用し、業務トランザクションから配信基盤へ渡すまでの handoff
      gap を CommitCourier でふさげます。
    </>
  ),
  comboFor: [
    "すでに Webhook SaaS を導入している",
    "顧客向けポータルや高度な監視は SaaS に任せたい",
    "既存構成を大きく変更したくない",
    "DB と外部配信サービスの間の不整合だけを防ぎたい",
  ],
  useCallout: <>既存の Webhook 基盤はそのままに。transactional gap だけをふさぐ。</>,

  scopeEyebrow: "非対象",
  scopeTitle: "CommitCourier が解決しないこと",
  scopeSub: (
    <>
      スコープを誠実に保つために: CommitCourier は、業務トランザクションとイベント登録の整合性、
      および登録後の配信・追跡・再試行を担当します。Webhook に関する<b>すべて</b>の障害を
      なくすものではありません — 受信側のバグ、受信側の idempotency、アプリ自身の業務ロジック、
      PostgreSQL 自体の可用性は利用側の責務のままです。
    </>
  ),
  scopeNote: (
    <>
      責任境界の全体 — CommitCourier が持つ範囲と利用側が持つ範囲 — は
      <a href="#/safe-adoption">安心して試すための設計 →</a>にまとめてあります。
    </>
  ),

  ctaTitle: "仕組みを理解したら、動く様子を確かめる",
  ctaSub: (
    <>
      問題と解決策を見たら、次は失敗と再試行の動作をライブデモで確かめ、実際の組み込みコードを
      読んでみてください。
    </>
  ),
  ctaDemo: "▶ ライブで動かす",
  ctaIntegrate: "組み込みコードを見る",
  ctaPath: ["問題を理解する", "ライブデモで動作を確認する", "導入コードを見る", "GitHub / npm"],
};

const copy: Record<Locale, WhyCopy> = { en, ja };

export function WhyWebhooks() {
  const t = useCopy(copy);
  const parts = [
    { id: "why-problem", label: t.partProblem },
    { id: "why-solution", label: t.partSolution },
    { id: "why-apply", label: t.partApply },
  ];
  return (
    <div className="container">
      {/* 導入 + ページ内ナビ */}
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 32 }}>
        {t.heading}
      </h2>
      <p className="sub">{t.intro}</p>
      <PageNav navLabel={t.navLabel} parts={parts} />

      {/* ===== Part 1 — 問題 ===== */}
      <PartHeader id="why-problem" n={1} label={t.partProblem} />

      {/* 二重書き込み問題 */}
      <div className="eyebrow">{t.dualEyebrow}</div>
      <h2 className="section">{t.dualTitle}</h2>
      <p className="sub">{t.dualSub}</p>
      <CodeBlock code={DUAL_WRITE} />
      <div style={{ height: 16 }} />
      <div className="grid cols-2">
        <div className="card">
          <b style={{ color: "var(--red)" }}>{t.lostTitle}</b>
          <Flow steps={t.lostFlow} breakAt={2} />
          <div style={{ marginTop: 10 }}>{t.lostResult}</div>
        </div>
        <div className="card">
          <b style={{ color: "var(--red)" }}>{t.phantomTitle}</b>
          <Flow steps={t.phantomFlow} breakAt={1} />
          <div style={{ marginTop: 10 }}>{t.phantomResult}</div>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.dualKey}
      </div>

      {/* コスト（業務影響 + 損失） */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.costEyebrow}</div>
      <h2 className="section">{t.costTitle}</h2>
      <p className="sub">{t.costSub}</p>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.impactList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div style={{ height: 16 }} />
      <div className="grid cols-2">
        <div className="card">
          <b>{t.directTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.directList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>{t.indirectTitle}</b>
          <ul className="muted" style={{ margin: "8px 0 0" }}>
            {t.indirectList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 障害後リカバリ */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.recoveryEyebrow}</div>
      <h2 className="section">{t.recoveryTitle}</h2>
      <p className="sub">{t.recoverySub}</p>
      <div className="card">
        <ul className="muted" style={{ margin: 0 }}>
          {t.recoveryList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.recoveryKey}
      </div>

      {/* ===== Part 2 — 解決策 ===== */}
      <PartHeader id="why-solution" n={2} label={t.partSolution} />

      {/* 既存 SaaS が解決していること */}
      <div className="eyebrow">{t.saasEyebrow}</div>
      <h2 className="section">{t.saasTitle}</h2>
      <p className="sub">{t.saasSub}</p>
      <div className="card">
        <div className="row" style={{ gap: 8 }}>
          {t.saasList.map((item) => (
            <span key={item} className="pill delivered">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* 残る最後の穴 */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.gapEyebrow}</div>
      <h2 className="section">{t.gapTitle}</h2>
      <p className="sub">{t.gapSub}</p>
      <div className="card">
        <Flow steps={t.gapFlow} breakAt={1} />
        <div style={{ marginTop: 10 }}>{t.gapPoints}</div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.gapKey}
      </div>

      {/* CommitCourier がふさぐ部分（山場） */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.fixEyebrow}</div>
      <h2 className="section">{t.fixTitle}</h2>
      <p className="sub">{t.fixSub}</p>
      <div className="card highlight">
        <Flow steps={t.fixFlow} />
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.fixKey}
      </div>
      <div style={{ height: 20 }} />
      <b className="muted">{t.deliveryTitle}</b>
      <div style={{ height: 10 }} />
      <div className="card">
        <div className="row" style={{ gap: 8 }}>
          {t.deliveryPills.map((item) => (
            <span key={item} className="pill delivered">
              {item}
            </span>
          ))}
        </div>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          {t.deliveryRef}
        </p>
      </div>

      {/* ===== Part 3 — 使い方と範囲 ===== */}
      <PartHeader id="why-apply" n={3} label={t.partApply} />

      {/* 2 つの利用パターン */}
      <div className="eyebrow">{t.useEyebrow}</div>
      <h2 className="section">{t.useTitle}</h2>
      <p className="sub">{t.useSub}</p>
      <div className="grid cols-2">
        <div className="card">
          <b>{t.soloTitle}</b>
          <Flow steps={t.soloFlow} />
          <p className="muted" style={{ margin: "10px 0 0" }}>
            {t.soloDesc}
          </p>
          <div className="muted" style={{ marginTop: 8, fontWeight: 600 }}>
            {t.forLabel}
          </div>
          <ul className="muted" style={{ margin: "4px 0 0" }}>
            {t.soloFor.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <b>{t.comboTitle}</b>
          <Flow steps={t.comboFlow} />
          <p className="muted" style={{ margin: "10px 0 0" }}>
            {t.comboDesc}
          </p>
          <div className="muted" style={{ marginTop: 8, fontWeight: 600 }}>
            {t.forLabel}
          </div>
          <ul className="muted" style={{ margin: "4px 0 0" }}>
            {t.comboFor.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.useCallout}
      </div>

      {/* 解決しないこと */}
      <div style={{ height: 28 }} />
      <div className="eyebrow">{t.scopeEyebrow}</div>
      <h2 className="section">{t.scopeTitle}</h2>
      <p className="sub">{t.scopeSub}</p>
      <div className="callout" style={{ marginTop: 16 }}>
        {t.scopeNote}
      </div>

      {/* 末尾 CTA */}
      <div style={{ height: 40 }} />
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="section">{t.ctaTitle}</h2>
        <p className="sub">{t.ctaSub}</p>
        <div className="cta">
          <a className="btn primary" href="#/demo">
            {t.ctaDemo}
          </a>
          <a className="btn" href="#/integrate">
            {t.ctaIntegrate}
          </a>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <Flow steps={t.ctaPath} />
        </div>
        <div className="cta" style={{ marginTop: 14 }}>
          <a
            className="btn ghost"
            href="https://github.com/Y1-Effy/CommitCourier"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="btn ghost"
            href="https://www.npmjs.com/package/commitcourier"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm ↗
          </a>
        </div>
      </div>
    </div>
  );
}
