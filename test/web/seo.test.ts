import { describe, it, expect } from "vitest";
import { SEO, ORIGIN, headFor, canonicalFor } from "../../web/seo";
import { ROUTES, pathForRoute } from "../../web/routes";
import type { Locale } from "../../web/i18n";

/**
 * `tsc` already proves every RouteId is present in both locales. These are the things types can't
 * say: that the copy is the right length, and — the one that actually matters for prerendering —
 * that no two URLs ship the same title.
 */

const LOCALES: Locale[] = ["en", "ja"];

describe("SEO table", () => {
  it.each(LOCALES)("keeps %s titles and descriptions within search-result limits", (locale) => {
    for (const { id } of ROUTES) {
      const { title, description } = SEO[locale][id];
      expect(title.length, `${locale}/${id} title`).toBeGreaterThan(0);
      expect(title.length, `${locale}/${id} title is truncated in results`).toBeLessThanOrEqual(60);
      expect(description.length, `${locale}/${id} description too short`).toBeGreaterThanOrEqual(
        50,
      );
      expect(description.length, `${locale}/${id} description too long`).toBeLessThanOrEqual(160);
    }
  });

  it.each(LOCALES)("gives every %s route a distinct title and description", (locale) => {
    // Duplicate titles across URLs is the classic prerender-SEO failure: eight pages, one <title>.
    const titles = ROUTES.map((r) => SEO[locale][r.id].title);
    const descriptions = ROUTES.map((r) => SEO[locale][r.id].description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("builds canonical URLs from the origin and the route path", () => {
    for (const { id } of ROUTES) {
      expect(canonicalFor(id)).toBe(`${ORIGIN}${pathForRoute(id)}`);
    }
    expect(canonicalFor("home")).toBe("https://commitcourier-demo.xvps.jp/");
    expect(canonicalFor("why")).toBe("https://commitcourier-demo.xvps.jp/why");
  });

  it("keeps the canonical URL locale-independent", () => {
    // One URL serves both locales — this is what og:locale:alternate in index.html asserts.
    for (const { id } of ROUTES) {
      expect(headFor(id, "en").canonical).toBe(headFor(id, "ja").canonical);
    }
  });

  it("falls back to title/description when no OG override is set", () => {
    const head = headFor("why", "en");
    expect(head.ogTitle).toBe(SEO.en.why.title);
    expect(head.ogDescription).toBe(SEO.en.why.description);
  });

  it("uses the explicit OG override on the home route", () => {
    const head = headFor("home", "en");
    expect(head.ogTitle).toBe("CommitCourier — webhooks that can't lie about your data");
    expect(head.ogTitle).not.toBe(SEO.en.home.title);
  });
});
