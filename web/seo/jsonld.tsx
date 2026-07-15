/**
 * Structured data, built at PRERENDER TIME ONLY.
 *
 * Never import this from a client module: the FAQ builder derives answer text via
 * react-dom/server, so a client import would ship the whole SSR renderer to the browser. It is
 * reached from web/entry-server.tsx and nowhere else.
 *
 * Consequence worth knowing: JSON-LD is static per prerendered file and is NOT refreshed on
 * client-side navigation, so an in-session move from / to /faq leaves SoftwareApplication in the
 * head. That's correct — crawlers fetch each URL independently, so /faq always arrives with its
 * FAQPage. Do not "fix" it on the client.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { FAQ_ITEMS_EN, type QA } from "../pages/Faq";
import { NPM, REPO } from "../lib/links";
import { canonicalFor } from "../seo";
import { SEO } from "../seo";
import type { RouteId } from "../routes";

/**
 * Drop the parts of an answer that are UI, not prose.
 *
 * <pre> because a 6-line snippet inside acceptedAnswer.text is noise for every consumer. <button>
 * because CodeBlock renders its copy button as a SIBLING of the <pre>, not inside it — strip only
 * the <pre> and the word "Copy" survives into the structured data. Neither element nests, so a
 * regex is safe here; matching the enclosing div.code wrapper instead would break on a nested div.
 */
function stripChrome(html: string): string {
  return html
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/g, " ")
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, " ");
}

/** The entities renderToStaticMarkup emits. Ampersand last, so decoded text isn't re-decoded. */
function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function htmlToText(html: string): string {
  return decode(stripChrome(html).replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function faqJsonLd(items: readonly QA[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: htmlToText(renderToStaticMarkup(<>{item.a}</>)) },
    })),
  });
}

function softwareApplicationJsonLd(): string {
  // No aggregateRating/review, so this will not produce a rich result — inventing ratings for your
  // own package is what earns a manual action. The value is entity disambiguation: it states that
  // CommitCourier is a specific free npm package with a repo and a licence.
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CommitCourier",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Node.js >= 22.19",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    license: "https://opensource.org/licenses/MIT",
    url: canonicalFor("home"),
    downloadUrl: NPM,
    codeRepository: REPO,
    // No softwareVersion: it would silently drift from the installed commitcourier release.
    description: SEO.en.home.description,
  });
}

export function jsonLdFor(id: RouteId): string | null {
  if (id === "home") return softwareApplicationJsonLd();
  if (id === "faq") return faqJsonLd(FAQ_ITEMS_EN);
  return null;
}
