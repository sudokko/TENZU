/* translate-lv5-vol1（6×6・compound）モチーフ追加バッチ
   （npx tsx scripts/seed-translate-lv5vol1-motifs.ts [--write] [--preview <html>] [--png <png>]）

   Lv.5 vol.1 の自動生成候補は D=6〜26 に固まって難易度が足りないため、手設計モチーフを
   18 問投入する。内訳（2026-07-25 オーナー指示）: ヨット3・車3・動物3・自然3・太陽3・月3。
   方針＝D（= lines + 1.5·diagonals + 8·non45）を 30 以上に上げる。非45°を 2 本前後 載せ、
   線本数と 45° で残りを積む（上限は模写 6×6 巻の D 窓 43 を目安にする）。

   移動タスク固有の制約:
   - みほん F と F+(dc,dr) が同じ 6×6 に収まる ⇒ 図形のスパンは移動量ぶん小さくなる。
     compound（両軸 ≥1・|dc|≠|dr|）の最小 m=3 で 5×4 点 または 4×5 点が上限。
   - 構成要素は 1（★きてん 1 点のアンカー規約・gen/translate.ts と同じ判断）。
   - 配置＝F∪F' の union bbox を盤面中央へ（generator placeWithVector と同一規約）。

   - 本物の computeMetrics / taskDifficulty / TRANSLATE_LADDER で巻制約を検証
   - published copy/translate ＋既存 candidates（全 status）＋生成ライブラリとの形かぶりを検証
   - --preview で SVG 一覧 HTML（左＝みほん＋★／右＝いどう先の●とうすい F'）、--png でコンタクトシート
   - --write で candidates/translate-lv5-vol1.json に status=pending で追記（手設計採番 -mNN）
   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics, type Pt,
} from "../app/products/problems/schema";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature } from "../app/products/problems/gen/dedupe";
import { TRANSLATE_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "translate-lv5-vol1";
const D_MIN = 30;   // オーナー指示（2026-07-25）
const D_MAX = 43;   // 模写 6×6 巻（copy-lv5-vol1）の D 窓 上限＝ジャンル外に出ない目安

type Seed = {
  label: string; category: string;
  vec: [number, number];   // 移動ベクトル（dc, dr）
  paths: string[];         // モチーフローカル座標（原点寄せ前提でなくてよい）
};

/* 18 モチーフ。座標は "c,r"（r 下向き）。
   箱A＝5×4 点（vec の |dc|=1,|dr|=2）／箱B＝4×5 点（|dc|=2,|dr|=1）。 */
const SEEDS: Seed[] = [
  /* ========================== ヨット ========================== */
  {
    label: "ヨット", category: "ヨット", vec: [1, 2],
    paths: [
      "0,2 4,2",          // デッキ
      "0,2 1,3 3,3 4,2",  // せんてい
      "2,0 2,2",          // マスト
      "2,0 4,1 2,2",      // おおきなほ（非45°×2）
      "2,0 0,2",          // まえのほ
    ],
  },
  {
    label: "はしるヨット", category: "ヨット", vec: [2, 1],
    paths: [
      "0,3 3,3",          // デッキ
      "0,3 1,4 2,4 3,3",  // せんてい
      "1,0 1,3",          // マスト
      "1,0 3,1 1,2",      // おおきなほ（非45°×2）
      "1,0 0,1 0,3",      // まえのほ
    ],
  },
  {
    label: "ふたつのほのヨット", category: "ヨット", vec: [-1, 2],
    paths: [
      "0,2 4,2",      // デッキ
      "0,2 2,3 4,2",  // Vがたのせんてい（非45°×2）
      "2,0 2,2",      // マスト
      "2,0 4,2",      // うしろのほ
      "2,0 0,2",      // まえのほ
      "2,0 3,0 2,1",  // てっぺんのはた
    ],
  },

  /* =========================== 車 =========================== */
  {
    label: "くるま", category: "車", vec: [1, -2],
    paths: [
      "0,2 4,2",      // したまわり
      "0,2 0,1",      // うしろ
      "0,1 2,0",      // うしろのまど（非45°）
      "2,0 3,0",      // やね
      "3,0 4,2",      // フロントガラスとボンネット（非45°）
      "2,0 2,2",      // ピラー
      "1,2 1,3 2,3 2,2", // うしろのタイヤ
      "3,2 3,3 4,3 4,2", // まえのタイヤ
    ],
  },
  {
    label: "トラック", category: "車", vec: [-1, -2],
    paths: [
      "0,2 4,2",      // したまわり
      "0,2 0,0 2,0 2,2", // にだい
      "0,2 2,1",      // にだいのしるし（非45°）
      "0,1 2,0",      // にだいのしるし（非45°）
      "2,1 3,1",      // うんてんせきのやね
      "3,1 4,2",      // フロントガラス
      "0,2 0,3 1,3 1,2", // うしろのタイヤ
      "3,2 3,3 4,3 4,2", // まえのタイヤ
    ],
  },
  {
    label: "はしごしゃ", category: "車", vec: [2, -1],
    paths: [
      "0,3 3,3",      // したまわり
      "0,3 0,2 3,2 3,3", // しゃたい
      "2,2 2,3",      // まど
      "1,3 1,4 2,4 2,3", // タイヤ
      "0,2 2,0",      // はしごのレール
      "1,2 3,0",      // はしごのレール
      "1,1 2,1",      // はしごのだん
      "2,0 3,0",      // はしごのだん
      "3,2 2,0",      // はしごのささえ（非45°）
      "0,3 1,1",      // はしごのささえ（非45°）
    ],
  },

  /* ========================== どうぶつ ========================== */
  {
    label: "ねこ", category: "動物", vec: [1, 2],
    paths: [
      "0,1 4,1",      // かおのうえ＋みみのそこ
      "0,0 1,1",      // ひだりみみ
      "0,0 0,1",      // ひだりみみ
      "3,1 4,0",      // みぎみみ
      "4,0 4,1",      // みぎみみ
      "1,1 1,3",      // かおのひだり
      "3,1 3,3",      // かおのみぎ
      "1,3 3,3",      // かおのした
      "1,2 3,3",      // ひげ（非45°）
      "1,3 3,2",      // ひげ（非45°）
      "2,1 2,2",      // はな
    ],
  },
  {
    label: "うさぎ", category: "動物", vec: [-2, 1],
    paths: [
      "0,2 2,2",      // かおのうえ
      "0,1 0,4",      // かおのひだり
      "2,1 2,4",      // かおのみぎ
      "0,4 2,4",      // かおのした
      "0,2 1,0 0,1",  // ひだりみみ（非45°）
      "2,2 3,0 2,1",  // みぎみみ（非45°）
      "0,3 1,4",      // め
      "1,3 0,4",      // め
      "1,3 2,4",      // くち
    ],
  },
  {
    label: "さかな", category: "動物", vec: [-1, 2],
    paths: [
      "1,2 3,1",      // せなか（非45°）
      "3,1 4,2 3,3",  // おなかとおびれのつけね
      "2,3 3,3",      // おなかのした
      "2,3 1,2",      // おなか
      "1,2 0,1 0,3 1,2", // おびれ
      "3,1 3,2",      // め
      "3,1 1,0",      // せびれ（非45°）
      "1,0 1,2",      // せびれ
    ],
  },

  /* =========================== 自然 =========================== */
  {
    label: "き", category: "自然", vec: [-2, -1],
    paths: [
      "0,2 1,0",      // はっぱ（非45°）
      "1,0 3,1",      // はっぱ（非45°）
      "3,1 3,2 2,3 1,3 0,2", // はっぱ
      "1,3 1,4",      // みき
      "2,3 2,4",      // みき
      "0,4 3,4",      // じめん
      "1,3 2,2",      // えだ
    ],
  },
  {
    label: "はな", category: "自然", vec: [2, -1],
    paths: [
      "1,1 2,0 3,1 2,2 1,1", // まんなかの花びら
      "2,0 0,1 2,2",          // おおきな花びら（非45°×2）
      "2,2 2,4",              // くき
      "2,3 1,4 2,4",          // は
    ],
  },
  {
    label: "やま", category: "自然", vec: [-1, -2],
    paths: [
      "0,3 4,3",      // じめん
      "0,3 2,0",      // やまのひだり（非45°）
      "2,0 4,3",      // やまのみぎ（非45°）
      "0,3 1,2 2,3",  // てまえのおか
      "2,3 3,2 4,3",  // てまえのおか
    ],
  },

  /* =========================== 太陽 =========================== */
  {
    label: "たいよう", category: "太陽", vec: [1, 2],
    paths: [
      "2,0 3,1 2,2 1,1 2,0", // たいようのからだ
      "1,1 0,1",  // ひかり
      "3,1 4,1",  // ひかり
      "2,2 2,3",  // ひかり
      "1,1 0,3",  // ながいひかり（非45°）
      "3,1 4,3",  // ながいひかり（非45°）
    ],
  },
  {
    label: "ひかりのたいよう", category: "太陽", vec: [2, 1],
    paths: [
      "1,0 2,0 3,1 3,3 2,4 1,4 0,3 0,1 1,0", // はちかくのたいよう
      "1,0 3,3",  // さしこむひかり（非45°）
      "3,1 1,4",  // さしこむひかり（非45°）
    ],
  },
  {
    label: "あさひ", category: "太陽", vec: [-1, 2],
    paths: [
      "0,3 4,3",              // ちへいせん
      "0,3 0,2 1,1 3,1 4,2 4,3", // のぼるたいよう
      "2,1 2,0",              // ひかり
      "1,1 0,0",              // ひかり
      "3,1 4,0",              // ひかり
      "0,2 1,0",              // ながいひかり（非45°）
      "4,2 3,0",              // ながいひかり（非45°）
    ],
  },

  /* ============================ 月 ============================ */
  {
    label: "みかづき", category: "月", vec: [3, 1],
    paths: [
      "2,0 1,0 0,1 0,3 1,4 2,4", // そとがわ
      "2,0 1,2 2,4",              // うちがわ（非45°×2）
      "0,2 1,2",                  // クレーター
    ],
  },
  {
    label: "はんげつ", category: "月", vec: [1, -2],
    paths: [
      "1,0 1,3",              // まっすぐなふち
      "1,0 3,0 4,1 4,2 3,3 1,3", // まるいふち
      "1,1 3,2",              // クレーター（非45°）
      "1,2 3,1",              // クレーター（非45°）
      "1,1 2,0",              // クレーター
    ],
  },
  {
    label: "やまの上のみかづき", category: "月", vec: [-1, -2],
    paths: [
      "2,0 4,1",      // つきのそとがわ（非45°）
      "4,1 4,2",      // つきのそとがわ
      "4,2 2,3",      // つきのそとがわ（非45°）
      "2,0 3,1 3,2 2,3", // つきのうちがわ
      "0,3 2,3",      // やまのふもと
      "0,3 1,2 2,3",  // やま
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

/* F∪F' の union bbox を盤面中央へ（gen/translate.ts placeWithVector と同一規約） */
function place(edges: EdgeT[], vec: [number, number], n: number): EdgeT[] {
  const b = bounds(edges);
  const spanC = b.cMax - b.cMin, spanR = b.rMax - b.rMin;
  const [dc, dr] = vec;
  const uC = spanC + Math.abs(dc), uR = spanR + Math.abs(dr);
  const offC = Math.floor((n - 1 - uC) / 2) + (dc < 0 ? -dc : 0);
  const offR = Math.floor((n - 1 - uR) / 2) + (dr < 0 ? -dr : 0);
  return normalizeEdges(edges.map((e) => [
    [e[0][0] - b.cMin + offC, e[0][1] - b.rMin + offR],
    [e[1][0] - b.cMin + offC, e[1][1] - b.rMin + offR],
  ] as EdgeT));
}

/* ★きてん＝F の辞書順最小点（描画側と同じ導出規約） */
function anchorOf(edges: EdgeT[]): Pt {
  let a: Pt = edges[0][0];
  for (const e of edges) for (const p of e) {
    if (p[0] < a[0] || (p[0] === a[0] && p[1] < a[1])) a = p;
  }
  return a;
}

/* 巻ゲート（TRANSLATE_LADDER）の検証 */
function checkAgainstLadder(edges: EdgeT[], vec: [number, number], m: ProblemMetrics, D: number): string[] {
  const p = TRANSLATE_LADDER[SKU];
  const errs: string[] = [];
  const n = p.grid;
  const [dc, dr] = vec;
  const mag = Math.abs(dc) + Math.abs(dr);
  if (p.dir === "compound" && (Math.abs(dc) < 1 || Math.abs(dr) < 1 || Math.abs(dc) === Math.abs(dr)))
    errs.push(`複合いどうでない vec=(${dc},${dr})`);
  if (mag < p.moves[0] || mag > p.moves[1])
    errs.push(`いどう量 ${mag} が窓 [${p.moves[0]}, ${p.moves[1]}] の外`);
  const b = bounds(edges);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  if (b.cMin + dc < 0 || b.cMax + dc > n - 1 || b.rMin + dr < 0 || b.rMax + dr > n - 1)
    errs.push(`いどう先が盤面外（span ${b.cMax - b.cMin}×${b.rMax - b.rMin} ＋ vec (${dc},${dr})）`);
  if (m.components !== 1) errs.push(`かたちが ${m.components} つ（★きてん規約は 1 つのみ）`);
  if (D < D_MIN) errs.push(`D=${D} が下限 ${D_MIN} 未満`);
  return errs;
}

/* SVG プレビュー（左＝みほん＋★／右＝いどう先の●とうすい F'） */
function svgPair(edges: EdgeT[], vec: [number, number], n: number): string {
  const cell = 30, pad = 14, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.4" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number, dash = "") =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash}/>`;
  const a = anchorOf(edges);
  const star = `<circle cx="${px(a[0])}" cy="${px(a[1])}" r="5" fill="none" stroke="#c2452d" stroke-width="2"/>`;
  const dest: Pt = [a[0] + vec[0], a[1] + vec[1]];
  const dot = `<circle cx="${px(dest[0])}" cy="${px(dest[1])}" r="5" fill="#c2452d"/>`;
  const moved = edges.map((e) => [
    [e[0][0] + vec[0], e[0][1] + vec[1]], [e[1][0] + vec[0], e[1][1] + vec[1]],
  ] as EdgeT);
  const left = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + edges.map((e) => line(e, "#2b2925", 2.6)).join("") + star + "</svg>";
  const right = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + moved.map((e) => line(e, "#c9c2b6", 2, ' stroke-dasharray="4 3"')).join("") + dot + "</svg>";
  return `<div class="pair">${left}${right}</div>`;
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

  const params = TRANSLATE_LADDER[SKU];
  if (!params) throw new Error(`TRANSLATE_LADDER に ${SKU} が無い`);
  const n = params.grid;

  /* ---- かぶり台帳（published copy/translate ＋ candidates 全 status ＋ 生成ライブラリ） ---- */
  const known = new Map<string, string>();
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!(sku.startsWith("copy-") || sku.startsWith("translate-"))) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(p.edges), `published:${p.id}`);
    }
  }
  const candFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.startsWith("translate-") && f.endsWith(".json"));
  const liveSameSku: EdgeT[][] = [];
  for (const f of candFiles) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSameSku.push(c.edges);
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
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
    const edges = place(normalizeEdges(parsePaths(seed.paths)), seed.vec, n);
    const m = computeMetrics(edges, n);
    const probe: Problem = {
      id: `${SKU}-probe`, grid: { type: "square", n }, edges, metrics: m,
      answer: { mode: "derived", transform: { type: "translate", dc: seed.vec[0], dr: seed.vec[1] } },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("translate", probe).value;
    errs.push(...checkAgainstLadder(edges, seed.vec, m, D));
    errs.push(...validateProblem(probe));
    if (D > D_MAX) warns.push(`D=${D} が模写 6×6 の窓上限 ${D_MAX} 超`);

    const sig = shapeSignature(edges);
    const dup = known.get(sig);
    if (dup) errs.push(`形かぶり → ${dup}`);
    const selfDup = seenSelf.get(sig);
    if (selfDup) errs.push(`バッチ内かぶり → ${selfDup}`);
    seenSelf.set(sig, seed.label);
    for (const other of liveSameSku) {
      const j = jaccard(other, edges);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    const hige = danglingCount(edges);
    if (hige > 2) warns.push(`ヒゲ（線のはし）が ${hige} 本`);

    rows.push({ seed, edges, m, D, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  for (const r of rows) {
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    console.log(
      `${status}${r.seed.label}（${r.seed.category}）vec=(${r.seed.vec[0]},${r.seed.vec[1]})` +
      `  lines=${r.m.lines} diag=${r.m.diagonals} non45=${r.m.non45} cross=${r.m.crossings}` +
      ` comp=${r.m.components} D=${r.D}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const ds = rows.map((r) => r.D);
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  D=${Math.min(...ds)}〜${Math.max(...ds)}（平均 ${(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1)}）`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  ${svgPair(r.edges, r.seed.vec, n)}
  <div class="meta">D=${r.D}・いどう(${r.seed.vec[0]},${r.seed.vec[1]})・線${r.m.lines}・ななめ${r.m.diagonals}・非45° ${r.m.non45}・交差${r.m.crossings}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>translate-lv5-vol1 モチーフ追加</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;width:400px}
.head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.pair{display:flex;gap:8px;justify-content:center;margin:6px 0}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{background:#fffdf9;border:1px dashed #eee}
</style>
<h1>translate-lv5-vol1 モチーフ追加（${SEEDS.length}問・D≥${D_MIN}）</h1><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cell = 30, pad = 14, board = (n - 1) * cell + pad * 2;
    const cols = 3, cellW = board * 2 + 40, cellH = board + 60;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgPair(r.edges, r.seed.vec, n)
        .replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 12)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("");
      return `<g transform="translate(${x},${y})">
<text x="10" y="22" font-size="15" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D}  いどう(${r.seed.vec[0]},${r.seed.vec[1]})</text>
<g transform="translate(10,32)">${g}</g>
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
    schemaVersion: 1 as const, sku: SKU, task: "translate", candidates: [], seedCursor: 0,
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
      answer: { mode: "derived", transform: { type: "translate", dc: r.seed.vec[0], dr: r.seed.vec[1] } },
      metrics: r.m,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("translate", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log("書き込み完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
