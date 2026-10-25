/** npx tsx scripts/export-kdp-series.ts --book first|second [--out PATH]
 * Interior of the two-book series (kdp-paperback §1–§2). The 216-problem book stays in export-kdp-book.ts. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PDFDocument, PDFDict, PDFName, PDFRef, grayscale, type Color, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PUBLISHED } from "../app/products/problems/published";
import { volBySku, LAUNCH_TASKS, LEVEL_NAMES } from "../app/products/data";
import { KDP_B5, pairGeom, CELL_PAD } from "../app/products/print";
import { toRenderProblems, resultEdgesOf } from "../app/products/problems/render";
import { paintProblemPdf, paintGridPdf, paintGuideGridPdf } from "../app/products/problems/pdf-render";
import { BOOK, SERIES, TASK_COPY, TASK_AIM, GUIDE_COPY, LEVEL_COPY, FONT_FILES, type SeriesSlot } from "./kdp/book";
import { PAGE_COPY, SHARED_COPY, STAGE_COPY, STAGE_COPY_UTSUSU, DESIGN_COPY, PRINT_OPTIONS, type Box } from "./kdp/series-pages";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argOf = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const bookArg = argOf("--book");
if (bookArg !== "first" && bookArg !== "second") throw new Error("Pass --book first|second");
const which: "first" | "second" = bookArg;
const SB = SERIES[which], OTHER = SERIES[which === "first" ? "second" : "first"];
const OUT = argOf("--out") ? path.resolve(argOf("--out")!) : path.join(ROOT, "docs/drafts/kdp", SB.id);
const MM = 72 / 25.4, LINE = BOOK.minLineMm;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const fw = (s: string | number) => String(s).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
type Fonts = Record<"heading" | "body" | "mono" | "bold", PDFFont>;
type Stage = Extract<SeriesSlot, { kind: "stage" }>;
const ink = grayscale(0.08);

const skusOf = (slots: readonly SeriesSlot[]) => slots.flatMap((s) => s.kind === "stage" ? [s.sku] : []);
const shared = skusOf(SB.slots).filter((s) => skusOf(OTHER.slots).includes(s));
if (shared.length) throw new Error(`Volumes appear in both books: ${shared.join(", ")}`);

/* Volumes in book order. Problems inside a volume are re-sorted by D ascending; ties keep the source order. */
const volumes = SB.slots.filter((s): s is Stage => s.kind === "stage").map((stage) => {
  // A planned volume is drawn from a stand-in and marked on the page until it is published; once published it is used as is.
  const planned = stage.source === null && !PUBLISHED[stage.sku];
  const dataSku = planned ? stage.standIn! : stage.sku;
  const set = PUBLISHED[dataSku], hit = volBySku(dataSku);
  if (!set || !hit || set.problems.length !== 12) throw new Error(`Missing 12-problem volume: ${dataSku}`);
  const order = set.problems.map((p, i) => {
    if (!p.difficulty || !Number.isFinite(p.difficulty.value)) throw new Error(`D missing: ${p.id}`);
    return { p, i, d: p.difficulty.value };
  }).sort((a, b) => a.d - b.d || a.i - b.i);
  const sorted = { ...set, problems: order.map((o) => o.p) };
  const g = set.problems[0].grid;
  return { ...stage, ...hit, vol: { ...hit.vol, lv: stage.lv ?? hit.vol.lv, volNo: stage.volNo ?? hit.vol.volNo }, planned, dataSku,
    set: sorted, sourceIndex: order.map((o) => o.i), rendered: toRenderProblems(sorted),
    grid: g.type === "square" ? `${g.n}×${g.n}` : `${g.cols}×${g.rows}` };
});
const tasks = [...new Set(volumes.map((v) => v.set.task))];
const short = (task: string) => TASK_COPY[task].short;
const taskName = (vi: number) => volumes[vi].set.task === "solid" ? "立体模写" : volumes[vi].task.name;
const explanation = (task: string) => SB.explanation[task] ?? TASK_COPY[task].explanation;
/** Stage label: the first book changes task and board within a level, so it names both. */
const stageLabel = (vi: number) => which === "first"
  ? `${short(volumes[vi].set.task)} レベル${fw(volumes[vi].vol.lv)}`
  : `レベル${fw(volumes[vi].vol.lv)}`;
/** A level with only Vol.1 in this book is named without the Vol (Lv.1, Lv.2); Lv.3 and Lv.4 keep Vol.1/Vol.2. */
const hasVol2 = (lv: number) => volumes.some((v) => v.vol.lv === lv && v.vol.volNo > 1);
const volSuffix = (lv: number, volNo: number) => hasVol2(lv) ? ` Vol.${volNo}` : "";
/** Web label of a volume, e.g. "Lv.3 Vol.2"; the book follows the Web numbering. */
const lvLabel = (vi: number) => `Lv.${volumes[vi].vol.lv}${volSuffix(volumes[vi].vol.lv, volumes[vi].vol.volNo)}`;
/** Book 1 pairs the たす and うつす volumes of one level; the pair shares an explanation page. */
const pairKey = (vi: number) => `${volumes[vi].vol.lv}-${volumes[vi].vol.volNo}`;
const pairStart = (vi: number) => vi === 0 || pairKey(vi - 1) !== pairKey(vi);
/** Where an explanation page goes: before every volume, before each Lv・Vol pair, or before each task. */
const introKey = (vi: number) => SB.stageIntro === "volume" ? volumes[vi].sku : SB.stageIntro ? pairKey(vi) : volumes[vi].set.task;
const introStart = (vi: number) => SB.stageIntro === "volume" || (SB.stageIntro ? pairStart(vi) : volumes.findIndex((v) => v.set.task === volumes[vi].set.task) === vi);

/** Problems drawn on the volume's explanation page: every explanation after the book's first one carries them. */
const leadProblems = (vi: number) => SB.introProblems && vi > 0 && introStart(vi) ? SB.introProblems : 0;

/* ---- Pagination: every page number is fixed before drawing so cross references can be printed. */
type PageKind = { kind: string; ref?: string };
const pages: PageKind[] = [];
const at = (kind: string, ref?: string) => { pages.push({ kind, ref }); return pages.length; };
const introPage = new Map<string, number>();
const extraPage = new Map<string, number>();
const answerVolumes = volumes.map((v, vi) => ({ v, vi })).filter(({ v }) => !SB.omitAnswerTasks.includes(v.set.task));
const questions: { number: number; sku: string; sourceId: string; sourceIndex: number; volumeIndex: number; position: number;
  task: string; level: number; volNo: number; grid: string; difficulty: number; page: number; answerPage: number | null; planned: boolean }[] = [];
let vi = 0, answerStart = 0;
for (const slot of SB.slots) {
  if (slot.kind === "stage") {
    const v = volumes[vi], lead = leadProblems(vi);
    if (introStart(vi)) introPage.set(introKey(vi), at("explanations", v.sku));
    v.set.problems.forEach((p, i) => {
      const pn = i < lead ? pages.length : (i - lead) % slot.perPage === 0 ? at("problems", v.sku) : pages.length;
      questions.push({ number: questions.length + 1, sku: v.sku, sourceId: p.id, sourceIndex: v.sourceIndex[i], volumeIndex: vi,
        position: i, task: v.set.task, level: v.vol.lv, volNo: v.vol.volNo, grid: v.grid, difficulty: p.difficulty!.value, page: pn,
        answerPage: null, planned: v.planned });
    });
    vi++;
  } else if (slot.kind === "answers") {
    answerStart = pages.length + 1;
    answerVolumes.forEach(({ v, vi }) => {
      const pn = at("answers", v.sku);
      questions.filter((q) => q.volumeIndex === vi).forEach((q) => { q.answerPage = pn; });
    });
  } else if (slot.kind === "extra") {
    if (slot.spread && (pages.length + 1) % 2) throw new Error(`Spread must start on an even page: ${slot.id} at ${pages.length + 1}`);
    extraPage.set(slot.id, pages.length + 1);
    for (let i = 0; i < slot.pages; i++) at("extra", slot.id);
  } else at(slot.kind);
}
if (answerVolumes.length && !answerStart) throw new Error("Answers slot missing");
if (pages.length !== SB.total || pages.length % 2 || pages.length > 110)
  throw new Error(`Page count ${pages.length} differs from the plan (${SB.total})`);
const pageOf = (kind: string) => pages.findIndex((p) => p.kind === kind) + 1;
// Designed pages carry printed page references, so the plan must put exactly those pages where the design has them.
if (SB.design) {
  // Other non-problem pages may be drawn by the exporter; a designed page must never land on a problem or explanation.
  const wrong = SB.design.pages.filter((pn) => !pages[pn - 1] || pages[pn - 1].kind === "problems" || pages[pn - 1].kind === "explanations");
  if (wrong.length) throw new Error(`Designed pages ${wrong.join()} fall on problem pages in the plan`);
}
const qrUrl = `https://tenzu.jp/book/${SB.slug}`;
/** Every printed QR, with where it sits (mm), for the manifest and the module check. */
const qrCodes: { page: number; url: string; x: number; y: number; side: number; modules: number }[] = [];
/** Every QR carries the book and its page, so GA4 shows which page a visit came from. The printed URL stays short. */
const tracked = (url: string, pn: number) =>
  `${url}${url.includes("?") ? "&" : "?"}utm_source=kdp&utm_medium=book&utm_campaign=${SB.slug}&utm_content=p${pn}`;

/* ---- Drawing primitives (same conventions as export-kdp-book.ts). */
let doc: PDFDocument, f: Fonts, logoImage: PDFImage;
function text(page: PDFPage, s: string, x: number, top: number, size = 10, face: keyof Fonts = "body", color: Color = ink) {
  const chars = f[face].getCharacterSet();
  for (const ch of s) if (!chars.includes(ch.codePointAt(0)!)) throw new Error(`Missing ${face} glyph: ${ch}`);
  page.drawText(s, { x: x * MM, y: page.getHeight() - top * MM - size, size, font: f[face], color });
}
const widthMm = (s: string, size: number, face: keyof Fonts = "heading") => f[face].widthOfTextAtSize(s, size) / MM;
function fillRect(page: PDFPage, x: number, y: number, w: number, h: number, color: Color) {
  page.drawRectangle({ x: x * MM, y: page.getHeight() - (y + h) * MM, width: w * MM, height: h * MM, color });
}
function framedRect(page: PDFPage, x: number, y: number, w: number, h: number, fill: Color = grayscale(1)) {
  const inset = LINE / 2;
  page.drawRectangle({ x: (x + inset) * MM, y: page.getHeight() - (y + h) * MM, width: (w - 2 * inset) * MM, height: h * MM,
    color: fill, borderColor: grayscale(0.42), borderWidth: LINE * MM });
}
function wrap(s: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of s.split("\n")) {
    let cur = "";
    for (const c of para) {
      if (cur && font.widthOfTextAtSize(cur + c, size) > width * MM) {
        const run = /[0-9０-９°×]/.test(c) ? cur.match(/[0-9０-９°×]+$/)?.[0] ?? "" : "";
        // A closing mark never starts a line: carry the trailing closers (e.g. "）」") and the character before them.
        const carry = /[、。，．！？）」』】]/.test(c) ? cur.match(/[、。，．！？）」』】]*$/)![0].length + 1
          : /[（「『【]$/.test(cur) ? 1 : 0; // nor does an opening mark end one
        if (carry && cur.length > carry) { lines.push(cur.slice(0, -carry)); cur = cur.slice(-carry); }
        else if (run && run.length < cur.length) { lines.push(cur.slice(0, -run.length)); cur = run; } // keep "45°" and "5×5" whole
        else { lines.push(cur); cur = ""; }
      }
      cur += c;
    }
    lines.push(cur);
  }
  return lines;
}
function paragraph(page: PDFPage, s: string, x: number, y: number, width = 150, size = 10, lineMm = 6, face: keyof Fonts = "body") {
  const lines = wrap(s, f[face], size, width);
  lines.forEach((l, i) => text(page, l, x, y + i * lineMm, size, face));
  return y + lines.length * lineMm;
}
function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: Color = ink) {
  page.drawLine({ start: { x: x1 * MM, y: page.getHeight() - y1 * MM }, end: { x: x2 * MM, y: page.getHeight() - y2 * MM },
    thickness: LINE * MM, color });
}
function rule(page: PDFPage, x: number, y: number, w: number) {
  page.drawLine({ start: { x: (x + 0.3) * MM, y: page.getHeight() - y * MM }, end: { x: (x + w - 0.3) * MM, y: page.getHeight() - y * MM },
    thickness: LINE * MM, color: grayscale(0.5), dashArray: [1.5 * MM, 1.5 * MM] });
}
function brandDots(page: PDFPage, x: number, y: number, w: number, h: number) {
  for (let py = y; py <= y + h; py += 5) for (let px = x; px <= x + w; px += 5)
    page.drawCircle({ x: px * MM, y: page.getHeight() - py * MM, size: 0.2 * MM, color: grayscale(0.88) });
}
const qrCode = createRequire(import.meta.url)("qrcode") as {
  create: (url: string, options: { errorCorrectionLevel: "M" }) => { modules: { size: number; data: Uint8Array } };
};
function qr(page: PDFPage, url: string, x: number, y: number, side: number) {
  const pn = doc.getPages().indexOf(page) + 1;
  if (pn < 1) throw new Error(`QR on a page outside the book: ${url}`);
  const m = qrCode.create(tracked(url, pn), { errorCorrectionLevel: "M" }).modules;
  qrCodes.push({ page: pn, url: tracked(url, pn), x, y, side, modules: m.size });
  fillRect(page, x, y, side, side, grayscale(1));
  const unit = side / (m.size + 8);
  for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++)
    if (m.data[r * m.size + c]) fillRect(page, x + (c + 4) * unit, y + (r + 4) * unit, unit, unit, grayscale(0));
}
/** The TENZU horizontal lockup, right-aligned at `right` (mm); returns its bottom. The image is the ink master turned grey
 * for the black-ink interior (visual-identity §5.1). §5.3 sets 8 mm as the smallest height, so at least 24.2 mm wide. */
function logo(page: PDFPage, right: number, y: number, w = 27) {
  const h = w * logoImage.height / logoImage.width;
  if (h < 8) throw new Error(`Logo below its minimum size: ${h.toFixed(1)} mm tall`);
  // The master is 332 px wide; KDP wants 300 dpi, so it is never printed wider than 28 mm.
  if (logoImage.width / (w / 25.4) < 300) throw new Error(`Logo under 300 dpi at ${w} mm`);
  page.drawImage(logoImage, { x: (right - w) * MM, y: page.getHeight() - (y + h) * MM, width: w * MM, height: h * MM });
  return y + h;
}
/** The line that says what TENZU is; visual-identity §5.3 wants it beside the logo where the page does not say it. */
const SHOP_PHRASE = "点図形（点描写）プリントの専門店";
const left = (pn: number) => pn % 2 ? BOOK.margins.inside : BOOK.margins.outside;
/** Right end of the designed pages' header (TENZU). */
const frameRight = (pn: number) => pn % 2 ? 167.9 : 164;
/** Every page number ends 14.1 mm from the paper's right edge, odd or even page. design-pages.py folio_at matches it. */
const FOLIO_RIGHT = 167.9, FOLIO_SIZE = 10, FOLIO_BASELINE = 247.1;
/** The page number, "P12", flush right at the same place on the paper on every page. */
function folio(page: PDFPage, pn: number) {
  const n = `P${pn}`;
  text(page, n, FOLIO_RIGHT - widthMm(n, FOLIO_SIZE, "mono"), FOLIO_BASELINE - FOLIO_SIZE / MM, FOLIO_SIZE, "mono", grayscale(0.4));
}
function newPage(heading: string, compact = false) {
  const page = doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
  const pn = doc.getPageCount(), x = left(pn);
  if (heading) text(page, heading, x, compact ? 7 : 17, 10);
  folio(page, pn);
  return { page, pn, x };
}
function expect(kind: string, pn: number) {
  if (pages[pn - 1]?.kind !== kind) throw new Error(`Page ${pn} drawn as ${kind}, planned ${pages[pn - 1]?.kind}`);
}

/* ---- Problems. One per page stacks model above the answer area; two and three per page sit side by side. */
function question(page: PDFPage, vi: number, pi: number, x: number, y: number, w: number, h: number, vertical: boolean, answerGuide = false) {
  const v = volumes[vi], p = v.set.problems[pi];
  if (p.grid.type === "solid") {
    const g = pairGeom(w * MM, h * MM, "vertical");
    for (let side = 0; side < 2; side++) {
      const cell = { x: x * MM + g.ox, y: y * MM + g.oy + side * g.dy, width: g.pane, height: g.pane };
      paintGridPdf(page, cell, p.grid.cols, p.grid.rows, side ? [] : p.solidEdges ?? [], { minLineMm: LINE, inkGray: 0.6 });
      if (side && answerGuide) paintGuideGridPdf(page, cell, p.grid.cols, p.grid.rows, p.solidEdges ?? [], LINE);
    }
    return;
  }
  const compose = Boolean(v.rendered[pi].compose);
  paintProblemPdf(page, v.rendered[pi], { x: x * MM, y: y * MM, width: w * MM, height: h * MM }, vertical ? "vertical" : "horizontal",
    { minLineMm: LINE, monochrome: true, dotScale: 1, inkGray: 0.6, gapScale: compose ? 1 : vertical ? 1.6 : 3.1,
      markerMaxPaneRatio: 0.23, answerGuide });
}
/** Planar pane size in mm for the manifest, from the same geometry the renderer uses. */
function paneMm(vi: number, w: number, h: number, vertical: boolean) {
  const v = volumes[vi];
  if (v.set.problems[0].grid.type === "solid") return pairGeom(w * MM, h * MM, "vertical").pane / MM;
  const pad = Math.min(w, h) * CELL_PAD, compose = Boolean(v.rendered[0].compose);
  return pairGeom((w - pad * 2) * MM, (h - pad * 2) * MM, vertical ? "vertical" : "horizontal", compose ? 3 : 2,
    compose ? 1 : vertical ? 1.6 : 3.1).pane / MM;
}
const PROBLEM_TOP = 32, PROBLEM_BOTTOM = 236, BOTTOM = 236;
const paneSizes: Record<string, number> = {};
function transition(page: PDFPage, x: number, from: string, to: string) {
  const gray = grayscale(0.55), right = x + 151.7, toW = widthMm(to, 12.5), fromW = widthMm(from, 9.5);
  const toX = right - toW, arrowEnd = toX - 2.5, fromX = arrowEnd - 10 - fromW;
  if (fromX < x + 40) throw new Error(`Transition heading too wide: ${from} → ${to}`);
  text(page, from, fromX, 8.6, 9.5, "heading", gray);
  line(page, arrowEnd - 8, 13, arrowEnd, 13, gray);
  line(page, arrowEnd - 2, 11.3, arrowEnd, 13, gray);
  line(page, arrowEnd - 2, 14.7, arrowEnd, 13, gray);
  text(page, to, toX, 7.7, 12.5, "heading");
  line(page, toX, 17.5, right, 17.5);
}
function problemPage(vi: number, pi: number) {
  const v = volumes[vi], perPage = v.perPage;
  // A stage that does not open right after its task introduction shows "previous → next" instead.
  const continues = pi === 0 && vi > 0 && pages[doc.getPageCount() - 1]?.kind !== "explanations";
  const { page, pn, x } = newPage(continues ? taskName(vi) : `${taskName(vi)} / ${lvLabel(vi)}・${v.grid}`, true);
  if (v.planned && !continues) text(page, "準備中：仮の問題", x + 120, 7, 8.5, "heading", grayscale(0.5));
  expect("problems", pn);
  if (continues) transition(page, x, stageLabel(vi - 1), stageLabel(vi));
  text(page, TASK_COPY[v.set.task].instruction, x, 19, 11, "heading");
  problemRows(page, pn, vi, pi, perPage, x, PROBLEM_TOP, (PROBLEM_BOTTOM - PROBLEM_TOP) / perPage);
  if (pi + perPage === 12) {
    const next = volumes[vi + 1];
    const copy = !next ? "さいごまで できたね！ おつかれさま＾＾"
      : next.set.task !== v.set.task && which === "second" ? `${short(v.set.task)}は ここまで、おつかれさま＾＾`
      : `おつかれさま＾＾ つぎは「${which === "first" ? `${short(next.set.task)} ` : ""}レベル${fw(next.vol.lv)}」だよ！`;
    const w = widthMm(copy, 12);
    if (w > 152) throw new Error(`Farewell exceeds page: ${copy}`);
    text(page, copy, x + (152 - w) / 2, 238.5, 12, "heading");
  }
}

/** Problems pi.. stacked from top, each in a band of `step` mm with its number, position and answer page. */
function problemRows(page: PDFPage, pn: number, vi: number, pi: number, count: number, x: number, top: number, step: number, ruleW = 152) {
  const v = volumes[vi], vertical = v.perPage === 1;
  // Every problem of a volume is drawn in the problem pages' cell, centred in its band, so the panes match in size.
  const cellH = (PROBLEM_BOTTOM - PROBLEM_TOP) / v.perPage - 11;
  for (let j = 0; j < count; j++) {
    const q = questions.find((q) => q.volumeIndex === vi && q.position === pi + j)!;
    if (q.page !== pn) throw new Error(`Wrong page: ${q.number}`);
    const y = top + j * step, number = `${q.number}ばん`;
    text(page, number, x, y, 12, "heading");
    text(page, `（${q.position + 1}／12）`, x + widthMm(number, 12) + 2.5, y + 1, 10.5, "heading");
    if (q.answerPage !== null) text(page, `こたえ ${q.answerPage}ページ`, x + 109, y + 1, 8.5);
    question(page, vi, pi + j, x + (ruleW - 152) / 2, y + 8 + (step - 11 - cellH) / 2, 152, cellH, vertical);
    paneSizes[v.sku] ??= Math.round(paneMm(vi, 152, cellH, vertical) * 10) / 10;
    if (j < count - 1) rule(page, x, y + step - 2, ruleW);
  }
}

/* ---- Task introduction: worked example, parent note, level list, aim. */
/** Worked example shared by task and stage introductions: child prompt, labels and the solved first problem. */
function workedExample(page: PDFPage, vi: number, x: number, top: number, w = 152, planeH = 53) {
  const v = volumes[vi], task = v.set.task;
  text(page, "れいだい", x, top, 16, "heading");
  const childEnd = paragraph(page, GUIDE_COPY[task], x, top + 12, w, 11.5, 6.4, "heading");
  const labelY = Math.max(top + 25.5, childEnd + 2);
  const diagramY = labelY + 9.5, diagramH = task === "solid" ? 63 : planeH;
  if (task === "solid") {
    const g = pairGeom(w * MM, diagramH * MM, "vertical");
    ["しつもん", "かいとう"].forEach((label, side) => {
      const cy = diagramY + (g.oy + side * g.dy + g.pane / 2) / MM;
      fillRect(page, x + 2, cy - 4, 26, 7.5, grayscale(0.88));
      text(page, label, x + 3, cy - 2.9, 10.5, "heading");
    });
  } else exampleLabels(page, x, labelY, w, diagramH, v.rendered[0].compose ? 3 : 2);
  question(page, vi, 0, x, diagramY, w, diagramH, false, true);
  return diagramY + diagramH;
}
/** しつもん・かいとう over a side-by-side worked example: the question label spans both inputs of a compose task. */
function exampleLabels(page: PDFPage, x: number, labelY: number, w: number, diagramH: number, paneCount: 2 | 3) {
  const pad = Math.min(w, diagramH) * CELL_PAD;
  const g = pairGeom((w - pad * 2) * MM, (diagramH - pad * 2) * MM, "horizontal", paneCount, paneCount === 3 ? 1 : 3.1);
  const center = (side: number) => x + pad + (g.ox + side * g.dx + g.pane / 2) / MM;
  ["しつもん", "かいとう"].forEach((label, side) => {
    const cx = paneCount === 3 && side === 0 ? (center(0) + center(1)) / 2 : center(side === 0 ? 0 : paneCount - 1);
    fillRect(page, cx - 13, labelY, 26, 7.5, grayscale(0.88));
    text(page, label, cx - widthMm(label, 10.5) / 2, labelY + 1.1, 10.5, "heading");
  });
}
/** Header and footer of the owner's designed pages: section label at the left, TENZU at the right, page number below it. */
function designFrame(label: string) {
  const page = doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]);
  const pn = doc.getPageCount();
  const l = pn % 2 ? 18 : 14.1, r = frameRight(pn), gray = grayscale(0.4);
  text(page, label, l, 12.9, 8.5, "bold", gray);
  text(page, "TENZU", r - widthMm("TENZU", 8.3, "mono"), 12.5, 8.3, "mono", gray);
  folio(page, pn);
  return { page, pn, x: l, w: r - l, right: r };
}
/** Book 1: an explanation before every stage, saying what is new and why the stage changes here.
 * With an owner design, the page keeps this layout and takes the design's header and footer. */
function stageIntroduction(vi: number) {
  const v = volumes[vi], perVolume = SB.stageIntro === "volume";
  // Per-volume pages: the たす page explains the level, the うつす page what changes when the whole shape is drawn.
  const c = perVolume && v.set.task === "copy" ? STAGE_COPY_UTSUSU[pairKey(vi)] : STAGE_COPY[pairKey(vi)];
  if (!c) throw new Error(`Level copy missing: ${v.set.task} ${pairKey(vi)}`);
  const framed = SB.design ? designFrame(`あたらしくでてくるもの / ${short(v.set.task)} ${lvLabel(vi)}`) : null;
  const { page, pn, x } = framed ?? newPage("");
  const W = framed?.w ?? 152, dy = framed ? 3 : 0; // the design header sits where the band used to start
  expect("explanations", pn);
  fillRect(page, x, 17 + dy, W, 19, grayscale(0.14));
  const level = `レベル${fw(v.vol.lv)}`, vol = volSuffix(v.vol.lv, v.vol.volNo).trim();
  if (perVolume) {
    // The band names the task first, as the 216-problem book did ("01 うつす（模写）"); level and board sit on the right.
    text(page, `${short(v.set.task)}（${taskName(vi)}）`, x + 5, 21.4 + dy, 18, "heading", grayscale(1));
    const right = `${level}${vol ? ` ${vol}` : ""}　${fw(v.grid)}`;
    text(page, right, x + W - 4 - widthMm(right, 13), 22.6 + dy, 13, "heading", grayscale(1));
  } else {
    text(page, level, x + 5, 21.4 + dy, 18, "heading", grayscale(1));
    text(page, `Vol.${v.vol.volNo}`, x + 46, 24 + dy, 12, "mono", grayscale(1));
    text(page, fw(v.grid), x + W - 4 - widthMm(fw(v.grid), 13), 22.6 + dy, 13, "heading", grayscale(1));
  }
  text(page, "あたらしく でてくるもの", x, 41 + dy, 9, "heading", grayscale(0.4));
  text(page, c.fresh, x, 47.5 + dy, 15, "heading");
  const order = volumes.map((item, i) => ({ item, i })).filter(({ i }) => perVolume ? i === vi : pairKey(i) === pairKey(vi)).map(({ item, i }) => {
    const qs = questions.filter((q) => q.volumeIndex === i);
    return perVolume ? `${qs[0].number}〜${qs[11].number}ばん（${qs[0].page}〜${qs[11].page}ページ）` : `${short(item.set.task)} ${qs[0].page}〜${qs[11].page}ページ`;
  }).join("  →  ");
  text(page, order, x + W - widthMm(order, 9, "body"), 49 + dy, 9);
  const lead = leadProblems(vi);
  if (lead) {
    // After the book's first explanation, the page goes straight to the volume's first problems.
    text(page, TASK_COPY[v.set.task].instruction, x, 61 + dy, 11, "heading");
    const top = 74 + dy;
    problemRows(page, pn, vi, 0, lead, x, top, (PROBLEM_BOTTOM - top) / lead, W);
    if (v.planned && framed) text(page, "準備中：仮の問題", framed.right - widthMm("準備中：仮の問題", 7.5, "body"), 5, 7.5, "body", grayscale(0.5));
    return;
  }
  const diagramEnd = workedExample(page, vi, x, 61 + dy, W, perVolume ? 47 : 53);
  const ruleY = diagramEnd + 4, parentY = ruleY + 6;
  rule(page, x, ruleY, W);
  fillRect(page, x, parentY, 31, 8, grayscale(0.18));
  text(page, "おうちの方へ", x + 3.5, parentY + 1.5, 10, "heading", grayscale(1));
  const whyEnd = paragraph(page, c.why, x, parentY + 12, W, 9.5, 5.4);
  const boxY = whyEnd + 5, lines = wrap(c.stuck, f.body, 9, W - 12).length, boxH = 12 + lines * 5;
  framedRect(page, x, boxY, W, boxH, grayscale(0.92));
  fillRect(page, x, boxY, 2, boxH, grayscale(0.18));
  text(page, "手が止まったら", x + 7, boxY + 3, 10, "heading");
  paragraph(page, c.stuck, x + 7, boxY + 10, W - 12, 9, 5);
  if (perVolume) {
    // The aim of the task closes the page, as on the 216-problem book's task pages.
    const aimY = boxY + boxH + 5;
    fillRect(page, x, aimY, 1, 13, grayscale(0.4));
    text(page, "この課題のめあて", x + 5, aimY, 9.5, "heading");
    const aimEnd = paragraph(page, TASK_AIM[v.set.task], x + 5, aimY + 6.5, W - 5, 9.5, 5.2, "heading");
    if (aimEnd > BOTTOM) throw new Error(`Level introduction overflows: ${v.sku}: ${aimEnd.toFixed(1)} mm`);
  }
  if (v.planned) {
    const note = "準備中：れいだいは仮の問題";
    if (framed) text(page, note, framed.right - widthMm(note, 7.5, "body"), 5, 7.5, "body", grayscale(0.5));
    else text(page, note, x + 100, 8, 8.5, "heading", grayscale(0.5));
  }
  if (boxY + boxH > BOTTOM) throw new Error(`Level introduction overflows: ${pairKey(vi)}: ${(boxY + boxH).toFixed(1)} mm`);
}
function taskIntroduction(vi: number) {
  const v = volumes[vi], task = v.set.task;
  const { page, pn, x } = newPage("");
  expect("explanations", pn);
  fillRect(page, x, 17, 152, 19, grayscale(0.14));
  text(page, String(tasks.indexOf(task) + 1).padStart(2, "0"), x + 5, 23.5, 13, "mono", grayscale(1));
  text(page, `${short(task)}（${taskName(vi)}）`, x + 23, 21.4, 20, "heading", grayscale(1));
  const diagramEnd = workedExample(page, vi, x, 43);
  const ruleY = diagramEnd + 4, parentY = ruleY + 6;
  rule(page, x, ruleY, 152);
  fillRect(page, x, parentY, 31, 8, grayscale(0.18));
  text(page, "おうちの方へ", x + 3.5, parentY + 1.5, 10, "heading", grayscale(1));
  const parentEnd = paragraph(page, explanation(task), x, parentY + 12, 152, 9.5, 5.4);
  const taskVolumes = volumes.filter((item) => item.set.task === task);
  const range = (sku: string) => { const qs = questions.filter((q) => q.sku === sku); return `${qs[0].page}〜${qs[11].page}P`; };
  let y = Math.max(parentY + 30, parentEnd + 5);
  if (taskVolumes.length <= 3) {
    const gap = 4, colW = (152 - (taskVolumes.length - 1) * gap) / taskVolumes.length;
    const copy = taskVolumes.map((item) => LEVEL_COPY[item.sku].replaceAll("。", "。\n").trim());
    const colH = 13 + Math.max(...copy.map((c) => wrap(c, f.body, 9, colW - 8).length)) * 5.2;
    taskVolumes.forEach((item, i) => {
      const cx = x + i * (colW + gap), label = `Lv.${item.vol.lv}（${range(item.sku)}）`;
      if (widthMm(label, 9.5, "body") > colW - 8) throw new Error(`Level range too wide: ${item.sku}`);
      fillRect(page, cx, y, colW, colH, grayscale(0.88));
      text(page, label, cx + 4, y + 3, 9.5);
      paragraph(page, copy[i], cx + 4, y + 12, colW - 8, 9, 5.2);
    });
    y += colH;
  } else {
    // Six volumes do not fit as columns; one row per volume keeps the board size beside the page range.
    for (const item of taskVolumes) {
      fillRect(page, x, y - 1, 37, 6.4, grayscale(0.88));
      text(page, `Lv.${item.vol.lv}・${item.grid}  ${range(item.sku)}`, x + 1.5, y, 8.5);
      y = paragraph(page, LEVEL_COPY[item.sku], x + 40, y, 112, 8.5, 4.6) + 1.8;
    }
  }
  const aimY = y + 6;
  fillRect(page, x, aimY, 1, 16, grayscale(0.4));
  text(page, "この課題のめあて", x + 5, aimY, 10, "heading");
  const aimEnd = paragraph(page, TASK_AIM[task], x + 5, aimY + 7, 147, 10, 5.5, "heading");
  if (Math.max(aimEnd, aimY + 16) > 236) throw new Error(`Introduction exceeds content area: ${v.sku}: ${aimEnd.toFixed(1)} mm`);
}

/* ---- Front matter. Copy is a first draft for the owner's review. */
const total = questions.length;
function openingPage() {
  const { page, pn, x } = newPage(which === "first" ? "おうちの方へ / この本の使い方" : "大人の方へ / この本の使い方");
  expect("opening", pn);
  brandDots(page, x + 1, 30, 145, 10);
  text(page, SB.subtitle, x, 47, 14, "heading");
  text(page, SB.title, x, 59, 25, "heading");
  const intro = which === "first"
    ? ["この本は、鉛筆で線を引くことに慣れてきた、4〜6才ごろのお子さんのための点図形（点描写）の問題集です。",
       `足りない線を書き足す「たす（欠け補完）」と、見本と同じ形を写す「うつす（模写）」を、${total}問収録しました。点の位置を確かめ、見本と見比べながら線を引きます。点の数や線の種類を細かく分けているので、新しく取り組むことを確かめながら進められます。`]
    : ["この本は、見本を写せるようになったお子さんのための点図形（点描写）の問題集です。",
       `写した形を、鏡にうつす・動かす・回す・重ねる・取り除く・折り重ねる、そして立体を写す。7つの課題を${total}問収録しました。頭の中で形を動かして考える力を育てます。`];
  let y = paragraph(page, intro[0], x, 78, 148, 10.5, 5.8);
  y = paragraph(page, intro[1], x, y + 4, 148, 10.5, 5.8);
  // Book 1 names where to open first: the worked example on the first level page, then question 1.
  const tips = which === "first"
    ? [["まずは、やり方を一緒に。", `鉛筆と消しゴムを用意して、${introPage.get(pairKey(0))}ページの例題を一緒に読み、${questions[0].page}ページの1問目へ進みましょう。レベルが変わるたびに、やり方の説明があります。`],
       ["できたら、見本と見比べる。", "この本の問題は、見本がそのまま答えです。「同じ点をつなげたね」と、できたところを一緒に確かめましょう。1問だけの日があってもかまいません。"],
       ["もう一度やりたいときは、特典PDFで。", `本には直接書き込めます。もう一度練習するときは、購入者特典のPDFを印刷してご利用ください。問題の大きさや1枚の問題数も変えられます。受け取り方は${pageOf("benefit")}ページ、印刷の工夫は${extraPage.get("print-options")}ページ。`]]
    : [["まずは、前から順に。", "どの課題も3×3のやさしい問題から始まります。新しい課題の前のやり方の説明を、一緒に読んで始めましょう。"],
       ["「どの点からかな？」と、一緒に。", "手が止まったら、見本の線の始まりを指で探してみましょう。一度にたくさん進めなくても大丈夫です。"],
       ["できたら、見比べてみましょう。", `答えは${answerStart}ページから。「りったい」は見本が答えです。「向きが変わったね」と、気づいたことを言葉にしてみましょう。`]];
  y += 7;
  for (const [title, body] of tips) {
    text(page, title, x, y, 11.5, "heading");
    y = paragraph(page, body, x, y + 7.5, 148, 9, 4.8) + 6;
  }
  if (y > 214) throw new Error(`Opening page overflows: ${y.toFixed(1)} mm`);
  if (which === "second")
    paragraph(page, `本に直接書き込めます。くり返し練習するときは、${pageOf("benefit")}ページの案内からPDFを印刷してご利用ください。`, x, 217, 148, 8, 4.4);
  text(page, `進め方は${pageOf("route")}ページ、もくじは${pageOf("index")}ページ。困ったときは${extraPage.get("trouble")}ページへ。`, x, 230, 8);
}
function routePage() {
  const { page, pn, x } = newPage("この本の進め方");
  expect("route", pn);
  brandDots(page, x + 1, 30, 145, 10);
  const first = (sku: string) => questions.find((q) => q.sku === sku)!.page;
  const [h1, h2, body, routes] = which === "first"
    // Says why the order is fine-grained without promising one change at a time: Lv.3 Vol.1 widens the board and adds crossings together.
    ? ["難しさを細かく分けて、", "小さな段階で。", "点が増える。ななめの線が加わる。形をまるごと写す。点描写には、いくつもの難しさがあります。この本は、Lv.1からLv.4までを6つの区分に分け、どの区分も「たす」から「うつす」へ進みます。新しい傾きの線は慣れた4×4の点で練習し、5×5に広げるときは、線をいったん45°までに戻します。新しく取り組むことに目を向けやすくするための工夫です。",
      [["はじめてなら", `たす Lv.1（${first("fill-lv1-vol1")}ページ）から。足りない線を1本だけ書き足します。`],
       ["書き足すのに慣れたら", "同じレベルの「うつす」へ。見本の形を、まるごと写します。"],
       ["手が止まったら", `「うつす」で迷ったら、同じレベルの「たす」へ。そのほかの戻り先は、各レベルの解説ページと${extraPage.get("way-back")}ページの表にあります。`]]]
    : ["好きな課題から、", "どれでも。", "課題ごとに、レベル2（3×3）からレベル3（4×4）へ進みます。どの課題から始めてもかまいません。1冊目の最後は5×5でしたが、この本は3×3から始まります。やさしく見えるのは、動かし方が新しいからです。",
      [["写すのがまだなら", "1冊目「はじめての点描写」から。見本をそのまま写せると、この本の課題に入りやすくなります。"],
       ["はじめての課題は", `かがみ（${first("mirror-lv2-vol1")}ページ）がおすすめ。鏡の線をはさんで、反対側に写します。`],
       ["手が止まったら", `紙を回す・折る・手鏡を使うと、動きが目で見えます。${extraPage.get("hands")}ページをご覧ください。`]]];
  text(page, h1, x, 48, 18, "heading");
  text(page, h2, x, 61, 18, "heading");
  const bodyEnd = paragraph(page, body, x, 79, 148, 9.5, 5.5);
  // Book 1 has a longer lead, so its three route boxes start lower and sit closer.
  const [routeTop, step, boxH] = which === "first" ? [124, 31, 28] : [118, 33, 29];
  if (bodyEnd > routeTop - 3) throw new Error(`Route lead overflows: ${bodyEnd.toFixed(1)} mm`);
  routes.forEach(([label, copy], i) => {
    const y = routeTop + i * step;
    framedRect(page, x, y, 152, boxH, i % 2 ? grayscale(1) : grayscale(0.9));
    fillRect(page, x, y, 2, boxH, grayscale(0.18));
    text(page, `0${i + 1}`, x + 6, y + 5, 12, "mono");
    text(page, label, x + 20, y + 4, 11, "heading");
    paragraph(page, copy, x + 20, y + 13, 124, 8.8, 5);
  });
  paragraph(page, which === "first"
    ? `Lv.3とLv.4は、Vol.1で点の並びの広さに慣れ、Vol.2で同じ広さのまま新しい傾きに取り組みます。全体のつながりは${extraPage.get("levels")}ページの「レベルの地図」で確かめられます。`
    : "各課題の最初には、書く場所を示した見本があります。", x, 222, 148, 8.4, 4.7);
}
function indexPage() {
  const { page, pn, x } = newPage("もくじ");
  expect("index", pn);
  const tableY = 30, headerH = 10;
  const ranges = (vi: number) => { const qs = questions.filter((q) => q.volumeIndex === vi); return [`${qs[0].number}〜${qs[11].number}ばん`, `${qs[0].page}〜${qs[11].page}ページ`]; };
  let y = tableY + headerH;
  if (which === "first") {
    // One row per level: what is new, then the たす and うつす ranges (question numbers and pages).
    const cols = [0, 26, 76, 114, 152], rowH = 20;
    fillRect(page, x, tableY, 152, headerH, grayscale(0.16));
    ["レベル", "新しく出るもの", "たす", "うつす"].forEach((label, i) => text(page, label, x + cols[i] + 2, tableY + 2.5, 8.5, "heading", grayscale(1)));
    let row = 0;
    volumes.forEach((v, i) => {
      if (!pairStart(i)) return;
      if (row++ % 2 === 0) fillRect(page, x, y, 152, rowH, grayscale(0.9));
      text(page, `Lv.${v.vol.lv}`, x + 2, y + 3, 11, "heading");
      text(page, `Vol.${v.vol.volNo}・${v.grid}`, x + 2, y + 11, 8);
      paragraph(page, STAGE_COPY[pairKey(i)].fresh, x + cols[1] + 2, y + 3.5, 46, 9, 5, "heading");
      volumes.forEach((item, j) => {
        if (pairKey(j) !== pairKey(i)) return;
        const qs = questions.filter((q) => q.volumeIndex === j), col = item.set.task === "fill" ? 2 : 3;
        text(page, `${qs[0].number}〜${qs[11].number}ばん`, x + cols[col] + 2, y + 3.5, 8.5);
        text(page, `${qs[0].page}〜${qs[11].page}ページ`, x + cols[col] + 2, y + 10.5, 7.8);
      });
      y += rowH;
    });
  } else {
    const cols = [0, 42, 97, 152], rowH = 17;
    fillRect(page, x, tableY, 152, headerH, grayscale(0.16));
    ["課題", "Lv.2  3×3", "Lv.3  4×4"].forEach((label, i) => text(page, label, x + cols[i] + 3, tableY + 2.5, 8.5, "heading", grayscale(1)));
    tasks.forEach((task, ti) => {
      if (ti % 2 === 0) fillRect(page, x, y, 152, rowH, grayscale(0.9));
      const first = volumes.findIndex((v) => v.set.task === task);
      text(page, String(ti + 1).padStart(2, "0"), x + 2.5, y + 3.5, 8, "mono");
      text(page, short(task), x + 11, y + 2.8, 10.5, "heading");
      text(page, taskName(first), x + 11, y + 10.2, 7.5);
      volumes.forEach((v, vi) => {
        if (v.set.task !== task) return;
        const col = task === "solid" ? 2 : v.vol.lv - 1, [nums, pgs] = ranges(vi);
        text(page, task === "solid" ? `${nums}（9×9）` : nums, x + cols[col] + 3, y + 2.8, 8.7, "heading");
        text(page, pgs, x + cols[col] + 3, y + 10.2, 7.8);
      });
      y += rowH;
    });
  }
  y += 8;
  text(page, "おうちの方へのページ", x, y, 10.5, "heading");
  y += 8;
  const listed = SB.slots.filter((s): s is Extract<SeriesSlot, { kind: "extra" }> => s.kind === "extra");
  // The benefit page is the reader's way to the Web, so it is listed even though it is not an extra page.
  const items = [...listed.map((s) => [s.title, extraPage.get(s.id)!] as const),
    ...(which === "first" ? [["購入者特典", pageOf("benefit")] as const, ["あとがき", pageOf("colophon")] as const] : []),
    ...(answerStart ? [["答え", answerStart] as const] : [])].sort((a, b) => a[1] - b[1]);
  const half = Math.ceil(items.length / 2);
  items.forEach(([title, p], i) => {
    const cx = x + (i < half ? 0 : 78), cy = y + (i % half) * 6.2;
    text(page, title, cx, cy, 8.5);
    text(page, `${p}`, cx + 68, cy, 8.5, "mono");
  });
  if (y + half * 6.2 > 236) throw new Error("Index overflows");
}
function benefitPage() {
  const { page, pn, x } = newPage("購入者特典");
  expect("benefit", pn);
  // One QR only: the benefit is the first reason to visit; the shelf and the makers are introduced at the back.
  brandDots(page, x + 1, 27, 145, 8);
  text(page, `この本の${total}問を、何度でも印刷できます。`, x, 41, 18, "heading");
  const leadEnd = paragraph(page, `「もう一度やってみたい」「大きな紙面で書いてみたい」。そんなときは、TENZUの購入者特典をご利用ください。この本と同じ${total}問のPDFを、巻ごと（12問ずつ）に選んで印刷できます。大きく書きたいときは、はじめから特典PDFで1問ずつ印刷して使えます。`, x, 58, 150, 9.5, 5.8);
  const top = leadEnd + 6;
  framedRect(page, x, top, 152, 92, grayscale(0.9));
  fillRect(page, x, top, 3, 92, grayscale(0.18));
  text(page, "受け取り方", x + 7, top + 6, 11.5, "heading");
  ["1　QRコードから、受け取りページを開く", "2　下の受取コードを入れる", "3　巻と印刷設定を選び、PDFを保存する"]
    .forEach((s, i) => text(page, s, x + 7, top + 17 + i * 8.5, 9.5));
  text(page, "受取コード", x + 7, top + 47, 8, "heading");
  // The reader code is issued with the benefit entrance (kdp-revision-plan step 4); a grey placeholder marks the draft.
  text(page, "TENZU-XXXX-XXXXXXXXXX", x + 28, top + 47, 9, "mono", grayscale(0.55));
  text(page, `tenzu.jp/book/${SB.slug}`, x + 7, top + 57, 9, "mono");
  qr(page, qrUrl, x + 110, top + 9, 36);
  text(page, "PDFの受け取り", x + 116, top + 47, 7.5);
  const terms = `本書をご購入の方は、追加料金・メール登録なしで、何度でもご利用いただけます。1枚の問題数や見本の並びも変えられます${extraPage.has("print-options") ? `（${extraPage.get("print-options")}ページ）` : ""}。再印刷するときも、同じQRから入れます。`;
  if (paragraph(page, terms, x + 7, top + 68, 138, 8.5, 4.8) > top + 90) throw new Error("Benefit terms overflow");
  const next = extraPage.get("after-book") ?? extraPage.get("next-web");
  paragraph(page, `TENZUは、点図形（点描写）プリントの専門店です。次のプリントは${next}ページから。自分で問題を作りたいときは${extraPage.get("next-maker")}ページへ。`,
    x, top + 100, 150, 8.5, 4.8);
  if (top + 110 > BOTTOM) throw new Error(`Benefit page overflows: ${(top + 110).toFixed(1)} mm`);
}
/* ---- Pages that are not problems (kdp-paperback §2.4). Copy lives in kdp/series-pages.ts. */
const COPY = PAGE_COPY[which];
/** Resolves {page-id} references in copy to the planned page numbers: extra pages by id, fixed pages by kind. */
const fillRefs = (s: string) => s.replace(/\{([a-z-]+)\}/g, (_, id: string) => {
  const pn = extraPage.get(id) ?? pageOf(id);
  if (!pn) throw new Error(`Unknown page reference: ${id}`);
  return String(pn);
});
function extraPage_(title: string, kind = "extra") {
  const r = newPage(title);
  expect(kind, r.pn);
  return r;
}
function titleBlock(page: PDFPage, x: number, heading: string, lead?: string, kicker?: string) {
  brandDots(page, x + 1, 27, 145, 8);
  if (kicker) text(page, kicker, x, 38, 9.5, "heading", grayscale(0.4));
  text(page, heading, x, 44, 18, "heading");
  return lead ? paragraph(page, fillRefs(lead), x, 60, 150, 9.5, 5.5) + 4 : 60;
}
function boxes(page: PDFPage, x: number, y: number, items: readonly Box[], bodySize = 9) {
  items.forEach((b, i) => {
    const lines = wrap(fillRefs(b.body), f.body, bodySize, 140).length;
    const h = 13 + lines * (bodySize * 0.55) + 2;
    framedRect(page, x, y, 152, h, i % 2 ? grayscale(1) : grayscale(0.92));
    fillRect(page, x, y, 2, h, grayscale(0.18));
    text(page, b.title, x + 7, y + 3.5, 11, "heading");
    paragraph(page, fillRefs(b.body), x + 7, y + 11.5, 140, bodySize, bodySize * 0.55);
    y += h + 3.5;
  });
  if (y - 3.5 > BOTTOM) throw new Error(`Boxes overflow (${y.toFixed(1)} mm): ${items[0]?.title}`);
  return y;
}
/** Simple ruled table; the first row is the header when `header` is set. */
function table(page: PDFPage, x: number, y: number, rows: readonly (readonly string[])[], widths: number[], header = true, size = 8.8) {
  rows.forEach((row, ri) => {
    const lines = Math.max(...row.map((c, ci) => wrap(c, f.body, size, widths[ci] - 4).length));
    const h = lines * size * 0.5 + 4.2;
    if (ri === 0 && header) fillRect(page, x, y, 152, h, grayscale(0.16));
    else if (ri % 2 === (header ? 1 : 0)) fillRect(page, x, y, 152, h, grayscale(0.92));
    let cx = x;
    row.forEach((c, ci) => {
      wrap(c, f.body, size, widths[ci] - 4).forEach((l, li) => text(page, l, cx + 2, y + 2 + li * size * 0.5, size,
        ri === 0 && header ? "heading" : "body", ri === 0 && header ? grayscale(1) : ink));
      cx += widths[ci];
    });
    y += h;
  });
  return y;
}
/** First problem (lowest D) of any published volume, for previews of the other book and the Web shelf. */
/** The volume's problem of the given rank by D, easiest first. */
function sampleOf(sku: string, rank = 0) {
  const set = PUBLISHED[sku], hit = volBySku(sku);
  if (!set || !hit) throw new Error(`Missing preview volume: ${sku}`);
  const p = [...set.problems].sort((a, b) => (a.difficulty?.value ?? 0) - (b.difficulty?.value ?? 0))[rank];
  const rendered = toRenderProblems({ ...set, problems: [p] })[0];
  return { p, rendered, hit };
}
/** A small, non-writable preview of a problem (model and empty answer area). */
function preview(page: PDFPage, sku: string, x: number, y: number, w: number, h: number) {
  const { p, rendered } = sampleOf(sku);
  if (p.grid.type === "solid") {
    const g = pairGeom(w * MM, h * MM, "horizontal");
    for (let side = 0; side < 2; side++)
      paintGridPdf(page, { x: x * MM + g.ox + side * g.dx, y: y * MM + g.oy, width: g.pane, height: g.pane },
        p.grid.cols, p.grid.rows, side ? [] : p.solidEdges ?? [], { minLineMm: LINE, inkGray: 0.6 });
    return;
  }
  paintProblemPdf(page, rendered, { x: x * MM, y: y * MM, width: w * MM, height: h * MM }, "horizontal",
    { minLineMm: LINE, monochrome: true, dotScale: 1, inkGray: 0.6, gapScale: rendered.compose ? 1 : 2.2, markerMaxPaneRatio: 0.23 });
}
const gridLabel = (sku: string) => { const g = PUBLISHED[sku].problems[0].grid; return g.type === "square" ? `${g.n}×${g.n}` : `${g.cols}×${g.rows}`; };
const childTask = (task: string) => `${short(task)}（${task === "solid" ? "立体模写" : PRODUCT_NAME[task]}）`;
const PRODUCT_NAME: Record<string, string> = { copy: "模写", fill: "欠け補完", mirror: "鏡", translate: "移動", rotate: "回転",
  overlay: "かさね", decompose: "分解", fold: "折り重ね", solid: "立体模写" };

function parentsPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = COPY.parents;
  let y = titleBlock(page, x, c.heading, c.lead);
  if ("compare" in c) {
    text(page, c.compareTitle, x, y + 1, 10.5, "heading");
    y = table(page, x, y + 9, c.compare, [44, 50, 58]) + 6;
  }
  boxes(page, x, y, c.boxes);
}
function progressPage() {
  const c = SHARED_COPY.progress, perPage = which === "first" ? [6, 6] : [10];
  let vi = 0;
  perPage.forEach((count, pi) => {
    const { page, x } = extraPage_(perPage.length > 1 ? `できたよ表（${pi + 1}／${perPage.length}）` : "できたよ表");
    let y = 68;
    if (pi === 0) {
      brandDots(page, x + 1, 27, 145, 8);
      text(page, c.title, x, 40, 20, "heading");
      text(page, c.child, x, 55, 11, "heading");
    } else y = 30;
    const rowH = which === "first" ? 25 : 15.5, cell = 9, labelW = 38;
    for (const end = vi + count; vi < end; vi++) {
      const v = volumes[vi], qs = questions.filter((q) => q.volumeIndex === vi);
      text(page, short(v.set.task), x, y + 1, 10.5, "heading");
      text(page, which === "first" ? `${lvLabel(vi)}・${v.grid}` : `レベル${fw(v.vol.lv)}`, x, y + 7.5, 8.5);
      qs.forEach((q, i) => {
        const cx = x + labelW + i * (cell + 0.85);
        framedRect(page, cx, y, cell, cell);
        const label = String(q.number), w = widthMm(label, 6.5, "mono");
        text(page, label, cx + (cell - w) / 2, y + cell + 0.8, 6.5, "mono", grayscale(0.45));
      });
      y += rowH;
    }
    if (y > 226) throw new Error(`Progress table overflows: ${y.toFixed(1)}`);
    if (pi === perPage.length - 1) paragraph(page, c.parent, x, 229, 150, 8, 4.4);
  });
}
function certificatePage() {
  const { page, x } = extraPage_("");
  const c = SHARED_COPY.certificate;
  framedRect(page, x, 30, 152, 200);
  framedRect(page, x + 4, 34, 144, 192);
  brandDots(page, x + 11, 42, 130, 10);
  const center = (s: string, y: number, size: number, face: keyof Fonts = "heading") => text(page, s, x + (152 - widthMm(s, size, face)) / 2, y, size, face);
  center(c.title, 66, 26);
  line(page, x + 30, 116, x + 112, 116);
  text(page, c.label, x + 114, 110, 13, "heading");
  const body = c.body(SB.title, total);
  wrap(body, f.heading, 13, 118).forEach((l, i) => center(l, 132 + i * 9, 13));
  center("　　　ねん　　　がつ　　　にち", 186, 12);
  center("TENZU", 206, 12, "mono");
}
/** Blank boards for parents and children to set problems for each other. */
function makePages(count: number) {
  const c = SHARED_COPY.make;
  const sizes = which === "first" ? [3, 4, 5, 5] : [3, 4];
  for (let i = 0; i < count; i++) {
    const { page, x } = extraPage_(`じぶんでつくろう（${i + 1}／${count}）`);
    const n = sizes[i], last = i === count - 1;
    let y = 30;
    if (i === 0) {
      text(page, "じぶんで つくろう", x, 30, 18, "heading");
      y = paragraph(page, which === "second" ? c.secondChild : c.child, x, 44, 150, 11, 6.2, "heading") + 2;
      y = paragraph(page, c.parent, x, y, 150, 8.5, 4.6) + 6;
    }
    const pairs = last ? 1 : i === 0 ? 2 : 2;
    const pairH = (last ? BOTTOM - y - 54 : BOTTOM - y) / pairs;
    for (let j = 0; j < pairs; j++) {
      const py = y + j * pairH, side = Math.min(64, pairH - 14);
      text(page, "もんだい", x + 4, py, 9.5, "heading");
      text(page, "こたえ", x + 88, py, 9.5, "heading");
      if (which === "second") text(page, "かがみ ・ ずらす ・ まわす", x + 36, py, 8.5, "body", grayscale(0.4));
      for (let s = 0; s < 2; s++) paintGridPdf(page, { x: (x + 4 + s * 84) * MM, y: (py + 7) * MM, width: side * MM, height: side * MM }, n, n, [], { minLineMm: LINE, inkGray: 0.6 });
      if (j < pairs - 1) rule(page, x, py + pairH - 4, 152);
    }
    if (last) makerBridge(page, x, BOTTOM - 48);
  }
}
function makerBridge(page: PDFPage, x: number, y: number) {
  framedRect(page, x, y, 152, BOTTOM - y - 2, grayscale(0.92));
  fillRect(page, x, y, 2, BOTTOM - y - 2, grayscale(0.18));
  text(page, "もっと作りたくなったら", x + 7, y + 4, 11, "heading");
  paragraph(page, `${SHARED_COPY.maker.lead} 詳しくは${extraPage.get("next-maker")}ページへ。`, x + 7, y + 12, 108, 8.5, 4.7);
  text(page, "tenzu.jp/makers", x + 7, BOTTOM - 10, 8, "mono");
  qr(page, "https://tenzu.jp/makers", x + 123, y + 6, 24);
}
function siblingPages() {
  const target = which === "first" ? "second" : "first";
  const c = SHARED_COPY.sibling[target], book = SERIES[target];
  {
    const { page, x } = extraPage_("もう1冊の紹介");
    let y = titleBlock(page, x, c.heading, undefined, c.kicker);
    text(page, `「${book.title}」`, x, y, 13, "heading");
    y = paragraph(page, c.lead, x, y + 10, 150, 9.5, 5.5) + 6;
    c.points.forEach((p) => {
      page.drawCircle({ x: (x + 1.5) * MM, y: page.getHeight() - (y + 2.2) * MM, size: 0.9 * MM, color: ink });
      y = paragraph(page, p, x + 5, y, 145, 9.5, 5.5) + 2.5;
    });
    framedRect(page, x, y + 6, 152, 16, grayscale(0.92));
    paragraph(page, c.tail, x + 6, y + 10.5, 140, 9.5, 5.5);
  }
  const { page, x } = extraPage_(`「${book.title}」の問題から`);
  const picks = target === "first" ? ["fill-lv2-vol1", "copy-lv3-vol1", "fill-lv3-vol1", "copy-lv4-vol2"]
    : skusOf(book.slots).filter((sku, i, all) => all.findIndex((s) => PUBLISHED[s].task === PUBLISHED[sku].task) === i);
  const cols = 2, cw = 74, ch = picks.length > 4 ? 47 : 60;
  picks.forEach((sku, i) => {
    const cx = x + (i % cols) * (cw + 4), cy = 30 + Math.floor(i / cols) * (ch + 4);
    framedRect(page, cx, cy, cw, ch);
    const t = PUBLISHED[sku].task;
    text(page, `${childTask(t)}  Lv.${volBySku(sku)!.vol.lv}・${gridLabel(sku)}`, cx + 3, cy + 2.5, 8.5, "heading");
    preview(page, sku, cx + 2, cy + 8, cw - 4, ch - 10);
  });
  paragraph(page, "収録問題から、各課題のはじめの1問を縮小して掲載しています。", x, BOTTOM - 4, 150, 8, 4.4);
}
/** First volume of each moving task on the Web shelf; the book stops at copying (kdp-paperback §2.4・§6). */
const WEB_TASK_ENTRY = ["mirror-lv2-vol1", "translate-lv2-vol1", "rotate-lv2-vol1", "overlay-lv2-vol1", "decompose-lv2-vol1", "fold-lv2-vol1", "solid-lv3-vol1"];
function webTasksPages() {
  const c = PAGE_COPY.first.webTasks;
  {
    const { page, x } = extraPage_("本の先にある7つの課題");
    let y = taskGroups(page, x, titleBlock(page, x, c.heading, c.lead, c.kicker), c.groups) + 2;
    y = boxes(page, x, y, c.boxes, 8.6);
    if (y > 194) throw new Error(`Web-tasks page overflows: ${y.toFixed(1)}`);
    framedRect(page, x, 196, 152, 36, grayscale(0.92));
    text(page, "レベル選びガイド", x + 6, 200, 11, "heading");
    paragraph(page, "いくつかの質問に答えると、始める課題とレベルの目安が出ます。", x + 6, 208, 108, 8.5, 4.7);
    text(page, "tenzu.jp/level-guide", x + 6, 224, 8, "mono");
    qr(page, "https://tenzu.jp/level-guide", x + 124, 198, 25);
  }
  const { page, x } = extraPage_("本の先にある7つの課題（見本）");
  text(page, c.previewHeading, x, 26, 12, "heading");
  // The note sits under the heading; the eighth cell of the grid goes to the shelf.
  const top = paragraph(page, c.previewNote, x, 34, 150, 8, 4.4) + 3;
  const cols = 2, cw = 74, ch = 42;
  WEB_TASK_ENTRY.forEach((sku, i) => {
    const cx = x + (i % cols) * (cw + 4), cy = top + Math.floor(i / cols) * (ch + 4);
    framedRect(page, cx, cy, cw, ch, grayscale(0.97));
    text(page, `${childTask(PUBLISHED[sku].task)}  Lv.${volBySku(sku)!.vol.lv}・${gridLabel(sku)}`, cx + 3, cy + 2.5, 8.5, "heading");
    // The rotate arc sits above its pane, so leave room under the label.
    preview(page, sku, cx + 2, cy + 10, cw - 4, ch - 12);
  });
  // A reader who found a task here goes straight to the shelf.
  const n = WEB_TASK_ENTRY.length, sx = x + (n % cols) * (cw + 4), sy = top + Math.floor(n / cols) * (ch + 4);
  framedRect(page, sx, sy, cw, ch, grayscale(0.9));
  text(page, c.shelf.title, sx + 4, sy + 4, 10.5, "heading");
  paragraph(page, c.shelf.body, sx + 4, sy + 13, 40, 8, 4.6);
  text(page, "tenzu.jp/products", sx + 4, sy + ch - 8, 7.5, "mono");
  qr(page, "https://tenzu.jp/products", sx + cw - 28, sy + 6, 24);
  if (sy + ch > BOTTOM) throw new Error(`Web-tasks previews overflow: ${(sy + ch).toFixed(1)}`);
}
/** The volume that follows the book on the Web shelf, per task (kdp-paperback §6). */
const NEXT_WEB: Record<"first" | "second", readonly string[]> = {
  first: ["copy-lv5-vol1", "copy-lv5-vol2", "copy-lv5-vol3", "fill-lv5-vol1"],
  second: ["mirror-lv4-vol1", "translate-lv3-vol2", "rotate-lv3-vol2", "overlay-lv3-vol1", "decompose-lv3-vol1", "fold-lv3-vol1", "solid-lv4-vol1"],
};
function nextWebPages() {
  const c = SHARED_COPY.nextWeb, next = NEXT_WEB[which];
  {
    const { page, x } = extraPage_(which === "first" ? "うつす・たすの続き（1／2）" : "つぎの一冊（1／2）");
    let y = titleBlock(page, x, c.heading, c.lead);
    const rows = [["課題", "この本の次の巻", "盤面", "どんな巻か"],
      ...next.map((sku) => { const h = volBySku(sku)!; return [childTask(PUBLISHED[sku].task), `Lv.${h.vol.lv}`, gridLabel(sku), h.vol.blurb.replace(/——.*$/, "。").replace(/自分で解いて.*$/, "")]; })];
    y = table(page, x, y + 2, rows, [34, 22, 16, 80], true, 8.4) + 6;
    if (which === "second") y = paragraph(page, "平面の課題は、Lv.4で5×5、Lv.5で6×6に盤面が広がります。", x, y, 150, 8.8, 5) + 4;
    framedRect(page, x, 196, 152, 36, grayscale(0.92));
    text(page, "TENZUの商品一覧", x + 6, 200, 11, "heading");
    paragraph(page, which === "first" ? c.shelf : "課題とレベルから選べます。1巻12問のPDFで、まとめて買うと割引があります。", x + 6, 207, 108, 8.5, 4.7);
    text(page, "tenzu.jp/products", x + 6, 226, 8, "mono");
    qr(page, "https://tenzu.jp/products", x + 124, 198, 25);
    if (y > 194) throw new Error("Next-web table overflows");
  }
  const { page, x } = extraPage_(which === "first" ? "うつす・たすの続き（2／2）" : "つぎの一冊（2／2）");
  text(page, c.preview, x, 28, 12, "heading");
  const cols = 2, cw = 74, ch = next.length > 4 ? 44 : 60;
  next.forEach((sku, i) => {
    const cx = x + (i % cols) * (cw + 4), cy = 38 + Math.floor(i / cols) * (ch + 4);
    framedRect(page, cx, cy, cw, ch, grayscale(0.97));
    const h = volBySku(sku)!;
    text(page, `${childTask(PUBLISHED[sku].task)}  Lv.${h.vol.lv}・${gridLabel(sku)}`, cx + 3, cy + 2.5, 8.5, "heading");
    preview(page, sku, cx + 2, cy + 8, cw - 4, ch - 10);
  });
  paragraph(page, c.previewNote, x, BOTTOM - 4, 150, 8, 4.4);
}
function nextMakerPages() {
  const c = SHARED_COPY.maker;
  {
    const { page, x } = extraPage_(which === "first" ? "自分で問題を作りたいときは（1／2）" : "つぎの一冊（メーカー 1／2）");
    let y = titleBlock(page, x, c.heading, c.lead);
    c.steps.forEach((s, i) => {
      framedRect(page, x, y, 152, 30, i % 2 ? grayscale(1) : grayscale(0.92));
      text(page, `0${i + 1}`, x + 6, y + 5, 14, "mono");
      text(page, s.title, x + 22, y + 4.5, 11.5, "heading");
      paragraph(page, s.body, x + 22, y + 14, 124, 9, 5);
      y += 34;
    });
    paragraph(page, c.kinds, x, y + 3, 150, 9.5, 5.5);
  }
  const { page, x } = extraPage_(which === "first" ? "自分で問題を作りたいときは（2／2）" : "つぎの一冊（メーカー 2／2）");
  text(page, "メーカーで作れる紙面の例", x, 28, 12, "heading");
  const kinds = ["copy-lv3-vol1", "fill-lv3-vol1", "mirror-lv3-vol1", "translate-lv2-vol1", "rotate-lv2-vol1", "overlay-lv2-vol1"];
  kinds.forEach((sku, i) => {
    const cx = x + (i % 2) * 78, cy = 38 + Math.floor(i / 2) * 42;
    text(page, childTask(PUBLISHED[sku].task), cx, cy, 8.5, "heading");
    preview(page, sku, cx, cy + 5, 74, 34);
  });
  framedRect(page, x, 170, 152, 62, grayscale(0.92));
  fillRect(page, x, 170, 2, 62, grayscale(0.18));
  text(page, "無料で使える範囲", x + 7, 174, 11, "heading");
  paragraph(page, c.free, x + 7, 183, 108, 8.8, 5);
  text(page, "tenzu.jp/makers", x + 7, 224, 8, "mono");
  qr(page, "https://tenzu.jp/makers", x + 122, 180, 26);
}
function troublePage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = COPY.trouble;
  let y = titleBlock(page, x, c.heading);
  y = boxes(page, x, y, c.boxes, 8.8);
  if ("calls" in c) {
    text(page, c.callsTitle, x, y + 1, 10.5, "heading");
    table(page, x, y + 8, c.calls, [40, 112], false, 8.6);
  }
}
function wayBackPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = PAGE_COPY.first.wayBack;
  let y = titleBlock(page, x, c.heading, c.lead);
  y = table(page, x, y, [["手が止まった", "新しく出るもの", "戻る先", "戻ったら見ること"],
    ...c.rows], [26, 40, 24, 62], true, 8.8) + 8;
  paragraph(page, c.foot, x, y, 150, 8.5, 4.8);
}
/** Book 1: the print settings the reader benefit offers, drawn with the same renderer as the book. */
function printOptionsPage() {
  const { page, x } = extraPage_("購入者特典 / 選べる印刷設定");
  const c = PRINT_OPTIONS;
  let y = titleBlock(page, x, c.heading, c.lead) + 2;
  const w = 31, h = w * 297 / 210, step = 59;
  c.samples.forEach((sample, i) => {
    const sx = x + i * step;
    text(page, sample.label, sx, y, 10.5, "heading");
    framedRect(page, sx, y + 8, w, h);
    line(page, sx + 3, y + 11, sx + 13, y + 11, grayscale(0.4));
    const cellH = (h - 8) / sample.perPage;
    for (let j = 0; j < sample.perPage; j++)
      paintProblemPdf(page, volumes[0].rendered[0], { x: (sx + 2) * MM, y: (y + 14 + j * cellH) * MM, width: (w - 4) * MM, height: cellH * MM },
        sample.vertical ? "vertical" : "horizontal", { minLineMm: 0.2, monochrome: true, dotScale: 1, inkGray: 0.3, gapScale: 1.6 });
    text(page, sample.note, sx + (w - widthMm(sample.note, 8, "body")) / 2, y + 10 + h, 8);
  });
  y += h + 15;
  text(page, c.sampleNote, x, y, 8, "body", grayscale(0.4));
  y += 7;
  fillRect(page, x, y, 152, 7, grayscale(0.16));
  text(page, c.rowsHead[0], x + 3, y + 1.4, 8.5, "heading", grayscale(1));
  text(page, c.rowsHead[1], x + 64, y + 1.4, 8.5, "heading", grayscale(1));
  y += 7;
  c.rows.forEach(([need, setting, note]) => {
    text(page, need, x + 3, y + 3, 9.5, "heading");
    text(page, setting, x + 64, y + 1.6, 9.5, "heading");
    text(page, note, x + 64, y + 6.6, 7.8);
    y += 11;
    line(page, x, y, x + 152, y, grayscale(0.7));
  });
  y = paragraph(page, c.foot, x, y + 4, 150, 8.3, 4.6);
  if (y > BOTTOM) throw new Error(`Print options overflow: ${y.toFixed(1)}`);
}
/** Book 1: the page before the Web spreads that splits the way on by what the child wants next. */
function afterBookPage() {
  const { page, x } = extraPage_("この本のあとに");
  const c = PAGE_COPY.first.afterBook;
  let y = titleBlock(page, x, c.heading, c.lead, c.kicker) + 2;
  y = boxes(page, x, y, c.boxes, 9.2) + 3;
  // The level-guide QR sits on the next page, so this page only points to it.
  y = paragraph(page, fillRefs(c.foot), x, y, 150, 8.8, 5);
  if (y > BOTTOM) throw new Error(`After-book page overflows: ${y.toFixed(1)}`);
}
function afterwordPage() {
  const { page, x } = extraPage_("あとがき");
  brandDots(page, x + 1, 27, 145, 8);
  text(page, "店主から", x, 44, 18, "heading");
  let y = 62;
  for (const p of COPY.afterword) y = paragraph(page, fillRefs(p), x, y, 148, 9.5, 6) + 4;
  if (y > 222) throw new Error(`Afterword overflows: ${y.toFixed(1)}`);
  text(page, "TENZU 店主", x + 152 - widthMm("TENZU 店主", 10), 226, 10, "heading");
}
/** The seven moving tasks in their three groups (mirror/translate/rotate, the compose tasks, solid). */
function taskGroups(page: PDFPage, x: number, y: number, groups: readonly { title: string; tasks: readonly string[]; body: string }[]) {
  groups.forEach((g) => {
    framedRect(page, x, y, 152, 17, grayscale(0.92));
    fillRect(page, x, y, 2, 17, grayscale(0.18));
    text(page, g.title, x + 6, y + 3, 10.5, "heading");
    text(page, g.tasks.map((t) => short(t)).join("・"), x + 62, y + 3.4, 10, "heading", grayscale(0.35));
    text(page, g.body, x + 6, y + 10.5, 8.5);
    y += 20;
  });
  return y;
}
function mapPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = PAGE_COPY.second.map;
  let y = taskGroups(page, x, titleBlock(page, x, c.heading, c.lead), c.groups) + 3;
  text(page, "この本の範囲と、Webの続き", x, y, 10.5, "heading");
  y += 8;
  const inBook = (task: string, lv: number) => volumes.some((v) => v.set.task === task && v.vol.lv === lv);
  const rows: string[][] = [["課題", "Lv.2", "Lv.3", "Lv.4", "Lv.5"]];
  for (const task of tasks) rows.push([short(task), ...[2, 3, 4, 5].map((lv) =>
    task === "solid" && lv === 2 ? "—"
      : inBook(task, lv) ? ((task === "translate" || task === "rotate") && lv === 3 ? "この本＋Web" : "この本") : "Web")]);
  const widths = [36, 29, 29, 29, 29];
  rows.forEach((row, ri) => {
    let cx = x;
    row.forEach((cell, ci) => {
      const head = ri === 0, book = cell.startsWith("この本");
      fillRect(page, cx + 0.4, y + 0.4, widths[ci] - 0.8, 7.2, head ? grayscale(0.16) : book ? grayscale(0.3) : ci === 0 ? grayscale(1) : grayscale(0.92));
      text(page, cell, cx + 2.5, y + 1.6, 8.5, head || ci === 0 ? "heading" : "body", head || book ? grayscale(1) : ink);
      cx += widths[ci];
    });
    y += 8;
  });
  paragraph(page, c.foot, x, y + 5, 150, 8.5, 4.8);
}
function boxesPage(c: { heading: string; lead?: string; boxes: readonly Box[] }, header = "おうちの方へ", size = 9) {
  const { page, x } = extraPage_(header);
  boxes(page, x, titleBlock(page, x, c.heading, c.lead), c.boxes, size);
}
function isometricPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = PAGE_COPY.second.isometric;
  let y = titleBlock(page, x, c.heading, c.lead) + 2;
  // A cube on a 6×6 dot board: front face 3×3, depth (+2, −2). Each step adds one group of edges.
  const unit = 6, front = [[0, 2], [3, 2], [3, 5], [0, 5]] as const, d = [2, -2] as const;
  const groups: (readonly (readonly [number, number])[])[][] = [
    [[front[0], front[1]], [front[1], front[2]], [front[2], front[3]], [front[3], front[0]]],
    [[front[0], [front[0][0] + d[0], front[0][1] + d[1]]], [front[1], [front[1][0] + d[0], front[1][1] + d[1]]], [front[2], [front[2][0] + d[0], front[2][1] + d[1]]]],
    [[[front[0][0] + d[0], front[0][1] + d[1]], [front[1][0] + d[0], front[1][1] + d[1]]], [[front[1][0] + d[0], front[1][1] + d[1]], [front[2][0] + d[0], front[2][1] + d[1]]]],
  ];
  c.steps.forEach((s, i) => {
    const bx = x + 2, by = y;
    for (let r = 0; r < 6; r++) for (let col = 0; col < 6; col++)
      page.drawCircle({ x: (bx + col * unit) * MM, y: page.getHeight() - (by + r * unit) * MM, size: 0.45 * MM, color: grayscale(0.55) });
    groups.slice(0, i + 1).forEach((g, gi) => g.forEach(([a, b]) =>
      page.drawLine({ start: { x: (bx + a[0] * unit) * MM, y: page.getHeight() - (by + a[1] * unit) * MM },
        end: { x: (bx + b[0] * unit) * MM, y: page.getHeight() - (by + b[1] * unit) * MM },
        thickness: (gi === i ? 0.7 : 0.35) * MM, color: gi === i ? ink : grayscale(0.55), lineCap: 1 })));
    text(page, `0${i + 1}`, x + 42, y - 1, 13, "mono");
    text(page, s.title, x + 54, y - 1, 11.5, "heading");
    paragraph(page, s.body, x + 54, y + 8, 96, 9, 5);
    y += 40;
  });
  paragraph(page, c.foot, x, y, 150, 8.8, 5);
}
/** Book 1: how the Web levels map onto board size and line type, and where the book stops. */
function levelsPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = PAGE_COPY.first.levels;
  let y = titleBlock(page, x, c.heading, c.lead) + 2;
  const widths = [30, 26, 60, 36];
  [["レベル", "盤面", "線", ""], ...c.rows].forEach((row, ri) => {
    let cx = x;
    row.forEach((cell, ci) => {
      const head = ri === 0, book = cell === "この本";
      fillRect(page, cx + 0.4, y + 0.4, widths[ci] - 0.8, 9.2, head ? grayscale(0.16) : book ? grayscale(0.3) : grayscale(0.92));
      text(page, cell, cx + 3, y + 2.4, 9.5, head || ci === 0 || book ? "heading" : "body", head || book ? grayscale(1) : ink);
      cx += widths[ci];
    });
    y += 10;
  });
  paragraph(page, fillRefs(c.foot), x, y + 6, 150, 9, 5.2);
}
function examPage() {
  const { page, x } = extraPage_("おうちの方へ");
  const c = PAGE_COPY.second.exam;
  let y = titleBlock(page, x, c.heading, c.lead);
  y = table(page, x, y, [["受験対策で使われる課題名", "このシリーズの課題"], ...c.rows], [76, 76], true, 9) + 6;
  boxes(page, x, y, c.boxes);
}
/* ---- Book 1 pages drawn in the owner's frame (designFrame): Plex Sans JP Bold headings and hairline rules, as on the designed pages. */
const DC = DESIGN_COPY;
const white = grayscale(1), hair = grayscale(0.78);
function designTitle(page: PDFPage, x: number, w: number, heading: string, lead?: string) {
  let y = 22;
  for (const l of wrap(heading, f.bold, 19, w)) { text(page, l, x, y, 19, "bold"); y += 9.6; }
  return lead ? paragraph(page, fillRefs(lead), x, y + 3.5, w, 9.2, 5.4) + 4 : y + 3;
}
/** URL as on the designed pages: Plex Mono with a hairline underline. */
function urlText(page: PDFPage, url: string, x: number, y: number, size = 8.5) {
  text(page, url, x, y, size, "mono");
  line(page, x, y + size * 0.42 + 0.9, x + widthMm(url, size, "mono"), y + size * 0.42 + 0.9, grayscale(0.14));
}
/** A titled box with a QR on the right, closing a page that sends the reader to the Web. */
function qrBox(page: PDFPage, x: number, y: number, w: number, h: number, title: string, body: string, url: string) {
  line(page, x, y, x + w, y, grayscale(0.14));
  text(page, title, x, y + 4, 11, "bold");
  paragraph(page, body, x, y + 11.5, w - h - 6, 8.6, 4.8);
  urlText(page, url, x, y + h - 6.5);
  qr(page, url, x + w - h + 3, y + 3, h - 4);
}
/** Book 1, page 1: what the book does for a first-timer, in the place a buyer looks first. */
function featuresPage() {
  const c = DC.features, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  text(page, c.title, x, 22, 25, "bold");
  text(page, c.titleSub, x - 2, 33.5, 19, "bold");
  // The mark of the owner's first page: a 3×3 board with one shape drawn, a few lines short of a square.
  const mx = x + w - 22, my = 23, step = 9, gray = grayscale(0.3);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++)
    page.drawCircle({ x: (mx + k * step) * MM, y: page.getHeight() - (my + r * step) * MM, size: 0.55 * MM, color: gray });
  ([[0, 0, 0, 2], [0, 0, 2, 0], [2, 0, 2, 2]] as const).forEach(([x1, y1, x2, y2]) =>
    line(page, mx + x1 * step, my + y1 * step, mx + x2 * step, my + y2 * step, gray));
  text(page, c.tagline, x, 47, 10.5, "bold");
  let y = paragraph(page, c.lead, x, 56, w, 9.5, 5.6) + 4;
  line(page, x, y, x + w, y, grayscale(0.14));
  y += 7;
  c.points.forEach((pt, i) => {
    text(page, `0${i + 1}`, x, y - 0.6, 15, "mono", grayscale(0.4));
    text(page, pt.title, x + 15, y, 11.5, "bold");
    y = paragraph(page, fillRefs(pt.body), x + 15, y + 7.6, w - 15, 9.5, 5.5) + 9;
  });
  if (y > 222) throw new Error(`Features page overflows: ${y.toFixed(1)}`);
  line(page, x, 226, x + w, 226, hair);
  let nx = x;
  for (const [label, ref] of c.nav) {
    const s = `${label}  ${fillRefs(ref)}ページ`;
    text(page, s, nx, 230, 8.5, "bold");
    nx += widthMm(s, 8.5, "bold") + 9;
  }
  if (nx > x + w - 27 - 6) throw new Error("Page links run into the logo");
  logo(page, x + w, 228.5);
}
/** Book 1, page 2: what a dot figure is, set against the dot-to-dot a first-timer already knows. */
function aboutPage() {
  const c = DC.about, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  let y = designTitle(page, x, w, c.heading, c.lead) + 1;
  // Side by side: a numbered dot-to-dot half drawn, and a dot figure with its model.
  const cw = (w - 6) / 2, ch = 56, gray = grayscale(0.35);
  [c.dotsTitle, c.figureTitle].forEach((t, i) => {
    const cx = x + i * (cw + 6);
    fillRect(page, cx, y, cw, ch, grayscale(0.95));
    text(page, t, cx + 4, y + 3, 10.5, "bold");
    paragraph(page, i ? c.figureCaption : c.dotsCaption, cx + 4, y + ch - 8, cw - 8, 8.2, 4.5);
  });
  const hx = x + cw / 2, pts = [[0, 13], [14, 24], [14, 42], [-14, 42], [-14, 24]].map(([dx, dy]) => [hx + dx, y + dy] as const);
  [[0, 1], [1, 2]].forEach(([a, b]) => line(page, pts[a][0], pts[a][1], pts[b][0], pts[b][1], gray));
  pts.forEach(([px, py], i) => {
    page.drawCircle({ x: px * MM, y: page.getHeight() - py * MM, size: 0.7 * MM, color: grayscale(0.15) });
    text(page, String(i + 1), px + (px < hx ? -4 : 1.6), py - 4.2, 8.5, "mono", grayscale(0.3));
  });
  const vi = volumes.findIndex((v) => v.sku === "copy-lv1-vol1");
  if (vi < 0) throw new Error("about: copy-lv1-vol1 missing");
  question(page, vi, 5, x + cw + 8, y + 9, cw - 4, 36, false, true);
  y += ch + 6;
  // What differs, row by row.
  const cols = [0, 34, 34 + (w - 34) / 2];
  c.compare.forEach((row, ri) => {
    row.forEach((cell, ci) => text(page, cell, x + cols[ci], y + 1.6, ri === 0 ? 8.5 : 9, ri === 0 || ci === 0 ? "bold" : "body",
      ri === 0 || ci === 0 ? grayscale(0.4) : ink));
    y += 7.2;
    line(page, x, y, x + w, y, ri === 0 ? grayscale(0.14) : hair);
  });
  y += 6;
  text(page, c.bridgeTitle, x, y, 11, "bold");
  y = paragraph(page, c.bridge, x, y + 7.5, w, 9, 5.1) + 6;
  const sw = (w - 8) / 3;
  c.steps.forEach((st, i) => {
    const sx = x + i * (sw + 4);
    line(page, sx, y, sx + sw, y, grayscale(0.14));
    text(page, `0${i + 1}`, sx, y + 3.5, 12, "mono");
    text(page, st.title, sx + 10, y + 3.6, 11, "bold");
    paragraph(page, st.body, sx, y + 11, sw, 8.6, 4.7);
  });
  y += 28;
  line(page, x, y, x + w, y, grayscale(0.14));
  text(page, c.aimTitle, x, y + 4, 11, "bold");
  y = paragraph(page, c.aim, x, y + 11.5, w, 9, 5.1);
  if (y > BOTTOM) throw new Error(`About page overflows: ${y.toFixed(1)}`);
}
const LINEUP_GROUPS = ["見て写す", "かたちを動かす", "重ねる・分ける"];
/** Book 1, page 3: the whole book in order; the problem part, the reason to buy, carries the level rows. */
function contentsPage() {
  const c = DC.contents, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  let y = designTitle(page, x, w, c.heading) + 1;
  const list = (title: string, items: readonly (readonly [string, string])[]) => {
    text(page, title, x, y, 10, "bold", grayscale(0.4));
    y += 6.5;
    const half = Math.ceil(items.length / 2);
    items.forEach(([t, ref], i) => {
      const cx = x + (i < half ? 0 : w / 2 + 3), cy = y + (i % half) * 6.3, p = fillRefs(ref);
      text(page, t, cx, cy, 9);
      text(page, p, cx + w / 2 - 6 - widthMm(p, 9, "mono"), cy, 9, "mono");
    });
    y += half * 6.3 + 4;
  };
  list(c.frontTitle, c.front);
  const qs = questions;
  line(page, x, y, x + w, y, grayscale(0.14));
  const head = `${c.problemsTitle}　${qs[0].number}〜${qs[qs.length - 1].number}ばん`, range = `${pageOf("explanations")}〜${qs[qs.length - 1].page}ページ`;
  text(page, head, x, y + 4, 13, "bold");
  text(page, range, x + widthMm(head, 13, "bold") + 5, y + 5.4, 10, "bold");
  text(page, fillRefs(c.problemsNote), x, y + 12.5, 8.5, "body", grayscale(0.4));
  y += 20;
  const cols = [0, 30, 78, 114], labels = ["レベル", "新しく出るもの", "たす（欠け補完）", "うつす（模写）"];
  labels.forEach((l, i) => text(page, l, x + cols[i], y, 8.5, "bold", grayscale(0.4)));
  y += 6;
  line(page, x, y, x + w, y, grayscale(0.14));
  const habit = extraPage.get("habit")!;
  volumes.forEach((v, i) => {
    if (!pairStart(i)) return;
    // The habit page sits between two levels; it gets its own thin row where it falls.
    if (introPage.get(introKey(i))! > habit && introPage.get(introKey(i - 1))! < habit) {
      text(page, c.habit, x + cols[1], y + 2.2, 8.8);
      text(page, `${habit}ページ`, x + cols[2], y + 2.2, 9, "bold");
      y += 7.5;
      line(page, x, y, x + w, y, hair);
    }
    const ry = y + 3.2;
    text(page, lvLabel(i), x, ry, 11, "bold");
    text(page, v.grid, x, ry + 7, 8, "body", grayscale(0.4));
    paragraph(page, STAGE_COPY[pairKey(i)].fresh, x + cols[1], ry + 0.6, 44, 8.8, 4.8);
    volumes.forEach((item, j) => {
      if (pairKey(j) !== pairKey(i)) return;
      const vq = qs.filter((q) => q.volumeIndex === j), cx = x + cols[item.set.task === "fill" ? 2 : 3];
      text(page, `${vq[0].number}〜${vq[11].number}ばん`, cx, ry + 0.6, 8.8);
      text(page, `${introPage.get(introKey(j))}〜${vq[11].page}ページ`, cx, ry + 6.6, 9, "bold");
    });
    y += 16;
    line(page, x, y, x + w, y, hair);
  });
  y += 6;
  list(c.backTitle, c.back);
  if (y - 4 > BOTTOM) throw new Error(`Contents overflow: ${(y - 4).toFixed(1)}`);
}
/** Book 1, page 5: the nine tasks by level, with this book's part in black. */
function lineupPage() {
  const c = DC.contents, { page, pn, x, w } = designFrame(c.lineupLabel);
  expect("extra", pn);
  // The reader meets the name TENZU here first: the shop comes before the table of its tasks, under its logo.
  if (widthMm(c.aboutHeading, 19, "bold") > w - 27 - 6) throw new Error("Heading runs into the logo");
  logo(page, x + w, 20.5);
  let y = designTitle(page, x, w, c.aboutHeading, c.aboutLead);
  const sw = (w - 6) / 2;
  let end = y;
  c.aboutPoints.forEach((s, i) => {
    const sx = x + (i % 2) * (sw + 6);
    if (i % 2 === 0 && i) y = end + 4;
    line(page, sx, y, sx + sw, y, grayscale(0.14));
    text(page, `0${i + 1}`, sx, y + 3.2, 10.5, "mono", grayscale(0.4));
    text(page, s.title, sx + 8, y + 3.4, 10, "bold");
    end = Math.max(end, paragraph(page, fillRefs(s.body), sx, y + 10, sw, 8.2, 4.5));
  });
  y = end + 4.5;
  text(page, c.lineupHeading, x, y, 12, "bold");
  y = paragraph(page, c.lineupLead, x, y + 7, w, 8.6, 4.8) + 2;
  const nameW = 36, colW = (w - nameW) / 5, inBook = new Set(volumes.map((v) => v.sku));
  for (let lv = 1; lv <= 5; lv++) {
    text(page, `Lv.${lv}`, x + nameW + (lv - 1) * colW + 2, y, 9, "mono");
    text(page, LEVEL_NAMES[lv - 1], x + nameW + (lv - 1) * colW + 2, y + 4.6, 7.3, "body", grayscale(0.4));
  }
  y += 9.5;
  LINEUP_GROUPS.forEach((group, gi) => {
    if (gi) y += 1.8;
    text(page, group, x, y + 0.6, 7.5, "bold", grayscale(0.4));
    y += 4.6;
    for (const task of LAUNCH_TASKS.filter((t) => t.groupIdx === gi)) {
      line(page, x, y, x + w, y, hair);
      text(page, task.name, x, y + 1.6, 9, "bold");
      for (let lv = 1; lv <= 5; lv++) {
        const vols = task.vols.filter((v) => v.lv === lv && v.status === "live"), cx = x + nameW + (lv - 1) * colW;
        if (!vols.length) { text(page, "—", cx + colW / 2 - 1.5, y + 1.6, 8.2, "body", grayscale(0.6)); continue; }
        const book = vols.some((v) => inBook.has(v.sku));
        fillRect(page, cx + 0.7, y + 0.6, colW - 1.4, 5.2, book ? grayscale(0.14) : grayscale(0.9));
        const label = book ? c.legendBook : `${vols.length}巻`;
        text(page, label, cx + (colW - widthMm(label, 8.2, book ? "bold" : "body")) / 2, y + 1.6, 8.2, book ? "bold" : "body", book ? white : ink);
      }
      y += 6.2;
    }
  });
  line(page, x, y, x + w, y, hair);
  fillRect(page, x, y + 4.5, 6, 4, grayscale(0.14)); text(page, c.legendBook, x + 8, y + 4.1, 8);
  fillRect(page, x + 28, y + 4.5, 6, 4, grayscale(0.9)); text(page, c.legendWeb, x + 36, y + 4.1, 8);
  if (y + 10 > 210) throw new Error(`Lineup overflows: ${(y + 10).toFixed(1)}`);
  qrBox(page, x, 212, w, 22, c.moreTitle, c.moreBody, "https://tenzu.jp/products");
}
/** Small figures for the print features: drawn with the book's own renderer so they show real pages. */
function printFeaturesPage() {
  const c = DC.print, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  let y = designTitle(page, x, w, c.heading, c.lead);
  const sample = volumes.find((v) => v.sku === "copy-lv3-vol1") ?? volumes[0];
  const pb = sample.rendered[0], cw = (w - 6) / 2, ch = 64;
  const a4 = (fx: number, fy: number, fw: number) => { framedRect(page, fx, fy, fw, fw * 297 / 210); return fw * 297 / 210; };
  c.features.forEach((ft, i) => {
    const cx = x + (i % 2) * (cw + 6), cy = y + Math.floor(i / 2) * (ch + 5), fh = 33;
    fillRect(page, cx, cy, cw, fh, grayscale(0.96));
    if (ft.kind === "stack") {
      const fw = 19, fy = cy + 2.5;
      a4(cx + 10, fy, fw);
      for (let j = 0; j < 3; j++) paintProblemPdf(page, pb, { x: (cx + 11) * MM, y: (fy + 2 + j * 8.6) * MM, width: (fw - 2) * MM, height: 7.6 * MM }, "horizontal", { minLineMm: 0.15, monochrome: true, inkGray: 0.3, gapScale: 1.6, dotScale: 0.6 });
      a4(cx + cw - 10 - fw, fy, fw);
      paintProblemPdf(page, pb, { x: (cx + cw - 9 - fw) * MM, y: (fy + 1.5) * MM, width: (fw - 2) * MM, height: 24 * MM }, "vertical", { minLineMm: 0.15, monochrome: true, inkGray: 0.3, gapScale: 1.2, dotScale: 0.8 });
      text(page, "→", cx + cw / 2 - 2, fy + 11, 11, "body", grayscale(0.4));
    } else if (ft.kind === "nodots") {
      paintProblemPdf(page, pb, { x: (cx + 4) * MM, y: (cy + 2) * MM, width: (cw - 8) * MM, height: 29 * MM }, "horizontal", { minLineMm: 0.2, monochrome: true, inkGray: 0.3, gapScale: 2.2, noDots: true });
    } else if (ft.kind === "paper") {
      // A4・B4・A3 standing side by side at true proportion, then A4 turned sideways.
      const s = 0.055, base = cy + fh - 3;
      let fx = cx + 4;
      ([["A4", 210, 297], ["B4", 257, 364], ["A3", 297, 420], ["A4よこ", 297, 210]] as const).forEach(([name, pw, ph]) => {
        framedRect(page, fx, base - ph * s, pw * s, ph * s);
        text(page, name, fx + 1, base - ph * s + 1, 7.5, name.length > 2 ? "body" : "mono");
        fx += pw * s + 3.5;
      });
    } else {
      const fw = 21, fy = cy + 2.5, fx = cx + cw / 2 - fw / 2;
      a4(fx, fy, fw);
      line(page, fx + 1.5, fy + 2.9, fx + 11, fy + 2.9, grayscale(0.5));
      line(page, fx + 12.5, fy + 2.9, fx + fw - 1.5, fy + 2.9, grayscale(0.5));
      for (let j = 0; j < 3; j++) paintProblemPdf(page, pb, { x: (fx + 1) * MM, y: (fy + 4.5 + j * 8) * MM, width: (fw - 2) * MM, height: 7.2 * MM }, "horizontal", { minLineMm: 0.15, monochrome: true, inkGray: 0.3, gapScale: 1.6, dotScale: 0.6 });
      text(page, "なまえ・ひづけ →", fx + fw + 2, fy + 1, 7.5, "body", grayscale(0.4));
    }
    text(page, ft.title, cx, cy + fh + 3.5, 10.5, "bold");
    paragraph(page, ft.body, cx, cy + fh + 10.5, cw, 8.4, 4.6);
  });
  y += 2 * (ch + 5);
  y = paragraph(page, c.foot, x, y, w, 8.4, 4.7);
  if (y > 203) throw new Error(`Print features overflow: ${y.toFixed(1)}`);
  qrBox(page, x, 207, w, 27, c.guideTitle, "子どもの様子ごとの刷り方を、図とあわせてまとめています。", "https://tenzu.jp/articles/print-settings-guide");
}
/** A grid of small non-writable previews with the last cell sending the reader to the shelf. */
function previewGrid(page: PDFPage, x: number, y: number, w: number, skus: readonly string[], shelf: { title: string; body: string; url: string }, ch: number) {
  const cols = 2, cw = (w - 4) / 2;
  skus.forEach((sku, i) => {
    const cx = x + (i % cols) * (cw + 4), cy = y + Math.floor(i / cols) * (ch + 4), h = volBySku(sku)!;
    framedRect(page, cx, cy, cw, ch, grayscale(0.97));
    text(page, `${childTask(PUBLISHED[sku].task)}  Lv.${h.vol.lv}・${gridLabel(sku)}`, cx + 3, cy + 2.5, 8.5, "bold");
    preview(page, sku, cx + 2, cy + 9, cw - 4, ch - 11);
  });
  const n = skus.length, sx = x + (n % cols) * (cw + 4), sy = y + Math.floor(n / cols) * (ch + 4);
  framedRect(page, sx, sy, cw, ch, grayscale(0.9));
  text(page, shelf.title, sx + 4, sy + 4, 10.5, "bold");
  paragraph(page, shelf.body, sx + 4, sy + 12, cw - 34, 8, 4.5);
  urlText(page, shelf.url, sx + 4, sy + ch - 7, 7.5);
  qr(page, shelf.url, sx + cw - 27, sy + 4, 24);
  return sy + ch;
}
function moreLevelsPage() {
  const c = DC.moreLevels, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  const y = designTitle(page, x, w, c.heading, c.lead);
  const skus = [...NEXT_WEB.first, ...(PUBLISHED["fill-lv5-vol2"] ? ["fill-lv5-vol2"] : [])];
  const rows = Math.ceil((skus.length + 1) / 2), ch = Math.min(52, (BOTTOM - y - 4) / rows - 4);
  const end = previewGrid(page, x, y + 2, w, skus, { title: c.shelfTitle, body: c.shelfBody, url: "https://tenzu.jp/products" }, ch);
  if (end > BOTTOM) throw new Error(`More-levels page overflows: ${end.toFixed(1)}`);
}
function moreTasksPage() {
  const c = DC.moreTasks, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  const y = designTitle(page, x, w, c.heading, c.lead);
  const end = previewGrid(page, x, y + 2, w, WEB_TASK_ENTRY, { title: c.shelfTitle, body: c.shelfBody, url: "https://tenzu.jp/products" }, (BOTTOM - y - 4) / 4 - 4);
  if (end > BOTTOM) throw new Error(`More-tasks page overflows: ${end.toFixed(1)}`);
}
/** A writable problem of a volume outside this book: same geometry and ink as the book's own problem pages.
 * answerGuide draws the answer in dashed grey, for a worked example. */
function sampleQuestion(page: PDFPage, sku: string, rank: number, x: number, y: number, w: number, h: number, answerGuide = false) {
  const { p, rendered } = sampleOf(sku, rank);
  if (p.grid.type === "solid") {
    // Stacked like the book's solid pages: the 9×9 boards are too fine to sit side by side.
    const g = pairGeom(w * MM, h * MM, "vertical");
    for (let side = 0; side < 2; side++)
      paintGridPdf(page, { x: x * MM + g.ox, y: y * MM + g.oy + side * g.dy, width: g.pane, height: g.pane },
        p.grid.cols, p.grid.rows, side ? [] : p.solidEdges ?? [], { minLineMm: LINE, inkGray: 0.6 });
    return;
  }
  const compose = Boolean(rendered.compose);
  paintProblemPdf(page, rendered, { x: x * MM, y: y * MM, width: w * MM, height: h * MM }, "horizontal",
    { minLineMm: LINE, monochrome: true, dotScale: 1, inkGray: 0.6, gapScale: compose ? 1 : 3.1, markerMaxPaneRatio: 0.23, answerGuide });
}
/** The sampled problem the reader solves: solid has one, the others a worked example (the easiest) and the next one. */
const sampleRank = (sku: string) => PUBLISHED[sku].task === "solid" ? 0 : 1;
/** Book 1: one problem from the first volume of each of the 7 other tasks, laid out like a volume's explanation page. */
function samplePages() {
  const c = DC.samples;
  for (const sku of WEB_TASK_ENTRY) {
    const task = PUBLISHED[sku].task, hit = volBySku(sku)!, { page, pn, x, w } = designFrame(c.label);
    expect("extra", pn);
    fillRect(page, x, 20, w, 19, grayscale(0.14));
    text(page, childTask(task), x + 5, 24.4, 18, "heading", white);
    const right = `レベル${fw(hit.vol.lv)}　${fw(gridLabel(sku))}`;
    text(page, right, x + w - 4 - widthMm(right, 13), 25.6, 13, "heading", white);
    // A new task needs to be seen solved first: the easiest problem is a worked example, the next one is the child's.
    // Solid keeps a single problem; its stacked boards fill the page.
    let y = 44;
    if (task !== "solid") {
      text(page, c.example, x, y, 15, "heading");
      const labelY = Math.max(y + 17, paragraph(page, GUIDE_COPY[task], x, y + 9, w, 11, 6.2, "heading") + 2);
      exampleLabels(page, x, labelY, w, 44, sampleOf(sku).rendered.compose ? 3 : 2);
      sampleQuestion(page, sku, 0, x, labelY + 9.5, w, 44, true);
      y = labelY + 9.5 + 44 + 4;
      rule(page, x, y, w);
      y += 6;
    }
    text(page, c.tryIt, x, y, 15, "heading");
    const at = fillRefs(c.answerAt);
    text(page, at, x + w - widthMm(at, 9), y + 2, 9);
    text(page, TASK_COPY[task].instruction, x, y + 11, 11.5, "heading");
    if (203 - (y + 19) < 50) throw new Error(`Sample problem too small: ${sku}: ${(203 - y - 19).toFixed(1)} mm`);
    sampleQuestion(page, sku, sampleRank(sku), x, y + 19, w, 203 - (y + 19));
    const t = LAUNCH_TASKS.find((t) => t.slug === task)!, live = t.vols.filter((v) => v.status === "live");
    const lvs = live.map((v) => v.lv), body = `${childTask(task)}は、Lv.${Math.min(...lvs)}〜Lv.${Math.max(...lvs)}の${live.length}巻（1巻12問）。この${task === "solid" ? "1問" : "2問"}は、Lv.${hit.vol.lv}の最初の巻から選びました。`;
    qrBox(page, x, 207, w, 27, c.webTitle, body, `https://tenzu.jp/products/${task}`);
  }
}
/** The answers of the 7 samples on one page, so the child solves first and checks after. */
function sampleAnswersPage() {
  const c = DC.samples, { page, pn, x, w } = designFrame(c.answersLabel);
  expect("extra", pn);
  const y = designTitle(page, x, w, c.answersHeading, c.answersLead) + 2;
  const cw = (w - 8) / 3, ch = 52;
  WEB_TASK_ENTRY.forEach((sku, i) => {
    const { p, rendered } = sampleOf(sku, sampleRank(sku)), task = PUBLISHED[sku].task;
    const cx = x + (i % 3) * (cw + 4), cy = y + Math.floor(i / 3) * (ch + 5);
    text(page, `${short(task)}  ${extraPage.get("samples")! + i}ページ`, cx, cy, 8.5, "bold");
    framedRect(page, cx, cy + 6, cw, ch - 6, grayscale(0.97));
    const n = p.grid.type === "square" ? p.grid.n : p.grid.cols, rows = p.grid.type === "square" ? p.grid.n : p.grid.rows;
    paintGridPdf(page, { x: (cx + 3) * MM, y: (cy + 9) * MM, width: (cw - 6) * MM, height: (ch - 12) * MM }, n, rows,
      p.grid.type === "solid" ? p.solidEdges ?? [] : resultEdgesOf(rendered), { minLineMm: LINE, inkGray: 0.6 });
  });
  if (y + 3 * (ch + 5) > BOTTOM) throw new Error("Sample answers overflow");
}
function makerOnePage() {
  const c = DC.maker, { page, pn, x, w } = designFrame(c.label);
  expect("extra", pn);
  let y = designTitle(page, x, w, c.heading, c.lead);
  // What the reader can do with it, not what the pages look like: they have just seen 100 of those.
  text(page, c.usesTitle, x, y, 9, "bold", grayscale(0.4));
  y += 6.5;
  const cw = (w - 4) / 2, ch = 31;
  c.uses.forEach((u, i) => {
    const cx = x + (i % 2) * (cw + 4), cy = y + Math.floor(i / 2) * (ch + 4);
    fillRect(page, cx, cy, cw, ch, grayscale(0.96));
    text(page, u.title, cx + 4, cy + 4, 11, "bold");
    const end = paragraph(page, fillRefs(u.body), cx + 4, cy + 12.5, cw - 8, 8.6, 4.8);
    if (end > cy + ch - 1) throw new Error(`Maker use overflows: ${u.title}`);
  });
  y += 2 * (ch + 4) + 6;
  const sw = (w - 8) / 3;
  c.steps.forEach((s, i) => {
    const sx = x + i * (sw + 4);
    line(page, sx, y, sx + sw, y, grayscale(0.14));
    text(page, `0${i + 1}`, sx, y + 3.5, 12, "mono");
    text(page, s.title, sx + 10, y + 3.6, 10.5, "bold");
    paragraph(page, s.body, sx, y + 11, sw, 8.4, 4.6);
  });
  y += 26;
  // The nine makers in the same black/gray as page 5, so the book's two tasks read as "the ones you just did".
  text(page, c.kindsTitle, x, y, 9, "bold", grayscale(0.4));
  fillRect(page, x + w - 30, y + 0.6, 6, 4, grayscale(0.14)); text(page, c.kindsLegend, x + w - 22, y + 0.2, 8);
  y += 7;
  const bookTasks = new Set(volumes.map((v) => v.set.task)), kw = (w - 8) / 5;
  LAUNCH_TASKS.forEach((t, i) => {
    const kx = x + (i % 5) * (kw + 2), ky = y + Math.floor(i / 5) * 9, book = bookTasks.has(t.slug);
    fillRect(page, kx, ky, kw, 7, book ? grayscale(0.14) : grayscale(0.9));
    text(page, t.name, kx + (kw - widthMm(t.name, 8.8, "bold")) / 2, ky + 1.6, 8.8, "bold", book ? white : ink);
  });
  y += 18;
  if (y > 196) throw new Error(`Maker page overflows: ${y.toFixed(1)}`);
  line(page, x, 200, x + w, 200, grayscale(0.14));
  text(page, c.freeTitle, x, 204, 11, "bold");
  paragraph(page, c.freeBody, x, 211.5, w - 36, 8.4, 4.6);
  // The free link opens the copy maker only, so it says so; the other link lists all nine.
  const copyLabel = "うつす（模写）：", allLabel = "全9種類：";
  let ux = x;
  text(page, copyLabel, ux, 229.2, 8); ux += widthMm(copyLabel, 8, "body") + 1;
  urlText(page, "https://tenzu.jp/maker", ux, 229, 8); ux += widthMm("https://tenzu.jp/maker", 8, "mono") + 4.5;
  text(page, allLabel, ux, 229.2, 8); ux += widthMm(allLabel, 8, "body") + 1;
  urlText(page, "https://tenzu.jp/makers", ux, 229, 8); ux += widthMm("https://tenzu.jp/makers", 8, "mono");
  if (ux > x + w - 31) throw new Error(`Maker links run into the QR: ${ux.toFixed(1)}`);
  qr(page, "https://tenzu.jp/maker", x + w - 28, 203, 28);
}
function extraPages(slot: Extract<SeriesSlot, { kind: "extra" }>) {
  const before = doc.getPageCount();
  const draw: Record<string, () => void> = {
    parents: parentsPage, progress: progressPage, certificate: certificatePage, make: () => makePages(slot.pages),
    sibling: siblingPages, "web-tasks": webTasksPages, "next-web": nextWebPages, "next-maker": nextMakerPages, trouble: troublePage,
    "way-back": wayBackPage, "print-options": which === "first" && SB.design ? printFeaturesPage : printOptionsPage, levels: levelsPage, afterword: afterwordPage, map: mapPage, isometric: isometricPage, exam: examPage,
    "after-book": afterBookPage, features: featuresPage, about: aboutPage, contents: contentsPage, lineup: lineupPage, "more-levels": moreLevelsPage,
    samples: samplePages, "sample-answers": sampleAnswersPage, blank: () => { doc.addPage([KDP_B5.w * MM, KDP_B5.h * MM]); },
    "more-tasks": moreTasksPage, maker: makerOnePage,
    habit: () => boxesPage(PAGE_COPY.first.habit),
    hands: () => boxesPage(PAGE_COPY.second.hands, "おうちの方へ", 8.8),
  };
  if (!draw[slot.id]) throw new Error(`No page renderer: ${slot.id}`);
  draw[slot.id]();
  if (doc.getPageCount() - before !== slot.pages) throw new Error(`${slot.id} drew ${doc.getPageCount() - before} pages, planned ${slot.pages}`);
}
function answerPages() {
  for (const { v, vi } of answerVolumes) {
    const { page, pn, x } = newPage(`答え / ${short(v.set.task)}（${taskName(vi)}） Lv.${v.vol.lv}`);
    expect("answers", pn);
    text(page, "同じ点を結べているか、線のつながりを確かめましょう。", x, 28, 9);
    for (let pi = 0; pi < 12; pi++) {
      const q = questions.find((q) => q.volumeIndex === vi && q.position === pi)!;
      const xx = x + (pi % 3) * 51, yy = 43 + Math.floor(pi / 3) * 46;
      text(page, `${q.number}ばん / ${q.page}ページ`, xx, yy, 8.5);
      const p = v.set.problems[pi], n = p.grid.type === "square" ? p.grid.n : p.grid.cols, rows = p.grid.type === "square" ? p.grid.n : p.grid.rows;
      paintGridPdf(page, { x: xx * MM, y: (yy + 7) * MM, width: 47 * MM, height: 35 * MM }, n, rows,
        p.grid.type === "solid" ? p.solidEdges ?? [] : resultEdgesOf(v.rendered[pi]), { minLineMm: LINE, inkGray: 0.6 });
    }
  }
}
/** Book 1, last page, in the owner's frame: the shop owner's afterword, then the colophon held to the foot of the page. */
function afterwordColophon() {
  const c = DC.afterword, { page, pn, x, w } = designFrame(c.label);
  expect("colophon", pn);
  let y = designTitle(page, x, w, c.heading) + 1;
  // A little under the designed page's 10.5 pt: the owner's afterword is longer than the one designed for.
  for (const p of COPY.afterword) y = paragraph(page, p, x, y, w, 10, 5.7) + 3;
  text(page, c.sign, x + w - widthMm(c.sign, 10, "bold"), y, 10, "bold");
  const top = 179; // the colophon block is 56 mm tall and ends at the frame's foot
  if (y + 9 > top) throw new Error(`Afterword runs into the colophon: ${(y + 9).toFixed(1)} mm`);
  line(page, x, top, x + w, top, grayscale(0.14));
  text(page, "見て、考えて、書く力を、点描写から。", x, top + 6, 11, "bold");
  text(page, SB.title, x, top + 16.4, 12, "bold");
  text(page, SB.subtitle, x, top + 23.7, 9.2);
  text(page, "著者・編集・発行 TENZU / 初版 / 2026年", x, top + 32.5, 8.8);
  text(page, "© 2026 TENZU. All rights reserved.", x, top + 38.8, 8, "body", grayscale(0.4));
  const contact = "https://tenzu.jp/contact";
  urlText(page, contact, x + w - widthMm(contact, 8, "mono"), top + 38.4, 8);
  const end = paragraph(page, c.notice, x, top + 47.6, w, 8.2, 4.4);
  if (end > BOTTOM) throw new Error(`Colophon overflows: ${end.toFixed(1)}`);
  const logoEnd = logo(page, x + w, top + 5.7);
  text(page, SHOP_PHRASE, x + w - widthMm(SHOP_PHRASE, 7.5, "body"), logoEnd + 2, 7.5, "body", grayscale(0.4));
}
function colophon() {
  if (which === "first") return afterwordColophon();
  const { page, pn, x } = newPage("TENZUについて");
  expect("colophon", pn);
  brandDots(page, x + 1, 35, 145, 10);
  text(page, "見て、考えて、書く力を、", x, 43, 20, "heading");
  text(page, "点描写から。", x, 57, 20, "heading");
  paragraph(page, "TENZUは、点図形（点描写）プリントの専門店です。形を写す、動かす、重ねる。点の位置を考えながら線を引く時間を、家庭で無理なく続けられるように。", x, 95, 145, 10.5, 6.3);
  text(page, SB.title, x, 190, 12, "heading");
  text(page, SB.subtitle, x, 199, 8.5);
  text(page, "著者・編集・発行 TENZU / 初版 / 2026年", x, 210, 7.5);
  text(page, "© 2026 TENZU. All rights reserved. お問い合わせ：tenzu.jp/contact", x, 218, 7.5);
  paragraph(page, "本書と特典PDFの転載・再配布・販売を禁じます。特典PDFは購入者の家庭内で、きょうだいと何度でも印刷して使えます。教室等での利用はお問い合わせください。", x, 226, 132, 7.5, 3.8);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  f = {} as Fonts;
  for (const [key, filename] of FONT_FILES)
    // Full embedding: fontkit subsets lose glyphs in these Japanese TrueType fonts in Poppler (OFL 1.1 permits it).
    f[key] = await doc.embedFont(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts", filename)), { subset: false });
  // The owner's designed pages are copied as they are; only their header style is reproduced on generated level pages.
  const design = SB.design && await PDFDocument.load(await fs.readFile(path.join(ROOT, SB.design.file)));
  if (SB.design && design) {
    if (design.getPageCount() !== SB.design.pages.length) throw new Error(`Design PDF has ${design.getPageCount()} pages, listed ${SB.design.pages.length}`);
    // Every font a designed page names must be a real font object; KDP rejects broken or unembedded references.
    design.getPages().forEach((page, i) => {
      const fonts = page.node.Resources()?.lookupMaybe(PDFName.of("Font"), PDFDict);
      for (const [name, value] of fonts?.entries() ?? [])
        if (!(value instanceof PDFRef || value instanceof PDFDict)) throw new Error(`Design page ${SB.design!.pages[i]}: font ${name} is not a font object`);
    });
    f.bold = await doc.embedFont(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts/IBMPlexSansJP-Bold.ttf")), { subset: false });
  }
  logoImage = await doc.embedPng(await fs.readFile(path.join(ROOT, "web/scripts/kdp/tenzu-logo-horizontal-gray.png")));
  const copyDesign = async (count: number) => {
    for (let i = 0; i < count; i++) {
      const pn = doc.getPageCount() + 1, at = SB.design!.pages.indexOf(pn);
      if (at < 0) throw new Error(`Page ${pn} is not in the design PDF`);
      const page = doc.addPage((await doc.copyPages(design!, [at]))[0]);
      // The owner's QR is replaced by one with this page's tracking parameters, its modules fitted to the same box.
      for (const q of SB.design!.qr ?? []) {
        if (q.page !== pn) continue;
        const [x0, y0, x1, y1] = q.box, side = x1 - x0, n = qrCode.create(tracked(q.url, pn), { errorCorrectionLevel: "M" }).modules.size;
        fillRect(page, x0 - 2, y0 - 2, side + 4, y1 - y0 + 4, grayscale(1));
        qr(page, q.url, x0 - side * 4 / n, y0 - side * 4 / n, side * (n + 8) / n);
      }
    }
  };
  let vi = 0;
  const drawn = new Set<string>();
  for (const slot of SB.slots) {
    if (slot.kind === "stage") {
      const task = volumes[vi].set.task;
      if (SB.stageIntro) { if (introStart(vi)) stageIntroduction(vi); }
      else if (!drawn.has(task)) { taskIntroduction(vi); drawn.add(task); }
      for (let pi = leadProblems(vi); pi < 12; pi += slot.perPage) problemPage(vi, pi);
      vi++;
    } else if (design && SB.design!.pages.includes(doc.getPageCount() + 1)) await copyDesign(slot.kind === "extra" ? slot.pages : 1);
    else if (slot.kind === "extra") extraPages(slot);
    else ({ opening: openingPage, route: routePage, index: indexPage, benefit: benefitPage,
      answers: answerPages, colophon })[slot.kind]();
  }
  if (doc.getPageCount() !== pages.length) throw new Error(`Drew ${doc.getPageCount()} pages, planned ${pages.length}`);
  doc.context.trailerInfo.Info = undefined;
  const bytes = await doc.save({ useObjectStreams: false });
  await fs.writeFile(path.join(OUT, "interior.pdf"), bytes);
  const sources = await Promise.all(volumes.map(async (v) => {
    const file = `web/app/products/problems/published/${v.dataSku}.json`;
    return { sku: v.sku, file, planned: v.planned, sha256: sha(await fs.readFile(path.join(ROOT, file))) };
  }));
  await fs.writeFile(path.join(OUT, "manifest.json"), JSON.stringify({
    book: { ...SB, slots: undefined }, provisional: { slug: SB.slug, subtitle: SB.subtitle, readerCode: "placeholder" },
    pageCount: pages.length, pages: pages.map((p, i) => ({ page: i + 1, ...p })), questions, answerStart: answerStart || null,
    paneMm: paneSizes, qrCodes, sources, pdfs: { interior: sha(bytes) }, interiorMm: KDP_B5,
    spineMm: Math.round(pages.length * BOOK.whitePaperSpineMmPerPage * 100) / 100,
  }, null, 2) + "\n");
  console.log(`Wrote ${OUT}: ${pages.length} pages, ${questions.length} questions`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
