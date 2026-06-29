import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { api, useLiveSnapshot, type Attempt, type OutboxItem } from "../lib/api";
import { useCopy, useStatusLabel, type Locale } from "../i18n";

const ENQUEUE_CODE = `await client.query("BEGIN");
await client.query("INSERT INTO orders ...");      // business write
await relay.enqueue(client, {                       // rides the SAME tx
  eventType, payload, endpoint: { url, secret },
});
commit ? await client.query("COMMIT")
       : await client.query("ROLLBACK");            // both vanish`;

type Mode = "ok" | "fail" | "slow";
type Outcome = "delivered" | "retry" | "dead";

interface LiveDemoCopy {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  connecting: string;
  enqEyebrow: string;
  enqTitle: string;
  enqSub: ReactNode;
  btnCommit: string;
  btnRollback: string;
  btnSsrf: string;
  btnIdem: string;
  ssrfHint: string;
  idemHint: string;
  toastCommit: (eventType: string, tag: string) => string;
  toastRollback: (eventType: string) => string;
  toastSsrf: (tag: string) => string;
  toastIdem: (tags: string) => string;
  errorToast: string;
  dupLabel: string;
  rcvEyebrow: string;
  rcvTitle: string;
  rcvSub: ReactNode;
  modeLabels: Record<Mode, string>;
  modeDescs: Record<Mode, string>;
  recentLabel: string;
  recentHint: string;
  nothingYet: string;
  sigOk: string;
  sigBad: string;
  loadingLedger: string;
  noAttempts: string;
  attemptsHeaders: [string, string, string, string, string];
  okText: string;
  outEyebrow: string;
  outTitle: string;
  replayDlq: (n: number) => string;
  clickRow: string;
  outHeaders: [string, string, string, string, string, string, string];
  emptyOutbox: string;
  cancel: string;
  feedEyebrow: string;
  feedTitle: string;
  feedEmpty: string;
  attempt: (n: number) => string;
  outcomeLabels: Record<Outcome, string>;
}

const en: LiveDemoCopy = {
  eyebrow: "Live demo",
  title: "Drive CommitCourier in real time",
  subtitle: (
    <>
      Every action below hits a live PostgreSQL database and delivers real signed HTTP webhooks to
      this site's own receiver. Updates stream in over Server-Sent Events.
    </>
  ),
  connecting: " · connecting…",
  enqEyebrow: "1 · Enqueue",
  enqTitle: "Send an event",
  enqSub: (
    <>
      Each enqueue runs inside a real DB transaction. <b>Commit</b> and it is delivered;{" "}
      <b>roll back</b> and the row never exists.
    </>
  ),
  btnCommit: "✓ Enqueue & COMMIT",
  btnRollback: "⤺ Enqueue & ROLLBACK",
  btnSsrf: "⚠ Try SSRF target",
  btnIdem: "⇉ Same key ×2",
  ssrfHint: "Targets 169.254.169.254",
  idemHint: "Two at-least-once deliveries, one idempotency-key",
  toastCommit: (e, tag) => `Enqueued ${e} ${tag} (committed → will be delivered)`,
  toastRollback: (e) => `Rolled back ${e} (no row written — dual-write safe)`,
  toastSsrf: (tag) =>
    `Enqueued ${tag} to the cloud-metadata IP — watch it get SSRF-blocked (in the feed/state, not the receiver).`,
  toastIdem: (tags) =>
    `Enqueued 2 deliveries ${tags} sharing one idempotency-key — the receiver dedups the second.`,
  errorToast: "Request failed (rate limited?). Try again.",
  dupLabel: "duplicate ✓ ignored",
  rcvEyebrow: "2 · Receiver",
  rcvTitle: "Flaky endpoint simulator",
  rcvSub: (
    <>
      Flip how the customer's endpoint responds. Switch to <b>500</b>, enqueue, and watch the
      retries climb until the row lands in the DLQ.
    </>
  ),
  modeLabels: { ok: "200 OK", fail: "500", slow: "timeout" },
  modeDescs: {
    ok: "Deliver successfully",
    fail: "Force retries → DLQ",
    slow: "Exceed 5s timeout",
  },
  recentLabel: "Recently received (signature verified server-side):",
  recentHint: "newest first ↓ · the #id tag matches the same event in send / state / feed",
  nothingYet: "— nothing yet —",
  sigOk: "sig ✓",
  sigBad: "sig ✗",
  loadingLedger: "Loading ledger…",
  noAttempts: "No attempts yet (still pending).",
  attemptsHeaders: ["#", "Response", "Duration", "Error", "At"],
  okText: "ok",
  outEyebrow: "3 · Outbox & ledger",
  outTitle: "Live delivery state",
  replayDlq: (n) => `↻ Replay DLQ (${n})`,
  clickRow: "Click a row to open its delivery ledger (every attempt, recorded).",
  outHeaders: ["seq", "id", "event", "status", "tries", "last error", "age"],
  emptyOutbox: "Empty — enqueue something above.",
  cancel: "cancel",
  feedEyebrow: "Delivery feed",
  feedTitle: "Outcomes as they happen",
  feedEmpty: "Hook events (delivered / retry / dead) appear here.",
  attempt: (n) => `attempt ${n}`,
  outcomeLabels: { delivered: "delivered", retry: "retry", dead: "dead" },
};

const ja: LiveDemoCopy = {
  eyebrow: "ライブデモ",
  title: "CommitCourier をリアルタイムで動かす",
  subtitle: (
    <>
      下の操作はすべて稼働中の PostgreSQL データベースに対して実行され、実際の署名付き HTTP Webhook
      を このサイト自身の受信側へ配信します。更新は Server-Sent Events で流れてきます。
    </>
  ),
  connecting: " · 接続中…",
  enqEyebrow: "1 · Enqueue",
  enqTitle: "イベントを送る",
  enqSub: (
    <>
      各 enqueue は実際の DB トランザクション内で動きます。<b>コミット</b>すれば配信され、
      <b>ロールバック</b>すれば行は最初から存在しません。
    </>
  ),
  btnCommit: "✓ Enqueue & COMMIT",
  btnRollback: "⤺ Enqueue & ROLLBACK",
  btnSsrf: "⚠ SSRF 先を試す",
  btnIdem: "⇉ 同一キーで2回",
  ssrfHint: "169.254.169.254 を標的にします",
  idemHint: "at-least-once 配信2回・idempotency-key は1つ",
  toastCommit: (e, tag) => `${e} ${tag} を enqueue (コミット済み → 配信されます)`,
  toastRollback: (e) => `${e} をロールバック (行は書かれていない — 二重書き込み安全)`,
  toastSsrf: (tag) =>
    `クラウドメタデータ IP への配信 ${tag} を enqueue しました — SSRF でブロックされる様子を (受信側ではなくフィード/配信状態で) 見てください。`,
  toastIdem: (tags) =>
    `1つの idempotency-key で2配信 ${tags} を enqueue しました — 2件目を receiver が重複排除します。`,
  errorToast: "リクエスト失敗 (レート制限?)。少し待って再試行してください。",
  dupLabel: "重複 ✓ 無視",
  rcvEyebrow: "2 · Receiver",
  rcvTitle: "不安定なエンドポイントの模擬",
  rcvSub: (
    <>
      顧客のエンドポイントの応答の仕方を切替えます。<b>500</b> に切替えて enqueue し、行が DLQ
      に入るまで リトライが積み上がる様子を見てください。
    </>
  ),
  modeLabels: { ok: "200 OK", fail: "500", slow: "タイムアウト" },
  modeDescs: {
    ok: "正常に配信",
    fail: "リトライ → DLQ を誘発",
    slow: "5秒のタイムアウトを超過",
  },
  recentLabel: "最近の受信 (署名はサーバ側で検証済み):",
  recentHint: "新しい順 ↓ ・ #id タグは送信/配信状態/フィードの同じイベントと一致します",
  nothingYet: "— まだ何もありません —",
  sigOk: "署名 ✓",
  sigBad: "署名 ✗",
  loadingLedger: "台帳を読み込み中…",
  noAttempts: "まだ試行はありません (保留中)。",
  attemptsHeaders: ["#", "応答", "所要時間", "エラー", "時刻"],
  okText: "正常",
  outEyebrow: "3 · Outbox & 台帳",
  outTitle: "ライブな配信状態",
  replayDlq: (n) => `↻ DLQ を再送 (${n})`,
  clickRow: "行をクリックすると配信台帳 (記録された全試行) が開きます。",
  outHeaders: ["seq", "追跡", "イベント", "状態", "試行", "直近エラー", "経過"],
  emptyOutbox: "空です — 上で何か enqueue してください。",
  cancel: "キャンセル",
  feedEyebrow: "配信フィード",
  feedTitle: "結果をリアルタイムで",
  feedEmpty: "Hook イベント (delivered / retry / dead) がここに表示されます。",
  attempt: (n) => `試行 ${n}`,
  outcomeLabels: { delivered: "配信", retry: "リトライ", dead: "失効" },
};

const copy: Record<Locale, LiveDemoCopy> = { en, ja };

function age(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s / 60).toFixed(0)}m`;
  return `${(s / 3600).toFixed(0)}h`;
}

// last 6 chars of the shared outbox/webhook id — the same value flows to every panel
// (enqueue response id === webhook-id header === outbox id === delivery event id), so the
// tag lets a viewer trace one event across send / delivery state / receiver / feed.
function tag(id: string): string {
  return `#${id.slice(-6)}`;
}

function Pill({ status }: { status: string }) {
  const label = useStatusLabel();
  return <span className={`pill ${status}`}>{label(status)}</span>;
}

function EnqueuePanel({ t, onAction }: { t: LiveDemoCopy; onAction: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const enqueue = async (commit: boolean) => {
    setBusy(true);
    try {
      const r = await api<{ eventType: string; committed: boolean; id: string }>("/enqueue", {
        body: { commit },
      });
      onAction(commit ? t.toastCommit(r.eventType, tag(r.id)) : t.toastRollback(r.eventType));
    } catch (e) {
      console.error(e);
      onAction(t.errorToast);
    } finally {
      setBusy(false);
    }
  };
  const ssrf = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/enqueue-ssrf", { body: {} });
      onAction(t.toastSsrf(tag(r.id)));
    } catch (e) {
      console.error(e);
      onAction(t.errorToast);
    } finally {
      setBusy(false);
    }
  };
  const idempotent = async () => {
    setBusy(true);
    try {
      const r = await api<{ ids: string[] }>("/enqueue-idempotent", { body: {} });
      onAction(t.toastIdem(r.ids.map(tag).join(" ")));
    } catch (e) {
      console.error(e);
      onAction(t.errorToast);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card">
      <div className="eyebrow">{t.enqEyebrow}</div>
      <h2 className="section">{t.enqTitle}</h2>
      <p className="sub">{t.enqSub}</p>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn primary" disabled={busy} onClick={() => enqueue(true)}>
          {t.btnCommit}
        </button>
        <button className="btn danger" disabled={busy} onClick={() => enqueue(false)}>
          {t.btnRollback}
        </button>
        <button className="btn ghost" disabled={busy} onClick={ssrf} title={t.ssrfHint}>
          {t.btnSsrf}
        </button>
        <button className="btn ghost" disabled={busy} onClick={idempotent} title={t.idemHint}>
          {t.btnIdem}
        </button>
      </div>
      <CodeBlock code={ENQUEUE_CODE} />
    </div>
  );
}

function ReceiverControl({
  t,
  mode,
  recent,
}: {
  t: LiveDemoCopy;
  mode: string;
  recent: {
    webhookId: string;
    eventType: string;
    verified: boolean;
    responded: number;
    duplicate?: boolean;
    at: string;
  }[];
}) {
  const set = (m: string) =>
    api("/receiver/mode", { body: { mode: m } }).catch((e) => console.error(e));
  const modes: Mode[] = ["ok", "fail", "slow"];
  return (
    <div className="card">
      <div className="eyebrow">{t.rcvEyebrow}</div>
      <h2 className="section">{t.rcvTitle}</h2>
      <p className="sub">{t.rcvSub}</p>
      <div className="seg" role="group">
        {modes.map((m) => (
          <button key={m} className={mode === m ? "active" : ""} onClick={() => set(m)}>
            {t.modeLabels[m]}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {t.modeDescs[mode as Mode] ?? ""}
      </p>
      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
          {t.recentLabel}
        </div>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
          {t.recentHint}
        </div>
        {recent.length === 0 && <div className="muted">{t.nothingYet}</div>}
        {recent.map((r) => (
          <div key={r.webhookId} className="row" style={{ fontSize: 12, gap: 8 }}>
            <span className="mono muted">{tag(r.webhookId)}</span>
            <span className="mono">{r.eventType}</span>
            <span className={r.verified ? "pill delivered" : "pill dead"}>
              {r.verified ? t.sigOk : t.sigBad}
            </span>
            <span className="muted">→ {r.responded}</span>
            {r.duplicate && <span className="pill in_flight">{t.dupLabel}</span>}
            <span className="spacer" />
            <span className="muted">{age(r.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptsDrawer({ t, id }: { t: LiveDemoCopy; id: string }) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => api<Attempt[]>(`/attempts/${id}`).then((a) => live && setAttempts(a));
    load();
    const timer = setInterval(load, 1500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id]);
  if (!attempts) return <div className="muted">{t.loadingLedger}</div>;
  if (attempts.length === 0) return <div className="muted">{t.noAttempts}</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          {t.attemptsHeaders.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {attempts.map((a) => (
          <tr key={a.id}>
            <td>{a.attemptNo}</td>
            <td>{a.responseStatus ?? "—"}</td>
            <td>{a.durationMs}ms</td>
            <td style={{ color: a.error ? "var(--red)" : "var(--muted)" }}>
              {a.error ?? t.okText}
            </td>
            <td className="muted">{new Date(a.attemptedAt).toLocaleTimeString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OutboxTable({ t, rows }: { t: LiveDemoCopy; rows: OutboxItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const replayDlq = () => api("/replay", { body: {} }).catch((e) => console.error(e));
  const cancel = (id: string) => api(`/cancel/${id}`, { body: {} }).catch((e) => console.error(e));
  const deadCount = rows.filter((r) => r.status === "dead").length;
  return (
    <div className="card">
      <div className="row">
        <div>
          <div className="eyebrow">{t.outEyebrow}</div>
          <h2 className="section" style={{ margin: 0 }}>
            {t.outTitle}
          </h2>
        </div>
        <div className="spacer" />
        <button className="btn sm" disabled={deadCount === 0} onClick={replayDlq}>
          {t.replayDlq(deadCount)}
        </button>
      </div>
      <p className="sub">{t.clickRow}</p>
      <div style={{ maxHeight: 420, overflow: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              {t.outHeaders.map((h) => (
                <th key={h}>{h}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  {t.emptyOutbox}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{r.seq}</td>
                  <td>
                    <span className="mono muted">{tag(r.id)}</span>
                  </td>
                  <td>{r.eventType}</td>
                  <td>
                    <Pill status={r.status} />
                  </td>
                  <td>{r.attempts}</td>
                  <td
                    style={{
                      color: "var(--red)",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
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
                        {t.cancel}
                      </button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={8} style={{ background: "var(--bg-soft)" }}>
                      <AttemptsDrawer t={t} id={r.id} />
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
  const t = useCopy(copy);
  const { snapshot, feed } = useLiveSnapshot();
  const [toast, setToast] = useState<string>("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = snapshot?.outbox ?? [];
  const mode = snapshot?.receiver.mode ?? "ok";
  const recent = snapshot?.receiver.recent ?? [];

  return (
    <div className="container wide">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 30 }}>
        {t.title}
      </h2>
      <p className="sub">
        {t.subtitle}
        {!snapshot && <span style={{ color: "var(--amber)" }}>{t.connecting}</span>}
      </p>

      {toast && (
        <div className="callout flash" style={{ marginBottom: 16 }}>
          {toast}
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <EnqueuePanel t={t} onAction={setToast} />
        <ReceiverControl t={t} mode={mode} recent={recent} />
      </div>

      <OutboxTable t={t} rows={rows} />

      <div style={{ height: 18 }} />
      <div className="card">
        <div className="eyebrow">{t.feedEyebrow}</div>
        <h2 className="section" style={{ marginTop: 0 }}>
          {t.feedTitle}
        </h2>
        {feed.length === 0 && <p className="muted">{t.feedEmpty}</p>}
        <div style={{ maxHeight: 200, overflow: "auto", fontFamily: "var(--mono)", fontSize: 13 }}>
          {feed.map((f) => (
            <div
              key={`${f.event.id}-${f.outcome}-${f.event.attempt}`}
              className="row"
              style={{ gap: 8 }}
            >
              <span
                className={`pill ${f.outcome === "delivered" ? "delivered" : f.outcome === "dead" ? "dead" : "in_flight"}`}
              >
                {t.outcomeLabels[f.outcome]}
              </span>
              <span className="mono muted">{tag(f.event.id)}</span>
              <span>{f.event.eventType}</span>
              <span className="muted">{t.attempt(f.event.attempt)}</span>
              <span className="muted">{f.event.status ?? f.event.error ?? ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
