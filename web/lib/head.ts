/**
 * Keeps the <head> in sync with the active route on client-side navigation.
 *
 * The prerendered file already carries the right tags for the URL a visitor lands on; this only has
 * to fix them up as they navigate within the session. Googlebot renders JS and reads the resulting
 * DOM, so what this writes is what a JS-executing crawler sees.
 *
 * Note that JSON-LD is deliberately NOT touched here — it is static per prerendered file. Building
 * it on the client would mean shipping react-dom/server to the browser (see web/seo/jsonld.tsx).
 */
import type { HeadTags } from "../seo";

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** App only calls this for real routes, so canonical/ogUrl are never null in practice. */
export function applyHead(head: HeadTags): void {
  document.title = head.title;
  upsertMeta("name", "description", head.description);
  if (head.canonical) upsertCanonical(head.canonical);
  if (head.ogUrl) upsertMeta("property", "og:url", head.ogUrl);
  upsertMeta("property", "og:title", head.ogTitle);
  upsertMeta("property", "og:description", head.ogDescription);
  upsertMeta("name", "twitter:title", head.ogTitle);
  upsertMeta("name", "twitter:description", head.ogDescription);
}
