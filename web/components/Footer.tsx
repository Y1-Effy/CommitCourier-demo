import type { ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";
import { useCopy, type Locale } from "../i18n";
import { NPM as NPM_URL, REPO as REPO_URL, LICENSE as LICENSE_URL } from "../lib/links";

const INSTALL = `npm install commitcourier pg`;

interface FooterCopy {
  tagline: ReactNode;
  installLabel: string;
  star: string;
  npm: string;
  docs: string;
  license: string;
  builtWith: ReactNode;
}

const en: FooterCopy = {
  tagline: (
    <>
      Transactional outbound webhooks on the Postgres you already run — signing, retries, DLQ, a
      full ledger and SSRF protection.
    </>
  ),
  installLabel: "Install",
  star: "★ Star on GitHub",
  npm: "npm",
  docs: "Docs",
  license: "MIT License",
  builtWith: (
    <>
      This site runs <code>commitcourier</code> straight from npm. Demo source is MIT-licensed.
    </>
  ),
};

const ja: FooterCopy = {
  tagline: (
    <>
      すでに動かしている Postgres の上で動くトランザクショナルなアウトバウンド Webhook —
      署名・リトライ・DLQ・完全な台帳・SSRF 保護。
    </>
  ),
  installLabel: "インストール",
  star: "★ GitHub でスター",
  npm: "npm",
  docs: "ドキュメント",
  license: "MIT ライセンス",
  builtWith: (
    <>
      このサイトは npm 版の <code>commitcourier</code> を実際に動かしています。デモのソースは MIT。
    </>
  ),
};

const copy: Record<Locale, FooterCopy> = { en, ja };

export function Footer() {
  const t = useCopy(copy);
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <div className="brand" style={{ marginBottom: 8 }}>
            <span className="dot" />
            CommitCourier
          </div>
          <p className="muted" style={{ margin: 0, maxWidth: 460 }}>
            {t.tagline}
          </p>
          {/* Intrinsic sizes from shields.io, so the browser reserves each box before the SVG
              arrives instead of jumping 0 -> 88px. The npm badge's width tracks the version string,
              so 80 is approximate. Height is also pinned by `.badges img` in styles.css.

              loading="lazy" defers nothing at this page length — measured, the footer sits ~4.5k px
              down, still inside Chromium's load-early threshold, so the badges are fetched on load
              anyway. It's kept because it is correct for a below-the-fold footer and costs nothing,
              not because it saves a request here. */}
          <div className="badges" style={{ marginTop: 14 }}>
            <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/npm/v/commitcourier.svg"
                width={80}
                height={20}
                loading="lazy"
                decoding="async"
                alt="npm version"
              />
            </a>
            <img
              src="https://img.shields.io/badge/license-MIT-blue"
              width={78}
              height={20}
              loading="lazy"
              decoding="async"
              alt="MIT license"
            />
            <img
              src="https://img.shields.io/badge/node-%3E%3D22.19-brightgreen"
              width={96}
              height={20}
              loading="lazy"
              decoding="async"
              alt="node >= 22.19"
            />
          </div>
        </div>

        <div className="footer-col">
          <div className="eyebrow">{t.installLabel}</div>
          <CodeBlock code={INSTALL} lang="bash" />
          <div className="footer-links">
            <a className="btn sm" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {t.star}
            </a>
            <a className="btn ghost sm" href={NPM_URL} target="_blank" rel="noopener noreferrer">
              {t.npm} ↗
            </a>
            <a className="btn ghost sm" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {t.docs} ↗
            </a>
            <a
              className="btn ghost sm"
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.license} ↗
            </a>
          </div>
        </div>
      </div>
      <p className="muted footer-fine">{t.builtWith}</p>
    </footer>
  );
}
