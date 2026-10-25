/** npx tsx scripts/export-book-benefits.ts
 * Reader PDFs for「はじめての点図形（点描写）」(kdp-paperback §5): all 144, たす 72, うつす 72, and the sheets.
 * Question order and numbers come from the book's manifest, so a reprint of the book and the PDFs cannot drift apart. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument, grayscale, type PDFFont, type PDFPage, type Color } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { BOOK, BOOK_FILES, BOOK_TASKS, BOOK_VOLUMES, type BookTask } from "../app/book/hajimete/catalog";
import { PUBLISHED } from "../app/products/problems/published";
import { toRenderProblems } from "../app/products/problems/render";
import { paintProblemPdf } from "../app/products/problems/pdf-render";
import { FONT_FILES, SERIES, TASK_COPY } from "./kdp/book";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SB = SERIES.first;
const BOOK_OUT = path.join(ROOT, "docs/drafts/kdp", SB.id);
const PRIVATE = path.join(ROOT, `web/private/book-${BOOK.slug}`);
const MM = 72 / 25.4, A4 = [210 * MM, 297 * MM] as [number, number];
const ink = grayscale(0.12);
type Fonts = Record<"heading" | "body" | "mono", PDFFont>;
const sha = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

type Manifest = {
  questions: { number: number; sku: string; sourceId: string; task: string; level: number; volNo: number; planned: boolean }[];
  sources: { sku: string; file: string; planned: boolean; sha256: string }[];
  pages: { page: number; kind: string; ref?: string }[];
};

async function loadEntries() {
  const manifest: Manifest = JSON.parse(await fs.readFile(path.join(BOOK_OUT, "manifest.json"), "utf8"));
  // The Web catalog and the book must list the same volumes, in the same order, with the same stand-ins.
  const bookStages = SB.slots.flatMap((s) => s.kind === "stage" ? [{ sku: s.sku, standIn: s.source === null ? s.standIn : undefined }] : []);
  const webStages = BOOK_VOLUMES.map((v) => ({ sku: v.sku, standIn: v.standIn }));
  if (JSON.stringify(bookStages) !== JSON.stringify(webStages)) throw new Error("Web catalog and book.ts list different volumes");
  // A source that changed after the book was exported would renumber problems silently: re-export the book first.
  for (const s of manifest.sources) {
    if (sha(await fs.readFile(path.join(ROOT, s.file))) !== s.sha256) throw new Error(`Source changed since the book export: ${s.file}`);
  }
  const rendered = new Map<string, ReturnType<typeof toRenderProblems>[number]>();
  const entries = manifest.questions.map((q) => {
    const source = manifest.sources.find((s) => s.sku === q.sku)!;
    const set = PUBLISHED[path.basename(source.file, ".json")];
    const problem = set?.problems.find((p) => p.id === q.sourceId);
    if (!set || !problem) throw new Error(`Missing source problem: ${q.sourceId}`);
    if (!rendered.has(problem.id)) toRenderProblems({ ...set, problems: [problem] }).forEach((r) => rendered.set(problem.id, r));
    return { ...q, task: q.task as BookTask, render: rendered.get(problem.id)! };
  });
  if (entries.length !== BOOK.total || entries.some((e, i) => e.number !== i + 1)) throw new Error("Book manifest numbering is not 1…144");
  return { entries, manifest };
}
type Entry = Awaited<ReturnType<typeof loadEntries>>["entries"][number];

async function newDocument() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = {} as Fonts;
  // Full embedding, as in the book: subsets of these Japanese fonts lose glyphs in some viewers.
  for (const [role, name] of FONT_FILES) f[role] = await doc.embedFont(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts", name)), { subset: false });
  return { doc, f };
}
function text(page: PDFPage, font: PDFFont, value: string, x: number, y: number, size = 10, color: Color = ink) {
  for (const c of value) if (!font.getCharacterSet().includes(c.codePointAt(0)!)) throw new Error(`Missing glyph ${c}`);
  page.drawText(value, { x: x * MM, y: page.getHeight() - y * MM - size, font, size, color });
}
async function save(doc: PDFDocument, filename: string) {
  const data = await doc.save();
  await fs.writeFile(path.join(PRIVATE, filename), data);
  return { filename, sha256: sha(data), bytes: data.length, pages: doc.getPageCount() };
}
const footer = (page: PDFPage, f: Fonts, pn: number) => {
  text(page, f.body, `© 2026 TENZU ／ 家庭内利用・きょうだい利用可 ／ 再配布・販売不可 ／ 特典PDF 第${BOOK.edition}版`, 15, 282, 7.5, grayscale(0.4));
  text(page, f.mono, String(pn), 190, 282, 8, grayscale(0.4));
};

/** Three problems per A4 page, never crossing a volume, with the book's numbers. */
async function questionsPdf(filename: string, qs: Entry[]) {
  const { doc, f } = await newDocument();
  const pageMap: { page: number; questions: number[] }[] = [];
  for (let i = 0; i < qs.length;) {
    const chunk = [qs[i++]];
    while (i < qs.length && chunk.length < 3 && qs[i].sku === chunk[0].sku) chunk.push(qs[i++]);
    const page = doc.addPage(A4), first = chunk[0], t = BOOK_TASKS[first.task];
    const volume = BOOK_VOLUMES.find((v) => v.sku === first.sku)!;
    text(page, f.heading, `${BOOK.title} ／ ${t.child}（${t.name}） Lv.${first.level} Vol.${first.volNo}・${volume.grid}`, 15, 12, 11);
    if (first.planned) text(page, f.heading, "準備中：仮の問題", 160, 12.5, 9, grayscale(0.5));
    text(page, f.heading, TASK_COPY[first.task].instruction, 15, 22, 10.5);
    chunk.forEach((e, j) => {
      const y = 33 + j * 82;
      text(page, f.heading, `${e.number}ばん`, 17, y, 12);
      paintProblemPdf(page, e.render, { x: 17 * MM, y: (y + 9) * MM, width: 176 * MM, height: 68 * MM }, "horizontal",
        { minLineMm: 0.3, monochrome: true, inkGray: 0.6, gapScale: 3.1 });
    });
    footer(page, f, doc.getPageCount());
    pageMap.push({ page: doc.getPageCount(), questions: chunk.map((e) => e.number) });
  }
  return { ...(await save(doc, filename)), numbers: qs.map((e) => e.number), pageMap };
}

/** The progress chart, certificate and blank boards, taken from the owner's designed pages and enlarged to A4. */
async function sheetsPdf(filename: string, manifest: Manifest) {
  if (!SB.design) throw new Error("The book has no design PDF for the sheets");
  // じぶんでつくろう: the blank boards parents and children set problems on, wherever the book puts them.
  const bookPages = manifest.pages.filter((p) => p.ref === "make").map((p) => p.page);
  if (!bookPages.length) throw new Error("No じぶんでつくろう pages in the book manifest");
  const design = await fs.readFile(path.join(ROOT, SB.design.file));
  // The designed pages already carry their fonts; only the ASCII footer needs one more (Plex Mono, small).
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const mono = await doc.embedFont(await fs.readFile(path.join(ROOT, "web/scripts/kdp/fonts/IBMPlexMono-Regular.ttf")), { subset: false });
  const embedded = await doc.embedPdf(design, bookPages.map((pn) => {
    const at = SB.design!.pages.indexOf(pn);
    if (at < 0) throw new Error(`Book page ${pn} is not in the design PDF`);
    return at;
  }));
  const scale = Math.min(210 / 182, 287 / 257);
  for (const e of embedded) {
    const page = doc.addPage(A4), w = 182 * scale, h = 257 * scale;
    page.drawPage(e, { x: ((210 - w) / 2) * MM, y: (297 - h - 2) * MM, width: w * MM, height: h * MM });
    text(page, mono, `(c) 2026 TENZU  /  ${BOOK.url}  /  ${doc.getPageCount()}`, 15, 289, 7.5, grayscale(0.4));
  }
  return { ...(await save(doc, filename)), bookPages };
}

async function main() {
  await fs.mkdir(PRIVATE, { recursive: true });
  const { entries, manifest } = await loadEntries();
  const files: Record<string, unknown> = {};
  for (const file of BOOK_FILES) {
    files[file.id] = file.id === "sheets" ? await sheetsPdf(file.filename, manifest)
      : await questionsPdf(file.filename, file.id === "all" ? entries : entries.filter((e) => e.task === file.id));
  }
  const planned = [...new Set(entries.filter((e) => e.planned).map((e) => e.sku))];
  await fs.writeFile(path.join(BOOK_OUT, "benefits-manifest.json"), JSON.stringify({
    book: BOOK, plannedStandIns: planned, sources: manifest.sources,
    questions: entries.map((e) => ({ number: e.number, sku: e.sku, sourceId: e.sourceId })), files,
  }, null, 2) + "\n");
  console.log(`Wrote ${BOOK_FILES.length} reader PDFs to ${PRIVATE}${planned.length ? ` (stand-ins: ${planned.join(", ")})` : ""}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
