import { Landing } from "./pages/Landing";
import { WhyWebhooks } from "./pages/WhyWebhooks";
import { SafeAdoption } from "./pages/SafeAdoption";
import { Integrate } from "./pages/Integrate";
import { LiveDemo } from "./pages/LiveDemo";
import { Playground } from "./pages/Playground";
import { Stats } from "./pages/Stats";
import { Faq } from "./pages/Faq";
import { NotFound } from "./components/NotFound";
import { LocaleToggle } from "./components/LocaleToggle";
import { LiveIndicator } from "./components/LiveIndicator";
import { Footer } from "./components/Footer";
import { NPM, REPO } from "./lib/links";
import { useRouteId } from "./lib/router";
import { applyHead } from "./lib/head";
import { ROUTES, pathForRoute, type RouteId } from "./routes";
import { headFor } from "./seo";
import { useCopy, useLocale, type Locale } from "./i18n";
import { useEffect } from "react";

// Keyed by RouteId, so adding a row to ROUTES fails `tsc` until both locales have a label.
const navCopy: Record<Locale, Record<RouteId, string>> = {
  en: {
    home: "Home",
    why: "Why webhooks",
    "safe-adoption": "Safe adoption",
    integrate: "Integrate",
    demo: "Live demo",
    playground: "Playground",
    stats: "Track record",
    faq: "FAQ",
  },
  ja: {
    home: "ホーム",
    why: "Webhook の課題",
    "safe-adoption": "安心して試す",
    integrate: "組み込み方",
    demo: "ライブデモ",
    playground: "プレイグラウンド",
    stats: "稼働実績",
    faq: "FAQ",
  },
};

export function App() {
  const route = useRouteId();
  const labels = useCopy(navCopy);
  const { locale } = useLocale();
  // The prerendered file lands with the right head already; this keeps it right as the visitor
  // navigates or switches locale. Effects don't run during prerender, so it's a no-op there.
  useEffect(() => {
    if (route) applyHead(headFor(route, locale));
  }, [route, locale]);
  return (
    <>
      <nav className="nav">
        <a className="brand" href="/">
          <span className="dot" />
          CommitCourier
        </a>
        <LiveIndicator />
        {ROUTES.map(({ id }) => (
          <a
            key={id}
            className={`tab ${route === id ? "active" : ""}`}
            href={pathForRoute(id)}
            aria-current={route === id ? "page" : undefined}
          >
            {labels[id]}
          </a>
        ))}
        <a className="tab" href={NPM} target="_blank" rel="noopener noreferrer">
          npm ↗
        </a>
        <a className="tab" href={REPO} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
        <LocaleToggle />
      </nav>
      {route === "home" && <Landing />}
      {route === "why" && <WhyWebhooks />}
      {route === "safe-adoption" && <SafeAdoption />}
      {route === "integrate" && <Integrate />}
      {route === "demo" && <LiveDemo />}
      {route === "playground" && <Playground />}
      {route === "stats" && <Stats />}
      {route === "faq" && <Faq />}
      {route === null && <NotFound />}
      <Footer />
    </>
  );
}
