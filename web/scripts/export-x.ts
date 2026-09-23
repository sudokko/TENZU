/* =========================================================================
   X 投稿用の問題画像（横 16:9 = 1600×900）を書き出す。
   「みほん → かく（点だけ）」の 1 問を横に並べ、見た人がその場で解きたくなる形にする。
   素材は published の実問題。描画は pin-render と共有（ピン・動画と見え方をそろえる）。

   使い方: npx tsx scripts/export-x.ts <sku>:<問題番号(1始まり)> [...] [--out <dir>]
   ========================================================================= */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import { metricsLabel } from "../app/products/problems/schema";
import { LEVEL_NAMES, volBySku } from "../app/products/data";
import { figureGroup, figureOf, arrow, text, INK, MUTED } from "../app/atelier/pins/pin-render";

const W = 1600, H = 900;
const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const outDir = path.resolve(process.cwd(), oi >= 0 ? args[oi + 1] : "../docs/drafts/sns/x/img");
/* Windows の絶対パス（C:\...）も ":" を含むため、フラグの値は spec から外す。 */
const specs = args.filter((a, i) => a.includes(":") && !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));

if (specs.length === 0) {
  console.error("使い方: npx tsx scripts/export-x.ts <sku>:<問題番号> [...] [--out <dir>]");
  process.exit(1);
}

function build(sku: string, no: number): string {
  const set = PUBLISHED[sku];
  const hit = volBySku(sku);
  if (!set || !hit) throw new Error(`published / data.ts にない SKU: ${sku}`);
  const p = set.problems[no - 1];
  if (!p) throw new Error(`${sku}: ${no} 問目がない（${set.problems.length} 問）`);
  if (figureOf(p).segs.length === 0) throw new Error(`${sku}:${no} は線が 0 本（白紙になる）`);
  const { task, vol } = hit;

  const S = 560, oy = 190, oxL = 170, oxR = W - 170 - S;
  const cy = oy + S / 2;
  const body =
    text(W / 2, 92, `${task.name}・${vol.ageLabel}`, 50, INK, "middle", 700) +
    text(W / 2, 146, `${LEVEL_NAMES[vol.lv - 1]}・${metricsLabel(p.metrics, p.grid)}`, 28, MUTED) +
    text(oxL + S / 2, oy + 6, "みほん", 26, MUTED) +
    text(oxR + S / 2, oy + 6, "かく", 26, MUTED) +
    figureGroup(p, oxL, oy + 10, S) +
    figureGroup(p, oxR, oy + 10, S, true) +
    arrow(oxL + S + 20, oxR - 20, cy + 10) +
    text(W / 2, H - 34, "点描写プリントの専門店　TENZU", 26, MUTED);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>${body}</svg>`
  );
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  for (const spec of specs) {
    const [sku, n] = spec.split(":");
    const file = path.join(outDir, `x_${sku}_${String(n).padStart(2, "0")}.png`);
    await sharp(Buffer.from(build(sku, Number(n)))).flatten({ background: "#FFFFFF" }).png().toFile(file);
    console.log(`${spec.padEnd(20)} → ${path.basename(file)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
