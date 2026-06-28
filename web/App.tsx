import { useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { Integrate } from "./pages/Integrate";
import { LiveDemo } from "./pages/LiveDemo";
import { Playground } from "./pages/Playground";
import { Stats } from "./pages/Stats";

const TABS = [
  { id: "", label: "Home" },
  { id: "integrate", label: "Integrate" },
  { id: "demo", label: "Live demo" },
  { id: "playground", label: "Playground" },
  { id: "stats", label: "Track record" },
] as const;

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
  return (
    <>
      <nav className="nav">
        <a className="brand" href="#/">
          <span className="dot" />
          CommitCourier
        </a>
        {TABS.map((t) => (
          <a
            key={t.id}
            className={`tab ${route === t.id ? "active" : ""}`}
            href={`#/${t.id}`}
          >
            {t.label}
          </a>
        ))}
        <a className="tab" href="https://www.npmjs.com/package/commitcourier" target="_blank">
          npm ↗
        </a>
        <a className="tab" href="https://github.com/Y1-Effy/CommitCourier" target="_blank">
          GitHub ↗
        </a>
      </nav>
      {route === "" && <Landing />}
      {route === "integrate" && <Integrate />}
      {route === "demo" && <LiveDemo />}
      {route === "playground" && <Playground />}
      {route === "stats" && <Stats />}
    </>
  );
}
