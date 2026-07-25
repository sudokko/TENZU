/* copy-lv5-vol2（7×7）モチーフ追加バッチ
   （npx tsx scripts/seed-lv5vol2-motifs.ts [--write] [--preview <html>] [--png <png>]）

   Lv.5 vol.2 の候補がランダム生成偏りで「絵」に乏しいため、手設計モチーフを 15 問投入する。
   内訳（2026-07-25 オーナー指示）: ロボット3・どうぶつのかお3・たべもの3・ロケット3・いえ3。
   方針＝非45°（ナイト傾き等）と交差を多用する。

   - 本物の computeMetrics / baseDifficulty / COPY_LADDER で巻制約（slopes・fullGrid・D窓）を検証
   - published copy＋既存 candidates（全 status）＋生成ライブラリ全変種との形かぶりを検証
   - --preview で SVG 一覧 HTML、--png でコンタクトシートを書き出し（目視検品用）
   - --write で candidates/copy-lv5-vol2.json に status=pending で追記（手設計採番 -mNN）
   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { baseDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature, mirroredShapeSignature } from "../app/products/problems/gen/dedupe";
import { COPY_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants, type CopyShapeParams } from "../app/products/problems/gen/copy";
import { jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "copy-lv5-vol2";

type Seed = { label: string; category: string; paths: string[] };

/* 15 モチーフ。座標は "c,r"（r 下向き）・7×7 盤面（0..6）に直書き。
   fullGrid 巻のため 4 隅方向いっぱい（span 6×6）に届かせること。 */
const SEEDS: Seed[] = [
  /* ======================= ロボット ======================= */
  {
    label: "バンザイロボット", category: "ロボット",
    paths: [
      "2,0 4,0 4,2 2,2 2,0",   // あたま
      "2,1 4,1",               // くち
      "3,2 3,3",               // くび
      "1,3 5,3 5,5 1,5 1,3",   // どうたい
      "1,3 0,1", "5,3 6,1",    // うで（非45°×2）
      "2,3 4,5", "4,3 2,5",    // むねの×（交差）
      "2,5 2,6", "4,5 4,6",    // あし
    ],
  },
  {
    label: "ロボットのかお", category: "ロボット",
    paths: [
      "0,1 6,1", "0,1 0,5", "6,1 6,5", "0,5 6,5",  // かおのわく
      "2,1 4,0", "4,1 2,0",                        // アンテナ交差（非45°×2）
      "1,2 2,3", "2,2 1,3",                        // 左め（交差）
      "4,2 5,3", "5,2 4,3",                        // 右め（交差）
      "2,4 4,4",                                   // くち
      "2,5 2,6", "4,5 4,6",                        // あし
    ],
  },
  {
    label: "さんかくロボット", category: "ロボット",
    paths: [
      "3,0 5,2 1,2 3,0",       // さんかくのあたま
      "2,1 4,1",               // くち
      "1,2 1,5", "5,2 5,5", "1,5 5,5",  // どうたい
      "1,3 0,2", "5,3 6,2",    // うで
      "2,5 4,6", "4,5 2,6",    // あしの交差（非45°×2）
    ],
  },

  /* ==================== どうぶつのかお ==================== */
  {
    label: "たれみみのいぬ", category: "どうぶつのかお",
    paths: [
      "1,1 5,1",               // あたまのうえ
      "1,1 1,3", "5,1 5,3",    // ほお
      "1,3 3,6", "5,3 3,6",    // あご（非45°×2）
      "1,1 0,0", "0,0 0,3",    // 左のたれみみ
      "5,1 6,0", "6,0 6,3",    // 右のたれみみ
      "1,2 2,3", "2,2 1,3",    // 左め（交差）
      "4,2 5,3", "5,2 4,3",    // 右め（交差）
      "3,3 3,4",               // はな
    ],
  },
  {
    label: "ふくろうのかお", category: "どうぶつのかお",
    paths: [
      "1,0 5,0",                       // あたまのてっぺん
      "0,1 1,0", "5,0 6,1",            // かた
      "0,1 0,5", "6,1 6,5",            // よこ
      "0,5 3,6", "3,6 6,5",            // したのまるみ（非45°×2）
      "1,2 2,3", "2,2 1,3",            // 左め（交差）
      "4,2 5,3", "5,2 4,3",            // 右め（交差）
      "3,3 4,4 3,5 2,4 3,3",           // くちばしとむね
    ],
  },
  {
    label: "うさぎのかお", category: "どうぶつのかお",
    paths: [
      "1,0 2,2", "5,0 4,2",            // みみ（非45°×2）
      "1,2 5,2",                       // あたまのうえ
      "5,2 6,3", "6,3 6,5", "6,5 5,6", // 右のりんかく
      "5,6 1,6",                       // あご
      "1,6 0,5", "0,5 0,3", "0,3 1,2", // 左のりんかく
      "1,3 2,4", "2,3 1,4",            // 左め（交差）
      "4,3 5,4", "5,3 4,4",            // 右め（交差）
      "3,4 3,5",                       // はな
    ],
  },

  /* ======================= たべもの ======================= */
  {
    label: "ソフトクリーム", category: "たべもの",
    paths: [
      "0,3 1,2 2,2 2,1 4,1 4,2 5,2 6,3",  // しぼりだしたクリーム
      "0,3 6,3",               // クリームのした
      "1,3 3,6", "5,3 3,6",    // コーン（非45°×2）
      "1,4 5,4", "2,5 4,5",    // コーンのあみめ（交差×4）
      "3,0 3,1",               // さくらんぼのじく
    ],
  },
  {
    label: "みたらしだんご", category: "たべもの",
    paths: [
      "0,6 6,1",                       // くし（非45°）
      "1,4 2,5 1,6 0,5 1,4",           // だんご1（交差×2）
      "3,2 4,3 3,4 2,3 3,2",           // だんご2（交差×2）
      "5,0 6,1 5,2 4,1 5,0",           // だんご3（交差×2）
    ],
  },
  {
    label: "ハンバーガー", category: "たべもの",
    paths: [
      "0,3 1,1 5,1 6,3",                       // うえのパン（非45°×2）
      "0,3 6,3",                               // パンのした
      "0,4 1,3 2,4 3,3 4,4 5,3 6,4",           // レタス
      "0,4 6,4",                               // パティ
      "0,5 6,5",                               // チーズ
      "0,5 1,6 5,6 6,5",                       // したのパン
      "3,0 3,1", "3,0 4,1",                    // ピックのはた
    ],
  },

  /* ======================== ロケット ======================== */
  {
    label: "ロケットのうちあげ", category: "ロケット",
    paths: [
      "3,0 1,3", "3,0 5,3",            // せんたん（非45°×2）
      "1,3 1,5", "5,3 5,5", "1,5 5,5", // どうたい
      "2,3 4,5", "4,3 2,5",            // まど（交差）
      "1,4 0,5", "0,5 1,5",            // 左のはね
      "5,4 6,5", "6,5 5,5",            // 右のはね
      "2,5 3,6 4,5",                   // ほのお
    ],
  },
  {
    label: "ロケットのはっしゃだい", category: "ロケット",
    paths: [
      "3,0 2,2", "3,0 4,2",            // せんたん（非45°×2）
      "2,2 2,5", "4,2 4,5", "2,5 4,5", // どうたい
      "0,2 0,6", "1,2 1,6",            // 左のやぐら
      "5,2 5,6", "6,2 6,6",            // 右のやぐら
      "0,2 1,3", "1,2 0,3",            // 左のあしば うえ（交差）
      "0,4 1,5", "1,4 0,5",            // 左のあしば した（交差）
      "5,2 6,3", "6,2 5,3",            // 右のあしば うえ（交差）
      "5,4 6,5", "6,4 5,5",            // 右のあしば した（交差）
      "0,6 6,6",                       // じめん
    ],
  },
  {
    label: "ロケットとけむり", category: "ロケット",
    paths: [
      "3,0 2,2", "3,0 4,2",            // せんたん（非45°×2）
      "2,2 2,3", "4,2 4,3", "2,3 4,3", // どうたい
      "2,3 1,4", "4,3 5,4",            // はね
      "0,4 2,6", "2,4 0,6",            // 左のけむり（交差）
      "4,4 6,6", "6,4 4,6",            // 右のけむり（交差）
    ],
  },

  /* ========================== いえ ========================== */
  {
    label: "とんがりやねのいえ", category: "いえ",
    paths: [
      "0,2 3,0", "3,0 6,2",            // やね（非45°×2）
      "0,2 0,6", "6,2 6,6", "0,6 6,6", // かべ
      "2,6 2,4 4,4 4,6",               // とびら
      "4,2 5,3", "5,2 4,3",            // まど（交差）
      "5,0 5,2",                       // えんとつ（やねと交差）
    ],
  },
  {
    label: "キャンプのテント", category: "いえ",
    paths: [
      "3,0 0,6", "3,0 6,6",            // テント（非45°×2）
      "0,6 6,6",                       // じめん
      "1,6 3,4", "3,4 5,6",            // いりぐち
      "1,2 5,2",                       // ポール（交差×2）
      "0,5 6,4",                       // ロープ（非45°・交差×2）
    ],
  },
  {
    label: "ひさしのあるビル", category: "いえ",
    paths: [
      "0,2 1,0", "1,0 5,0", "5,0 6,2", // ひさしつきのやね（非45°×2）
      "0,2 6,2",                       // やねのした
      "1,2 1,6", "5,2 5,6",            // かべ
      "1,6 5,6",                       // じめん
      "2,3 3,4", "3,3 2,4",            // 左のまど（交差）
      "3,3 4,4", "4,3 3,4",            // 右のまど（交差）
      "2,6 2,5 4,5 4,6",               // とびら
    ],
  },
];

/* ---- ヘルパ ---- */
function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

/* 巻制約の検証（seed-motif-scatter.ts と同じ判定） */
function checkAgainstLadder(p: CopyShapeParams, edges: EdgeT[], m: ProblemMetrics, D: number): string[] {
  const errs: string[] = [];
  const n = p.grid;
  const b = bounds(edges);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  const spanC = b.cMax - b.cMin, spanR = b.rMax - b.rMin;
  if (p.fullGrid) {
    if (spanC !== n - 1 || spanR !== n - 1) errs.push(`盤面いっぱい不成立 span=${spanC}×${spanR}（要 ${n - 1}×${n - 1}）`);
  } else if (Math.max(spanC, spanR) < Math.min(n - 1, 2)) {
    errs.push(`span 過小 ${spanC}×${spanR}`);
  }
  if (p.slopes === "ortho" && m.diagonals > 0) errs.push(`タテヨコ巻に斜め ${m.diagonals} 本`);
  if (p.slopes !== "any" && m.non45 > 0) errs.push(`非45°禁止巻に非45° ${m.non45} 本`);
  if (p.requireDiag45 && m.diagonals < 1) errs.push("45°斜め必須が不成立");
  if (p.requireNon45 && m.non45 < 1) errs.push("非45°必須が不成立");
  if (p.cross === "zero" && m.crossings !== 0) errs.push(`交差なし巻に交差 ${m.crossings}`);
  if (p.cross === "some" && m.crossings < 1) errs.push("交差あり巻なのに交差ゼロ");
  if (D < p.D[0] || D > p.D[1]) errs.push(`D=${D} が窓 [${p.D[0]}, ${p.D[1]}] の外`);
  return errs;
}

/* SVG プレビュー（r 下向き＝SVG y 方向そのまま） */
function svgOf(edges: EdgeT[], n: number): string {
  const cell = 34, pad = 16, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.6" fill="#b9b3a8"/>`);
  const lines = edges.map((e) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}" stroke="#2b2925" stroke-width="2.6" stroke-linecap="round"/>`);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${dots.join("")}${lines.join("")}</svg>`;
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

async function readCandidateFileRaw(sku: string): Promise<CandidateFile | null> {
  try {
    return JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${sku}.json`), "utf8"))) as CandidateFile;
  } catch {
    return null;
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const pvIdx = process.argv.indexOf("--preview");
  const previewPath = pvIdx >= 0 ? process.argv[pvIdx + 1] : null;

  const params = COPY_LADDER[SKU] as CopyShapeParams | undefined;
  if (!params) throw new Error(`COPY_LADDER に ${SKU} が無い`);
  const n = params.grid;

  /* ---- かぶり台帳（published copy＋candidates copy 全 status＋生成ライブラリ） ---- */
  const known = new Map<string, string>();
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("copy-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(p.edges), `published:${p.id}`);
    }
  }
  const candFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.startsWith("copy-") && f.endsWith(".json"));
  const liveSameSku: EdgeT[][] = [];
  for (const f of candFiles) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSameSku.push(c.edges);
    }
  }
  for (const v of allVariants()) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }

  /* ---- 検証 ---- */
  type Row = { seed: Seed; edges: EdgeT[]; m: ProblemMetrics; D: number; errs: string[]; warns: string[] };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();

  for (const seed of SEEDS) {
    const errs: string[] = [];
    const warns: string[] = [];
    const edges = normalizeEdges(parsePaths(seed.paths));
    const m = computeMetrics(edges, n);
    const D = baseDifficulty(m);
    errs.push(...checkAgainstLadder(params, edges, m, D));

    const probe: Problem = {
      id: `${SKU}-probe`, grid: { type: "square", n }, edges, metrics: m, gen: { kind: "manual" },
    };
    errs.push(...validateProblem(probe));

    const sig = shapeSignature(edges);
    const dup = known.get(sig);
    if (dup) errs.push(`形かぶり → ${dup}`);
    const mdup = known.get(mirroredShapeSignature(edges));
    if (mdup) warns.push(`ミラーかぶり → ${mdup}`);
    const selfDup = seenSelf.get(sig);
    if (selfDup) errs.push(`バッチ内かぶり → ${selfDup}`);
    seenSelf.set(sig, seed.label);
    for (const other of liveSameSku) {
      const j = jaccard(other, edges);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    if (m.components > 3) warns.push(`かたちが ${m.components} つに分かれている`);

    rows.push({ seed, edges, m, D, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  for (const r of rows) {
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    console.log(
      `${status}${r.seed.label}（${r.seed.category}）` +
      `  lines=${r.m.lines} diag=${r.m.diagonals} non45=${r.m.non45} cross=${r.m.crossings}` +
      ` comp=${r.m.components} D=${r.D} 窓[${params.D[0]},${params.D[1]}]`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const nonZero = rows.filter((r) => r.m.non45 > 0).length;
  const crossZero = rows.filter((r) => r.m.crossings > 0).length;
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  非45°あり ${nonZero}/${rows.length}・交差あり ${crossZero}/${rows.length}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  ${svgOf(r.edges, n)}
  <div class="meta">D=${r.D} 窓[${params.D[0]},${params.D[1]}]・線${r.m.lines}・ななめ${r.m.diagonals}・非45° ${r.m.non45}・交差${r.m.crossings}・かたち${r.m.components}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>copy-lv5-vol2 モチーフ追加</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;width:280px}
.head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{display:block;margin:6px auto;background:#fffdf9;border:1px dashed #eee}
</style>
<h1>copy-lv5-vol2 モチーフ追加（15問）</h1><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 5, cellW = 280, cellH = 300;
    const rowsN = Math.ceil(rows.length / cols);
    const size = (n - 1) * 34 + 32;
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgOf(r.edges, n).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
      const off = (cellW - size) / 2;
      return `<g transform="translate(${x},${y})">
<rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" fill="#fff" stroke="#ccc"/>
<text x="${cellW / 2}" y="26" text-anchor="middle" font-size="15" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D}</text>
<g transform="translate(${off},${40 + (cellH - 60 - size) / 2})">${inner}</g>
</g>`;
    }).join("\n");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rowsN * cellH}" viewBox="0 0 ${cols * cellW} ${rowsN * cellH}"><rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 110 }).png().toFile(pngPath);
    console.log(`png → ${pngPath}`);
  }

  /* ---- 書き込み ---- */
  if (!write) return;
  if (failed > 0) {
    console.error("検証 NG があるため --write を中断");
    process.exitCode = 1;
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const file = (await readCandidateFileRaw(SKU)) ?? {
    schemaVersion: 1 as const, sku: SKU, task: "copy", candidates: [], seedCursor: 0,
  };
  let maxM = file.candidates.reduce((mx, c) => {
    const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, k);
  }, 0);
  for (const r of rows) {
    const base: Problem = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "square", n },
      edges: r.edges,
      metrics: r.m,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("copy", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log("書き込み完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
