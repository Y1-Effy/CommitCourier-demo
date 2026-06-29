// Shared building blocks for the long-form explainer pages (WhyWebhooks, SafeAdoption):
// the vertical flow diagram, the part divider, and the in-page jump nav. Kept here so the
// two pages share one implementation instead of each carrying its own copy.

/** Smooth-scroll to a part/section anchor without touching the hash router (`#/...` stays put). */
function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 縦方向の簡易フロー図。ステップ配列を矢印で連結して描画する。
 * CJK の桁ずれを避けるため、箱組みではなく縦並び + 矢印で表現する。
 * `breakAt` を渡すと、その index のステップ（＝破綻が起きる箇所）を赤く強調する。
 */
export function Flow({ steps, breakAt }: { steps: string[]; breakAt?: number }) {
  return (
    <pre className="diagram">
      {steps.map((step, i) => (
        <span key={i}>
          {i > 0 && "\n   ↓\n"}
          {i === breakAt ? (
            <span style={{ color: "var(--red)", fontWeight: 700 }}>{"✗ " + step}</span>
          ) : (
            step
          )}
        </span>
      ))}
    </pre>
  );
}

/** Visual divider that groups a long page into numbered parts. */
export function PartHeader({ id, n, label }: { id: string; n: number; label: string }) {
  return (
    <div id={id} className="part-header">
      <span className="part-num">Part {n}</span>
      {label}
    </div>
  );
}

/** In-page jump nav: a short label followed by one button per part. */
export function PageNav({
  navLabel,
  parts,
}: {
  navLabel: string;
  parts: { id: string; label: string }[];
}) {
  return (
    <div className="row" style={{ gap: 8, marginTop: 4 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        {navLabel}
      </span>
      {parts.map((p, i) => (
        <button key={p.id} className="btn sm" onClick={() => jump(p.id)}>
          {i + 1}. {p.label}
        </button>
      ))}
    </div>
  );
}
