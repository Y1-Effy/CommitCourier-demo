import { useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { Integrate } from "./pages/Integrate";
import { LiveDemo } from "./pages/LiveDemo";
import { Playground } from "./pages/Playground";
import { Stats } from "./pages/Stats";
import { Faq } from "./pages/Faq";
import { LocaleToggle } from "./components/LocaleToggle";
import { Footer } from "./components/Footer";
import { useCopy, type Locale } from "./i18n";

const TAB_IDS = ["", "integrate", "demo", "playground", "stats", "faq"] as const;

const navCopy: Record<Locale, Record<(typeof TAB_IDS)[number], string>> = {
  en: {
    "": "Home",
    integrate: "Integrate",
    demo: "Live demo",
    playground: "Playground",
    stats: "Track record",
    faq: "FAQ",
  },
  ja: {
    "": "ホーム",
    integrate: "組み込み方",
    demo: "ライブデモ",
    playground: "プレイグラウンド",
    stats: "稼働実績",
    faq: "FAQ",
  },
};

function useHashRoute(): string {
  const [route, setRoute] = useState(() => location.hash.replace(/^#\/?/, ""));
  useEffect(() => {
    const on = () => setRoute(location.hash.replace(/^#\/?/, ""));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  const labels = useCopy(navCopy);
  return (
    <>
      <nav className="nav">
        <a className="brand" href="#/">
          <span className="dot" />
          CommitCourier
        </a>
        {TAB_IDS.map((id) => (
          <a key={id} className={`tab ${route === id ? "active" : ""}`} href={`#/${id}`}>
            {labels[id]}
          </a>
        ))}
        <a
          className="tab"
          href="https://www.npmjs.com/package/commitcourier"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm ↗
        </a>
        <a
          className="tab"
          href="https://github.com/Y1-Effy/CommitCourier"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
        <LocaleToggle />
      </nav>
      {route === "" && <Landing />}
      {route === "integrate" && <Integrate />}
      {route === "demo" && <LiveDemo />}
      {route === "playground" && <Playground />}
      {route === "stats" && <Stats />}
      {route === "faq" && <Faq />}
      <Footer />
    </>
  );
}
