import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { RouterProvider } from "./lib/router";
import { LocaleProvider } from "./i18n";

// createRoot, not hydrateRoot, even though #root arrives prerendered: the locale is detected on the
// client, so a ja visitor would mismatch the English markup on every load and React would throw the
// server output away anyway. createRoot replaces it deterministically instead. The cost is a brief
// English flash for ja visitors; see CLAUDE.md before "fixing" this.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <RouterProvider initialPath={window.location.pathname}>
        <App />
      </RouterProvider>
    </LocaleProvider>
  </StrictMode>,
);
