// @vitest-environment node
//
// The docblock above is the entire point of this file. vitest.config.ts sets environment: "jsdom"
// globally, so without it these tests run with window, document, localStorage and navigator all
// defined — and would pass happily while `npm run build` dies with "window is not defined". Forcing
// the node environment is what makes this a real SSR regression detector.
import { describe, it, expect } from "vitest";
import { renderRoute, renderNotFound } from "../../web/entry-server";
import { FAQ_IDS } from "../../web/pages/Faq";
import { ROUTES } from "../../web/routes";
import { SEO } from "../../web/seo";

/** Runs against source, not build output: CI runs `npm run check` before `npm run build`. */

describe("prerender", () => {
  it.each(ROUTES.map((r) => r.path))("renders %s without touching a browser global", (path) => {
    expect(typeof window).toBe("undefined"); // guards the docblock above
    expect(() => renderRoute(path)).not.toThrow();
  });

  it.each(ROUTES.map((r) => [r.path, r.id] as const))("gives %s exactly one h1", (path) => {
    const { html } = renderRoute(path);
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it.each(ROUTES.map((r) => [r.path, r.id] as const))("heads %s from the SEO table", (path, id) => {
    const { head } = renderRoute(path);
    expect(head.title).toBe(SEO.en[id].title);
    expect(head.description).toBe(SEO.en[id].description);
  });

  it("renders real prose, not an empty shell", () => {
    // The point of the whole exercise: article-grade copy must be in the static HTML.
    expect(renderRoute("/why").html).toContain("dual-write");
    expect(renderRoute("/faq").html).toContain("Is delivery exactly-once?");
  });

  it("renders the Stats heading even though its data is client-only", () => {
    // Stats returns early while `data` is null; the heading must sit ABOVE that guard or /stats
    // prerenders to the single word "Loading…".
    const { html } = renderRoute("/stats");
    expect(html).toContain(SEO.en.stats.title.split(" —")[0]);
    expect(html).toMatch(/<h1[\s>]/);
  });

  it("throws for a path that is not a route", () => {
    expect(() => renderRoute("/nope")).toThrow();
  });
});

describe("JSON-LD", () => {
  it("describes the package on the home route", () => {
    const { jsonLd } = renderRoute("/");
    const data = JSON.parse(jsonLd!);
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.name).toBe("CommitCourier");
    // Never claim ratings we don't have — that is what earns a manual action.
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
  });

  it("derives FAQPage entries from the rendered answers", () => {
    const { jsonLd } = renderRoute("/faq");
    const data = JSON.parse(jsonLd!);
    expect(data["@type"]).toBe("FAQPage");
    // Derived, not a literal: the count is incidental to what this test is actually pinning (the
    // htmlToText pipeline below), so adding a Q&A shouldn't fail it here.
    expect(data.mainEntity).toHaveLength(FAQ_IDS.length);
    for (const entry of data.mainEntity) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0);
      // Proves the stripChrome + htmlToText pipeline: no markup, no code samples, no raw entities.
      expect(entry.acceptedAnswer.text).not.toContain("<");
      expect(entry.acceptedAnswer.text).not.toContain("&amp;");
      // CodeBlock renders its copy button as a SIBLING of the <pre>, so stripping only the <pre>
      // left "Copy" glued to the end of four answers and shipped it to Google. Pin that shut.
      expect(entry.acceptedAnswer.text).not.toContain("Copy");
    }
  });

  it("gives other routes no structured data", () => {
    expect(renderRoute("/why").jsonLd).toBeNull();
    expect(renderRoute("/stats").jsonLd).toBeNull();
  });
});

describe("404 page", () => {
  it("renders without claiming a canonical URL", () => {
    const { html, head, jsonLd } = renderNotFound();
    expect(html).toMatch(/<h1[\s>]/);
    expect(head.canonical).toBeNull();
    expect(head.ogUrl).toBeNull();
    expect(jsonLd).toBeNull();
  });
});
