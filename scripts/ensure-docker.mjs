/**
 * Ensure the Docker engine is running before a `docker compose` command.
 *
 * `npm run db:up` (and `db:reset`) delegate to `docker compose`, which fails hard when Docker
 * Desktop isn't up. This guard detects a stopped engine, launches Docker Desktop (Windows-first,
 * best-effort on macOS/Linux), and waits until the engine answers — so bringing the demo DB up is
 * a single command even from a cold machine. If the engine is already running it returns instantly.
 */
import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;

/** Resolve true when the Docker engine answers, false otherwise (never rejects). */
function engineUp() {
  return new Promise((resolve) => {
    execFile(
      "docker",
      ["info", "--format", "{{.ServerVersion}}"],
      { timeout: 10_000, windowsHide: true },
      (err, stdout) => resolve(!err && stdout.trim().length > 0),
    );
  });
}

/** Best-effort launch of the Docker daemon for the current platform. Returns false if not found. */
function launchDocker() {
  if (process.platform === "win32") {
    const candidates = [
      process.env.ProgramW6432 &&
        join(process.env.ProgramW6432, "Docker", "Docker", "Docker Desktop.exe"),
      process.env.ProgramFiles &&
        join(process.env.ProgramFiles, "Docker", "Docker", "Docker Desktop.exe"),
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Docker", "Docker Desktop.exe"),
    ].filter(Boolean);
    const exe = candidates.find((p) => existsSync(p));
    if (!exe) return false;
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Docker"], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  // Linux: try to start the system service; likely needs privileges, so treat as best-effort.
  spawn("sh", ["-c", "systemctl start docker || sudo systemctl start docker"], {
    detached: true,
    stdio: "ignore",
  }).unref();
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (await engineUp()) {
    console.log("[ensure-docker] Docker engine is already running.");
    return;
  }

  console.log("[ensure-docker] Docker engine not detected — launching Docker...");
  if (!launchDocker()) {
    console.error(
      "[ensure-docker] Could not find Docker Desktop to launch. Please start Docker manually.",
    );
    process.exit(1);
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    if (await engineUp()) {
      const secs = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[ensure-docker] Docker engine is ready (${secs}s).`);
      return;
    }
    process.stdout.write(
      `[ensure-docker] waiting for engine... (${Math.round((Date.now() - startedAt) / 1000)}s)\n`,
    );
  }

  console.error(
    `[ensure-docker] Docker did not become ready within ${READY_TIMEOUT_MS / 1000}s. ` +
      "Check Docker Desktop and retry.",
  );
  process.exit(1);
}

await main();
