/**
 * The route table — the single source of truth for every URL this site serves.
 *
 * Deliberately pure data with zero imports: `server/index.ts` imports it to map a request path to a
 * prerendered file, and that must not drag React, CSS or localized copy into the server's module
 * graph. Keep it that way — English identifiers only, no JSX, no dependencies.
 *
 * Adding a row here makes `tsc` fail until the nav labels (web/App.tsx) and the SEO entries
 * (web/seo.ts) exist for both locales, because both are typed `Record<RouteId, ...>`.
 */

export interface Route {
  /** Stable key used by the nav, the SEO table and the render switch. */
  readonly id: string;
  /** The public URL path. Extensionless and without a trailing slash (except the root). */
  readonly path: string;
  /** The prerendered file inside web/dist that serves this path. */
  readonly file: string;
}

export const ROUTES = [
  { id: "home", path: "/", file: "index.html" },
  { id: "why", path: "/why", file: "why.html" },
  { id: "safe-adoption", path: "/safe-adoption", file: "safe-adoption.html" },
  { id: "integrate", path: "/integrate", file: "integrate.html" },
  { id: "demo", path: "/demo", file: "demo.html" },
  { id: "playground", path: "/playground", file: "playground.html" },
  { id: "stats", path: "/stats", file: "stats.html" },
  { id: "faq", path: "/faq", file: "faq.html" },
] as const satisfies readonly Route[];

export type RouteId = (typeof ROUTES)[number]["id"];
export type RoutePath = (typeof ROUTES)[number]["path"];

/** The 404 page. Prerendered like a route, but excluded from the nav and the sitemap. */
export const NOT_FOUND_FILE = "404.html";

/** Strip a trailing slash so "/why/" and "/why" resolve alike. The root stays "/". */
function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** The route for a path, or null if nothing here serves it (assets, /api, typos). */
export function routeIdFromPath(pathname: string): RouteId | null {
  const target = normalize(pathname);
  return ROUTES.find((r) => r.path === target)?.id ?? null;
}

export function pathForRoute(id: RouteId): RoutePath {
  const route = ROUTES.find((r) => r.id === id);
  if (!route) throw new Error(`pathForRoute: unknown route id ${id}`);
  return route.path;
}

/** The prerendered file for a path, or null if it is not a route. */
export function fileForPath(pathname: string): string | null {
  const target = normalize(pathname);
  return ROUTES.find((r) => r.path === target)?.file ?? null;
}
