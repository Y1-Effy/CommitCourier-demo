import { useLocale, type Locale } from "../i18n";

const OPTIONS: [Locale, string][] = [
  ["en", "EN"],
  ["ja", "日本語"],
];

/** Language switcher for the nav. Reuses the existing `.seg` segmented-control styling. */
export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="seg seg-lang" role="group" aria-label="Language">
      {OPTIONS.map(([code, label]) => (
        <button
          key={code}
          className={locale === code ? "active" : ""}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
