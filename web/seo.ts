/**
 * Per-route page metadata, in both locales.
 *
 * Two consumers, one table:
 *  - scripts/prerender.mjs bakes the English values into each prerendered file's <head>, which is
 *    what crawlers and social scrapers read.
 *  - App applies headFor(route, locale) on every client-side navigation (web/lib/head.ts).
 *
 * Typing `en` as Record<RouteId, RouteSeo> and the table as Record<Locale, typeof en> is what makes
 * a missing translation or a new unlisted route a `tsc` failure rather than a silent gap.
 *
 * Canonical URLs are locale-independent on purpose: one URL serves both locales (the locale is
 * client state), which is exactly what the og:locale + og:locale:alternate pair in index.html says.
 */
import { pathForRoute, type RouteId } from "./routes";
import type { Locale } from "./i18n";

export const ORIGIN = "https://commitcourier-demo.xvps.jp";

export interface RouteSeo {
  title: string;
  description: string;
  /** Falls back to `title` when unset. */
  ogTitle?: string;
  /** Falls back to `description` when unset. */
  ogDescription?: string;
}

export interface HeadTags {
  title: string;
  description: string;
  /** null only on the 404 page: a "not found" response must not claim a canonical URL. */
  canonical: string | null;
  ogUrl: string | null;
  ogTitle: string;
  ogDescription: string;
}

const en: Record<RouteId, RouteSeo> = {
  home: {
    title: "CommitCourier — Transactional Outbound Webhooks, live demo",
    description:
      "CommitCourier rides your own DB transaction all the way to webhook-grade HTTP delivery. Live demo with real Postgres, signing, retries, DLQ and replay.",
    ogTitle: "CommitCourier — webhooks that can't lie about your data",
    ogDescription:
      "Transactional outbound webhooks: write the webhook in the same Postgres transaction as your business change. Signing, retries, DLQ, ledger and SSRF protection — running live.",
  },
  why: {
    title: "Why webhooks lie — the dual-write problem | CommitCourier",
    description:
      "A webhook sent outside the transaction can be lost or phantom. What that costs, why retries alone don't fix it, and the gap webhook SaaS leaves open.",
  },
  "safe-adoption": {
    title: "Adopt safely — observe first, back out clean | CommitCourier",
    description:
      "How to try a pre-release library without betting on it: observe mode, a small footprint, clean removal, secure defaults, and honest limits.",
  },
  integrate: {
    title: "Integrate CommitCourier — the full integration code",
    description:
      "Five steps from npm install to verified delivery: migrate, create the relay, enqueue inside your transaction, run the dispatcher, verify the signature.",
  },
  demo: {
    title: "Live demo — delivery, retries, DLQ, replay | CommitCourier",
    description:
      "Drive real deliveries against a real Postgres: commit or roll back, break the receiver, and watch retries, the dead-letter queue and replay happen live.",
  },
  playground: {
    title: "Playground — signing, SSRF and backoff in your browser",
    description:
      "Run CommitCourier's core in your own browser: Standard Webhooks sign and verify, SSRF IP evaluation, retry backoff curves, AES-GCM and the state machine.",
  },
  stats: {
    title: "Track record — live delivery statistics | CommitCourier",
    description:
      "Cumulative delivered, enqueued, retried and dead-lettered counters from this demo's Postgres, plus the current queue snapshot and the system heartbeat.",
  },
  faq: {
    title: "FAQ — guarantees, ordering and scale | CommitCourier",
    description:
      "Straight answers on exactly-once, event ordering, serverless, multiple dispatchers, key rotation, feeding Svix, and when not to use CommitCourier.",
  },
};

export const SEO: Record<Locale, typeof en> = {
  en,
  ja: {
    home: {
      title: "CommitCourier — トランザクショナルなアウトバウンド Webhook、ライブデモ",
      description:
        "CommitCourier は自分の DB トランザクションに webhook 配信を乗せます。実際の Postgres・署名・リトライ・DLQ・再送をライブデモで確認できます。",
      ogTitle: "CommitCourier — データについて嘘をつかない Webhook",
      ogDescription:
        "トランザクショナルなアウトバウンド Webhook: 業務データの変更と同じ Postgres トランザクションで webhook を書き込む。署名・リトライ・DLQ・台帳・SSRF 防御を実稼働で。",
    },
    why: {
      title: "なぜ Webhook は嘘をつくのか — dual-write 問題 | CommitCourier",
      description:
        "トランザクション外で送る webhook は消失も幻影も起こす。その代償、リトライだけでは直らない理由、webhook SaaS が残す隙間を解説します。",
    },
    "safe-adoption": {
      title: "安心して試す — まず観測、撤退もきれいに | CommitCourier",
      description:
        "プレリリースのライブラリに賭けずに試す方法: 観測モード、小さな footprint、きれいな撤去、安全な既定値、そして正直な限界。",
    },
    integrate: {
      title: "CommitCourier の組み込み方 — 統合コードの全体",
      description:
        "npm install から配信検証までの5ステップ: マイグレーション、relay 生成、トランザクション内 enqueue、dispatcher 起動、署名検証。",
    },
    demo: {
      title: "ライブデモ — 配信・リトライ・DLQ・再送 | CommitCourier",
      description:
        "実際の Postgres に対して配信を動かす: commit / rollback を切り替え、receiver を壊し、リトライと DLQ と再送がライブで起きる様子を見る。",
    },
    playground: {
      title: "プレイグラウンド — 署名・SSRF・バックオフをブラウザで",
      description:
        "CommitCourier の core をブラウザで実行: Standard Webhooks の署名と検証、SSRF の IP 判定、リトライのバックオフ曲線、AES-GCM、状態機械。",
    },
    stats: {
      title: "稼働実績 — ライブ配信統計 | CommitCourier",
      description:
        "このデモの Postgres から配信済み・投入・リトライ・DLQ の累計カウンタ、現在のキュー状況、システムハートビートを表示します。",
    },
    faq: {
      title: "FAQ — 保証・順序・スケール | CommitCourier",
      description:
        "exactly-once、イベント順序、サーバレス、複数 dispatcher、鍵ローテーション、Svix への投入、そして使うべきでない場面への率直な回答。",
    },
  },
};

export function canonicalFor(id: RouteId): string {
  return `${ORIGIN}${pathForRoute(id)}`;
}

export function headFor(id: RouteId, locale: Locale): HeadTags {
  const seo = SEO[locale][id];
  const url = canonicalFor(id);
  return {
    title: seo.title,
    description: seo.description,
    canonical: url,
    ogUrl: url,
    ogTitle: seo.ogTitle ?? seo.title,
    ogDescription: seo.ogDescription ?? seo.description,
  };
}
