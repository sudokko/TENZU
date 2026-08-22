/* 未検品プールのコンタクトシート（検品支援・2026-08-05）
   （npx tsx scripts/review-pool.ts <sku> [<sku>...] [--status pending] [--out <png>] [--cols 4]）

   atelier の 1 問ずつ検品の前に「巻の全体像を一覧で眺める」ためのシート。
   review-motifs.ts が手設計モチーフ専用（採用/保留の学習パス）なのに対し、
   こちらは自動生成候補もふくむ全プールを D 昇順で並べる。

   - square 巻: 完成図 F を黒で描く。answer(explicit) を持つ合成系
     （かさね・分解）は図形B を青で重ね、折り重ねは問題1（edges）を黒・
     問題2（inputB）を青・完成図は answer から。
   - solid 巻: cols×rows の点格子に solidEdges を描く（dashed＝隠れ辺は破線）。
   - ラベル: 通し番号・id 末尾・D・固有メトリクス（隠れ辺/絡み）。
   読み取り専用（candidates は書き換えない）。 */
import { promises as fs } from "fs";
import path from "path";
import { edgeKey, type CandidateFile, type EdgeT, type Problem } from "../app/products/problems/schema";

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

type Cell = { title: string; svg: string; w: number; h: number };

function squareSvg(p: Problem): { svg: string; w: number; h: number } {
  if (p.grid.type !== "square") throw new Error("not square");
  const n = p.grid.n;
  const cell = n <= 4 ? 26 : 20, pad = 10, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="1.8" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  // 合成系: F を土台に B を青で。fold: answer=F・inputB=B。かさね/分解: edges=F・answer=B
  let black: EdgeT[] = p.edges;
  let blue: EdgeT[] = [];
  if (p.answer?.mode === "explicit") {
    if (p.inputB && p.inputB.length > 0) {
      black = p.answer.edges.filter((e) => !new Set(p.inputB!.map(edgeKey)).has(edgeKey(e)));
      blue = p.inputB;
    } else {
      const bk = new Set(p.answer.edges.map(edgeKey));
      black = p.edges.filter((e) => !bk.has(edgeKey(e)));
      blue = p.answer.edges;
    }
  }
  const body = black.map((e) => line(e, "#2b2925")).join("")
    + blue.map((e) => line(e, "#1a56a8")).join("");
  return {
    svg: `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${dots.join("")}${body}</svg>`,
    w: size, h: size,
  };
}

function solidSvg(p: Problem): { svg: string; w: number; h: number } {
  if (p.grid.type !== "solid") throw new Error("not solid");
  const cols = p.grid.cols, rows = p.grid.rows;
  const cell = 13, pad = 8;
  const w = (cols - 1) * cell + pad * 2, h = (rows - 1) * cell + pad * 2;
  const px = (c: number) => pad + c * cell;
  const py = (r: number) => pad + r * cell;
  const dots: string[] = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++)
    dots.push(`<circle cx="${px(c)}" cy="${py(r)}" r="1.2" fill="#c9c3b8"/>`);
  const lines = (p.solidEdges ?? []).map((e) =>
    `<line x1="${px(e.a.c)}" y1="${py(e.a.r)}" x2="${px(e.b.c)}" y2="${py(e.b.r)}"`
    + ` stroke="#2b2925" stroke-linecap="round"`
    + (e.style === "dashed" ? ` stroke-width="1.3" stroke-dasharray="4 3"` : ` stroke-width="1.8"`) + `/>`).join("");
  return {
    svg: `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${dots.join("")}${lines}</svg>`,
    w, h,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : "pool-review.png";
  const stIdx = args.indexOf("--status");
  const statusFilter = stIdx >= 0 ? args[stIdx + 1] : "pending";
  const colIdx = args.indexOf("--cols");
  const cols = colIdx >= 0 ? parseInt(args[colIdx + 1], 10) : 4;
  const skus = args.filter((a, i) =>
    !a.startsWith("--") && args[i - 1] !== "--out" && args[i - 1] !== "--status" && args[i - 1] !== "--cols");
  if (skus.length === 0) throw new Error("sku を指定して");

  const cells: Cell[] = [];
  for (const sku of skus) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${sku}.json`), "utf8"))) as CandidateFile;
    const pool = file.candidates
      .filter((c) => statusFilter === "all" || c.status === statusFilter)
      .sort((a, b) => (a.difficulty?.value ?? 0) - (b.difficulty?.value ?? 0));
    console.log(`${sku}: ${statusFilter} ${pool.length} 問`);
    for (const c of pool) {
      const drawn = c.grid.type === "solid" ? solidSvg(c) : squareSvg(c);
      const extra = c.grid.type === "solid"
        ? `隠れ${(c.solidEdges ?? []).filter((e) => e.style === "dashed").length}`
        : c.difficulty?.parts?.["絡み"] !== undefined ? `絡み${(c.difficulty.parts as Record<string, number>)["絡み"] / 2}` : "";
      const tail = c.id.replace(`${sku}-`, "");
      cells.push({
        title: `${sku.replace(/-vol/, " v").replace(/^(\w+)-lv/, "$1 L")} ${tail}  D=${c.difficulty?.value ?? "?"} ${extra}`,
        ...drawn,
      });
    }
  }
  if (cells.length === 0) { console.log("対象 0 問"); return; }

  const cellW = Math.max(Math.max(...cells.map((c) => c.w)) + 16, 205); // ラベルが隣とかぶらない下限
  const cellH = Math.max(...cells.map((c) => c.h)) + 34;
  const rowsN = Math.ceil(cells.length / cols);
  const parts = cells.map((c, i) => {
    const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
    return `<g transform="translate(${x + 8},${y + 6})">
<text x="0" y="12" font-size="11" font-family="sans-serif">#${i + 1} ${c.title}</text>
<g transform="translate(0,18)">${c.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>
<rect x="0" y="18" width="${c.w}" height="${c.h}" fill="none" stroke="#e5e0d6"/>
</g>`;
  }).join("\n");
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rowsN * cellH + 8}" viewBox="0 0 ${cols * cellW} ${rowsN * cellH + 8}"><rect width="100%" height="100%" fill="#faf8f4"/>${parts}</svg>`;
  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(sheet), { density: 100 }).png().toFile(outPath);
  console.log(`png → ${outPath}（${cells.length} 問）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
