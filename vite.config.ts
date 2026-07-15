import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// The frontend lives in web/. In dev, Vite serves it on :5173 and proxies API + receiver
// calls to the integrated Node app on :8787. In production, `npm run build` emits web/dist,
// which the Node app serves statically (single deployable process).
//
// `npm run build` runs this config twice: once for the browser bundle (web/dist), once via
// `build:ssr` for the prerender bundle (web/dist-ssr) that scripts/prerender.mjs imports to render
// each route to static HTML.
//
// The SSR entry is passed on the CLI (`--ssr entry-server.tsx`) rather than set here, because a bare
// `--ssr` overrides build.ssr with `true` and the build then fails on index.html as its input. Note
// the entry is written ROOT-relative: Vite resolves it against `root` (web/), so "web/entry-server"
// would look for web/web/entry-server. outDir stays here, where it can be an absolute path.
export default defineConfig(({ isSsrBuild }) => ({
  root: resolve(__dirname, "web"),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/receiver": "http://localhost:8787",
    },
  },
  build: isSsrBuild
    ? {
        outDir: resolve(__dirname, "web/dist-ssr"),
        emptyOutDir: true,
      }
    : {
        outDir: resolve(__dirname, "web/dist"),
        emptyOutDir: true,
      },
}));
