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
  useState,
  type ReactNode,
} from "react";
import { routeIdFromPath, type RouteId } from "../routes";

interface RouterContextValue {
  /** Pathname only — no search string, no hash. */
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

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

  return url.pathname;
}

export function RouterProvider({
  initialPath,
  children,
}: {
  initialPath: string;
  children: ReactNode;
}) {
  const [path, setPath] = useState(initialPath);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState(null, "", to);
    setPath(new URL(to, window.location.origin).pathname);
    // After pushState, so the outgoing history entry keeps the scroll offset it was left at.
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    // Back/forward. The browser restores the scroll position itself, so don't touch it here.
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
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
