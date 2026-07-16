/**
 * A tiny History-API router — dependency-free, in the same spirit as the custom i18n layer, the
 * custom highlighter and the custom SSE hooks. Replaces the old hash router so that every page is a
 * real, independently indexable URL that the server prerenders (see web/routes.ts, scripts/prerender.mjs).
 *
 * `initialPath` is required rather than defaulted from `location`, which is what makes the provider
 * renderable on the server: nothing here touches a browser global during render. The prerender entry
 * passes the route being rendered; the browser entry passes `window.location.pathname`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { routeIdFromPath, type RouteId } from "../routes";

interface RouterContextValue {
  /** Pathname only — no search string, no hash. */
  path: string;
  /** Accepts a fragment (`/faq#ordering`); the hash drives scrolling, never `path`. */
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Land on a fragment target, or the top of the page when there isn't one.
 *
 * Falls back to the top when the id matches nothing, because the alternative — leaving the viewport
 * wherever the previous page left it — looks like a navigation that silently failed.
 */
function scrollToTarget(id: string | null) {
  const el = id ? document.getElementById(id) : null;
  if (el) el.scrollIntoView();
  else window.scrollTo({ top: 0, left: 0 });
}

/**
 * Decide whether a click should become a client-side navigation. Returns the target pathname, or
 * null to let the browser handle the event untouched.
 *
 * Every branch here is a real user-facing behaviour: modifier-clicks must still open tabs, external
 * links must still leave the site, and non-route paths (/api/*, /og.png) must still hit the server.
 */
function internalTarget(e: MouseEvent): string | null {
  if (e.defaultPrevented) return null;
  if (e.button !== 0) return null;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;

  const anchor = (e.target as Element | null)?.closest?.("a");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.getAttribute("rel")?.split(/\s+/).includes("external")) return null;

  const href = anchor.getAttribute("href");
  if (!href) return null;
  if (href.startsWith("#")) return null; // in-page anchor — leave the browser's native jump alone

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null; // external, mailto:, tel:
  if (routeIdFromPath(url.pathname) === null) return null; // not a page we render — let it load

  // Fragment included: /faq#ordering has to survive as far as navigate(), which is what lets a card
  // on Landing link the answer to the doubt it just raised.
  return url.pathname + url.hash;
}

export function RouterProvider({
  initialPath,
  children,
}: {
  initialPath: string;
  children: ReactNode;
}) {
  const [path, setPath] = useState(initialPath);
  /**
   * A cross-route fragment can only be scrolled to once the new page has rendered, so navigate()
   * parks the target here and the effect below flushes it after the commit. Wrapped in an object
   * rather than held as a bare `string | null`, because "nothing pending" and "pending: scroll to
   * the top" are different states and both need to be representable.
   */
  const pendingScroll = useRef<{ hash: string | null } | null>(null);

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    const hash = url.hash ? url.hash.slice(1) : null;
    const samePath = url.pathname === window.location.pathname;
    if (samePath && url.hash === window.location.hash) return;

    // Before any scrolling, so the outgoing history entry keeps the offset it was left at.
    window.history.pushState(null, "", to);

    if (samePath) {
      // The page is already rendered, and setPath would bail out on an identical value — so no
      // commit is coming to flush a parked target. Scroll now.
      scrollToTarget(hash);
      return;
    }
    pendingScroll.current = { hash };
    setPath(url.pathname);
  }, []);

  useEffect(() => {
    // Back/forward. The browser restores the scroll position itself, so don't touch it here.
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // No dep array: this runs after every commit, which is the first moment a cross-route fragment
  // target exists in the DOM. It also covers the plain cross-route case, where the parked hash is
  // null and this scrolls to the top — the jump navigate() used to do inline.
  useEffect(() => {
    const pending = pendingScroll.current;
    if (!pending) return;
    pendingScroll.current = null;
    scrollToTarget(pending.hash);
  });

  useEffect(() => {
    // Cold load straight onto /faq#ordering. The browser does jump natively while parsing the
    // prerendered HTML, but this app mounts with createRoot, not hydrateRoot (see web/i18n) — the
    // markup it jumped to is thrown away and rebuilt, losing the position. Redo it once.
    if (window.location.hash) scrollToTarget(window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    // One delegated listener beats a <Link> component: copy dictionaries keep writing plain
    // <a href="/why"> and still navigate without a full reload.
    const onClick = (e: MouseEvent) => {
      const to = internalTarget(e);
      if (to === null) return;
      e.preventDefault();
      navigate(to);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within a RouterProvider");
  return ctx;
}

export function useRoutePath(): string {
  return useRouter().path;
}

/** The active route, or null when the path matches nothing (the 404 page). */
export function useRouteId(): RouteId | null {
  return routeIdFromPath(useRouter().path);
}

export function useNavigate(): (to: string) => void {
  return useRouter().navigate;
}
