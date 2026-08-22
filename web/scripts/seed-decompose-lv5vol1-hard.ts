/* decompose-lv5-vol1（6×6）へのモチーフ追加投入バッチ・D 40〜50 帯
   （npx tsx scripts/seed-decompose-lv5vol1-hard.ts [--preview <html>] [--png <png>] [--write]）

   オーナー指示（2026-08-06）: decompose-lv5-vol1 へ D=40〜50 のモチーフを 12 問。
   ジャンルは ケーキ／くだもの／ひと／けいたい を各 3 パターン。

   巻ゲート（ladder.json decompose-lv5-vol1）:
     6×6・slopes any・非45°必須・絡み 3-10・線 4-8/図
   D 式（gen/difficulty.ts）:
     D ＝ E(A) ＋ E(B) ＋ 2×絡み ＋ 共有点 ＋ ばらけ ＋ 盤面項
     E ＝ たてよこ ＋ 1.5×45° ＋ 4×非45°(1:2/2:1) ＋ 5×非45°(急)
   D 40〜50 に届かせる配合の勘どころ:
     - 非45° は完成図で 3 本まで（NON45_CAP_F）。ここに 12〜15 点を集める
     - 絡み 1 つ ＝ 2 点。パターン型の B（さく・こうし・あみ）で 4〜6 稼ぐ
     - 共有点（分解固有）＝ A と B がふれる格子点の数。パターンが主役を貫くほど増える

   設計は motif-craft.md 準拠（図A＝単体で名前が言える閉じた形／図B＝1つのもの
   または同じものの繰り返し／6×6 はパターン型の B が主）。

   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics, interCrossings, sharedPoints } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { DECOMPOSE_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "decompose-lv5-vol1";
const D_WINDOW: [number, number] = [40, 50];
const CROSS_HI = 12;        // CROSS_HI[6]（gen/overlay.ts tryCompose）
const NON45_CAP_F = 3;      // union ゲート
const DANGLING_MAX_F = 4;   // カード 2 枚ぶん
const DANGLING_MAX_PART = 2;

type Seed = {
  label: string; category: string;
  pathsA: string[];  // 図形A（=こたえ=C∖B）・盤面座標 "c,r"（r 下向き）
  pathsB: string[];  // 図形B（=引くもの=answer.edges）
};

const SEEDS: Seed[] = [
  /* ===================== ケーキ ×3 ===================== */
  {
    label: "ケーキ（ろうそくとガーランド）", category: "ケーキ",
    // A: 台形のケーキ＋ろうそく4本 / B: よこいとに三角のはたが2まい
    pathsA: ["0,5 1,3 4,3 5,5 0,5", "1,3 1,0", "2,3 2,0", "3,3 3,0", "4,3 4,0"],
    pathsB: ["0,1 5,1", "0,1 1,2 2,1", "3,1 4,2 5,1"],
  },
  {
    label: "ケーキ（まどべのカップケーキ）", category: "ケーキ",
    // A: カップ＋クリームのなみ / B: こうしのまど
    pathsA: ["1,5 0,3 5,3 4,5 1,5", "1,3 2,2 3,3 4,2 5,3"],
    pathsB: ["0,0 5,0 5,4 0,4 0,0", "1,0 1,4", "2,0 2,4", "4,0 4,4"],
  },
  {
    label: "ケーキ（リボンのはこ）", category: "ケーキ",
    // A: ケーキのはこ（ふたつき）/ B: 十文字にかけたリボン
    pathsA: ["1,2 0,5 5,5 4,2 1,2", "1,2 2,1 3,1 4,2"],
    pathsB: ["0,3 5,3", "0,4 5,4", "0,3 0,4", "5,3 5,4", "2,0 2,5", "3,0 3,5"],
  },

  /* ===================== くだもの ×3 ===================== */
  {
    label: "くだもの（かごのりんご）", category: "くだもの",
    // A: りんご＋へた＋は / B: かごのあみめ
    pathsA: ["1,1 0,2 1,4 4,4 5,2 4,1 1,1", "2,1 2,0", "2,0 4,1"],
    pathsB: ["0,3 5,3", "0,5 5,5", "0,3 0,5", "5,3 5,5", "1,3 3,5", "2,3 4,5"],
  },
  {
    label: "くだもの（かごのパイナップル）", category: "くだもの",
    // A: パイナップルのみ＋3まいのかんむり / B: かごのふち
    pathsA: ["1,3 1,5 4,5 4,3 1,3", "2,3 1,1", "2,3 3,1", "3,3 4,1"],
    pathsB: ["0,2 5,2", "0,4 5,4", "0,2 0,4", "5,2 5,4", "2,2 2,4"],
  },
  {
    label: "くだもの（はこのもも）", category: "くだもの",
    // A: もも（うえがくぼんだみ）/ B: はこのわく
    pathsA: ["2,1 1,2 1,4 3,5 5,4 5,2 4,1 3,2 2,1"],
    pathsB: ["0,3 5,3", "2,0 2,5", "4,0 4,5", "0,3 0,5", "0,5 5,5", "4,5 5,3"],
  },

  /* ===================== ひと ×3 ===================== */
  {
    label: "ひと（あめのなかのひと）", category: "ひと",
    // A: てをのばしたひと / B: くもとあめ
    pathsA: ["1,1 3,1 3,3 1,3 1,1", "2,3 2,4", "0,2 2,3", "0,5 2,4", "4,5 2,4"],
    pathsB: ["3,0 5,0", "5,0 5,2", "3,1 5,1", "3,0 3,1", "4,1 1,4", "5,2 2,5", "0,5 5,5"],
  },
  {
    label: "ひと（はしごをのぼるひと）", category: "ひと",
    // A: ひと（あたま・からだ・て・あし）/ B: はしご
    pathsA: ["2,0 3,0", "3,0 3,4", "2,0 2,2", "2,2 3,2", "1,2 3,3", "3,4 1,5", "3,4 5,5"],
    pathsB: ["1,0 1,5", "4,0 4,5", "1,1 4,1", "1,3 4,3", "1,5 4,5", "1,1 3,3"],
  },
  {
    label: "ひと（さくごしのひと）", category: "ひと",
    // A: てをのばしたひと / B: さくのよこいたとはしら
    pathsA: ["1,0 3,0 3,2 1,2 1,0", "2,2 2,4", "0,2 2,3", "2,4 0,5", "2,4 4,5"],
    pathsB: ["0,1 5,1", "0,3 5,3", "0,5 5,5", "0,1 0,5", "5,1 5,5"],
  },

  /* ===================== けいたい ×3 ===================== */
  {
    label: "けいたい（つくえのけいたい）", category: "けいたい",
    // A: けいたい＋がめんのグラフ / B: つくえのこうしマット
    pathsA: ["1,1 4,1 4,4 1,4 1,1", "1,2 4,2", "1,3 4,4"],
    pathsB: ["0,0 5,0", "0,5 5,5", "2,0 2,5", "3,0 3,5"],
  },
  {
    label: "けいたい（あみのけいたい）", category: "けいたい",
    // A: けいたい＋がめん / B: ポーチのあみ
    pathsA: ["1,2 4,2 4,5 1,5 1,2", "1,3 4,3", "2,3 4,4"],
    pathsB: ["0,0 5,0", "0,0 5,5", "1,0 5,2", "5,0 0,5"],
  },
  {
    label: "けいたい（ブラインドのけいたい）", category: "けいたい",
    // A: けいたい＋アンテナ / B: ブラインドのはね
    pathsA: ["1,1 4,1 4,5 1,5 1,1", "1,2 4,3", "3,1 5,0"],
    pathsB: ["0,0 5,0", "0,2 5,2", "0,3 5,3", "0,4 5,4", "0,0 0,4", "5,0 5,4"],
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

/* 端点共有ベースの連結成分数（gen/overlay.ts componentsOf と同じ） */
function componentsOf(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const pk = (p: [number, number]) => `${p[0]},${p[1]}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const e of edges) {
    const a = pk(e[0]), b = pk(e[1]);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));
  return roots.size;
}

function checkSeed(
  A: EdgeT[], B: EdgeT[], F: EdgeT[],
  mA: ProblemMetrics, mB: ProblemMetrics, mF: ProblemMetrics, D: number, inter: number,
): string[] {
  const p = DECOMPOSE_LADDER[SKU];
  const errs: string[] = [];
  const n = p.grid;
  const [dLo, dHi] = D_WINDOW;

  for (const [name, part, m] of [["A", A, mA], ["B", B, mB]] as const) {
    if (m.lines < p.lines[0] || m.lines > p.lines[1])
      errs.push(`図${name}: 線 ${m.lines} 本が窓 [${p.lines[0]}, ${p.lines[1]}] の外`);
    if (componentsOf(part) !== 1) errs.push(`図${name}: かたちが ${componentsOf(part)} つ（カードは 1 つながり）`);
  }

  const aKeys = new Set(A.map(edgeKey));
  for (const e of B) if (aKeys.has(edgeKey(e))) errs.push(`A・B が辺を共有: ${edgeKey(e)}`);

  const b = bounds(F);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  if (b.cMax - b.cMin < n - 2 || b.rMax - b.rMin < n - 2)
    errs.push(`ひろがり不足 span ${b.cMax - b.cMin}×${b.rMax - b.rMin}（bbox ≥ ${n - 2}）`);
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本が上限 ${NON45_CAP_F} 超`);
  if (p.requireNon45 && mF.non45 < 1) errs.push("非45° が 1 本もない（requireNon45）");
  if (mF.crossings > CROSS_HI) errs.push(`交差 ${mF.crossings} か所が上限 ${CROSS_HI} 超`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)} 本が上限 ${DANGLING_MAX_F} 超`);
  if (closedLoops(F, mF.components) < 1) errs.push("閉路なし（閉じた骨格が必要）");

  if (inter < p.entangle[0] || inter > p.entangle[1])
    errs.push(`絡み ${inter} が窓 [${p.entangle[0]}, ${p.entangle[1]}] の外`);
  const comps = componentsOf(F);
  if (comps > 2) errs.push(`完成図が ${comps} つに分かれている（≤2）`);
  if (inter === 0 && comps !== 1) errs.push("絡み 0 なのに A と B が接していない（離れ小島）");

  if (D < dLo) errs.push(`D=${D} が下限 ${dLo} 未満`);
  if (D >= dHi) errs.push(`D=${D} が上限 ${dHi} 以上`);
  return errs;
}

/* ---- SVG 3 ペイン（C − B ＝ A）＝分解の紙面順 ---- */
function svgTriple(A: EdgeT[], B: EdgeT[], n: number): string {
  const cell = 24, pad = 12, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.2" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  const board = (body: string) =>
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + body + "</svg>";
  const paneF = board(
    A.map((e) => line(e, "#2b2925", 2.2)).join("") + B.map((e) => line(e, "#1a56a8", 2.2)).join(""));
  const paneB = board(B.map((e) => line(e, "#1a56a8", 2.4)).join(""));
  const paneA = board(A.map((e) => line(e, "#2b2925", 2.4)).join(""));
  return `<div class="pair">${paneF}<span class="op">−</span>${paneB}<span class="op">＝</span>${paneA}</div>`;
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

async function main() {
  const write = process.argv.includes("--write");
  const pvIdx = process.argv.indexOf("--preview");
  const previewPath = pvIdx >= 0 ? process.argv[pvIdx + 1] : null;

  /* ---- かぶり台帳（seed-decompose-motifs.ts と同じ方針） ---- */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("overlay-") && !sku.startsWith("decompose-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(p.edges), `published:${p.id}`);
    }
  }
  const allCandFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.endsWith(".json"));
  const liveSame: EdgeT[][] = [];
  for (const f of allCandFiles.filter((x) => x.startsWith("overlay-") || x.startsWith("decompose-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSame.push(c.edges);
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }
  const warnSigs = new Map<string, string>();
  for (const f of allCandFiles.filter((x) => !x.startsWith("overlay-") && !x.startsWith("decompose-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.gen?.kind === "manual") warnSigs.set(shapeSignature(c.edges), `${file.sku}:${c.provenance?.label ?? c.id}`);
    }
  }

  /* ---- 検証 ---- */
  type Row = {
    seed: Seed; A: EdgeT[]; B: EdgeT[]; F: EdgeT[];
    mA: ProblemMetrics; mB: ProblemMetrics; m: ProblemMetrics;
    D: number; inter: number; touch: number; errs: string[]; warns: string[];
  };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();
  const n = DECOMPOSE_LADDER[SKU].grid;

  for (const seed of SEEDS) {
    const errs: string[] = [];
    const warns: string[] = [];
    const A = normalizeEdges(parsePaths(seed.pathsA));
    const B = normalizeEdges(parsePaths(seed.pathsB));
    const F = normalizeEdges([...A, ...B]);
    const mA = computeMetrics(A, n);
    const mB = computeMetrics(B, n);
    const mF = computeMetrics(F, n);
    const probe: Problem = {
      id: `${SKU}-probe`, grid: { type: "square", n }, edges: F, metrics: mF,
      answer: { mode: "explicit", edges: B },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("decompose", probe).value;
    const inter = interCrossings(A, B);
    const touch = sharedPoints(A, B);
    errs.push(...checkSeed(A, B, F, mA, mB, mF, D, inter));
    errs.push(...validateProblem(probe));
    for (const [name, part] of [["A", A], ["B", B]] as const) {
      const hige = danglingCount(part as EdgeT[]);
      if (hige > DANGLING_MAX_PART) warns.push(`図${name} 単体のヒゲ ${hige} 本（目視で散らばりを確認）`);
    }

    const sig = shapeSignature(F);
    const dup = known.get(sig);
    if (dup) errs.push(`形かぶり → ${dup}`);
    const selfDup = seenSelf.get(sig);
    if (selfDup) errs.push(`バッチ内かぶり → ${selfDup}`);
    seenSelf.set(sig, seed.label);
    const wd = warnSigs.get(sig);
    if (wd) warns.push(`他タスク手設計とかぶり → ${wd}`);
    for (const other of liveSame) {
      const j = jaccard(other, F);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    for (const r of rows) {
      const j = jaccard(r.F, F);
      if (j > 0.6) warns.push(`バッチ内で類似 J=${j.toFixed(2)}（${r.seed.label}）`);
    }

    rows.push({ seed, A, B, F, mA, mB, m: mF, D, inter, touch, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  console.log(`\n===== ${SKU}（D ${D_WINDOW[0]}〜${D_WINDOW[1]} 未満・${rows.length}問） =====`);
  for (const r of rows) {
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    console.log(
      `${status}${r.seed.label}`
      + `  A:線${r.mA.lines}/E${edgeE(r.mA)} B:線${r.mB.lines}/E${edgeE(r.mB)}`
      + ` 絡み${r.inter} 共有${r.touch} 交差${r.m.crossings} 非45°${r.m.non45}`
      + ` ヒゲ${danglingCount(r.F)} D=${r.D}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const ds = rows.map((r) => r.D);
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  D=${Math.min(...ds)}〜${Math.max(...ds)}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  ${svgTriple(r.A, r.B, n)}
  <div class="meta">D=${r.D}・絡み${r.inter}・共有${r.touch}・交差${r.m.crossings}・非45° ${r.m.non45}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>decompose lv5 vol1 モチーフ D40-50</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.pair{display:flex;gap:6px;justify-content:center;align-items:center;margin:6px 0}
.op{font-size:18px;color:#666}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{background:#fffdf9;border:1px dashed #eee}
</style>
<h1>decompose-lv5-vol1 モチーフ（D 40〜50・${rows.length}問）</h1>
<p style="font-size:13px;color:#666">完成図（黒＋青）− 引くもの（青）＝ こたえ（黒）</p><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 2;
    const board = (n - 1) * 24 + 24;
    const cellW = 3 * board + 120, cellH = board + 44;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgTriple(r.A, r.B, n).replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 26)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("")
        + `<text x="${board + 6}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">−</text>`
        + `<text x="${2 * board + 32}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">＝</text>`;
      return `<g transform="translate(${x},${y})">
<text x="8" y="18" font-size="14" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D} 絡み${r.inter}${r.errs.length ? "  ✗NG" : ""}</text>
<g transform="translate(8,26)">${g}</g>
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
  const file = JSON.parse(
    stripBom(await fs.readFile(path.join(CAND_DIR, `${SKU}.json`), "utf8")),
  ) as CandidateFile;
  let maxM = file.candidates.reduce((mx, c) => {
    const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, k);
  }, 0);
  for (const r of rows) {
    const base: Problem = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "square", n },
      edges: r.F,
      answer: { mode: "explicit", edges: r.B },
      metrics: r.m,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("decompose", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log(`書き込み完了 → ${SKU}.json（${rows.length} 問）`);
}

/* レポート用の E（gen/difficulty.ts edgeLoad と同じ式） */
function edgeE(m: ProblemMetrics): number {
  const tate = m.lines - m.diagonals;
  const a45 = m.diagonals - m.non45;
  const gentle = m.non45Gentle ?? 0;
  const steep = m.non45 - gentle;
  return tate + 1.5 * a45 + 4 * gentle + 5 * steep;
}

main().catch((e) => { console.error(e); process.exit(1); });
