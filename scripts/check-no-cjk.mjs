/**
 * Language-policy guard: server code must be English-only (comments, identifiers, strings).
 * Scans server/**\/*.ts for CJK characters and fails with file:line on any hit.
 *
 * NOTE: web/ is intentionally NOT scanned — it carries legitimate Japanese i18n UI copy.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TARGET_DIR = join(ROOT, "server");

// Hiragana, Katakana, kana punctuation, CJK ideographs (+ extension A), and fullwidth forms.
// The character class spans literal ranges (incl. the ideographic space), so the irregular-
// whitespace rule is intentionally disabled here — this guard is the one place CJK belongs.
// eslint-disable-next-line no-irregular-whitespace
const CJK = /[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]/;

async function tsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tsFiles(full)));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of await tsFiles(TARGET_DIR)) {
  const lines = (await readFile(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    if (CJK.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
  });
}

if (hits.length > 0) {
  console.error("CJK characters found in server/ (code must be English):");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log("lint:lang OK — no CJK in server/");
