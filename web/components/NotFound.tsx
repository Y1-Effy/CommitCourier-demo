import { useCopy, type Locale } from "../i18n";

// Prerendered to 404.html and served (with a 404 status) for any unknown path. App renders it
// client-side for the same paths, so a mistyped URL looks the same whether or not JS has run.
const en = {
  eyebrow: "404",
  title: "No such page",
  lead: "That URL doesn't exist here. The link may be out of date, or the address mistyped.",
  home: "Back to the home page",
};

const copy: Record<Locale, typeof en> = {
  en,
  ja: {
    eyebrow: "404",
    title: "ページが見つかりません",
    lead: "その URL はここには存在しません。リンクが古いか、アドレスが間違っている可能性があります。",
    home: "ホームに戻る",
  },
};

export function NotFound() {
  const t = useCopy(copy);
  return (
    <div className="container">
      <div className="eyebrow">{t.eyebrow}</div>
      <h1 className="page-title">{t.title}</h1>
      <p className="sub">{t.lead}</p>
      <p>
        <a className="btn" href="/">
          {t.home}
        </a>
      </p>
    </div>
  );
}
