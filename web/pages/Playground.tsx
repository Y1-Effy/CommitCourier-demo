import { useMemo, useState } from "react";
import type { ReactNode } from "react";
// These are imported DIRECTLY into the browser from the published package. `commitcourier/core`
// is dependency-free and uses only Web standards (WebCrypto, TextEncoder), so it runs client-side
// with zero backend — what you trigger here is the library's real code.
import {
  sign,
  verifySignature,
  evaluateIp,
  backoffMs,
  createAesGcmCipher,
  generateSecretKey,
  onClaim,
  onSuccess,
  onFailure,
  onCancel,
  type RetryConfig,
  type SsrfConfig,
  type Transition,
} from "commitcourier/core";
import { CodeBlock } from "../components/CodeBlock";
import { useCopy, type Locale } from "../i18n";

const DEMO_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

interface PanelCopy {
  eyebrow: string;
  title: string;
  sub: string;
}

interface PlaygroundCopy {
  eyebrow: string;
  heading: string;
  intro: ReactNode;
  signing: PanelCopy & { tamperLabel: string; runBtn: string; valid: string; rejected: string };
  ssrf: PanelCopy & { allowed: string; blocked: (reason: string) => string };
  backoff: PanelCopy;
  cipher: PanelCopy & { runBtn: string; ciphertext: string; decrypted: string; roundTrip: string };
  state: PanelCopy & {
    claim: string;
    success: string;
    fail: (attempts: number, max: number) => string;
    cancel: string;
    applyHint: string;
  };
}

const en: PlaygroundCopy = {
  eyebrow: "Playground",
  heading: "The pure core, running in your browser",
  intro: (
    <>
      No backend, no database. <span className="kbd">commitcourier/core</span> is dependency-free
      and Web-standard-only, so these are the library's actual functions executing client-side.
    </>
  ),
  signing: {
    eyebrow: "Signing",
    title: "Sign & verify (Standard Webhooks)",
    sub: "HMAC-SHA256 over {id}.{timestamp}.{body}. Tamper with the payload and verification fails.",
    tamperLabel: "tamper with payload before verifying",
    runBtn: "sign & verify",
    valid: "valid ✓",
    rejected: "rejected ✗",
  },
  ssrf: {
    eyebrow: "SSRF",
    title: "Outbound SSRF guard",
    sub: "Private, loopback, link-local and cloud-metadata ranges are blocked by default. Allowlist wins.",
    allowed: "allowed ✓",
    blocked: (reason) => `blocked — ${reason}`,
  },
  backoff: {
    eyebrow: "Retry",
    title: "Exponential backoff + jitter",
    sub: "Delay before each retry: baseMs · 2^(n-1), jittered, capped. Tune and watch the curve.",
  },
  cipher: {
    eyebrow: "At-rest encryption",
    title: "Encrypt signing secrets (AES-256-GCM)",
    sub: "Optional: pass a cipher to createRelay and secrets become ciphertext in your DB (ccsec.v1.…).",
    runBtn: "encrypt & decrypt",
    ciphertext: "ciphertext",
    decrypted: "decrypted →",
    roundTrip: "round-trip ✓",
  },
  state: {
    eyebrow: "State machine",
    title: "Transitions as pure functions",
    sub: "Each function returns only the field delta to persist. pending → in_flight → delivered / dead.",
    claim: "claim",
    success: "success",
    fail: (a, m) => `fail (${a}/${m})`,
    cancel: "cancel",
    applyHint: "Apply a transition to see the persisted delta.",
  },
};

const ja: PlaygroundCopy = {
  eyebrow: "プレイグラウンド",
  heading: "純粋なコアをブラウザ上で実行",
  intro: (
    <>
      バックエンドもデータベースもなし。<span className="kbd">commitcourier/core</span> は依存ゼロで
      Web 標準のみを使うため、これらはライブラリの実際の関数がクライアント側で動いているものです。
    </>
  ),
  signing: {
    eyebrow: "署名",
    title: "署名と検証 (Standard Webhooks)",
    sub: "{id}.{timestamp}.{body} に対する HMAC-SHA256。ペイロードを改ざんすると検証は失敗します。",
    tamperLabel: "検証前にペイロードを改ざんする",
    runBtn: "署名して検証",
    valid: "有効 ✓",
    rejected: "拒否 ✗",
  },
  ssrf: {
    eyebrow: "SSRF",
    title: "アウトバウンド SSRF ガード",
    sub: "プライベート・ループバック・リンクローカル・クラウドメタデータの範囲を既定でブロック。allowlist が優先。",
    allowed: "許可 ✓",
    blocked: (reason) => `ブロック — ${reason}`,
  },
  backoff: {
    eyebrow: "リトライ",
    title: "指数バックオフ + ジッタ",
    sub: "各リトライ前の遅延: baseMs · 2^(n-1) にジッタを加え上限を適用。調整してカーブを見てください。",
  },
  cipher: {
    eyebrow: "保存時の暗号化",
    title: "署名鍵を暗号化 (AES-256-GCM)",
    sub: "任意: createRelay に cipher を渡すと、鍵は DB 内で暗号文になります (ccsec.v1.…)。",
    runBtn: "暗号化して復号",
    ciphertext: "暗号文",
    decrypted: "復号 →",
    roundTrip: "ラウンドトリップ ✓",
  },
  state: {
    eyebrow: "状態機械",
    title: "純粋関数としての遷移",
    sub: "各関数は永続化すべきフィールド差分のみを返します。pending → in_flight → delivered / dead。",
    claim: "claim",
    success: "success",
    fail: (a, m) => `fail (${a}/${m})`,
    cancel: "cancel",
    applyHint: "遷移を適用すると永続化される差分が表示されます。",
  },
};

const copy: Record<Locale, PlaygroundCopy> = { en, ja };

function Panel({
  eyebrow,
  title,
  sub,
  children,
  code,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  code: string;
}) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="section" style={{ marginTop: 0 }}>
        {title}
      </h2>
      <p className="sub">{sub}</p>
      <div className="grid cols-2">
        <div>{children}</div>
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

function SigningPanel() {
  const c = useCopy(copy).signing;
  const [body, setBody] = useState('{"orderId":"order_42","amount":4200}');
  const [tamper, setTamper] = useState(false);
  const [out, setOut] = useState<{ sig: string; verified: boolean } | null>(null);
  const run = async () => {
    const id = "msg_" + Math.random().toString(36).slice(2, 8);
    const timestampSec = Math.floor(Date.now() / 1000);
    const headers = await sign({ id, timestampSec, body, secrets: [DEMO_SECRET] });
    const payload = tamper ? body + " " : body; // tamper => signature must fail
    const verified = await verifySignature({
      id,
      timestamp: headers["webhook-timestamp"],
      payload,
      header: headers["webhook-signature"],
      secrets: [DEMO_SECRET],
    });
    setOut({ sig: headers["webhook-signature"], verified });
  };
  return (
    <Panel
      eyebrow={c.eyebrow}
      title={c.title}
      sub={c.sub}
      code={`const h = await sign({ id, timestampSec, body, secrets });
// h["webhook-signature"] => "v1,<base64>"
const ok = await verifySignature({
  id, timestamp: h["webhook-timestamp"],
  payload: body, header: h["webhook-signature"], secrets,
});`}
    >
      <textarea className="txt" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      <label className="row" style={{ margin: "10px 0", fontSize: 13 }}>
        <input type="checkbox" checked={tamper} onChange={(e) => setTamper(e.target.checked)} />
        {c.tamperLabel}
      </label>
      <button className="btn primary" onClick={run}>
        {c.runBtn}
      </button>
      {out && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            webhook-signature
          </div>
          <div className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
            {out.sig}
          </div>
          <div style={{ marginTop: 8 }}>
            verify →{" "}
            <span className={out.verified ? "pill delivered" : "pill dead"}>
              {out.verified ? c.valid : c.rejected}
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function SsrfPanel() {
  const c = useCopy(copy).ssrf;
  const cfg: SsrfConfig = { blockPrivateRanges: true, allowlist: [], blocklist: [] };
  const presets = ["8.8.8.8", "127.0.0.1", "10.0.0.5", "169.254.169.254", "::1"];
  const [ip, setIp] = useState("169.254.169.254");
  const decision = useMemo(() => {
    try {
      return evaluateIp(ip, cfg);
    } catch {
      return { allowed: false, reason: "invalid" } as const;
    }
  }, [ip]);
  return (
    <Panel
      eyebrow={c.eyebrow}
      title={c.title}
      sub={c.sub}
      code={`evaluateIp("169.254.169.254", {
  blockPrivateRanges: true, allowlist: [], blocklist: [],
});
// => { allowed: false, reason: "metadata" }`}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        {presets.map((p) => (
          <button key={p} className="btn ghost sm" onClick={() => setIp(p)}>
            {p}
          </button>
        ))}
      </div>
      <input className="txt" value={ip} onChange={(e) => setIp(e.target.value)} />
      <div style={{ marginTop: 12 }}>
        {decision.allowed ? (
          <span className="pill delivered">{c.allowed}</span>
        ) : (
          <span className="pill dead">{c.blocked(decision.reason)}</span>
        )}
      </div>
    </Panel>
  );
}

function BackoffPanel() {
  const c = useCopy(copy).backoff;
  const [baseMs, setBaseMs] = useState(1000);
  const [jitter, setJitter] = useState(0.2);
  const [maxAttempts, setMaxAttempts] = useState(8);
  const cfg: RetryConfig = {
    maxAttempts,
    backoff: "exponential",
    baseMs,
    capMs: 3_600_000,
    jitter,
  };
  const delays = useMemo(
    () => Array.from({ length: maxAttempts }, (_, i) => backoffMs(i + 1, cfg, () => 0.5)),
    [baseMs, jitter, maxAttempts],
  );
  const max = Math.max(...delays, 1);
  const fmt = (ms: number) =>
    ms >= 60000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 1000).toFixed(1)}s`;
  return (
    <Panel
      eyebrow={c.eyebrow}
      title={c.title}
      sub={c.sub}
      code={`backoffMs(attempt, {
  maxAttempts, backoff: "exponential",
  baseMs: ${baseMs}, capMs: 3_600_000, jitter: ${jitter},
});`}
    >
      <label className="muted" style={{ fontSize: 13 }}>
        baseMs: {baseMs}
        <input
          type="range"
          min={250}
          max={5000}
          step={250}
          value={baseMs}
          onChange={(e) => setBaseMs(+e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <label className="muted" style={{ fontSize: 13 }}>
        jitter: {jitter}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={jitter}
          onChange={(e) => setJitter(+e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <label className="muted" style={{ fontSize: 13 }}>
        maxAttempts: {maxAttempts}
        <input
          type="range"
          min={3}
          max={12}
          step={1}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(+e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {delays.map((d, i) => (
          <div key={i} className="row" style={{ gap: 8 }}>
            <span className="muted mono" style={{ width: 22, fontSize: 12 }}>
              #{i + 1}
            </span>
            <div className="bar" style={{ flex: 1 }}>
              <span style={{ width: `${(d / max) * 100}%` }} />
            </div>
            <span className="mono" style={{ width: 48, fontSize: 12, textAlign: "right" }}>
              {fmt(d)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CipherPanel() {
  const c = useCopy(copy).cipher;
  const [plain, setPlain] = useState("whsec_super_secret_signing_key");
  const [enc, setEnc] = useState<string>("");
  const [dec, setDec] = useState<string>("");
  const run = async () => {
    const cipher = createAesGcmCipher(generateSecretKey());
    const ciphertext = await cipher.encrypt(plain);
    setEnc(ciphertext);
    setDec(await cipher.decrypt(ciphertext));
  };
  return (
    <Panel
      eyebrow={c.eyebrow}
      title={c.title}
      sub={c.sub}
      code={`const cipher = createAesGcmCipher(generateSecretKey());
const ct = await cipher.encrypt("whsec_...");  // "ccsec.v1.<base64>"
const pt = await cipher.decrypt(ct);           // round-trips`}
    >
      <input className="txt" value={plain} onChange={(e) => setPlain(e.target.value)} />
      <button className="btn primary" style={{ marginTop: 10 }} onClick={run}>
        {c.runBtn}
      </button>
      {enc && (
        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div className="muted">{c.ciphertext}</div>
          <div className="mono" style={{ wordBreak: "break-all" }}>
            {enc}
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            {c.decrypted} <span className="mono">{dec}</span>{" "}
            <span className="pill delivered">{c.roundTrip}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

function StatePanel() {
  const c = useCopy(copy).state;
  const cfg: RetryConfig = {
    maxAttempts: 6,
    backoff: "exponential",
    baseMs: 1000,
    capMs: 60000,
    jitter: 0.2,
  };
  const [log, setLog] = useState<{ label: string; t: Transition }[]>([]);
  const [attempts, setAttempts] = useState(0);
  const push = (label: string, t: Transition) => setLog((l) => [{ label, t }, ...l].slice(0, 6));
  const now = () => new Date();
  return (
    <Panel
      eyebrow={c.eyebrow}
      title={c.title}
      sub={c.sub}
      code={`onClaim(now, "worker-1");       // -> in_flight
onSuccess(now);                  // -> delivered
onFailure({ attempts }, cfg, now, "500", backoffMs); // -> pending|dead
onCancel();                      // -> cancelled`}
    >
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button
          className="btn ghost sm"
          onClick={() => push("onClaim", onClaim(now(), "worker-1"))}
        >
          {c.claim}
        </button>
        <button className="btn ghost sm" onClick={() => push("onSuccess", onSuccess(now()))}>
          {c.success}
        </button>
        <button
          className="btn ghost sm"
          onClick={() => {
            const next = attempts + 1;
            setAttempts(next);
            push(
              "onFailure",
              onFailure(
                { attempts },
                cfg,
                now(),
                "HTTP 500",
                backoffMs(next, cfg, () => 0.5),
              ),
            );
          }}
        >
          {c.fail(attempts, cfg.maxAttempts)}
        </button>
        <button className="btn ghost sm" onClick={() => push("onCancel", onCancel())}>
          {c.cancel}
        </button>
      </div>
      <div style={{ fontSize: 12 }}>
        {log.length === 0 && <span className="muted">{c.applyHint}</span>}
        {log.map((e, i) => (
          <div key={i} className="row" style={{ gap: 8, marginBottom: 4 }}>
            <span className="mono" style={{ width: 80 }}>
              {e.label}
            </span>
            <span className={`pill ${e.t.status}`}>{e.t.status}</span>
            <span className="muted mono">{JSON.stringify(e.t)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Playground() {
  const t = useCopy(copy);
  return (
    <div className="container wide">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 className="section" style={{ fontSize: 30 }}>
        {t.heading}
      </h2>
      <p className="sub">{t.intro}</p>
      <SigningPanel />
      <SsrfPanel />
      <BackoffPanel />
      <CipherPanel />
      <StatePanel />
    </div>
  );
}
