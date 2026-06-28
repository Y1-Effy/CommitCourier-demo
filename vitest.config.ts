import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test runner config (separate from vite.config.ts, which sets root to web/ for the dev server).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Tests live under test/ (mirroring the source tree), not colocated with source.
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    // server/config.ts throws at import time if DATABASE_URL is unset — give it a dummy value.
    env: { DATABASE_URL: "postgres://test:test@localhost:5432/test" },
  },
});
