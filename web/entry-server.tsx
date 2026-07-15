/**
 * The prerender entry — BUILD TIME ONLY. `npm run build` bundles this with `vite build --ssr`, and
 * scripts/prerender.mjs imports the result to render every route to static HTML.
 *
 * It never runs in production: `npm start` only serves the files this produced. That's why react and
 * react-dom can stay devDependencies, and why nothing here may be imported from a client module —
 * doing so would ship react-dom/server to the browser.
 *
 * It deliberately does NOT import main.tsx: that file is the only one that pulls in styles.css, so
 * keeping it out of this graph means the SSR build needs no CSS handling at all.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";
import { RouterProvider } from "./lib/router";
import { LocaleProvider } from "./i18n";
import { routeIdFromPath } from "./routes";
import { headFor, type HeadTags } from "./seo";
import { jsonLdFor } from "./seo/jsonld";

// Re-exported so prerender.mjs reads the route table and origin from one place.
export { ROUTES, NOT_FOUND_FILE } from "./routes";
export { ORIGIN } from "./seo";

export interface Rendered {
  /** Static markup for #root. */
  html: string;
  head: HeadTags;
  /** Serialised JSON-LD for this route, or null if it has none. */
  jsonLd: string | null;
}

// renderToStaticMarkup, not renderToString: the client uses createRoot rather than hydrateRoot, so
// hydration markers would be dead weight on every byte of every page. No StrictMode either — it is a
// dev-only double render with no server semantics.
function render(path: string): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale="en">
      <RouterProvider initialPath={path}>
        <App />
      </RouterProvider>
    </LocaleProvider>,
  );
}

export function renderRoute(path: string): Rendered {
  const id = routeIdFromPath(path);
  if (!id) throw new Error(`renderRoute: ${path} is not a route`);
  return { html: render(path), head: headFor(id, "en"), jsonLd: jsonLdFor(id) };
}

/** The 404 page. Prerendered like a route, but excluded from the nav, ROUTES and the sitemap. */
export function renderNotFound(): Rendered {
  const title = "Page not found — CommitCourier";
  const description = "That URL does not exist on the CommitCourier demo site.";
  return {
    // Any non-route path renders <NotFound />; this one just has to not collide with a real route.
    html: render("/__not_found__"),
    // No canonical and no og:url: a 404 must not claim a URL of its own, and an empty href would
    // resolve to whatever path the visitor mistyped.
    head: {
      title,
      description,
      canonical: null,
      ogUrl: null,
      ogTitle: title,
      ogDescription: description,
    },
    jsonLd: null,
  };
}
