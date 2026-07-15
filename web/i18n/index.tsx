/**
 * A tiny, dependency-free i18n layer — in the same spirit as the rest of this repo (custom History
 * router, custom highlighter, custom SSE hooks). Copy lives in per-page dictionaries whose values
 * can be plain strings, JSX nodes (so rich text with <b>/<a>/<code> needs no string-splitting), or
 * functions (for interpolated text). `Record<Locale, typeof en>` makes the compiler reject any
 * en/ja key or signature mismatch — translation gaps fail `tsc`, not silently at runtime.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "ja";

const STORAGE_KEY = "cc-locale";

function detectInitial(): Locale {
  // The prerender renders English (see web/seo.ts): there is no visitor to detect, and the static
  // markup must match the `lang="en"` and English OG tags index.html ships.
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ja") return saved;
  } catch {
    /* localStorage may be unavailable (privacy mode) — fall through to navigator */
  }
  return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * `initialLocale` lets the prerender pin the locale instead of sniffing a visitor that doesn't
 * exist. It stays optional so tests can render the provider bare.
 */
export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? detectInitial());

  useEffect(() => {
    document.documentElement.lang = locale;
    // document.title is NOT set here: the title is a function of route AND locale, so it belongs to
    // applyHead() in web/lib/head.ts, which App drives from both.
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* persistence is best-effort */
    }
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

/** Pick the active locale's copy from a per-page dictionary. */
export function useCopy<T>(dict: Record<Locale, T>): T {
  const { locale } = useLocale();
  return dict[locale];
}

/** Outbox row status — mirrors OutboxItem["status"] in lib/api.ts. */
export type Status = "pending" | "in_flight" | "delivered" | "dead" | "cancelled" | "observed";

// Status labels are needed in two places (LiveDemo pills/feed and Stats), so they live here rather
// than in either page's dictionary. Replaces the old `status.replace("_", " ")` formatting.
const STATUS_LABELS: Record<Locale, Record<Status, string>> = {
  en: {
    pending: "pending",
    in_flight: "in flight",
    delivered: "delivered",
    dead: "dead",
    cancelled: "cancelled",
    observed: "observed",
  },
  ja: {
    pending: "保留中",
    in_flight: "配信中",
    delivered: "配信済み",
    dead: "失効 (DLQ)",
    cancelled: "キャンセル",
    observed: "観測のみ",
  },
};

/** Returns a localizer for outbox statuses. Unknown statuses fall back to the raw key. */
export function useStatusLabel(): (status: string) => string {
  const { locale } = useLocale();
  return (status: string) => STATUS_LABELS[locale][status as Status] ?? status.replace("_", " ");
}
