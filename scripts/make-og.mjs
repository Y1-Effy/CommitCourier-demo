// Render the social card web/public/og.svg -> web/public/og.png (1200x630).
// One-off generator: run `node scripts/make-og.mjs` after editing og.svg and commit the PNG.
// @resvg/resvg-js is a devDependency only — runtime and CI ship the static PNG (no dep).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(here, "../web/public/og.svg");
const pngPath = resolve(here, "../web/public/og.png");

const svg = readFileSync(svgPath, "utf8");
const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
const png = resvg.render().asPng();
writeFileSync(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length} bytes)`);
