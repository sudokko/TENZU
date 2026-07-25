/* 変換指示子（回転の弧矢印・移動の目じるし□）の目視検証シート
   （npx tsx scripts/preview-transform-marks.ts <出力png>）

   本番の紙面が使う print.ts の関数そのもの（rotMarkPts / translateMarkPts /
   markRingSegs / rotArcSegs / pairGeom 相当）を呼んで描くので、
   ここで見た形＝プレビュー SVG＝PDF になる。
   published の回転・移動データから実問題を拾い、角度・方向ごとに並べる。 */
import { promises as fs } from "fs";
import {
  markRingSegs, rotArcSegs, rotMarkPts, translateMarkPts, rotPtPrint,
  paneSize, KGAP, CELL_PAD, rotArcRadius, rotArcWidth,
} from "../app/products/print";
import type { EdgeT } from "../app/products/problems/schema";
import { PUBLISHED } from "../app/products/problems/published";

const INK = "#777777";
const FRAME = "#9aa0aa";

/* 1 セル＝紙面の 1 問ぶん。本番と同じ pairGeom 相当を組む（横ならび） */
const CELL_W = 250, CELL_H = 150;
const pad = Math.min(CELL_W, CELL_H) * CELL_PAD;
const pane = paneSize(CELL_W - pad * 2, CELL_H - pad * 2, "horizontal");
const gap = pane * KGAP;
const dotAt = (i: number, n: number) => pane * (0.1 + (0.8 * i) / Math.max(1, n - 1));
const lw = Math.max(0.6, pane * 0.022);

function cell(
  ox: number, oy: number, n: number, edges: EdgeT[],
  marks: { from: [number, number]; to: [number, number] } | null,
  deg: 90 | -90 | 180 | null,
): string {
  const bx = ox + (CELL_W - (pane * 2 + gap)) / 2;
  const by = oy + (CELL_H - pane) / 2;
  const dx = pane + gap;
  let s = "";
  for (const side of [0, 1]) {
    const sx = bx + side * dx;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      s += `<circle cx="${sx + dotAt(c, n)}" cy="${by + dotAt(r, n)}" r="${pane * 0.014}" fill="${INK}"/>`;
  }
  // かくマスの薄枠（本番と同じ・点をとった紙面向け）
  s += `<rect x="${bx + dx + pane * 0.02}" y="${by + pane * 0.02}" width="${pane * 0.96}" height="${pane * 0.96}" fill="none" stroke="${FRAME}" stroke-width="${lw * 0.55}"/>`;
  for (const e of edges)
    s += `<line x1="${bx + dotAt(e[0][0], n)}" y1="${by + dotAt(e[0][1], n)}" x2="${bx + dotAt(e[1][0], n)}" y2="${by + dotAt(e[1][1], n)}" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round"/>`;

  if (marks) {
    const half = pane * 0.055;
    const ring = (p: [number, number], sx: number) =>
      markRingSegs(sx + dotAt(p[0], n), by + dotAt(p[1], n), half)
        .map((g) => `<line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" stroke="${INK}" stroke-width="${Math.max(0.3, lw * 0.85)}" stroke-linecap="round"/>`)
        .join("");
    s += ring(marks.from, bx) + ring(marks.to, bx + dx);
  }
  if (deg !== null) {
    s += rotArcSegs(bx + dx / 2 + pane / 2, by + pane / 2, rotArcRadius(pane, gap), deg)
      .map((g) => `<line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" stroke="${INK}" stroke-width="${rotArcWidth(pane, gap)}" stroke-linecap="round"/>`)
      .join("");
  } else {
    // 移動・模写は従来の直線矢印のまま
    const aS = gap * 0.9, ax = bx + pane + (gap - aS) / 2, ay = by + pane / 2, hd = aS * 0.3;
    s += `<path d="M${ax} ${ay} L${ax + aS} ${ay} M${ax + aS - hd} ${ay - hd} L${ax + aS} ${ay} L${ax + aS - hd} ${ay + hd}" fill="none" stroke="${INK}" stroke-width="${Math.max(0.35, aS * 0.04)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return s;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("出力 png のパスを指定してください");

  const rot = PUBLISHED["rotate-lv3-vol1"];
  const tr = PUBLISHED["translate-lv2-vol1"];
  if (!rot || !tr) throw new Error("published データが見つかりません");

  type Row = { title: string; cells: { label: string; svg: string }[] };
  const rows: Row[] = [];

  /* --- 回転: 同じ図形を 3 角度で --- */
  const rp = rot.problems[2];
  const rn = rp.grid.type === "square" ? rp.grid.n : 4;
  rows.push({
    title: "回転（弧の矢印＝まわす量と向き／□＝左上の点がどこへ行くか）",
    cells: ([90, -90, 180] as const).map((deg) => {
      const m = rotMarkPts(rn, deg);
      const to = rotPtPrint([0, 0], rn, deg);
      return {
        label: deg === 90 ? "みぎ 1/4（□は右上へ）"
          : deg === -90 ? "ひだり 1/4（□は左下へ）" : "はんかいてん（□は右下へ）",
        svg: cell(0, 0, rn, rp.edges, { from: m.from, to }, deg),
      };
    }),
  });

  /* --- 移動: published の実問題から方向違いを 3 問 --- */
  const seen = new Set<string>();
  const picks = tr.problems.filter((p) => {
    const t = p.answer?.mode === "derived" && p.answer.transform.type === "translate"
      ? p.answer.transform : null;
    if (!t) return false;
    const k = `${t.dc},${t.dr}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 3);
  rows.push({
    title: "移動（□＝図形の起点★と、その行き先●。巻内で方向が混在しても読める）",
    cells: picks.map((p) => {
      const t = (p.answer as { transform: { dc: number; dr: number } }).transform;
      const n = p.grid.type === "square" ? p.grid.n : 3;
      const m = translateMarkPts(p.edges, t)!;
      const label = [
        t.dc > 0 ? `みぎ${t.dc}` : t.dc < 0 ? `ひだり${-t.dc}` : "",
        t.dr > 0 ? `した${t.dr}` : t.dr < 0 ? `うえ${-t.dr}` : "",
      ].filter(Boolean).join("・");
      return { label, svg: cell(0, 0, n, p.edges, { from: m.from, to: m.to }, null) };
    }),
  });

  const W = CELL_W * 3 + 40, H = rows.length * (CELL_H + 52) + 40;
  let body = `<rect width="100%" height="100%" fill="#faf8f4"/>`;
  rows.forEach((row, ri) => {
    const oy = 44 + ri * (CELL_H + 52);
    body += `<text x="16" y="${oy - 14}" font-size="15" font-family="sans-serif" fill="#3a424e">${row.title}</text>`;
    row.cells.forEach((c, ci) => {
      const ox = 16 + ci * (CELL_W + 4);
      body += `<rect x="${ox}" y="${oy}" width="${CELL_W}" height="${CELL_H}" fill="#fff" stroke="#e3e7ec"/>`;
      body += `<g transform="translate(${ox},${oy})">${c.svg}</g>`;
      body += `<text x="${ox + CELL_W / 2}" y="${oy + CELL_H + 17}" text-anchor="middle" font-size="12.5" font-family="sans-serif" fill="#6b7280">${c.label}</text>`;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><text x="16" y="26" font-size="17" font-family="sans-serif" fill="#2b2925">紙面の変換指示子（本番 print.ts の関数で描画）</text>${body}</svg>`;

  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(svg), { density: 150 }).png().toFile(out);
  console.log(`png → ${out}`);
  console.log(`回転 ${rows[0].cells.length} 通り・移動 ${rows[1].cells.length} 方向を描画`);
}

main().catch((e) => { console.error(e); process.exit(1); });
