import type { ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";
import { useCopy, type Locale } from "../i18n";

const INSTALL = `npm install commitcourier pg`;

const NPM_URL = "https://www.npmjs.com/package/commitcourier";
const REPO_URL = "https://github.com/Y1-Effy/CommitCourier";

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
          <div className="badges" style={{ marginTop: 14 }}>
            <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
              <img src="https://img.shields.io/npm/v/commitcourier.svg" alt="npm version" />
            </a>
            <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" />
            <img
              src="https://img.shields.io/badge/node-%3E%3D22.19-brightgreen"
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
              href={`${REPO_URL}/blob/main/LICENSE`}
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
