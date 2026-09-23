/* Pinterest ピンのオフライン書き出し（2026-08-26 新設）
   （npx tsx scripts/export-pins.ts <sku>:<tmpl> [...] [--campaign launch] [--out <dir>]）

   /atelier/pins と同じ描画関数（app/atelier/pins/pin-render）を使い、
   ブラウザのダウンロードを介さずに PNG（1000×1500）と captions.csv を
   直接ディレクトリへ書き出す。素材は実問題＝メーカー出力。AI 画像は使わない。

   例）npx tsx scripts/export-pins.ts copy-lv1-vol1:p1 copy-lv1-vol1:p3 \
         --out ../docs/drafts/sns/pinterest/2026-08-26                        */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import type { Problem } from "../app/products/problems/schema";
import { volBySku } from "../app/products/data";
import {
  PIN_W, PIN_H, pinP1, pinP2, pinP3, pinRow, buildCsv, buildP2Ladder, figureOf,
  type PinTemplate, type PinRow,
} from "../app/atelier/pins/pin-render";

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const campaign = opt("campaign", "launch");
const outDir = path.resolve(process.cwd(), opt("out", "../docs/drafts/sns/pinterest"));
/* Windows の絶対パス（C:\...）も ":" を含むため、--out 等の「フラグの値」は spec から外す。 */
const specs = args.filter(
  (a, i) => a.includes(":") && !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")),
);

if (specs.length === 0) {
  console.error("使い方: npx tsx scripts/export-pins.ts <sku>:<p1|p2|p3> [...] [--campaign launch] [--out <dir>]");
  process.exit(1);
}

/* 図が 1 本も入っていないピンは、見た目が「枠だけの白紙」になる。
   気づかず投稿してしまうので、書き出す前にここで落とす。 */
function assertDrawable(spec: string, problems: Problem[]): void {
  if (problems.length === 0) throw new Error(`${spec}: 図が 0 問。ピンを組めない`);
  const empty = problems.filter((p) => figureOf(p).segs.length === 0);
  if (empty.length > 0)
    throw new Error(`${spec}: 線が 1 本も無い問題が ${empty.length}/${problems.length} 問ある（白紙ピンになる）`);
}

function buildPins(sku: string, template: PinTemplate) {
  const set = PUBLISHED[sku];
  const hit = volBySku(sku);
  if (!set) throw new Error(`published にない SKU: ${sku}`);
  if (!hit) throw new Error(`data.ts にない SKU: ${sku}`);
  const { task, vol } = hit;
  const fname = (suffix: string) => `pin_${sku}_${template}${suffix}.png`;

  const spec = `${sku}:${template}`;

  if (template === "p1") {
    assertDrawable(spec, set.problems);
    return set.problems.map((p, i) => {
      const seq = i + 1;
      const filename = fname(`_${String(seq).padStart(2, "0")}`);
      return { filename, svg: pinP1(task, vol, p), row: pinRow("p1", task, vol, filename, { campaign, p, seq }) };
    });
  }
  if (template === "p2") {
    const steps = buildP2Ladder(sku);
    assertDrawable(spec, steps.map((st) => st.p));
    const filename = fname("");
    return [{ filename, svg: pinP2(task, steps), row: pinRow("p2", task, vol, filename, { campaign }) }];
  }
  assertDrawable(spec, set.problems);
  const filename = fname("");
  return [{ filename, svg: pinP3(task, vol, set.problems), row: pinRow("p3", task, vol, filename, { campaign }) }];
}

async function main() {
  const rows: PinRow[] = [];
  await fs.mkdir(outDir, { recursive: true });

  for (const spec of specs) {
    const [sku, tmpl] = spec.split(":") as [string, PinTemplate];
    const pins = buildPins(sku, tmpl);
    for (const pin of pins) {
      // ブラウザ側は canvas に白を敷いてから描くので、ここでも白地に合成する
      await sharp(Buffer.from(pin.svg))
        .resize(PIN_W, PIN_H)
        .flatten({ background: "#FFFFFF" })
        .png()
        .toFile(path.join(outDir, pin.filename));
      rows.push(pin.row);
    }
    console.log(`${spec.padEnd(26)} → ${pins.length} 枚`);
  }

  await fs.writeFile(path.join(outDir, "captions.csv"), buildCsv(rows), "utf8");
  console.log(`
${rows.length} 枚 + captions.csv → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
