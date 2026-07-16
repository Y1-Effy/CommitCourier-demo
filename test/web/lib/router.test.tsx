import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { RouterProvider, useRoutePath } from "../../../web/lib/router";

/**
 * The click interceptor is the riskiest piece of the History router: every branch it gets wrong is a
 * user-visible bug (a ctrl+click that hijacks the tab, an external link that silently does nothing,
 * an /api URL that never reaches the server). So each branch gets a test.
 *
 * The "Not implemented: navigation" lines jsdom logs while this file runs are expected: they come
 * from the links the router correctly declines to intercept, where jsdom then attempts the real
 * navigation it cannot perform. Their absence would mean the guards had stopped working.
 */

function Probe() {
  return <span data-testid="path">{useRoutePath()}</span>;
}

function renderAt(initialPath: string, links: React.ReactNode) {
  window.history.replaceState(null, "", initialPath);
  return render(
    <RouterProvider initialPath={initialPath}>
      <Probe />
      {links}
    </RouterProvider>,
  );
}

/** Dispatch a click the way a browser does, and report whether the router claimed it. */
function click(el: Element, init: MouseEventInit = {}): boolean {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  // dispatchEvent is synchronous, so defaultPrevented is settled once act() has flushed the render
  // the listener triggered.
  act(() => {
    el.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  // jsdom implements neither scrollTo nor real navigation; without this it logs "Not implemented".
  vi.stubGlobal("scrollTo", vi.fn());
  // jsdom does no layout, so scrollIntoView isn't merely unimplemented — it's absent, and there is
  // nothing for vi.spyOn to wrap. Install it, and put the prototype back in afterEach.
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockClear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

describe("RouterProvider — client-side navigation", () => {
  it("intercepts a plain left click on an internal route", () => {
    renderAt("/", <a href="/why">Why</a>);

    expect(click(screen.getByText("Why"))).toBe(true);

    expect(window.location.pathname).toBe("/why");
    expect(screen.getByTestId("path")).toHaveTextContent("/why");
  });

  it("intercepts a click on an element nested inside the anchor", () => {
    renderAt(
      "/",
      <a href="/faq">
        <span data-testid="inner">FAQ</span>
      </a>,
    );

    expect(click(screen.getByTestId("inner"))).toBe(true);
    expect(screen.getByTestId("path")).toHaveTextContent("/faq");
  });

  it("scrolls to the top on navigation", () => {
    renderAt("/", <a href="/why">Why</a>);
    click(screen.getByText("Why"));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it("updates on popstate without scrolling (the browser restores position itself)", () => {
    renderAt("/", <a href="/why">Why</a>);
    click(screen.getByText("Why"));
    vi.mocked(window.scrollTo).mockClear();

    window.history.replaceState(null, "", "/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByTestId("path")).toHaveTextContent("/");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("ignores a repeat click on the current path", () => {
    renderAt("/why", <a href="/why">Why</a>);
    click(screen.getByText("Why"));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

/**
 * Deep links like /faq#ordering are what let a claim on Landing link straight to the answer that
 * qualifies it, so the fragment has to survive the click interceptor, the pushState and the render
 * of the incoming page. It previously did not: the router returned `url.pathname` and dropped it.
 */
describe("RouterProvider — fragment targets", () => {
  it("keeps the fragment in the URL and scrolls to it across routes", () => {
    renderAt(
      "/",
      <>
        <a href="/faq#ordering">Ordering</a>
        <div id="ordering">Are events ordered?</div>
      </>,
    );

    expect(click(screen.getByText("Ordering"))).toBe(true);

    expect(window.location.pathname).toBe("/faq");
    expect(window.location.hash).toBe("#ordering");
    expect(scrollIntoView).toHaveBeenCalled();
    // The fragment drives scrolling only; routing still matches on the pathname alone.
    expect(screen.getByTestId("path").textContent).toBe("/faq");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls when the fragment link points at the route already open", () => {
    // The old `to === location.pathname` guard swallowed this one whole: same path, so it returned
    // before the fragment could do anything.
    renderAt(
      "/faq",
      <>
        <a href="/faq#dedup">Dedup</a>
        <div id="dedup">Then how do I get exactly-once effects?</div>
      </>,
    );

    expect(click(screen.getByText("Dedup"))).toBe(true);
    expect(window.location.hash).toBe("#dedup");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("falls back to the top when the fragment matches no element", () => {
    // A stale anchor should look like an ordinary navigation, not like a dead link.
    renderAt("/", <a href="/faq#gone">Gone</a>);

    click(screen.getByText("Gone"));

    expect(window.location.pathname).toBe("/faq");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it("re-applies the fragment on a cold load", () => {
    // The browser jumps while parsing the prerendered HTML, but createRoot then discards that markup
    // and rebuilds it, losing the position. Without the mount effect this silently regresses.
    window.history.replaceState(null, "", "/faq#poll-latency");

    render(
      <RouterProvider initialPath="/faq">
        <div id="poll-latency">Isn't a ~1s polling loop too slow?</div>
      </RouterProvider>,
    );

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("does not scroll on a cold load without a fragment", () => {
    render(
      <RouterProvider initialPath="/faq">
        <div id="ordering">Are events ordered?</div>
      </RouterProvider>,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe("RouterProvider — clicks it must NOT intercept", () => {
  it.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
  ])("leaves a %s+click to the browser", (_name, init) => {
    renderAt("/", <a href="/why">Why</a>);
    expect(click(screen.getByText("Why"), init)).toBe(false);
    expect(screen.getByTestId("path")).toHaveTextContent("/");
  });

  it("leaves a middle click to the browser", () => {
    renderAt("/", <a href="/why">Why</a>);
    expect(click(screen.getByText("Why"), { button: 1 })).toBe(false);
  });

  it("leaves target=_blank to the browser", () => {
    renderAt(
      "/",
      <a href="/why" target="_blank" rel="noopener noreferrer">
        Why
      </a>,
    );
    expect(click(screen.getByText("Why"))).toBe(false);
  });

  it("leaves a download link to the browser", () => {
    renderAt(
      "/",
      <a href="/why" download="x">
        Why
      </a>,
    );
    expect(click(screen.getByText("Why"))).toBe(false);
  });

  it("leaves rel=external to the browser", () => {
    renderAt(
      "/",
      <a href="/why" rel="external">
        Why
      </a>,
    );
    expect(click(screen.getByText("Why"))).toBe(false);
  });

  it("leaves a cross-origin link to the browser", () => {
    renderAt("/", <a href="https://github.com/Y1-Effy/CommitCourier">GitHub</a>);
    expect(click(screen.getByText("GitHub"))).toBe(false);
  });

  it("leaves an in-page anchor to the browser", () => {
    renderAt("/safe-adoption", <a href="#sa-security">Security</a>);
    expect(click(screen.getByText("Security"))).toBe(false);
  });

  it.each(["/api/stats", "/og.png", "/robots.txt", "/nope"])(
    "leaves the non-route path %s to the browser",
    (href) => {
      // This is the guard that keeps API calls, assets and real 404s working as server requests.
      renderAt("/", <a href={href}>Link</a>);
      expect(click(screen.getByText("Link"))).toBe(false);
    },
  );

  it("ignores an already-handled click", () => {
    renderAt("/", <a href="/why">Why</a>);
    const el = screen.getByText("Why");
    el.addEventListener("click", (e) => e.preventDefault());
    click(el);
    expect(screen.getByTestId("path")).toHaveTextContent("/");
  });
});
