import "dotenv/config";

/** Runtime configuration, loaded from the environment (see .env.example). */
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  /**
   * This site's own public URL — the dispatcher delivers webhooks to `${publicBaseUrl}/receiver`.
   * RENDER_EXTERNAL_URL is injected automatically on Render, so a Blueprint deploy needs no manual
   * PUBLIC_BASE_URL. RECEIVER_HOST (server/courier.ts) is derived from this, so it stays in sync.
   */
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:8787",
  /** Standard Webhooks signing secret (must be "whsec_" + base64). */
  webhookSecret: process.env.DEMO_WEBHOOK_SECRET ?? "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
  port: Number(process.env.PORT ?? 8787),
  isProd: process.env.NODE_ENV === "production",
  /**
   * System-heartbeat driver (server/index.ts): a low-frequency self-delivery that keeps the demo
   * visibly "alive" and proves the dispatcher's long-running stability. Counted separately from the
   * demo track record (demo_heartbeat table), never mixed into demo_metrics.
   */
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS ?? 60_000), // 0 disables the heartbeat
  // Fault injection is OFF by default: on the unattended heartbeat, a visitor can't tell an injected
  // failure from a real one, so it just reads as broken. Opt in (e.g. 10) only for a chaos demo.
  heartbeatFlakyEvery: Number(process.env.HEARTBEAT_FLAKY_EVERY ?? 0), // every Nth beat fails on purpose (0 = never)
};

if (!config.databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database.",
  );
}

/** Whether to use TLS for the pg connection (managed Postgres needs it; local does not). */
export function needsSsl(url: string): boolean {
  return !/localhost|127\.0\.0\.1/.test(url);
}
