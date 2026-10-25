/** Two editorial alternatives for the book's 2-page index, plus a no-D question sample.
 *  npx tsx scripts/export-kdp-review.ts
 */
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, grayscale, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PUBLISHED } from "../app/products/problems/published";
import { volBySku } from "../app/products/data";
import { KDP_B5 } from "../app/products/print";
import { toRenderProblems } from "../app/products/problems/render";
import { paintProblemPdf } from "../app/products/problems/pdf-render";
import { D_BASE_FORMULA, D_TASK_FORMULA, boardTermText, taskDifficulty } from "../app/products/problems/gen/difficulty";
import { BOOK, FONT_FILES, TASK_COPY } from "./kdp/book";

const MM = 72 / 25.4;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "docs/drafts/kdp/first-patterns-156/review-options");
const ink = grayscale(0.08);
type Fonts = { heading: PDFFont; body: PDFFont; mono: PDFFont };
const current = JSON.parse(readFileSync(path.join(ROOT, "docs/drafts/kdp/first-patterns-156/manifest.json"), "utf8"));
const volumes = (current.book.skus as string[]).map((sku) => {
  const set = PUBLISHED[sku];
  const info = volBySku(sku);
  if (!set || !info || set.problems.length !== 12) throw new Error(`Missing volume: ${sku}`);
  return { sku, set, info, rendered: toRenderProblems(set) };
});
async function main() {
const entries = volumes.map((v) => {
  const qs = current.questions.filter((q: { sku: string }) => q.sku === v.sku);
  if (qs.length !== 12) throw new Error(`Manifest mismatch: ${v.sku}`);
  v.set.problems.forEach((problem, i) => {
    const calculated = taskDifficulty(v.set.task, problem).value;
    if (calculated !== qs[i].difficulty) throw new Error(`Published D differs from formula: ${problem.id} ${calculated}/${qs[i].difficulty}`);
  });
  return { v, qs };
});

async function document() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = {} as Fonts;
  for (const [key, filename] of FONT_FILES) {
    fonts[key] = await doc.embedFont(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts", filename)), { subset: false });
  }
  return { doc, fonts };
}
function page(doc: PDFDocument) { return doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]); }
function put(p: PDFPage, f: Fonts, s: string, x: number, top: number, size = 9, face: keyof Fonts = "body") {
  const font = f[face];
  const charset = font.getCharacterSet();
  for (const ch of s) if (!charset.includes(ch.codePointAt(0)!)) throw new Error(`Missing glyph: ${ch}`);
  p.drawText(s, { x: x * MM, y: p.getHeight() - top * MM - size, size, font, color: ink });
}
function lines(s: string, font: PDFFont, size: number, maxMm: number) {
  const result: string[] = [];
  let line = "";
  for (const char of s) {
    if (line && font.widthOfTextAtSize(line + char, size) > maxMm * MM) { result.push(line); line = ""; }
    line += char;
  }
  if (line) result.push(line);
  return result;
}
function paragraph(p: PDFPage, f: Fonts, s: string, x: number, y: number, width: number, size = 8.5, leading = 4.5) {
  const ls = lines(s, f.body, size, width);
  ls.forEach((line, i) => put(p, f, line, x, y + i * leading, size));
  return y + ls.length * leading;
}
function rule(p: PDFPage, y: number) {
  p.drawLine({ start: { x: 18 * MM, y: p.getHeight() - y * MM }, end: { x: 166 * MM, y: p.getHeight() - y * MM }, thickness: BOOK.minLineMm * MM, color: grayscale(0.55) });
}
function heading(p: PDFPage, f: Fonts, title: string, sub: string, n: number) {
  put(p, f, title, 18, 17, 14, "heading");
  put(p, f, sub, 18, 26, 8.5);
  put(p, f, String(n), 158, 236, 9, "mono");
}
async function save(doc: PDFDocument, name: string) {
  doc.context.trailerInfo.Info = undefined;
  await fs.writeFile(path.join(OUT, name), await doc.save({ useObjectStreams: false }));
}

await fs.mkdir(OUT, { recursive: true });
{
  const { doc, fonts: f } = await document();
  const p = page(doc);
  heading(p, f, "収録問題の一覧 / 案A", "Dを見せるなら、計算のしかたも同じ見開きで示す", 2);
  let y = 35;
  put(p, f, "まず、図形そのものの点数を出します。", 18, y, 9, "heading"); y += 7;
  y = paragraph(p, f, D_BASE_FORMULA, 18, y, 148, 9.3, 5.1) + 3;
  for (const line of [
    "線の重み＝たてよこ1／45°のななめ1.5／ゆるいななめ4／急なななめ5（1本ずつ合計）。",
    "対称係数＝左右0.70／上下0.75／ななめ0.85／対称なし1。",
    boardTermText(),
    "画数の項＝2画目から0.7ずつ。対称くずし＝ずれた線1本につき3（対称なしの計算値×1.10が上限）。交差＝1か所1。",
    "もつれ＝各図の中の交差1か所×2＋枝分かれ1か所×1.5。ばらけ＝離れた部分1つにつき2＋0.5×（最近距離−1）。",
    "共有点＝図Aと図Bが同じ点にふれる数×1。折り係数＝1−0.4×折り返しても重なる線の割合。",
    "全項を足したあと、最後に小数第1位へ丸めます。課題ごとに使わない項もあります。",
  ]) y = paragraph(p, f, line, 18, y, 148, 8.8, 4.7) + 1.2;
  y += 1; rule(p, y); y += 4;
  put(p, f, "遊び方によって、加える項や式を変えます。", 18, y, 9, "heading"); y += 8;
  const formulaRows: [string, string][] = [
    ["模写・鏡", D_TASK_FORMULA.copy],
    ["欠け補完", D_TASK_FORMULA.fill],
    ["移動", D_TASK_FORMULA.translate],
    ["回転", D_TASK_FORMULA.rotate],
    ["かさね", D_TASK_FORMULA.overlay],
    ["分解", D_TASK_FORMULA.decompose],
    ["折り重ね", D_TASK_FORMULA.fold],
    ["立体", D_TASK_FORMULA.solid],
  ];
  for (const [label, formula] of formulaRows) {
    put(p, f, label, 18, y, 8.5, "heading");
    y = paragraph(p, f, formula, 40, y, 126, 9, 5.2) + 2.5;
  }
  if (y > 229) throw new Error(`Formula page overflow: ${y}mm`);
  const p2 = page(doc);
  heading(p2, f, "収録問題の一覧 / 案A", "各問のDを比較できます。ページは問題の始まる場所です。", 3);
  entries.forEach(({ v, qs }, i) => {
    const y0 = 35 + i * 14.6;
    put(p2, f, `${v.info.task.name}  Lv.${v.info.vol.lv}  ${qs[0].grid}  p.${qs[0].page}〜${qs[11].page}`, 18, y0, 8.8, "heading");
    qs.forEach((q: { number: number; difficulty: number }, j: number) => put(p2, f,
      `${String(q.number).padStart(3, "0")}: ${q.difficulty}`, 18 + (j % 6) * 24.8, y0 + 4.9 + Math.floor(j / 6) * 4.3, 7.3, "mono"));
    if (i < entries.length - 1) rule(p2, y0 + 13.5);
  });
  await save(doc, "index-option-a.pdf");
}
{
  const { doc, fonts: f } = await document();
  for (let k = 0; k < 2; k++) {
    const p = page(doc);
    heading(p, f, "収録問題の一覧 / 案B", "課題とレベルから、取り組むページを選べます。", 2 + k);
    if (k === 0) {
      put(p, f, "Lv.1  まっすぐな線から", 18, 39, 10.5, "heading");
      paragraph(p, f, "3×3の点を見て、たて・よこの線を写します。はじめての一問も、ここから。", 18, 47, 148, 9, 5);
      put(p, f, "Lv.2  同じ3×3で、いろいろな見方へ", 18, 61, 10.5, "heading");
      paragraph(p, f, "ななめ線が加わります。足りない線を見つけたり、形を動かしたり、重ねたり。新しい遊び方は、始める前に1ページで紹介します。", 18, 69, 148, 9, 5);
      rule(p, 89);
    }
    const start = k === 0 ? 0 : 7, end = k === 0 ? 7 : 13;
    entries.slice(start, end).forEach(({ v, qs }, i) => {
      const y = k === 0 ? 96 + i * 18 : i < 2 ? 39 + i * 17 : 129 + (i - 2) * 18;
      put(p, f, `${v.info.task.name}  Lv.${v.info.vol.lv}  ${qs[0].grid}`, 18, y, 10, "heading");
      put(p, f, `第${qs[0].number}〜${qs[11].number}問   p.${qs[0].page}〜${qs[11].page}`, 18, y + 6.5, 8.8);
      if (i < end - start - 1 && !(k === 1 && i === 1)) rule(p, y + 14.5);
    });
    if (k === 1) {
      rule(p, 78);
      put(p, f, "Lv.3  点が増えたら、もう一歩", 18, 84, 10.5, "heading");
      paragraph(p, f, "平面は4×4になり、線が交わる問題も増えます。移動と回転では、新しい動かし方にも出会います。最後は9×9の点で立体の形を写します。", 18, 92, 148, 9, 5);
      paragraph(p, f, "年齢は目安です。気に入った遊び方に戻っても大丈夫。", 18, 115, 148, 8.5, 4.8);
    }
  }
  await save(doc, "index-option-b.pdf");
}
{
  const { doc, fonts: f } = await document();
  const p = page(doc), { v, qs } = entries[2];
  heading(p, f, `${v.info.task.name}  Lv.${v.info.vol.lv}`, "1ページ3問の紙面見本", 14);
  put(p, f, TASK_COPY[v.set.task].instruction, 18, 35, 11, "heading");
  for (let j = 0; j < 3; j++) {
    const y = 49 + j * 59;
    put(p, f, `第${qs[j].number}問`, 18, y, 11, "heading");
    put(p, f, qs[j].grid, 148, y + 1, 8.5);
    paintProblemPdf(p, v.rendered[j], { x: 18 * MM, y: (y + 8) * MM, width: 150 * MM, height: 48 * MM }, "horizontal", { minLineMm: BOOK.minLineMm, monochrome: true, dotScale: 1 });
    if (j < 2) rule(p, y + 57.5);
  }
  await save(doc, "question-option-b.pdf");
}
console.log(`Wrote ${OUT}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
