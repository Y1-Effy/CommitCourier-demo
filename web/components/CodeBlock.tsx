import { useState } from "react";

/** Minimal, dependency-free TypeScript syntax highlighter (good enough for short snippets). */
function highlight(code: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escape(code).split("\n");
  const keywords =
    /\b(const|let|await|async|function|return|import|from|export|new|type|interface|if|else|for|of|true|false|null|void|try|catch|finally)\b/g;
  return lines
    .map((line) => {
      // whole-line comment
      const commentIdx = line.indexOf("//");
      let head = line;
      let tail = "";
      if (commentIdx >= 0) {
        head = line.slice(0, commentIdx);
        tail = `<span class="tok-com">${line.slice(commentIdx)}</span>`;
      }
      head = head
        .replace(/(&quot;|&#39;|"|'|`)(?:\\.|(?!\1).)*\1/g, (m) => `<span class="tok-str">${m}</span>`)
        .replace(keywords, '<span class="tok-key">$1</span>')
        .replace(/\b(\d[\d_]*)\b/g, '<span class="tok-num">$1</span>')
        .replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="tok-fn">$1</span>');
      return head + tail;
    })
    .join("\n");
}

export function CodeBlock({ code, lang = "ts" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="code">
      <button className="btn ghost sm copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code
          data-lang={lang}
          dangerouslySetInnerHTML={{ __html: highlight(code.trim()) }}
        />
      </pre>
    </div>
  );
}
