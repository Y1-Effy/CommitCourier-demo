/**
 * Renders every route to static HTML, so each page is a real, independently indexable URL rather
 * than a fragment of one client-rendered document.
 *
 * Runs as the third phase of `npm run build`, and the ORDER IS AN INVARIANT: `vite build` empties
 * web/dist and copies web/public/* into it, so this must run after — it adds files to that
 * directory. Run it before and its output is deleted.
 *
 * It imports only the built SSR bundle (web/dist-ssr), which is why this stays a plain .mjs outside
 * tsconfig's include: everything typed lives in web/*.tsx and is checked there.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "web/dist");

// pathToFileURL is required, not cosmetic: importing a bare absolute Windows path (C:\...) throws
// ERR_UNSUPPORTED_ESM_URL_SCHEME. Without it this works on the Linux CI runner and fails locally.
const entryUrl = pathToFileURL(resolve(root, "web/dist-ssr/entry-server.js")).href;
const { ROUTES, NOT_FOUND_FILE, ORIGIN, renderRoute, renderNotFound } = await import(entryUrl);

const SEO_START = "<!-- SEO:START -->";
const SEO_END = "<!-- SEO:END -->";
const JSONLD_MARKER = "<!-- JSONLD -->";
const ROOT_DIV = '<div id="root"></div>';

/** Escape for an HTML attribute value. */
function attr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function seoBlock(head) {
  const tags = [];
  // A 404 has no canonical and no og:url — it must not claim a URL of its own.
  if (head.canonical) tags.push(`<link rel="canonical" href="${attr(head.canonical)}" />`);
  tags.push(`<title>${attr(head.title)}</title>`);
  tags.push(`<meta name="description" content="${attr(head.description)}" />`);
  if (head.ogUrl) tags.push(`<meta property="og:url" content="${attr(head.ogUrl)}" />`);
  tags.push(`<meta property="og:title" content="${attr(head.ogTitle)}" />`);
  tags.push(`<meta property="og:description" content="${attr(head.ogDescription)}" />`);
  tags.push(`<meta name="twitter:title" content="${attr(head.ogTitle)}" />`);
  tags.push(`<meta name="twitter:description" content="${attr(head.ogDescription)}" />`);
  return `${SEO_START}\n    ${tags.join("\n    ")}\n    ${SEO_END}`;
}

function buildPage(template, { html, head, jsonLd }) {
  const start = template.indexOf(SEO_START);
  const end = template.indexOf(SEO_END);
  // Fail the build rather than ship eight URLs that all carry the home page's <title>.
  if (start === -1 || end === -1) {
    throw new Error(`prerender: ${SEO_START}/${SEO_END} markers missing from web/index.html`);
  }
  if (!template.includes(JSONLD_MARKER)) {
    throw new Error(`prerender: ${JSONLD_MARKER} marker missing from web/index.html`);
  }
  if (!template.includes(ROOT_DIV)) {
    throw new Error(`prerender: ${ROOT_DIV} not found in web/index.html`);
  }

  const withSeo = template.slice(0, start) + seoBlock(head) + template.slice(end + SEO_END.length);
  const script = jsonLd
    ? // Escaping "</" makes a </script> breakout impossible regardless of the payload.
      `<script type="application/ld+json">${jsonLd.replace(/<\//g, "<\\/")}</script>`
    : "";
  return withSeo.replace(JSONLD_MARKER, script).replace(ROOT_DIV, `<div id="root">${html}</div>`);
}

function sitemap(lastmod) {
  const urls = ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${ORIGIN}${r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Read the template ONCE, before the home render overwrites index.html with it.
const template = await readFile(resolve(dist, "index.html"), "utf8");

for (const route of ROUTES) {
  await writeFile(resolve(dist, route.file), buildPage(template, renderRoute(route.path)), "utf8");
  console.log(`[prerender] ${route.path} -> web/dist/${route.file}`);
}

await writeFile(resolve(dist, NOT_FOUND_FILE), buildPage(template, renderNotFound()), "utf8");
console.log(`[prerender] 404 -> web/dist/${NOT_FOUND_FILE}`);

await writeFile(
  resolve(dist, "sitemap.xml"),
  sitemap(new Date().toISOString().slice(0, 10)),
  "utf8",
);
console.log(`[prerender] sitemap.xml -> ${ROUTES.length} urls`);
