/* モチーフ散布バッチ（npx tsx scripts/seed-motif-scatter.ts [--write] [--preview <html出力パス>]）
   atelier 検品用の手設計モチーフを copy 全8巻の candidates へ散布投入する。
   バリエーション偏り対策（2026-07-17 オーナー指示: ロボ3・自然3・動物顔3・動物フォルム3・食べ物3 ＝ 15問）。
   - 本物の computeMetrics / baseDifficulty / COPY_LADDER で巻制約（slopes・ゲート・D窓・span）を検証
   - published copy＋既存 candidates（全 status）＋生成ライブラリ全変種との形かぶり（シグネチャ）を検証
   - --preview で全モチーフの SVG プレビュー HTML を書き出し（目視検品用）
   - --write で candidates/{sku}.json に status=pending で追記（手設計採番 -mNN・白紙作成 API と同形）
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

type Seed = { sku: string; label: string; category: string; paths: string[] };

/* 15 モチーフ。座標は "c,r"（r 下向き）・盤面座標に直書き（配置済み）。
   各巻の制約: ladder.json copy 節（grid / slopes / requireDiag45 / requireNon45 / cross / fullGrid / D窓） */
const SEEDS: Seed[] = [
  // ---- copy-lv1-vol1（3×3・タテヨコのみ・D 2-6） ----
  {
    sku: "copy-lv1-vol1", label: "ロボットのあたま", category: "ロボット",
    paths: ["0,1 2,1 2,2 0,2 0,1", "1,0 1,1"],
  },
  {
    sku: "copy-lv1-vol1", label: "いたチョコ", category: "たべもの",
    paths: ["0,0 2,0 2,2 0,2 0,0", "1,0 1,2", "0,1 1,1"],
  },
  // ---- copy-lv2-vol1（3×3・45°必須・D 4-14） ----
  {
    sku: "copy-lv2-vol1", label: "きつねのかお", category: "どうぶつのかお",
    paths: ["0,1 2,1 1,2 0,1", "0,0 0,1", "2,0 2,1"],
  },
  {
    sku: "copy-lv2-vol1", label: "おだんご", category: "たべもの",
    paths: ["1,0 2,1 1,2 0,1 1,0", "0,2 2,0"],
  },
  // ---- copy-lv3-vol1（4×4・45°まで・交差あり・盤面いっぱい・D 10-23） ----
  {
    sku: "copy-lv3-vol1", label: "さかな", category: "どうぶつのフォルム",
    paths: ["0,1 1,0 3,2 3,1 1,3 0,2 0,1"],
  },
  {
    sku: "copy-lv3-vol1", label: "とんぼ", category: "どうぶつのフォルム",
    paths: ["0,3 3,0", "0,1 2,3", "1,0 3,2", "2,0 3,0 3,1 2,0"],
  },
  // ---- copy-lv3-vol2（5×5・45°まで・盤面いっぱい・D 10-28） ----
  {
    sku: "copy-lv3-vol2", label: "たいよう", category: "しぜん",
    paths: [
      "2,1 3,2 2,3 1,2 2,1",
      "2,0 2,1", "2,3 2,4", "0,2 1,2", "3,2 4,2",
      "0,0 1,1", "4,0 3,1", "0,4 1,3", "4,4 3,3",
    ],
  },
  {
    sku: "copy-lv3-vol2", label: "ロボット", category: "ロボット",
    paths: [
      "1,0 3,0", "1,0 1,3", "3,0 3,3", "1,1 3,1", "1,3 3,3",
      "2,0 2,1", "0,2 1,2", "3,2 4,2", "1,3 0,4", "3,3 4,4",
    ],
  },
  // ---- copy-lv4-vol1（4×4・非45°必須・盤面いっぱい・D 14-40） ----
  {
    sku: "copy-lv4-vol1", label: "みかづき", category: "しぜん",
    paths: ["3,0 1,0 0,2 1,3 3,3", "3,0 2,1 2,2 3,3"],
  },
  {
    sku: "copy-lv4-vol1", label: "かもめとなみ", category: "どうぶつのフォルム",
    paths: ["0,2 1,0 2,2", "0,3 1,2 2,3 3,2"],
  },
  // ---- copy-lv4-vol2（5×5・非45°必須・盤面いっぱい・D 16-94） ----
  {
    sku: "copy-lv4-vol2", label: "ほし", category: "しぜん",
    paths: ["2,0 1,4 4,1 0,1 3,4 2,0"],
  },
  {
    sku: "copy-lv4-vol2", label: "ソフトクリーム", category: "たべもの",
    paths: ["2,0 0,1 1,2 2,4 3,2 4,1 2,0", "0,1 4,1"],
  },
  // ---- copy-lv5-vol1（6×6・盤面いっぱい・D 12-43） ----
  {
    sku: "copy-lv5-vol1", label: "ロボットぜんしん", category: "ロボット",
    paths: [
      "1,0 4,0", "1,0 1,4", "4,0 4,4", "1,1 4,1", "1,4 4,4",
      "2,0 2,1", "3,0 3,1", "2,2 3,2", "2,3 3,3",
      "0,2 1,2", "4,2 5,2", "2,4 2,5", "3,4 3,5",
    ],
  },
  {
    sku: "copy-lv5-vol1", label: "くまのかお", category: "どうぶつのかお",
    paths: [
      "1,1 1,0 2,0 2,1", "3,1 3,0 4,0 4,1",
      "1,1 4,1", "1,1 0,2", "4,1 5,2", "0,2 0,4", "5,2 5,4",
      "0,4 1,5", "5,4 4,5", "1,5 4,5",
      "2,2 2,3", "3,2 3,3", "2,4 3,4",
    ],
  },
  // ---- copy-lv5-vol2（7×7・盤面いっぱい・D 11-54） ----
  {
    sku: "copy-lv5-vol2", label: "ねこのかお", category: "どうぶつのかお",
    paths: [
      "0,2 1,0 1,2", "6,2 5,0 5,2",
      "0,2 6,2", "0,2 0,4", "6,2 6,4",
      "0,4 2,6", "2,6 4,6", "4,6 6,4",
      "2,3 2,4", "4,3 4,4", "3,4 3,5",
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

/* 巻制約の検証（variantFits と同じ判定を手設計向けに展開。ortho は斜め自体を禁止） */
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

/* 一部の candidates JSON が BOM 付き（外部ツール由来）。剥がして読む */
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
  const liveBySku = new Map<string, EdgeT[][]>(); // 同巻 Jaccard 類似チェック用（rejected 除く）
  for (const f of candFiles) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (c.status !== "rejected") {
        const arr = liveBySku.get(file.sku) ?? [];
        arr.push(c.edges);
        liveBySku.set(file.sku, arr);
      }
    }
  }
  for (const v of allVariants()) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }

  /* ---- 検証 ---- */
  type Row = {
    seed: Seed; edges: EdgeT[]; m: ProblemMetrics; D: number;
    errs: string[]; warns: string[];
  };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();

  for (const seed of SEEDS) {
    const params = COPY_LADDER[seed.sku] as CopyShapeParams | undefined;
    const errs: string[] = [];
    const warns: string[] = [];
    const edges = normalizeEdges(parsePaths(seed.paths));
    if (!params) errs.push(`COPY_LADDER に ${seed.sku} が無い`);
    const n = params?.grid ?? 7;
    const m = computeMetrics(edges, n);
    const D = baseDifficulty(m);
    if (params) errs.push(...checkAgainstLadder(params, edges, m, D));

    const probe: Problem = {
      id: `${seed.sku}-probe`, grid: { type: "square", n: n as 3 | 4 | 5 | 6 | 7 },
      edges, metrics: m, gen: { kind: "manual" },
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
    for (const other of liveBySku.get(seed.sku) ?? []) {
      const j = jaccard(other, edges);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }

    rows.push({ seed, edges, m, D, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  for (const r of rows) {
    const p = COPY_LADDER[r.seed.sku] as CopyShapeParams;
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    console.log(
      `${status}${r.seed.sku}  ${r.seed.label}（${r.seed.category}）` +
      `  lines=${r.m.lines} diag=${r.m.diagonals} non45=${r.m.non45} cross=${r.m.crossings}` +
      ` comp=${r.m.components} D=${r.D}${p ? ` 窓[${p.D[0]},${p.D[1]}]` : ""}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r) => {
      const p = COPY_LADDER[r.seed.sku] as CopyShapeParams;
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  <div class="sku">${r.seed.sku}（${p?.grid}×${p?.grid}）</div>
  ${svgOf(r.edges, p?.grid ?? 7)}
  <div class="meta">D=${r.D} 窓[${p?.D[0]},${p?.D[1]}]・線${r.m.lines}・ななめ${r.m.diagonals}・非45° ${r.m.non45}・交差${r.m.crossings}・かたち${r.m.components}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>モチーフ散布プレビュー</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;width:280px}
.head{display:flex;justify-content:space-between;align-items:center}
.cat{font-size:12px;color:#888}
.sku{font-size:12px;color:#666;margin:4px 0}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{display:block;margin:6px auto;background:#fffdf9;border:1px dashed #eee}
</style>
<h1>モチーフ散布プレビュー（15問）</h1><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>・sharp で SVG→PNG） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 4, cellW = 280, cellH = 300;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const p = COPY_LADDER[r.seed.sku] as CopyShapeParams;
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgOf(r.edges, p?.grid ?? 7)
        .replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
      const n = p?.grid ?? 7;
      const size = (n - 1) * 34 + 32;
      const off = (cellW - size) / 2;
      return `<g transform="translate(${x},${y})">
<rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" fill="#fff" stroke="#ccc"/>
<text x="${cellW / 2}" y="26" text-anchor="middle" font-size="15" font-family="sans-serif">#${i + 1} ${r.seed.sku.replace("copy-", "")}  D=${r.D}</text>
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
  const bySku = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = bySku.get(r.seed.sku) ?? [];
    arr.push(r);
    bySku.set(r.seed.sku, arr);
  }
  for (const [sku, list] of bySku) {
    const file = (await readCandidateFileRaw(sku)) ?? {
      schemaVersion: 1 as const, sku, task: "copy", candidates: [], seedCursor: 0,
    };
    let maxM = file.candidates.reduce((mx, c) => {
      const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
      return Math.max(mx, k);
    }, 0);
    for (const r of list) {
      const n = (COPY_LADDER[sku] as CopyShapeParams).grid;
      const base: Problem = {
        id: `${sku}-m${String(++maxM).padStart(2, "0")}`,
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
    await fs.writeFile(path.join(CAND_DIR, `${sku}.json`), JSON.stringify(file, null, 1), "utf8");
  }
  console.log("書き込み完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
