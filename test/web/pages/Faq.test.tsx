import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LocaleProvider } from "../../../web/i18n";
import { RouterProvider } from "../../../web/lib/router";
import { Faq, FAQ_IDS, FAQ_ITEMS_EN } from "../../../web/pages/Faq";
import { Landing } from "../../../web/pages/Landing";

/**
 * The FAQ carries the answers to the objections the rest of the site provokes, and Landing links
 * them by fragment. Two things can silently break that and neither is type-checkable: an id that
 * drifts between the en and ja arrays, and a link pointing at an id that no longer exists. Both fail
 * quietly — the reader just lands at the top of the page and concludes the answer isn't there, which
 * is the exact failure this work set out to fix.
 */

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderFaq() {
  return render(
    <LocaleProvider>
      <RouterProvider initialPath="/faq">
        <Faq />
      </RouterProvider>
    </LocaleProvider>,
  );
}

/** Every id an anchor id must be, in both locales, gathered from the rendered DOM. */
function renderedIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll(".card[id]")].map((el) => el.id);
}

describe("Faq — anchor ids", () => {
  it.each(["en", "ja"])("renders every declared id, in order, in %s", (locale) => {
    // Compared against FAQ_IDS rather than against the other locale: that catches an item dropped
    // from BOTH arrays, which a locale-vs-locale check would happily call consistent.
    localStorage.setItem("cc-locale", locale);
    const { container } = renderFaq();
    expect(renderedIds(container)).toEqual([...FAQ_IDS]);
  });

  it("has no duplicate ids", () => {
    expect(new Set(FAQ_IDS).size).toBe(FAQ_IDS.length);
  });

  it("keeps the JSON-LD source in step with the rendered anchors", () => {
    // FAQ_ITEMS_EN is what web/seo/jsonld.tsx bakes into faq.html.
    expect(FAQ_ITEMS_EN.map((item) => item.id)).toEqual([...FAQ_IDS]);
  });
});

describe("Faq — the corrections the copy has to keep making", () => {
  it("states that per-endpoint ordering only applies to registered endpoints", () => {
    // Opting in on an inline { url, secret } endpoint silently does nothing, and the inline form is
    // what this demo and most of the examples use. Saying "FIFO is opt-in" without this is a trap.
    const { container } = renderFaq();
    const ordering = container.querySelector("#ordering");
    expect(ordering?.textContent).toMatch(/registered/i);
    expect(ordering?.textContent).toMatch(/inline/i);
  });

  it("names Postel and concedes where it reaches further", () => {
    const { container } = renderFaq();
    const postel = container.querySelector("#vs-postel");
    expect(postel?.textContent).toMatch(/SQLite/);
    expect(postel?.textContent).toMatch(/Ed25519/);
    expect(screen.getByRole("link", { name: /Postel/i })).toHaveAttribute(
      "href",
      "https://postel.sh",
    );
  });

  it("does not claim exactly-once anywhere in an answer", () => {
    const { container } = renderFaq();
    expect(container.textContent).toContain("at-least-once");
  });
});

describe("Landing — deep links into the FAQ", () => {
  it.each(["en", "ja"])("every /faq#… link in %s resolves to a real anchor", (locale) => {
    localStorage.setItem("cc-locale", locale);
    const { container } = render(
      <LocaleProvider>
        <RouterProvider initialPath="/">
          <Landing />
        </RouterProvider>
      </LocaleProvider>,
    );

    const ids = new Set<string>(FAQ_ITEMS_EN.map((item) => item.id));
    const targets = [...container.querySelectorAll('a[href*="/faq#"]')].map(
      (el) => el.getAttribute("href")!.split("#")[1],
    );

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(ids).toContain(target);
  });
});
