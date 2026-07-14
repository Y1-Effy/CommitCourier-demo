import { useState } from "react";
import { useCopy, type Locale } from "../i18n";
import { useEventStream } from "../lib/api";

const en = {
  liveLabel: "Delivering webhooks",
  connecting: "connecting…",
  tooltip:
    "This site is a live CommitCourier consumer. A background heartbeat delivers a webhook to itself around the clock (about every 60s), so the pipeline keeps running even with no visitors.",
};

const copy: Record<Locale, typeof en> = {
  en,
  ja: {
    liveLabel: "Webhook 配信中",
    connecting: "接続中…",
    tooltip:
      "このサイトは本物の CommitCourier 利用側アプリです。バックグラウンドの heartbeat が約60秒ごとに自分自身へ Webhook を配信し続けているため、訪問者がいなくてもパイプラインは常時稼働しています。",
  },
};

/**
 * A compact "this site is delivering webhooks right now" badge for the nav. Mounted on every page
 * (the nav is global), it flips to the live state as soon as the SSE stream sends any frame — the
 * server emits a `hello` on connect, so this is near-instant. The exact liveness detail lives in the
 * hover tooltip rather than a noisy seconds counter (the heartbeat fires on a fixed ~60s cadence).
 */
export function LiveIndicator() {
  const t = useCopy(copy);
  const [connected, setConnected] = useState(false);
  // Any frame (hello / snapshot / delivery) confirms the live stream is flowing.
  useEventStream(() => setConnected(true));
  return (
    <div className="live-indicator" title={t.tooltip}>
      <span className={`pill ${connected ? "delivered" : "in_flight"}`}>
        ● {connected ? t.liveLabel : t.connecting}
      </span>
    </div>
  );
}
