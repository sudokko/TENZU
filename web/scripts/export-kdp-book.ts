/** npx tsx scripts/export-kdp-book.ts [--out ../docs/drafts/kdp/first-patterns-216] [--with-cover-comparisons] */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PDFDocument, grayscale, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PUBLISHED } from "../app/products/problems/published";
import { volBySku } from "../app/products/data";
import { KDP_B5, pairGeom, CELL_PAD } from "../app/products/print";
import { toRenderProblems, resultEdgesOf } from "../app/products/problems/render";
import { paintProblemPdf, paintGridPdf, paintGuideGridPdf } from "../app/products/problems/pdf-render";
import type { Problem } from "../app/products/problems/schema";
import { BOOK, BOOK_216, TASK_COPY, TASK_AIM, GUIDE_COPY, LEVEL_COPY, FONT_FILES } from "./kdp/book";
import { QR_PRODUCTS_MODULES } from "./kdp/qr-products";
import { readerCode } from "./kdp/reader-config";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = process.argv.indexOf("--out");
const OUT = arg < 0 ? path.join(ROOT, "docs/drafts/kdp", BOOK.id) : path.resolve(process.argv[arg + 1]);
const LAYOUT_SAMPLE = process.argv.includes("--layout-sample");
const INTRO_SAMPLE = process.argv.includes("--intro-sample");
const INTRO_ALTERNATIVES = process.argv.includes("--intro-alternatives");
const INTRO_REVISED = process.argv.includes("--intro-revised");
const REVIEW_SAMPLES = process.argv.includes("--review-samples");
const LINE_DENSITY_40_30_20 = process.argv.includes("--line-density-40-30-20");
const LINE_DENSITY_ALL_ELEMENTS_40_55 = process.argv.includes("--line-density-all-elements-40-55");
const TENZU_INTRO_ALTERNATIVES = process.argv.includes("--tenzu-intro-alternatives");
const TENZU_INTRO_REVISED_B = process.argv.includes("--tenzu-intro-b-revised");
const MM = 72 / 25.4;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
type Fonts = Record<"heading" | "body" | "mono", PDFFont>;
const sources: { file: string; sha256: string }[] = [];
const volumes = BOOK.skus.map((sku) => {
  const set = PUBLISHED[sku], hit = volBySku(sku);
  if (!set || !hit || set.problems.length !== 12) throw new Error(`Missing 12-problem volume: ${sku}`);
  return { sku, set, ...hit, rendered: toRenderProblems(set) };
});
const tasks = [...new Set(volumes.map((v) => v.set.task))];
let nextPage = BOOK.frontPages + 1, nextNumber = 1;
const seenTasks = new Set<string>();
const introductionPages = new Map<number, number>();
const levelColumnRegions: { volumeIndex: number; page: number; x: number; y: number; width: number; height: number }[] = [];
const questions = volumes.flatMap((v, vi) => {
  if (!seenTasks.has(v.set.task)) {
    introductionPages.set(vi, nextPage++);
    seenTasks.add(v.set.task);
  }
  const pp = v.set.task === "solid" ? 1 : 3;
  const firstPage = nextPage;
  nextPage += v.set.problems.length / pp;
  return v.set.problems.map((p, i) => {
    if (!p.difficulty || !Number.isFinite(p.difficulty.value)) throw new Error(`D missing: ${p.id}`);
    return { number: nextNumber++, sku: v.sku, sourceId: p.id, sourceIndex: i, volumeIndex: vi,
      task: v.task.name, taskSlug: v.set.task, level: v.vol.lv, ageLabel: v.vol.ageLabel, blurb: v.vol.blurb,
      grid: p.grid.type === "square" ? `${p.grid.n}×${p.grid.n}` : `${p.grid.cols}×${p.grid.rows}`,
      difficulty: p.difficulty.value, page: firstPage + Math.floor(i / pp), answerPage: null as number | null };
  });
});
const answerStart = nextPage;
const answerVolumes = volumes.map((v, vi) => ({ v, vi })).filter(({ v }) => !BOOK.omitAnswerTasks.includes(v.set.task));
answerVolumes.forEach(({ vi }, i) => questions.filter((q) => q.volumeIndex === vi).forEach((q) => { q.answerPage = answerStart + i; }));
const contentPageCount = answerStart + answerVolumes.length;
const pageCount = contentPageCount + contentPageCount % 2;
if (questions.length !== 216 || pageCount > 110) throw new Error("Invalid count or pagination");
const pageKinds: string[] = [];
const ink = grayscale(0.08);

async function makeDocument() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = {} as Fonts;
  for (const [key, filename] of FONT_FILES) {
    const bytes = await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts", filename));
    // fontkit's subset output loses glyphs in these Japanese TrueType fonts in Poppler.
    // Full embedding preserves the original glyph IDs and is permitted by OFL 1.1.
    fonts[key] = await doc.embedFont(bytes, { subset: false });
  }
  return { doc, fonts };
}
function text(page: PDFPage, f: Fonts, s: string, x: number, top: number, size = 10, face: keyof Fonts = "body", color: Color = ink) {
  // Fail early on missing glyphs rather than silently printing .notdef boxes.
  const chars = f[face].getCharacterSet();
  for (const ch of s) if (!chars.includes(ch.codePointAt(0)!)) throw new Error(`Missing ${face} glyph: ${ch}`);
  page.drawText(s, { x: x * MM, y: page.getHeight() - top * MM - size, size, font: f[face], color });
}
function fillRect(page: PDFPage, x: number, y: number, w: number, h: number, color: Color) {
  page.drawRectangle({ x: x * MM, y: page.getHeight() - (y + h) * MM,
    width: w * MM, height: h * MM, color });
}
function framedRect(page: PDFPage, x: number, y: number, w: number, h: number, fill: Color = grayscale(1)) {
  const inset = BOOK.minLineMm / 2;
  page.drawRectangle({ x: (x + inset) * MM, y: page.getHeight() - (y + h) * MM,
    width: (w - 2 * inset) * MM, height: h * MM, color: fill,
    borderColor: grayscale(0.42), borderWidth: BOOK.minLineMm * MM });
}
function wrap(s: string, font: PDFFont, size: number, widthMm: number) {
  const lines: string[] = [];
  for (const para of s.split("\n")) {
    let line = "";
    for (const c of para) {
      if (line && font.widthOfTextAtSize(line + c, size) > widthMm * MM) {
        if (/[、。，．！？）」』】]/.test(c) && line.length > 1) {
          lines.push(line.slice(0, -1)); line = line.slice(-1);
        } else { lines.push(line); line = ""; }
      }
      line += c;
    }
    lines.push(line);
  }
  return lines;
}
function paragraph(page: PDFPage, fonts: Fonts, s: string, x: number, y: number, width = 150, size = 10, lineMm = 6, face: keyof Fonts = "body") {
  const lines = wrap(s, fonts[face], size, width);
  lines.forEach((l, i) => text(page, fonts, l, x, y + i * lineMm, size, face));
  return y + lines.length * lineMm;
}
function rule(page: PDFPage, x: number, y: number, w: number) {
  page.drawLine({ start: { x: (x + 0.3) * MM, y: page.getHeight() - y * MM }, end: { x: (x + w - 0.3) * MM, y: page.getHeight() - y * MM }, thickness: BOOK.minLineMm * MM, color: grayscale(0.5), dashArray: [1.5 * MM, 1.5 * MM] });
}
function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: Color = ink) {
  page.drawLine({ start: { x: x1 * MM, y: page.getHeight() - y1 * MM },
    end: { x: x2 * MM, y: page.getHeight() - y2 * MM },
    thickness: BOOK.minLineMm * MM, color });
}
const fullWidthNumber = (n: number) => String(n).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
function followingLevel(vi: number) {
  const next = volumes[vi + 1];
  return next && next.set.task === volumes[vi].set.task && next.vol.lv > volumes[vi].vol.lv ? next.vol.lv : null;
}
function drawLevelTransition(page: PDFPage, fonts: Fonts, x: number, from: number, to: number) {
  const gray = grayscale(0.55);
  text(page, fonts, `レベル${fullWidthNumber(from)}`, x + 91, 8.6, 9.5, "heading", gray);
  line(page, x + 112.5, 13, x + 120.5, 13, gray);
  line(page, x + 118.5, 11.3, x + 120.5, 13, gray);
  line(page, x + 118.5, 14.7, x + 120.5, 13, gray);
  text(page, fonts, `レベル${fullWidthNumber(to)}`, x + 123, 7.7, 12.5, "heading");
  line(page, x + 123, 17.5, x + 151.7, 17.5);
}
function drawQrProducts(page: PDFPage, x: number, y: number, side: number) {
  if (QR_PRODUCTS_MODULES.length !== 25 || QR_PRODUCTS_MODULES.some((row) => !/^[01]{25}$/.test(row)))
    throw new Error("Invalid approved QR matrix");
  fillRect(page, x, y, side, side, grayscale(1));
  const moduleMm = side / 33;
  QR_PRODUCTS_MODULES.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === "1")
      fillRect(page, x + (c + 4) * moduleMm, y + (r + 4) * moduleMm, moduleMm, moduleMm, grayscale(0));
  });
}
const qrCode = createRequire(import.meta.url)("qrcode") as {
  create: (url: string, options: { errorCorrectionLevel: "M" }) => { modules: { size: number; data: Uint8Array } };
};
function drawQrMakers(page: PDFPage, x: number, y: number, side: number) {
  const modules = qrCode.create("https://tenzu.jp/makers", { errorCorrectionLevel: "M" }).modules;
  fillRect(page, x, y, side, side, grayscale(1));
  const moduleMm = side / (modules.size + 8);
  for (let r = 0; r < modules.size; r++) for (let c = 0; c < modules.size; c++) {
    if (modules.data[r * modules.size + c])
      fillRect(page, x + (c + 4) * moduleMm, y + (r + 4) * moduleMm, moduleMm, moduleMm, grayscale(0));
  }
}
function left(pn: number) { return pn % 2 ? BOOK.margins.inside : BOOK.margins.outside; }
function newPage(doc: PDFDocument, f: Fonts, kind: string, heading: string, record = true, printedPn?: number, compact = false) {
  const page = doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
  const pn = printedPn ?? doc.getPageCount(), x = left(pn);
  if (record) pageKinds.push(kind);
  if (heading) text(page, f, heading, x, compact ? 7 : 17, 10);
  text(page, f, String(pn), x + 144, compact ? 246 : 236, 9, "mono");
  return { page, pn, x };
}
function question(page: PDFPage, vi: number, pi: number, x: number, y: number, w: number, h: number, expanded = false, answerGuide = false, inkGray = 0.6) {
  const v = volumes[vi], p = v.set.problems[pi];
  if (p.grid.type === "solid") {
    const g = pairGeom(w * MM, h * MM, "vertical");
    for (let side = 0; side < 2; side++) {
      const cell = { x: x * MM + g.ox, y: y * MM + g.oy + side * g.dy, width: g.pane, height: g.pane };
      paintGridPdf(page, cell, p.grid.cols, p.grid.rows, side ? [] : p.solidEdges ?? [], { minLineMm: BOOK.minLineMm, inkGray });
      if (side && answerGuide) paintGuideGridPdf(page, cell, p.grid.cols, p.grid.rows, p.solidEdges ?? [], BOOK.minLineMm);
    }
  } else paintProblemPdf(page, v.rendered[pi], { x: x * MM, y: y * MM, width: w * MM, height: h * MM }, "horizontal",
    { minLineMm: BOOK.minLineMm, monochrome: true, dotScale: 1, inkGray,
      gapScale: v.rendered[pi].compose ? 1 : expanded ? 3.1 : 2.5,
      markerMaxPaneRatio: expanded ? 0.23 : undefined, answerGuide });
}
function solution(page: PDFPage, vi: number, pi: number, x: number, y: number, w: number, h: number, inkGray = 0.6) {
  const v = volumes[vi], p: Problem = v.set.problems[pi];
  const n = p.grid.type === "square" ? p.grid.n : p.grid.cols;
  const rows = p.grid.type === "square" ? p.grid.n : p.grid.rows;
  paintGridPdf(page, { x: x * MM, y: y * MM, width: w * MM, height: h * MM }, n, rows,
    p.grid.type === "solid" ? p.solidEdges ?? [] : resultEdgesOf(v.rendered[pi]), { minLineMm: BOOK.minLineMm, inkGray });
}
function brandDots(page: PDFPage, x: number, y: number, w: number, h: number) {
  for (let py = y; py <= y + h; py += 5) for (let px = x; px <= x + w; px += 5)
    page.drawCircle({ x: px * MM, y: page.getHeight() - py * MM, size: 0.2 * MM, color: grayscale(0.88) });
}
/** The opening page is shared by the full book and its one-page revision proof. */
function openingPage(doc: PDFDocument, f: Fonts, record = true) {
  const { page, x } = newPage(doc, f, "guide", "大人の方へ / この本の使い方", record, 1);
  brandDots(page, x + 1, 30, 145, 10);
  text(page, f, "4〜6才の図形・空間認識トレーニング", x, 47, 16, "heading");
  text(page, f, "点図形（点描写）", x, 59, 25, "heading");
  let y = paragraph(page, f, "この本は、鉛筆で線を引くことに慣れてきた、4〜6才ごろのお子さんのための点図形の問題集です。", x, 78, 148, 10.5, 5.8);
  y = paragraph(page, f, "見本をよく見て、形や点の位置を確かめ、自分で線を引く。そんな練習を通して、「形を見分ける力」「向きや位置を考える力」「考えた形を書き表す力」を育みます。", x, y + 4, 148, 10.5, 5.8);
  y = paragraph(page, f, "やさしい模写から、鏡・移動・回転・立体まで、9種類・216問を収録しました。初めてのお子さんは「うつす」から。慣れてきたら、お子さんに合う課題へ進んでください。", x, y + 4, 148, 10.5, 5.8);
  const tips = [
    ["まずは、まっすぐな線から。", "鉛筆と消しゴムを用意して、点の少ない「うつす」からどうぞ。新しい課題の前には、やり方の説明があります。一緒に読んで始めましょう。"],
    ["「どの点からかな？」と、一緒に。", "手が止まったら、見本の線の始まりを指で探してみましょう。一度にたくさん進めなくても大丈夫。好きなところで終えられます。"],
    ["できたら、見比べてみましょう。", `「うつす」「たす」「りったい」は見本が答えです。ほかの答えは${answerStart}ページから。「同じ点をつなげたね」と、できたところを一緒に見つけてください。`],
  ];
  y += 7;
  for (const [title, body] of tips) {
    text(page, f, title, x, y, 11.5, "heading");
    y = paragraph(page, f, body, x, y + 7.5, 148, 9, 4.8) + 6;
  }
  if (y > 226) throw new Error(`Opening page overflows: ${y.toFixed(1)} mm`);
  paragraph(page, f, "本に直接書き込むこともできます。ページが開きにくいときや、くり返し練習するときは、4ページの案内からPDFを印刷してご利用ください。", x, 217, 148, 8, 4.4);
  text(page, f, "進め方は2ページ、課題の一覧は3ページをご覧ください。", x, 234, 8);
}

const tenzuIntroOptions = {
  a: {
    headline: "まちがえた一問を、もう一度。",
    about: "TENZUは点図形（点描写）プリントの専門店。本の問題に、WEBでも取り組めます。",
    gift: "本に載っている216問をWEBで見られます。まちがえたページだけを繰り返し印刷して、前に書いた紙と比べると、上達が見えてきます。本書をご購入いただいたお客様に限り、特別に無償でご提供しています。",
  },
  b: {
    headline: "本とWEBで、くり返せる。",
    about: "TENZUは、見て、考えて、書く練習を家庭で続けられる、点図形プリントのWEBサイトです。",
    gift: "同じ216問をWEBでもご覧いただけます。まちがえたページだけを印刷し直し、書いた紙を並べると、できるようになったところが見つかります。本書の購入者に限り、特別に無償でご提供します。",
  },
  b2: {
    headline: "本とWEBで、くり返せる。",
    about: "「あの問題、もう一度やってみたい」。そんなときは、TENZUのWEBサイトへ。\n点図形（点描写）プリントの専門店です。",
    gift: "この本と同じ216問のプリントPDFをご用意しました。もう一度やりたい問題だけを印刷できます。本書をご購入の方は、追加料金・メール登録なしで、何度でもご利用いただけます。",
    giftHeadline: "216問のプリントを、必要な分だけ。",
    products: "次の一枚を探しに。この本より難しい問題も、種類・レベル別に選べます。",
    maker: "お子さんにぴったりの一問を、自分で。模写4×4は無料で使えます。",
  },
  c: {
    headline: "できた！を、見つけるために。",
    about: "TENZUは、図形を見て考え、自分で線を引くためのプリントをお届けするWEBサイトです。",
    gift: "この本の216問はWEBからも見られます。気になるページを繰り返し印刷して、以前の一枚と見比べてみてください。上達の足跡がわかります。本書をご購入いただいた方だけに、特別に無償でご提供します。",
  },
} as const;
/** Reader benefit page shared by the book and revision samples. */
function tenzuIntroOption(doc: PDFDocument, f: Fonts, variant: keyof typeof tenzuIntroOptions, printedPn?: number, record = false) {
  const copy = tenzuIntroOptions[variant];
  const { page, x } = newPage(doc, f, "about", "TENZUについて", record, printedPn);
  brandDots(page, x + 1, 27, 145, 8);
  text(page, f, copy.headline, x, 41, 18, "heading");
  const aboutEnd = paragraph(page, f, copy.about, x, 66, 150, 9.5, 5.8);
  if (aboutEnd > 91) throw new Error(`TENZU introduction overflows (${variant}): ${aboutEnd.toFixed(1)} mm`);

  framedRect(page, x, 94, 152, 79, grayscale(0.9));
  fillRect(page, x, 94, 3, 79, grayscale(0.18));
  text(page, f, variant === "b2" ? tenzuIntroOptions.b2.giftHeadline : "本書の購入者だけに、216問のプリントを。", x + 7, 101, 11.5, "heading");
  const giftEnd = paragraph(page, f, copy.gift, x + 7, 118, 110, variant === "b2" ? 9 : 8.5, variant === "b2" ? 5.1 : 4.8);
  if (giftEnd > 153) throw new Error(`Gift copy overflows (${variant}): ${giftEnd.toFixed(1)} mm`);
  text(page, f, "受取コード", x + 7, 150, 8, "heading");
  text(page, f, readerCode(), x + 28, 150, 9, "mono");
  text(page, f, "tenzu.jp/book/216", x + 7, 162, 9, "mono");
  const benefitQr = qrCode.create(BOOK_216.qrUrl, { errorCorrectionLevel: "M" }).modules;
  fillRect(page, x + 121, 117, 25, 25, grayscale(1));
  const unit = 25 / (benefitQr.size + 8);
  for (let r = 0; r < benefitQr.size; r++) for (let c = 0; c < benefitQr.size; c++) if (benefitQr.data[r * benefitQr.size + c]) fillRect(page, x + 121 + (c + 4) * unit, 117 + (r + 4) * unit, unit, unit, grayscale(0));
  text(page, f, "PDFの受け取り", x + 121, 145, 7.5);

  framedRect(page, x, 179, 152, 29);
  text(page, f, "TENZUの商品一覧", x + 5, 182, 11.5, "heading");
  const productsEnd = paragraph(page, f, variant === "b2" ? tenzuIntroOptions.b2.products : "この本より難しい問題も、種類・レベル別に選べます。", x + 5, 190, 112, 8.5, 4.6);
  if (productsEnd > 202) throw new Error(`Products copy overflows (${variant})`);
  text(page, f, "tenzu.jp/products", x + 5, 201, 8, "mono");
  drawQrProducts(page, x + 123, 180.5, 26);

  framedRect(page, x, 213, 152, 29);
  text(page, f, "点図形メーカー", x + 5, 216, 11.5, "heading");
  const makerEnd = paragraph(page, f, variant === "b2" ? tenzuIntroOptions.b2.maker : "自分で問題をつくれます。模写4×4は無料で使えます。", x + 5, 224, 112, 8.5, 4.6);
  if (makerEnd > 236) throw new Error(`Maker copy overflows (${variant})`);
  text(page, f, "tenzu.jp/makers", x + 5, 235, 8, "mono");
  drawQrMakers(page, x + 123, 214.5, 26);
}

/** Compare only figure-line density; published geometry, dot ink and stroke width stay unchanged. */
function lineDensitySample(doc: PDFDocument, f: Fonts,
  variants: readonly { density: number; label: string }[] = [
    { density: 0.88, label: "A  現行 / 黒の濃さ 88％" },
    { density: 0.70, label: "B  少し薄い / 黒の濃さ 70％" },
    { density: 0.55, label: "C  さらに薄い / 黒の濃さ 55％" },
  ]) {
  if (variants.length !== 3) throw new Error("Density comparison needs exactly three variants");
  const page = doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
  const x = BOOK.margins.inside;
  const vi = volumes.findIndex((v) => v.sku === "copy-lv3-vol1");
  if (vi < 0) throw new Error("Missing copy Lv.3 sample");
  const q = questions.find((q) => q.volumeIndex === vi && q.sourceIndex === 0)!;
  text(page, f, "線の濃さを比べる / 試し刷り専用", x, 8, 12, "heading");
  text(page, f, `本書${q.page}ページ・${q.number}ばんを、同じ大きさで3回掲載しています。`, x, 18, 8.5);
  text(page, f, "変えるのは図形の線だけ。点・文字・矢印の濃さと、線の太さは同じです。", x, 24, 8);
  const step = (244 - 32) / 3;
  const pad = Math.min(152, step - 11) * MM * CELL_PAD;
  const geometry = pairGeom(152 * MM - pad * 2, (step - 11) * MM - pad * 2, "horizontal", 2, 3.1);
  const referenceRight = x * MM + pad + geometry.ox + geometry.pane;
  variants.forEach(({ density, label }, i) => {
    const y = 32 + i * step;
    text(page, f, label, x, y, 10, "heading");
    let changedLines = 0;
    // A minimal adapter keeps the shared renderer and its exact geometry authoritative.
    const tonedPage = {
      getHeight: () => page.getHeight(),
      drawCircle: (options: Parameters<PDFPage["drawCircle"]>[0]) => page.drawCircle(options),
      drawLine: (options: Parameters<PDFPage["drawLine"]>[0]) => {
        const color = options?.color;
        const isFigure = color?.type === "Grayscale" && Math.abs(color.gray - 0.12) < 1e-6
          && options.start.x <= referenceRight && options.end.x <= referenceRight;
        if (isFigure) changedLines++;
        page.drawLine({ ...options, ...(isFigure ? { color: grayscale(1 - density) } : {}) });
      },
    } as unknown as PDFPage;
    question(tonedPage, vi, 0, x, y + 8, 152, step - 11, true, false, 0.12);
    if (changedLines !== volumes[vi].rendered[0].edges.length)
      throw new Error(`Unexpected density sample line count: ${changedLines}`);
    if (i < variants.length - 1) rule(page, x, y + step - 2, 152);
  });
  text(page, f, "B5・実際のサイズ（100％）で印刷。自動濃度補正・節約印刷はオフ。", x, 246, 7.5);
}
/** Compare figure lines, dots and arrows together on representative translation, rotation and folding problems. */
function lineDensityAllElementsSample(doc: PDFDocument, f: Fonts, density: 0.4 | 0.55) {
  const page = doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
  const x = BOOK.margins.inside;
  const selected = (["translate", "rotate", "fold"] as const).map((task) => {
    const vi = volumes.findIndex((v) => v.set.task === task && v.vol.lv === 3);
    if (vi < 0) throw new Error(`Missing ${task} Lv.3 sample`);
    const q = questions.find((item) => item.volumeIndex === vi && item.sourceIndex === 0);
    if (!q) throw new Error(`Missing first ${task} question`);
    return { task, vi, q };
  });
  const percentage = Math.round(density * 100);
  text(page, f, `図形・点・矢印の濃さを比べる / 黒${percentage}％`, x, 8, 12, "heading");
  text(page, f, "移動・回転・折り重ねを1問ずつ掲載。問題の線・点・矢印を同じ濃さにしています。", x, 19, 8.5);
  const start = 32;
  const step = (244 - start) / selected.length;
  selected.forEach(({ task, vi, q }, i) => {
    const y = start + i * step;
    text(page, f, `${TASK_COPY[task].short}（${volumes[vi].task.name}） / ${q.number}ばん`, x, y, 10, "heading");
    let tonedLines = 0;
    let tonedDots = 0;
    let untonedProblemMarks = 0;
    // Preserve the shared renderer's geometry while changing only its monochrome problem ink.
    const tonedPage = {
      getHeight: () => page.getHeight(),
      drawCircle: (options: Parameters<PDFPage["drawCircle"]>[0]) => {
        const color = options?.color;
        const isProblemInk = color?.type === "Grayscale" && Math.abs(color.gray - 0.12) < 1e-6;
        if (isProblemInk) {
          tonedDots++;
          page.drawCircle({ ...options, color: grayscale(1 - density) });
        } else {
          untonedProblemMarks++;
          page.drawCircle(options);
        }
      },
      drawLine: (options: Parameters<PDFPage["drawLine"]>[0]) => {
        const color = options?.color;
        const isProblemInk = color?.type === "Grayscale" && Math.abs(color.gray - 0.12) < 1e-6;
        if (isProblemInk) {
          tonedLines++;
          page.drawLine({ ...options, color: grayscale(1 - density) });
        } else {
          untonedProblemMarks++;
          page.drawLine(options);
        }
      },
    } as unknown as PDFPage;
    question(tonedPage, vi, q.sourceIndex, x, y + 8, 152, step - 11, true, false, 0.12);
    const problem = volumes[vi].rendered[q.sourceIndex];
    const paneCount = problem.compose ? 3 : 2;
    const expectedDots = problem.n * problem.n * paneCount;
    if (tonedDots !== expectedDots || tonedLines === 0 || untonedProblemMarks !== 0)
      throw new Error(`Unexpected ${task} ink counts: dots=${tonedDots}/${expectedDots}, lines=${tonedLines}, untoned=${untonedProblemMarks}`);
    if (i < selected.length - 1) rule(page, x, y + step - 2, 152);
  });
  text(page, f, "B5・実際のサイズ（100％）で印刷。自動濃度補正・節約印刷はオフ。文字は現行の濃さです。", x, 246, 7.5);
}
/** Full-size pages and review samples share the same problem renderer. */
function problemPage(doc: PDFDocument, fonts: Fonts, vi: number, pi: number, perPage: number, preview = false, layoutSample = false) {
  const v = volumes[vi];
  const samplePn = layoutSample ? questions.find((q) => q.volumeIndex === vi && q.sourceIndex === pi)?.page : undefined;
  const fromLevel = pi === 0 && vi > 0 && volumes[vi - 1].set.task === v.set.task ? volumes[vi - 1].vol.lv : null;
  const { page, pn, x } = newPage(doc, fonts, "problems", fromLevel !== null ? v.task.name : `${v.task.name} / Lv.${v.vol.lv}${preview ? " / 3問の紙面見本" : ""}`, !preview && !layoutSample, samplePn, true);
  if (fromLevel !== null) drawLevelTransition(page, fonts, x, fromLevel, v.vol.lv);
  text(page, fonts, TASK_COPY[v.set.task].instruction, x, 19, 11, "heading");
  const start = 32;
  const step = (244 - start) / perPage;
  const problemWidth = 152;
  for (let j = 0; j < perPage; j++) {
    const q = questions.find((q) => q.volumeIndex === vi && q.sourceIndex === pi + j)!;
    if (!preview && q.page !== pn) throw new Error(`Wrong page: ${q.number}`);
    const y = start + j * step;
    const number = `${q.number}ばん`;
    text(page, fonts, number, x, y, 12, "heading");
    text(page, fonts, `（${q.sourceIndex + 1}／${v.set.problems.length}）`, x + fonts.heading.widthOfTextAtSize(number, 12) / MM + 2.5, y + 1, 10.5, "heading");
    if (q.answerPage !== null) text(page, fonts, `こたえ ${q.answerPage}ページ`, x + 109, y + 1, 8.5);
    question(page, vi, pi + j, x, y + 8, problemWidth, step - 11, true);
    if (j < perPage - 1) rule(page, x, y + step - 2, problemWidth);
  }
  const nextLevel = followingLevel(vi);
  if (!preview && !layoutSample && pi + perPage === v.set.problems.length && nextLevel !== null) {
    const copy = `レベル${fullWidthNumber(v.vol.lv)}はここまで、おつかれさま＾＾つぎからはレベル${fullWidthNumber(nextLevel)}だよ！`;
    const width = fonts.heading.widthOfTextAtSize(copy, 12) / MM;
    if (width > 152) throw new Error(`Level farewell exceeds page: ${copy}`);
    text(page, fonts, copy, x + (152 - width) / 2, 238.5, 12, "heading");
  } else if (!preview && !layoutSample && pi + perPage === v.set.problems.length && v.vol.lv === 3) {
    const copy = "レベル３はここまで、おつかれさま＾＾がんばったね！";
    const width = fonts.heading.widthOfTextAtSize(copy, 12) / MM;
    if (width > 152) throw new Error(`Level farewell exceeds page: ${copy}`);
    text(page, fonts, copy, x + (152 - width) / 2, 238.5, 12, "heading");
  }
  return page;
}
function taskIntroduction(doc: PDFDocument, f: Fonts, vi: number, sample = false) {
  const v = volumes[vi];
  const { page, pn, x } = newPage(doc, f, "explanations", "この課題の やりかた", !sample,
    sample ? introductionPages.get(vi) : undefined);
  if (pn !== introductionPages.get(vi)) throw new Error("Introduction page mismatch");
  const taskTitle = `${TASK_COPY[v.set.task].short}（${v.task.name}）`;
  if (f.heading.widthOfTextAtSize(taskTitle, 22) / MM > 133) throw new Error(`Task title exceeds page: ${taskTitle}`);
  text(page, f, String(tasks.indexOf(v.set.task) + 1).padStart(2, "0"), x, 31, 12, "mono", grayscale(0.5));
  text(page, f, taskTitle, x + 19, 26, 22, "heading");
  line(page, x + 0.3, 49, x + 151.7, 49, grayscale(0.68));

  const taskVolumes = volumes.filter((item) => item.set.task === v.set.task);
  const explanation = TASK_COPY[v.set.task].explanation;
  const aim = TASK_AIM[v.set.task];
  if (!aim) throw new Error(`Task aim missing: ${v.set.task}`);
  const explanationEnd = 66 + wrap(explanation, f.body, 9, 150).length * 5.4;
  let levelY = Math.max(84, explanationEnd + 5);
  const levelRows = taskVolumes.map((item) => {
    const row = { item, y: levelY };
    levelY += wrap(LEVEL_COPY[item.sku], f.body, 8.5, 128).length * 5 + 3;
    return row;
  });
  const aimLabelY = levelY + 1;
  const aimTextY = aimLabelY + 8;
  const aimEnd = aimTextY + wrap(aim, f.heading, 10.5, 150).length * 6;
  const childY = Math.max(134, aimEnd + 7);
  const sampleY = childY + 30, diagramY = sampleY + 10;
  if (236 - diagramY < 40) throw new Error(`Task diagram too short: ${v.set.task}`);
  text(page, f, "おうちの方へ", x, 56, 10, "heading");
  paragraph(page, f, explanation, x, 66, 150, 9, 5.4);
  for (const { item, y } of levelRows) {
    text(page, f, `Lv.${item.vol.lv}`, x, y, 9, "mono", grayscale(0.44));
    paragraph(page, f, LEVEL_COPY[item.sku], x + 22, y, 128, 8.5, 5);
  }
  line(page, x + 0.3, aimLabelY - 3, x + 151.7, aimLabelY - 3, grayscale(0.68));
  text(page, f, "この課題のねらい", x, aimLabelY, 9, "heading");
  paragraph(page, f, aim, x, aimTextY, 150, 10.5, 6, "heading");
  fillRect(page, x, childY, 1.5, 22, grayscale(0.18));
  text(page, f, "やってみよう", x + 6, childY, 14, "heading");
  const childEnd = paragraph(page, f, GUIDE_COPY[v.set.task], x + 6, childY + 12, 144, 10.5, 6, "heading");
  if (childEnd > sampleY - 2) throw new Error(`Task child area overflow: ${v.set.task}`);
  text(page, f, "かいとうれい", x, sampleY, 10, "heading");
  question(page, vi, 0, x, diagramY, 152, 236 - diagramY, true, true);
  return page;
}
/** Level columns shared by the first comparison and the revised sample. */
function introductionLevelColumns(page: PDFPage, f: Fonts, task: string, x: number, y: number, pageNumber?: number) {
  const taskVolumes = volumes.filter((item) => item.set.task === task);
  const gap = 4, colW = (152 - (taskVolumes.length - 1) * gap) / taskVolumes.length;
  const columnCopy = taskVolumes.map((item) => LEVEL_COPY[item.sku].replaceAll("。", "。\n").trim());
  const colH = 13 + Math.max(...columnCopy.map((copy) => wrap(copy, f.body, 9, colW - 8).length)) * 5.2;
  taskVolumes.forEach((item, i) => {
    const cx = x + i * (colW + gap);
    if (pageNumber !== undefined) levelColumnRegions.push({ volumeIndex: volumes.indexOf(item), page: pageNumber,
      x: cx + 4, y: y + 12, width: colW - 8, height: colH - 12 });
    const listed = questions.filter((q) => q.sku === item.sku);
    const label = `Lv.${item.vol.lv}（${listed[0].page}P〜${listed[listed.length - 1].page}P）`;
    if (f.body.widthOfTextAtSize(label, 9.5) / MM > colW - 8) throw new Error(`Level range too wide: ${item.sku}`);
    fillRect(page, cx, y, colW, colH, grayscale(0.88));
    text(page, f, label, cx + 4, y + 3, 9.5);
    paragraph(page, f, columnCopy[i], cx + 4, y + 12, colW - 8, 9, 5.2);
  });
  return y + colH;
}
/** Review-only alternatives. Copy and diagrams come from the same sources as the book. */
function taskIntroductionAlternative(doc: PDFDocument, f: Fonts, vi: number, variant: "a" | "b") {
  const v = volumes[vi], task = v.set.task;
  const { page, x } = newPage(doc, f, "explanations", "この課題の やりかた", false, introductionPages.get(vi));
  const taskVolumes = volumes.filter((item) => item.set.task === task);
  const title = `${TASK_COPY[task].short}（${v.task.name}）`;
  const pale = grayscale(0.88);
  text(page, f, title, x, 29, 24, "heading");
  text(page, f, String(tasks.indexOf(task) + 1).padStart(2, "0"), x + 132, 27, 26, "mono", grayscale(0.5));

  if (variant === "a") {
    // Three parallel level columns make the progression comparable at a glance.
    fillRect(page, x, 49, 31, 8, grayscale(0.18));
    text(page, f, "おうちの方へ", x + 3.5, 50.5, 10, "heading", grayscale(1));
    const parentEnd = paragraph(page, f, TASK_COPY[task].explanation, x, 61, 152, 9.5, 5.4);
    const levelsY = Math.max(77, parentEnd + 5);
    const aimY = introductionLevelColumns(page, f, task, x, levelsY) + 6;
    fillRect(page, x, aimY, 1, 16, grayscale(0.4));
    text(page, f, "この課題のねらい", x + 5, aimY, 10, "heading");
    const aimEnd = paragraph(page, f, TASK_AIM[task], x + 5, aimY + 7, 147, 10, 5.5, "heading");
    const childY = Math.max(145, aimEnd + 9);
    text(page, f, "やってみよう", x, childY, 17, "heading");
    const childEnd = paragraph(page, f, GUIDE_COPY[task], x, childY + 12, 152, 11.5, 6.4, "heading");
    text(page, f, "かいとうれい", x, childEnd + 4, 10, "heading");
    const diagramY = childEnd + 12;
    if (234 - diagramY < 43) throw new Error(`Alternative A diagram too short: ${task}`);
    question(page, vi, 0, x, diagramY, 152, 234 - diagramY, true, true);
  } else {
    // A large worked example is the entry point; parent guidance forms a lower panel.
    text(page, f, "やってみよう", x, 52, 17, "heading");
    paragraph(page, f, GUIDE_COPY[task], x, 65, 152, 11.5, 6.4, "heading");
    text(page, f, "かいとうれい", x, 80, 10, "heading");
    question(page, vi, 0, x, 89, 152, 56, true, true);

    rule(page, x, 151, 152);
    const insetX = x + 5, levelsX = x + 72;
    text(page, f, "おうちの方へ", insetX, 157, 12, "heading");
    const parentEnd = paragraph(page, f, TASK_COPY[task].explanation, insetX, 169, 60, 9.5, 5.5);
    let levelY = 157;
    for (const item of taskVolumes) {
      fillRect(page, levelsX, levelY, 14, 6.5, pale);
      text(page, f, `Lv.${item.vol.lv}`, levelsX + 1.5, levelY + 0.7, 9.5, "mono");
      const end = paragraph(page, f, LEVEL_COPY[item.sku], levelsX + 17, levelY, 58, 9, 5.2);
      levelY = end + 4;
    }
    const aimY = Math.max(211, levelY + 1, parentEnd + 4);
    fillRect(page, x, aimY - 3, 152, 22, pale);
    text(page, f, "この課題のねらい", insetX, aimY, 9.5, "heading");
    const aimEnd = paragraph(page, f, TASK_AIM[task], insetX, aimY + 7, 142, 10, 5.5, "heading");
    if (aimEnd > 231) throw new Error(`Alternative B parent panel overflow: ${task}`);
  }
  return page;
}
/** Selected layout for the nine task introductions and their review sample. */
function taskIntroductionRevised(doc: PDFDocument, f: Fonts, vi: number, sample = false) {
  const v = volumes[vi], task = v.set.task;
  const { page, pn, x } = newPage(doc, f, "explanations", "", !sample, sample ? introductionPages.get(vi) : undefined);
  if (pn !== introductionPages.get(vi)) throw new Error("Introduction page mismatch");
  fillRect(page, x, 17, 152, 19, grayscale(0.14));
  text(page, f, String(tasks.indexOf(task) + 1).padStart(2, "0"), x + 5, 23.5, 13, "mono", grayscale(1));
  text(page, f, `${TASK_COPY[task].short}（${task === "solid" ? "立体模写" : v.task.name}）`, x + 23, 21.4, 20, "heading", grayscale(1));

  text(page, f, "れいだい", x, 43, 16, "heading");
  const childEnd = paragraph(page, f, GUIDE_COPY[task], x, 55, 152, 11.5, 6.4, "heading");
  const labelY = Math.max(68.5, childEnd + 2);
  const diagramY = labelY + 9.5, diagramH = task === "solid" ? 63 : 53;
  if (task === "solid") {
    const g = pairGeom(152 * MM, diagramH * MM, "vertical");
    ["しつもん", "かいとう"].forEach((label, side) => {
      const cy = diagramY + (g.oy + side * g.dy + g.pane / 2) / MM;
      fillRect(page, x + 2, cy - 4, 26, 7.5, grayscale(0.88));
      text(page, f, label, x + 3, cy - 2.9, 10.5, "heading");
    });
  } else {
    const paneCount = v.rendered[0].compose ? 3 : 2;
    const pad = Math.min(152, diagramH) * CELL_PAD;
    const g = pairGeom((152 - pad * 2) * MM, (diagramH - pad * 2) * MM,
      "horizontal", paneCount, paneCount === 3 ? 1 : 3.1);
    const center = (side: number) => x + pad + (g.ox + side * g.dx + g.pane / 2) / MM;
    ["しつもん", "かいとう"].forEach((label, side) => {
      const cx = paneCount === 3 && side === 0 ? (center(0) + center(1)) / 2 : center(side === 0 ? 0 : paneCount - 1);
      fillRect(page, cx - 13, labelY, 26, 7.5, grayscale(0.88));
      text(page, f, label, cx - f.heading.widthOfTextAtSize(label, 10.5) / MM / 2, labelY + 1.1, 10.5, "heading");
    });
  }
  question(page, vi, 0, x, diagramY, 152, diagramH, true, true);

  const ruleY = diagramY + diagramH + 4, parentY = ruleY + 6;
  rule(page, x, ruleY, 152);
  fillRect(page, x, parentY, 31, 8, grayscale(0.18));
  text(page, f, "おうちの方へ", x + 3.5, parentY + 1.5, 10, "heading", grayscale(1));
  const parentEnd = paragraph(page, f, TASK_COPY[task].explanation, x, parentY + 12, 152, 9.5, 5.4);
  const levelsEnd = introductionLevelColumns(page, f, task, x, Math.max(parentY + 30, parentEnd + 5), pn);
  const aimY = levelsEnd + 7;
  fillRect(page, x, aimY, 1, 16, grayscale(0.4));
  text(page, f, "この課題のめあて", x + 5, aimY, 10, "heading");
  const aimEnd = paragraph(page, f, TASK_AIM[task], x + 5, aimY + 7, 147, 10, 5.5, "heading");
  if (Math.max(aimEnd, aimY + 16) > 231) throw new Error(`Introduction exceeds content area: ${v.sku}: ${aimEnd.toFixed(1)} mm`);
  return page;
}
async function save(doc: PDFDocument, name: string) {
  // No automatic producer/timestamp metadata or page annotations in print files.
  doc.context.trailerInfo.Info = undefined;
  const bytes = await doc.save({ useObjectStreams: false });
  await fs.writeFile(path.join(OUT, name), bytes);
  return sha(bytes);
}
async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const v of volumes) {
    const file = `web/app/products/problems/published/${v.sku}.json`;
    sources.push({ file, sha256: sha(await fs.readFile(path.join(ROOT, file))) });
  }
  if (REVIEW_SAMPLES) {
    const opening = await makeDocument();
    openingPage(opening.doc, opening.fonts, false);
    await save(opening.doc, "opening-revised.pdf");
    const density = await makeDocument();
    lineDensitySample(density.doc, density.fonts);
    await save(density.doc, "line-density-comparison.pdf");
    console.log(`Wrote ${OUT}: revised opening and one-page density comparison`);
    return;
  }
  if (LINE_DENSITY_40_30_20) {
    const sample = await makeDocument();
    lineDensitySample(sample.doc, sample.fonts, [
      { density: 0.4, label: "A  図形の線 / 黒の濃さ 40％" },
      { density: 0.3, label: "B  図形の線 / 黒の濃さ 30％" },
      { density: 0.2, label: "C  図形の線 / 黒の濃さ 20％" },
    ]);
    await save(sample.doc, "line-density-40-30-20.pdf");
    console.log(`Wrote ${path.join(OUT, "line-density-40-30-20.pdf")}: one problem at 40%, 30%, 20% black`);
    return;
  }
  if (LINE_DENSITY_ALL_ELEMENTS_40_55) {
    for (const density of [0.4, 0.55] as const) {
      const sample = await makeDocument();
      lineDensityAllElementsSample(sample.doc, sample.fonts, density);
      const filename = `line-density-all-elements-${Math.round(density * 100)}.pdf`;
      await save(sample.doc, filename);
      console.log(`Wrote ${path.join(OUT, filename)}: move, rotate and fold, all problem marks at ${Math.round(density * 100)}% black`);
    }
    return;
  }
  if (TENZU_INTRO_ALTERNATIVES) {
    for (const variant of ["a", "b", "c"] as const) {
      const sample = await makeDocument();
      tenzuIntroOption(sample.doc, sample.fonts, variant, 2);
      await save(sample.doc, `tenzu-intro-${variant}.pdf`);
    }
    console.log(`Wrote ${OUT}: three proposed TENZU introduction pages`);
    return;
  }
  if (TENZU_INTRO_REVISED_B) {
    const sample = await makeDocument();
    tenzuIntroOption(sample.doc, sample.fonts, "b2", 2);
    await save(sample.doc, "tenzu-intro-b-revised.pdf");
    console.log(`Wrote ${path.join(OUT, "tenzu-intro-b-revised.pdf")}: revised page B`);
    return;
  }
  if (LAYOUT_SAMPLE) {
    const sample = await makeDocument();
    const vi = volumes.findIndex((v) => v.sku === "fill-lv2-vol1");
    const samplePn = questions.find((q) => q.volumeIndex === vi && q.sourceIndex === 0)!.page;
    problemPage(sample.doc, sample.fonts, vi, 0, 3, false, true);
    const filename = `layout-sample-${String(samplePn).padStart(3, "0")}.pdf`;
    await save(sample.doc, filename);
    console.log(`Wrote ${path.join(OUT, filename)}: one revised problem page`);
    return;
  }
  if (INTRO_SAMPLE) {
    const sample = await makeDocument();
    const vi = volumes.findIndex((v) => v.set.task === "copy");
    taskIntroduction(sample.doc, sample.fonts, vi, true);
    await save(sample.doc, "intro-copy-aim-sample.pdf");
    const layoutCheck = await makeDocument();
    for (const task of tasks) {
      const taskVi = volumes.findIndex((v) => v.set.task === task);
      taskIntroduction(layoutCheck.doc, layoutCheck.fonts, taskVi, true);
    }
    console.log(`Wrote ${path.join(OUT, "intro-copy-aim-sample.pdf")}: one task introduction page`);
    return;
  }
  if (INTRO_REVISED) {
    const sample = await makeDocument();
    const vi = volumes.findIndex((v) => v.set.task === "copy");
    taskIntroductionRevised(sample.doc, sample.fonts, vi, true);
    const layoutCheck = await makeDocument();
    for (const task of tasks) {
      const taskVi = volumes.findIndex((v) => v.set.task === task);
      taskIntroductionRevised(layoutCheck.doc, layoutCheck.fonts, taskVi, true);
    }
    const filename = "intro-design-b-revised.pdf";
    await save(sample.doc, filename);
    console.log(`Wrote ${path.join(OUT, filename)}`);
    return;
  }
  if (INTRO_ALTERNATIVES) {
    const vi = volumes.findIndex((v) => v.set.task === "copy");
    for (const variant of ["a", "b"] as const) {
      const sample = await makeDocument();
      taskIntroductionAlternative(sample.doc, sample.fonts, vi, variant);
      const filename = `intro-design-${variant}.pdf`;
      await save(sample.doc, filename);
      console.log(`Wrote ${path.join(OUT, filename)}`);
    }
    return;
  }
  const { doc, fonts: f } = await makeDocument();
  openingPage(doc, f);
  {
    const { page, x } = newPage(doc, f, "guide", "この本の進め方");
    brandDots(page, x + 1, 30, 145, 10);
    text(page, f, "お子さんの今に合わせて、", x, 48, 18, "heading");
    text(page, f, "好きなところから。", x, 61, 18, "heading");
    paragraph(page, f, "この本は課題の種類ごとに並んでいます。年齢やページの順番にこだわらず、お子さんの書く様子を見ながら選んでください。同じ課題では、Lv.2のあとにLv.3が続きます。", x, 79, 148, 9.5, 5.5);
    const first = questions.find((q) => q.sku === "copy-lv1-vol1")!;
    const routes = [
      ["はじめてなら", `うつす Lv.1（${first.page}ページ）から。たて・よこの線をゆっくり写します。`],
      ["3×3の点に慣れたら", "うつす Lv.2や、気になる課題のLv.2へ。やり方を一緒に読んでから始めましょう。"],
      ["もう少し描けそうなら", "同じ課題のLv.3へ。平面は4×4の点に増えます。最後に立体の問題もあります。"],
    ];
    routes.forEach(([label, body], i) => {
      const y = 112 + i * 33;
      framedRect(page, x, y, 152, 29, i % 2 ? grayscale(1) : grayscale(0.9));
      fillRect(page, x, y, 2, 29, grayscale(0.18));
      text(page, f, `0${i + 1}`, x + 6, y + 5, 12, "mono");
      text(page, f, label, x + 20, y + 4, 11, "heading");
      paragraph(page, f, body, x + 20, y + 13, 124, 8.8, 5);
    });
    text(page, f, "手が止まったら", x, 218, 11, "heading");
    paragraph(page, f, "ひとつ前に戻っても、別の課題を選んでも大丈夫。各課題の最初には書く場所を示した見本があります。答えがある問題は、問題の横のページ番号から確かめられます。", x, 226, 148, 8.4, 4.7);
  }
  {
    const { page, x } = newPage(doc, f, "index", "もくじ / 課題の種類から選ぶ");
    text(page, f, "同じ課題の中で、点の数や線が少しずつ変わります。", x, 29, 9);
    const tableY = 43, headerH = 12, rowH = 19;
    const cols = [0, 42, 78.5, 115, 152];
    fillRect(page, x, tableY, 152, headerH, grayscale(0.16));
    ["課題", "Lv.1  3×3", "Lv.2  3×3", "Lv.3  4×4"].forEach((label, i) =>
      text(page, f, label, x + cols[i] + 3, tableY + 3.5, 8.5, "heading", grayscale(1)));
    tasks.forEach((task, ti) => {
      const y = tableY + headerH + ti * rowH;
      if (ti % 2 === 0) fillRect(page, x, y, 152, rowH, grayscale(0.9));
      const v = volumes.find((item) => item.set.task === task)!;
      text(page, f, String(ti + 1).padStart(2, "0"), x + 2.5, y + 4, 8, "mono");
      text(page, f, TASK_COPY[task].short, x + 11, y + 3.2, 10.5, "heading");
      text(page, f, task === "solid" ? "立体模写" : v.task.name, x + 11, y + 11.5, 7.5);
      for (let lv = 1; lv <= 3; lv++) {
        const vi = volumes.findIndex((item) => item.set.task === task && item.vol.lv === lv);
        if (vi < 0) continue;
        const qs = questions.filter((q) => q.volumeIndex === vi);
        const cx = x + cols[lv] + 3;
        text(page, f, `${qs[0].number}〜${qs[11].number}問`, cx, y + 3.2, 8.7, "heading");
        text(page, f, `${qs[0].page}〜${qs[11].page}ページ`, cx, y + 11.5, 7.8);
      }
      page.drawLine({ start: { x: (x + 0.3) * MM, y: page.getHeight() - (y + rowH) * MM },
        end: { x: (x + 151.7) * MM, y: page.getHeight() - (y + rowH) * MM },
        thickness: BOOK.minLineMm * MM, color: grayscale(0.68) });
    });
    for (const c of cols.slice(1, -1)) page.drawLine({
      start: { x: (x + c) * MM, y: page.getHeight() - tableY * MM },
      end: { x: (x + c) * MM, y: page.getHeight() - (tableY + headerH + 9 * rowH) * MM },
      thickness: BOOK.minLineMm * MM, color: grayscale(0.68),
    });
    text(page, f, "※ りったいは9×9の点を使います。", x, 233, 8.5);
  }
  tenzuIntroOption(doc, f, "b2", undefined, true);
  for (let vi = 0; vi < volumes.length; vi++) {
    const v = volumes[vi], pp = v.set.task === "solid" ? 1 : 3;
    if (introductionPages.has(vi)) taskIntroductionRevised(doc, f, vi);
    for (let pi = 0; pi < 12; pi += pp) problemPage(doc, f, vi, pi, pp);
  }
  for (const { v, vi } of answerVolumes) {
    const { page, x } = newPage(doc, f, "answers", `答え / ${v.task.name} Lv.${v.vol.lv}`);
    text(page, f, "同じ点を結べているか、線のつながりを確かめましょう。", x, 28, 9);
    for (let pi = 0; pi < 12; pi++) {
      const q = questions.find((q) => q.volumeIndex === vi && q.sourceIndex === pi)!;
      const xx = x + (pi % 3) * 51, yy = 43 + Math.floor(pi / 3) * 46;
      text(page, f, `第${q.number}問 / p.${q.page}`, xx, yy, 8.5);
      solution(page, vi, pi, xx, yy + 7, 47, 35);
    }
  }
  {
    const { page, x } = newPage(doc, f, "about", "TENZUについて");
    brandDots(page, x + 1, 35, 145, 10);
    text(page, f, "見て、考えて、書く力を、", x, 43, 20, "heading");
    text(page, f, "点描写から。", x, 57, 20, "heading");
    paragraph(page, f, "TENZUは、点図形（点描写）プリントの専門店です。形を写す、動かす、重ねる。点の位置を考えながら線を引く時間を、家庭で無理なく続けられるように。", x, 95, 145, 10.5, 6.3);
    framedRect(page, x, 136, 152, 64, grayscale(0.9));
    fillRect(page, x, 136, 3, 64, grayscale(0.18));
    text(page, f, "もっと難しい問題へ。", x + 8, 143, 15, "heading");
    paragraph(page, f, "この本より難しい問題も、課題とレベルを選んで探せます。年齢にこだわらず、お子さんの手ごたえを見ながらどうぞ。", x + 8, 156, 96, 9, 5.2);
    text(page, f, "tenzu.jp/products", x + 8, 185, 10, "mono");
    drawQrProducts(page, x + 113, 145, 32);
    text(page, f, "WEB版はこちら", x + 113, 180, 8, "heading");
    text(page, f, BOOK.title, x, 202, 10, "heading");
    text(page, f, BOOK.subtitle, x, 210, 8);
    text(page, f, `著者・編集・発行 TENZU / 初版 改訂${BOOK_216.edition} / 2026年10月`, x, 218, 7.5);
    text(page, f, "© 2026 TENZU. All rights reserved. お問い合わせ：tenzu.jp/contact", x, 226, 7.5);
    paragraph(page, f, "本書と特典PDFの転載・再配布・販売を禁じます。特典PDFは購入者の家庭内で、きょうだいと何度でも印刷して使えます。教室等での利用はお問い合わせください。", x, 233, 132, 7.5, 3.8);
  }
  if (contentPageCount % 2) {
    doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
    pageKinds.push("blank");
  }
  if (doc.getPageCount() !== pageCount) throw new Error("Actual page count differs");
  const interiorHash = await save(doc, "interior.pdf");
  const spine = pageCount * BOOK.whitePaperSpineMmPerPage, b = BOOK.bleedMm;
  const cw = KDP_B5.w * 2 + b * 2 + spine, ch = KDP_B5.h + b * 2;
  const front = b + KDP_B5.w + spine, fx = front + 16, bx = b + 16;
  // Entire lower back-cover band stays blank for KDP's automatic barcode.
  const barcode = { x: b, y: ch - b - 43, width: KDP_B5.w, height: 43 };
  const coverHashes: Record<string, string> = {};
  // Cover design is owner-managed. Legacy comparisons require an explicit opt-in.
  const withCoverComparisons = process.argv.includes("--with-cover-comparisons");
  const coverSamples = withCoverComparisons ? tasks.map((task) => {
    const vi = volumes.findIndex((v) => v.set.task === task);
    const pi = 1;
    return { task, volumeIndex: vi, sourceIndex: pi, sku: volumes[vi].sku, sourceId: volumes[vi].set.problems[pi].id };
  }) : [];
  if (withCoverComparisons) for (const variant of ["a", "b", "c"] as const) {
    const { doc: cover, fonts: cf } = await makeDocument();
    const cp = cover.addPage([cw * MM, ch * MM]);
    if (variant === "b") {
      const teal = rgb(0x0c / 255, 0x54 / 255, 0x70 / 255);
      fillRect(cp, b + KDP_B5.w, 0, spine + KDP_B5.w + b, ch, teal);
    }
    // The same lower-back barcode space and spine remain clear in all three wraps.
    text(cp, cf, "TENZU", bx, 22, 11, "heading");
    rule(cp, bx, 35, 148);
    text(cp, cf, "写すだけで終わらない、", bx, 43, 17, "heading");
    text(cp, cf, "点図形（点描写）の本。", bx, 57, 17, "heading");
    paragraph(cp, cf, "点を結ぶところから、向きを変えたり、形を重ねたり。9種類の課題を、少しずつ進められる順にまとめました。", bx, 77, 148, 9.5, 6);
    if (variant === "b") {
      text(cp, cf, "少しずつ、できることをふやしていく。", bx, 101, 11, "heading");
      const stages = [
        { sku: "copy-lv1-vol1", title: "Lv.1  まっすぐな線を写す" },
        { sku: "rotate-lv2-vol1", title: "Lv.2  向きや位置を考える" },
        { sku: "overlay-lv3-vol1", title: "Lv.3  点が増えた形へ" },
      ];
      stages.forEach(({ sku, title }, i) => {
        const yy = 116 + i * 29, vi = volumes.findIndex((v) => v.sku === sku);
        rule(cp, bx, yy - 5, 148);
        text(cp, cf, title, bx, yy + 6, 9.5);
        solution(cp, vi, 1, bx + 109, yy, 30, 20, 0.12);
      });
    } else {
      text(cp, cf, "この本で出会う9つの課題", bx, 101, 11, "heading");
      tasks.forEach((task, i) => {
        const vi = volumes.findIndex((v) => v.set.task === task);
        const xx = bx + (i % 3) * 51, yy = 116 + Math.floor(i / 3) * 29;
        solution(cp, vi, 0, xx + 4, yy, 34, 20, 0.12);
        text(cp, cf, volumes[vi].task.name, xx + 2, yy + 20, 8.5);
      });
    }
    paragraph(cp, cf, "3×3から4×4へ。最後は9×9の立体にも。\nLv.1〜3・全216問。課題別の説明と答え付き。", bx, 206, 148, 8.5, 5.2);
    if (variant === "a") {
      text(cp, cf, "TENZU", fx, 22, 11, "heading");
      rule(cp, fx, 34, 148);
      text(cp, cf, "4才〜6才向け 図形を考える本", fx, 43, 11);
      text(cp, cf, "点図形（点描写）", fx, 60, 29, "heading");
      text(cp, cf, "写す、その先へ。", fx, 85, 17, "heading");
      const rotate = volumes.findIndex((v) => v.set.task === "rotate" && v.vol.lv === 2);
      text(cp, cf, "たとえば、形の向きを変える。", fx, 109, 10);
      question(cp, rotate, 0, fx, 119, 148, 53, false, false, 0.12);
      rule(cp, fx, 179, 148);
      text(cp, cf, "216問", fx, 188, 39, "heading");
      text(cp, cf, "9種類の課題  /  Lv.1〜3", fx, 218, 11);
      text(cp, cf, "見て、考えて、書く。", fx, 235, 10);
      text(cp, cf, "点図形（点描写）プリントの専門店", fx, 249, 8);
    } else if (variant === "b") {
      const teal = rgb(0x0c / 255, 0x54 / 255, 0x70 / 255);
      const cream = rgb(0xfa / 255, 0xf8 / 255, 0xf3 / 255);
      const paleBlue = rgb(0xe5 / 255, 0xf0 / 255, 0xf3 / 255);
      const orange = rgb(0xf0 / 255, 0x7c / 255, 0x29 / 255);
      const white = rgb(1, 1, 1);
      const cx = front + 9, cardW = 164;
      fillRect(cp, cx, 9, cardW, 63, cream);
      text(cp, cf, "TENZU", cx + 7, 14, 13, "heading", teal);
      fillRect(cp, cx + 108, 14, 49, 10, orange);
      text(cp, cf, "4才〜6才向け", cx + 112, 15.5, 10, "body", white);
      text(cp, cf, "点図形（点描写）", cx + 7, 27, 40, "heading", teal);
      text(cp, cf, "はじめての子も、Lv.1から。", cx + 7, 54, 18, "heading", teal);
      text(cp, cf, "9種類の問題を、1冊に。", cx, 74, 16, "heading", white);
      text(cp, cf, "収録問題の完成図から", cx + 108, 77, 7.5, "body", white);
      coverSamples.forEach(({ task, volumeIndex, sourceIndex }, i) => {
        const xx = cx + (i % 3) * 55.5, yy = 86 + Math.floor(i / 3) * 44.5;
        fillRect(cp, xx, yy, 53, 42, white);
        fillRect(cp, xx, yy, 53, 8.5, paleBlue);
        cp.drawCircle({ x: (xx + 5.2) * MM, y: cp.getHeight() - (yy + 4.25) * MM,
          size: 3.1 * MM, color: teal });
        text(cp, cf, String(i + 1), xx + 4.15, yy + 1.45, 8, "mono", white);
        text(cp, cf, TASK_COPY[task].short, xx + 10, yy + 1.4, 10, "heading", teal);
        solution(cp, volumeIndex, sourceIndex, xx + 4, yy + 9.5, 45, 30.5, 0.12);
      });
      text(cp, cf, "Lv.1からLv.3へ", cx, 226, 17, "heading", white);
      text(cp, cf, "まっすぐ → 動かす・重ねる → 点がふえる", cx, 241, 9.5, "body", white);
      text(cp, cf, "点図形（点描写）プリントの専門店", cx, 252, 7.5, "body", white);
      cp.drawCircle({ x: (cx + 149) * MM, y: cp.getHeight() - 242 * MM,
        size: 13 * MM, color: orange });
      text(cp, cf, "216", cx + 137.3, 235.7, 22, "heading", white);
      text(cp, cf, "問", cx + 151.5, 246, 9, "heading", white);
    } else {
      text(cp, cf, "TENZU", fx, 22, 11, "heading");
      text(cp, cf, "点図形（点描写）", fx, 42, 27, "heading");
      text(cp, cf, "小さな一歩から、", fx, 68, 17, "heading");
      text(cp, cf, "いろいろな形へ。", fx, 84, 17, "heading");
      const stages = [
        { task: "copy", label: "写す", level: 1 },
        { task: "rotate", label: "動かす", level: 2 },
        { task: "overlay", label: "重ねる", level: 3 },
      ];
      stages.forEach(({ task, label, level }, i) => {
        const vi = volumes.findIndex((v) => v.set.task === task && v.vol.lv === level);
        const yy = 111 + i * 37;
        rule(cp, fx, yy - 5, 148);
        text(cp, cf, `${i + 1}  ${label}`, fx, yy + 8, 13, "heading");
        question(cp, vi, 0, fx + 66, yy, 82, 31, false, false, 0.12);
      });
      rule(cp, fx, 221, 148);
      text(cp, cf, "全216問  /  9種類の課題", fx, 229, 15, "heading");
      text(cp, cf, "Lv.1〜3  ・  4才〜6才向け", fx, 249, 8);
    }
    const filename = variant === "b" ? "cover.pdf" : `cover-${variant}.pdf`;
    coverHashes[variant === "b" ? "cover" : `cover-${variant}`] = await save(cover, filename);
  }
  const fonts = await Promise.all(FONT_FILES.map(async ([role, filename, folder]) => ({ role, filename,
    sha256: sha(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts", filename))),
    license: "SIL Open Font License 1.1", url: `https://github.com/google/fonts/tree/main/ofl/${folder}`,
  })));
  const trial = await makeDocument();
  for (const sku of ["copy-lv2-vol1", "overlay-lv2-vol1"]) {
    const vi = volumes.findIndex((v) => v.sku === sku);
    problemPage(trial.doc, trial.fonts, vi, 0, 3, true);
  }
  const trialHash = await save(trial.doc, "three-per-page-preview.pdf");
  await fs.writeFile(path.join(OUT, "manifest.json"), JSON.stringify({ book: BOOK, pageCount, questions,
    introductionPages: Object.fromEntries(introductionPages), levelColumnRegions,
    levelNotes: Object.fromEntries(volumes.map((v) => [v.sku, LEVEL_COPY[v.sku]])), guideNotes: GUIDE_COPY, answerStart, answerCount: answerVolumes.length * 12,
    pageKinds, sources, fonts, coverSamples, pdfs: { interior: interiorHash, ...coverHashes, "three-per-page-preview": trialHash },
    interiorMm: KDP_B5, coverMm: { width: cw, height: ch, spine, bleed: b, barcodeBlank: barcode },
  }, null, 2) + "\n");
  console.log(`Wrote ${OUT}: ${pageCount} pages, ${questions.length} questions; ${withCoverComparisons ? "legacy cover comparisons included" : "interior only; cover untouched"}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
