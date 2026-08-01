/* 検品結果の学習パス — 手設計モチーフを status 別コンタクトシートに出す
   （npx tsx scripts/review-motifs.ts <sku> [<sku>...] --out <png> [--all]）

   モチーフ投入バッチの「次の一手」を決めるための道具。オーナーが atelier で
   採否をつけた後にこれを回し、★採用 と ・保留 を並べて目で見比べる。
   採用される絵の傾向は巻・タスクで変わるので、次バッチはこの実績から組む
   （設計ルールの SSOT＝product/motif-craft.md）。

   既定は手設計（gen.kind=manual かつ id 末尾 -mNN）のみ。--all で生成候補も含む。
   かさね・分解は「図A ＋ 図B ＝ 完成図」の 3 ペイン、それ以外は完成図 1 ペイン。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, EdgeT, Problem } from "../app/products/problems/schema";
import { edgeKey } from "../app/products/problems/schema";

const stripBom = (s: string) => s.replace(/^﻿/, "");
const PANE_TASKS = new Set(["overlay", "decompose"]);

type Card = { status: string; label: string; d: number; panes: string[]; size: number };

/* 1 ペイン分の中身（点格子＋線）。<svg> ラッパは貼る側が持つ */
function pane(edges: { e: EdgeT; color: string }[], n: number, cell: number): { body: string; size: number } {
  const pad = 10, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2" fill="#c9c3b8"/>`);
  const lines = edges.map(({ e, color }) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`).join("");
  return { body: dots.join("") + lines, size };
}

function cardOf(p: Problem, task: string, cell: number): Omit<Card, "status" | "label" | "d"> {
  const n = p.grid.type === "square" ? p.grid.n : 5;
  const B = p.answer?.mode === "explicit" ? p.answer.edges : [];
  if (PANE_TASKS.has(task) && B.length > 0) {
    const bk = new Set(B.map(edgeKey));
    const A = p.edges.filter((e) => !bk.has(edgeKey(e)));
    const mk = (es: { e: EdgeT; color: string }[]) => pane(es, n, cell);
    const pa = mk(A.map((e) => ({ e, color: "#2b2925" })));
    const pb = mk(B.map((e) => ({ e, color: "#1a56a8" })));
    const pf = mk([...A.map((e) => ({ e, color: "#2b2925" })), ...B.map((e) => ({ e, color: "#1a56a8" }))]);
    return { panes: [pa.body, pb.body, pf.body], size: pa.size };
  }
  const one = pane(p.edges.map((e) => ({ e, color: "#2b2925" })), n, cell);
  return { panes: [one.body], size: one.size };
}

async function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf("--out");
  if (outIdx < 0) throw new Error("--out <png> が必要");
  const out = argv[outIdx + 1];
  const all = argv.includes("--all");
  const skus = argv.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1);
  if (skus.length === 0) throw new Error("sku を 1 つ以上指定して");

  const cell = 22;
  const cards: Card[] = [];
  for (const sku of skus) {
    const p = path.join(process.cwd(), "app", "products", "problems", "candidates", `${sku}.json`);
    const file = JSON.parse(stripBom(await fs.readFile(p, "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      const manual = c.gen?.kind === "manual" && /-m\d\d$/.test(c.id);
      if (!all && !manual) continue;
      cards.push({
        status: c.status ?? "pending",
        label: `${sku} ${c.provenance?.label ?? c.id}`,
        d: c.difficulty ? (c.difficulty.manual ?? c.difficulty.auto) : 0,
        ...cardOf(c, file.task, cell),
      });
    }
  }
  if (cards.length === 0) throw new Error("対象カードが 0 件（--all を試して）");

  // 採用を先頭・巻順・D 昇順（採用の D 分布が一目で見える並び）
  const rank = (s: string) => (s === "adopted" ? 0 : s === "pending" ? 1 : 2);
  cards.sort((a, b) => rank(a.status) - rank(b.status) || a.label.localeCompare(b.label) || a.d - b.d);

  const board = Math.max(...cards.map((c) => c.size));
  const maxPanes = Math.max(...cards.map((c) => c.panes.length));
  const cellW = maxPanes * (board + 18) + 24, cellH = board + 34, cols = 3;
  const rowsN = Math.ceil(cards.length / cols);
  const tone = (s: string) => (s === "adopted" ? "#2e7d32" : s === "rejected" ? "#c62828" : "#999");
  const mark = (s: string) => (s === "adopted" ? "★採用" : s === "rejected" ? "×不採用" : "・保留");
  const cells = cards.map((c, i) => {
    const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
    const g = c.panes.map((body, k) =>
      `<g transform="translate(${k * (c.size + 18)},0)">${body}`
      + `<rect width="${c.size}" height="${c.size}" fill="none" stroke="${c.status === "adopted" ? "#2e7d32" : "#ddd"}"`
      + ` stroke-width="${c.status === "adopted" ? 2 : 1}"/></g>`).join("");
    return `<g transform="translate(${x},${y})">`
      + `<text x="6" y="14" font-size="12" font-family="sans-serif" fill="${tone(c.status)}">`
      + `${mark(c.status)} ${c.label} D=${c.d}</text>`
      + `<g transform="translate(6,20)">${g}</g></g>`;
  }).join("");
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rowsN * cellH}"`
    + ` viewBox="0 0 ${cols * cellW} ${rowsN * cellH}"><rect width="100%" height="100%" fill="#fbfaf7"/>${cells}</svg>`;
  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(sheet), { density: 120 }).png().toFile(out);

  const n = (s: string) => cards.filter((c) => c.status === s).length;
  console.log(`png → ${out}`);
  console.log(`採用 ${n("adopted")} / 保留 ${n("pending")} / 不採用 ${n("rejected")}（全 ${cards.length}）`);
  const ad = cards.filter((c) => c.status === "adopted").map((c) => c.d);
  if (ad.length) console.log(`採用の D: ${Math.min(...ad)}〜${Math.max(...ad)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
