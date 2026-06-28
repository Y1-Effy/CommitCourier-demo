import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// The frontend lives in web/. In dev, Vite serves it on :5173 and proxies API + receiver
// calls to the integrated Node app on :8787. In production, `npm run build` emits web/dist,
// which the Node app serves statically (single deployable process).
export default defineConfig({
  root: resolve(__dirname, "web"),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/receiver": "http://localhost:8787",
    },
  },
  build: {
    outDir: resolve(__dirname, "web/dist"),
    emptyOutDir: true,
  },
});
