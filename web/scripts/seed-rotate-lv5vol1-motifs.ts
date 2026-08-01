/* rotate-lv5-vol1（5×5・mixed）モチーフ追加バッチ
   （npx tsx scripts/seed-rotate-lv5vol1-motifs.ts [--write] [--preview <html>] [--png <png>]）

   Lv.5 vol.1 の自動生成候補は D=6〜28 に固まって難易度が足りないため、手設計モチーフを
   15 問投入する。内訳（2026-07-28 オーナー指示）＝5 ジャンル × 3 問:
     のりもの（ロケット・きかんしゃ・ヘリコプター）
     どうぶつ（かに・ことり・ちょう）
     しぜん（きのこ・チューリップ・まつ）
     たてもの（とうだい・つりばし・おしろ）
     どうぐ（かぎ・かさ・はた）
   方針＝D（= lines + 1.5·diagonals + 8·non45）を 30 以上に上げる。5×5 の lines 上限が
   12 本なので、非45° を 2 本載せて 16 点を確保し、残りを 45° と線本数で積む。

   回転タスク固有の制約（gen/rotate.ts と同一規約）:
   - 回転は盤面中心まわり ⇒ R は常に盤内。移動のような「動く余白」制約が無く、
     図形は盤面いっぱいを使える（centerPlace）。
   - mixed 巻＝1 問 1 角度。90cw / 90ccw / 180 を 5 問ずつに配る（decisions §3.87）。
   - 退化除外: その角度で自分に重なる形は「回さなくても写せる」＝解答が出題と同じ。
     90°問題は r90 対称を、180°問題は r180 / r90 対称を弾く。
   - 非45° は 180°/mixed 帯のみ解禁・生成器と同じ 2 本までに揃える。

   - 本物の computeMetrics / taskDifficulty / ROTATE_LADDER で巻制約を検証
   - published copy（みほん側・回転後の解答側の両方）＋既存 rotate candidates 全 status
     ＋生成ライブラリとの形かぶりを検証
   - --preview で SVG 一覧 HTML（左＝みほん F／右＝こたえ R=rotate(F)）、--png でコンタクトシート
   - --write で candidates/rotate-lv5-vol1.json に status=pending で追記（手設計採番 -mNN）
   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { ROTATE_LADDER, rotateEdges, degOf, type RotateAngle } from "../app/products/problems/gen/rotate";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "rotate-lv5-vol1";
const D_MIN = 30;   // オーナー指示（2026-07-28）
const D_MAX = 40;   // lines 12 + 45°積み + 非45° 2本 の実質上限（超えたら巻の外）
const NON45_CAP = 2;      // gen/rotate.ts: 解禁帯でも 2 本まで
const CROSS_MAX = 4;      // copyParamsFor の grid 5 → crossings [0,4]
const DIAG_MAX = 9;       // copyParamsFor diagonals [0,9]
const DANGLING_MAX = 2;   // gen/rotate.ts のヒゲ上限

type Angle = Exclude<RotateAngle, "mixed">;

type Seed = {
  label: string; category: string;
  angle: Angle;            // この問題の回転角（mixed 巻なので 1 問 1 角度）
  paths: string[];         // モチーフローカル座標 "c,r"（r 下向き・原点寄せ前提でなくてよい）
};

/* 15 モチーフ。5×5（座標 0..4）・線 6〜12 本・非45° 2 本・ヒゲ 2 本以下・閉路あり。 */
const SEEDS: Seed[] = [
  /* ========================= のりもの ========================= */
  {
    label: "ロケット", category: "のりもの", angle: "180",
    paths: [
      "2,0 1,1 1,3 3,3 3,1 2,0", // きたい（とがったあたま）
      "1,2 0,4 1,3",             // ひだりのはね（非45°）
      "3,2 4,4 3,3",             // みぎのはね（非45°）
      "1,2 3,2",                 // まんなかのせん
    ],
  },
  {
    label: "きかんしゃ", category: "のりもの", angle: "90cw",
    paths: [
      "0,4 4,4",         // したまわり
      "0,4 0,1 2,1 2,4", // うんてんしつ
      "2,2 4,2 4,4",     // ボイラーとまえ
      "3,2 3,1 1,0",     // えんとつとけむり（非45°）
      "0,3 2,3",         // うんてんしつのゆか
      "2,4 4,3",         // だいわく（非45°）
      "0,2 1,2",         // まどのわく
      "1,2 1,3",         // まどのわく
    ],
  },
  {
    label: "ヘリコプター", category: "のりもの", angle: "90ccw",
    paths: [
      "0,1 4,1",   // ローター
      "2,1 2,2",   // マスト
      "1,2 3,2",   // きたいのうえ
      "1,2 1,3",   // きたいのひだり
      "1,3 2,4",   // きたいのそこ
      "2,4 3,3",   // きたいのそこ
      "3,3 3,2",   // きたいのみぎ
      "3,3 4,1",   // テールブーム（非45°）
      "4,1 4,0",   // テールのはね
      "1,3 3,2",   // まど（非45°）
    ],
  },

  /* ========================== どうぶつ ========================== */
  {
    label: "かに", category: "どうぶつ", angle: "180",
    paths: [
      "1,1 3,1 3,3 1,3 1,1", // からだ
      "1,2 0,0",             // ひだりのはさみ（非45°）
      "3,2 4,0",             // みぎのはさみ（非45°）
      "1,3 0,4 2,4 3,3",     // あし
      "2,1 2,3",             // こうらのすじ
      "1,2 3,2",             // めのせん
    ],
  },
  {
    label: "ことり", category: "どうぶつ", angle: "90cw",
    paths: [
      "1,2 3,1",     // せなか（非45°）
      "3,1 4,2 3,3", // くちばしとあご
      "3,3 1,3",     // おなか
      "1,3 1,2",     // むね
      "1,2 0,1 0,3 1,3", // おびれ
      "2,3 3,1",     // つばさ（非45°）
      "2,3 2,4",     // あし
      "1,4 3,4",     // とまりぎ
    ],
  },
  {
    label: "ちょう", category: "どうぶつ", angle: "90ccw",
    paths: [
      "2,1 2,4",   // からだ
      "2,2 0,1",   // ひだりのはね（非45°）
      "0,1 0,4",   // ひだりのはね
      "2,2 4,1",   // みぎのはね（非45°）
      "4,1 4,4",   // みぎのはね
      "0,4 4,4",   // はねのした
      "0,2 4,2",   // はねのもよう
      "2,1 1,0",   // しょっかく
      "2,1 3,0",   // しょっかく
    ],
  },

  /* =========================== しぜん =========================== */
  {
    label: "きのこ", category: "しぜん", angle: "180",
    paths: [
      "0,2 1,0 3,0 4,2 0,2", // かさ（非45°×2）
      "1,2 1,4 3,4 3,2",     // じく
      "1,0 3,2",             // かさのもよう
      "3,0 1,2",             // かさのもよう
    ],
  },
  {
    label: "チューリップ", category: "しぜん", angle: "90cw",
    paths: [
      "1,0 1,2 3,2 3,0", // はなびら
      "1,0 2,1 3,0",     // まんなかのはなびら
      "2,2 2,4",         // くき
      "2,3 0,4",         // ひだりのは（非45°）
      "2,3 4,4",         // みぎのは（非45°）
      "0,4 4,4",         // はのさき
    ],
  },
  {
    label: "まつ", category: "しぜん", angle: "90ccw",
    paths: [
      "2,0 0,3 4,3 2,0", // そとのえだ（非45°×2）
      "0,3 2,1 4,3",     // うちのえだ
      "2,1 2,3",         // みき（うえ）
      "1,3 1,4 3,4 3,3", // みきのした
    ],
  },

  /* ========================== たてもの ========================== */
  {
    label: "とうだい", category: "たてもの", angle: "180",
    paths: [
      "0,4 4,4",         // じめん
      "0,4 1,1",         // ひだりのかべ（非45°）
      "4,4 3,1",         // みぎのかべ（非45°）
      "1,1 3,1",         // てんぼうだいのゆか
      "1,1 2,0 3,1",     // やね
      "1,4 1,3 3,3 3,4", // とびら
    ],
  },
  {
    label: "つりばし", category: "たてもの", angle: "90cw",
    paths: [
      "1,0 1,4",     // ひだりのはしら
      "3,0 3,4",     // みぎのはしら
      "0,3 4,3",     // わたるところ
      "1,0 0,3",     // ひだりのケーブル（非45°）
      "3,0 4,3",     // みぎのケーブル（非45°）
      "1,0 2,1 3,0", // まんなかのケーブル
      "2,1 2,3",     // つりさげ
      "0,4 4,4",     // かわ
    ],
  },
  {
    label: "おしろ", category: "たてもの", angle: "90ccw",
    paths: [
      "0,4 4,4",         // じめん
      "0,4 0,2",         // ひだりのかべ
      "4,4 4,2",         // みぎのかべ
      "0,2 4,2",         // かべのうえ
      "0,2 1,0 2,2",     // ひだりのとう（非45°×2）
      "2,2 3,1 4,2",     // みぎのとう
      "1,4 1,3 3,3 3,4", // もん
    ],
  },

  /* =========================== どうぐ =========================== */
  {
    label: "かぎ", category: "どうぐ", angle: "180",
    paths: [
      "0,1 1,0 2,0 3,1 2,2 1,2 0,1", // あたまのわ
      "2,2 4,3",   // じく（非45°）
      "4,3 2,4",   // ぎざぎざ（非45°）
      "2,4 4,4",   // ぎざぎざのそこ
      "4,4 4,3",   // ぎざぎざのはし
    ],
  },
  {
    label: "かさ", category: "どうぐ", angle: "90cw",
    paths: [
      "0,2 1,0 3,0 4,2",     // かさのやま（非45°×2）
      "0,2 1,3 2,2 3,3 4,2", // かさのふち
      "2,2 2,4",             // え
      "2,4 3,4",             // もちて
    ],
  },
  {
    label: "はた", category: "どうぐ", angle: "90ccw",
    paths: [
      "1,0 1,4",     // ポール
      "1,0 4,1",     // はたのうえ（非45°）
      "4,1 1,2",     // はたのした（非45°）
      "1,1 4,1",     // はたのもよう
      "1,2 2,3 1,4", // ちいさいはた
      "1,3 0,3 0,4 1,4", // だいざ
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

/* 盤面中央へ寄せる（gen/rotate.ts centerPlace と同一規約） */
function place(edges: EdgeT[], n: number): EdgeT[] {
  const b = bounds(edges);
  const offC = Math.floor((n - 1 - (b.cMax - b.cMin)) / 2);
  const offR = Math.floor((n - 1 - (b.rMax - b.rMin)) / 2);
  return normalizeEdges(edges.map((e) => [
    [e[0][0] - b.cMin + offC, e[0][1] - b.rMin + offR],
    [e[1][0] - b.cMin + offC, e[1][1] - b.rMin + offR],
  ] as EdgeT));
}

/* 巻ゲート（ROTATE_LADDER ＋ gen/rotate.ts の導出ゲート）の検証 */
function checkAgainstLadder(
  edges: EdgeT[], angle: Angle, m: ProblemMetrics, D: number, n: number,
): string[] {
  const p = ROTATE_LADDER[SKU];
  const errs: string[] = [];
  if (p.angle !== "mixed" && p.angle !== angle)
    errs.push(`巻の角度 ${p.angle} と不一致（${angle}）`);
  if (m.lines < p.lines[0] || m.lines > p.lines[1])
    errs.push(`線 ${m.lines} 本が窓 [${p.lines[0]}, ${p.lines[1]}] の外`);
  const b = bounds(edges);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1)
    errs.push(`盤面外（grid ${n}）`);
  if (b.cMax - b.cMin < n - 2 || b.rMax - b.rMin < n - 2)
    errs.push(`ひろがり不足 span ${b.cMax - b.cMin}×${b.rMax - b.rMin}（bbox ≥ ${n - 2}）`);
  if (m.components !== 1) errs.push(`かたちが ${m.components} つ（回転は 1 つのみ）`);
  if (m.non45 > NON45_CAP) errs.push(`非45° ${m.non45} 本が上限 ${NON45_CAP} 超`);
  if (m.diagonals > DIAG_MAX) errs.push(`ななめ ${m.diagonals} 本が上限 ${DIAG_MAX} 超`);
  if (m.crossings > CROSS_MAX) errs.push(`交差 ${m.crossings} か所が上限 ${CROSS_MAX} 超`);
  const hige = danglingCount(edges);
  if (hige > DANGLING_MAX) errs.push(`ヒゲ ${hige} 本が上限 ${DANGLING_MAX} 超`);
  if (closedLoops(edges, m.components) < 1) errs.push("閉路なし（4×4 以上は閉じた骨格が必要）");
  // 退化除外（gen/rotate.ts okForDeg と同一判定）
  const deg = degOf(angle);
  const degenerate = deg === 180
    ? (m.symmetry.includes("r180") || m.symmetry.includes("r90"))
    : m.symmetry.includes("r90");
  if (degenerate) errs.push(`${angle} で自分に重なる（回さなくても写せる）`);
  if (D < D_MIN) errs.push(`D=${D} が下限 ${D_MIN} 未満`);
  return errs;
}

/* SVG ペア（左＝みほん F／右＝こたえ R=rotate(F)） */
function svgPair(edges: EdgeT[], angle: Angle, n: number): string {
  const cell = 30, pad = 14, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.4" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number, dash = "") =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash}/>`;
  const R = rotateEdges(edges, n, degOf(angle));
  const left = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + edges.map((e) => line(e, "#2b2925", 2.6)).join("") + "</svg>";
  const right = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + R.map((e) => line(e, "#c2452d", 2, ' stroke-dasharray="5 3"')).join("") + "</svg>";
  return `<div class="pair">${left}${right}</div>`;
}

const ANGLE_JA: Record<Angle, string> = {
  "90cw": "右に90°", "90ccw": "左に90°", "180": "180°",
};

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

  const params = ROTATE_LADDER[SKU];
  if (!params) throw new Error(`ROTATE_LADDER に ${SKU} が無い`);
  const n = params.grid;

  /* ---- かぶり台帳 ----
     published copy（生成器と同じ publishedCopySignatures）＋ published rotate ＋
     rotate candidates 全 status ＋ 生成ライブラリ全変種。 */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("rotate-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(p.edges), `published:${p.id}`);
    }
  }
  const candFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.startsWith("rotate-") && f.endsWith(".json"));
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
  /* 別タスクの手設計モチーフ（translate バッチ）との絵柄かぶりは warn 扱い
     （タスクが違えば設問は別だが、同じ絵を使い回すのは避けたい）。 */
  const otherMotifs = new Map<string, string>();
  for (const f of (await fs.readdir(CAND_DIR)).filter((x) => x.endsWith(".json") && !x.startsWith("rotate-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.gen?.kind !== "manual") continue;
      otherMotifs.set(shapeSignature(c.edges), `${file.sku}:${c.provenance?.label ?? c.id}`);
    }
  }

  /* ---- 検証 ---- */
  type Row = { seed: Seed; edges: EdgeT[]; m: ProblemMetrics; D: number; errs: string[]; warns: string[] };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();
  const pubSigs = publishedCopySignatures();

  for (const seed of SEEDS) {
    const errs: string[] = [];
    const warns: string[] = [];
    const edges = place(normalizeEdges(parsePaths(seed.paths)), n);
    const m = computeMetrics(edges, n);
    const deg = degOf(seed.angle);
    const probe: Problem = {
      id: `${SKU}-probe`, grid: { type: "square", n }, edges, metrics: m,
      answer: { mode: "derived", transform: { type: "rotate", deg } },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("rotate", probe).value;
    errs.push(...checkAgainstLadder(edges, seed.angle, m, D, n));
    errs.push(...validateProblem(probe));
    if (D > D_MAX) warns.push(`D=${D} が巻の目安上限 ${D_MAX} 超`);

    const sig = shapeSignature(edges);
    const dup = known.get(sig);
    if (dup) errs.push(`形かぶり → ${dup}`);
    // 解答ペイン（回転後）に模写公開済みの形が現れるかぶり（gen/rotate.ts と同じ判定）
    const rotSig = shapeSignature(rotateEdges(edges, n, deg));
    if (pubSigs.has(rotSig)) errs.push("こたえの形が模写公開済みとかぶり");
    const selfDup = seenSelf.get(sig);
    if (selfDup) errs.push(`バッチ内かぶり → ${selfDup}`);
    seenSelf.set(sig, seed.label);
    const otherDup = otherMotifs.get(sig);
    if (otherDup) warns.push(`他タスクの手設計モチーフとかぶり → ${otherDup}`);
    for (const other of liveSameSku) {
      const j = jaccard(other, edges);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    for (const r of rows) {
      const j = jaccard(r.edges, edges);
      if (j > 0.6) warns.push(`バッチ内で類似 J=${j.toFixed(2)}（${r.seed.label}）`);
    }

    rows.push({ seed, edges, m, D, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  for (const r of rows) {
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    console.log(
      `${status}${r.seed.label}（${r.seed.category}・${ANGLE_JA[r.seed.angle]}）`
      + `  線${r.m.lines} ななめ${r.m.diagonals} 非45° ${r.m.non45} 交差${r.m.crossings}`
      + ` ヒゲ${danglingCount(r.edges)} 閉路${closedLoops(r.edges, r.m.components)}`
      + ` 対称[${r.m.symmetry.join(",") || "なし"}] D=${r.D}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const ds = rows.map((r) => r.D);
  const byAngle = new Map<string, number>();
  for (const r of rows) byAngle.set(r.seed.angle, (byAngle.get(r.seed.angle) ?? 0) + 1);
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  D=${Math.min(...ds)}〜${Math.max(...ds)}（平均 ${(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1)}）`
    + `  角度 ${[...byAngle].map(([a, c]) => `${a}:${c}`).join(" / ")}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}・${ANGLE_JA[r.seed.angle]}</span></div>
  ${svgPair(r.edges, r.seed.angle, n)}
  <div class="meta">D=${r.D}・線${r.m.lines}・ななめ${r.m.diagonals}・非45° ${r.m.non45}・交差${r.m.crossings}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>rotate-lv5-vol1 モチーフ追加</title>
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
<h1>rotate-lv5-vol1 モチーフ追加（${SEEDS.length}問・D≥${D_MIN}）</h1>
<p style="font-size:13px;color:#666">左＝みほん F／右＝こたえ R=rotate(F)</p><div class="grid">${cards}</div>`;
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
      const inner = svgPair(r.edges, r.seed.angle, n)
        .replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 12)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("");
      return `<g transform="translate(${x},${y})">
<text x="10" y="22" font-size="15" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D}  ${ANGLE_JA[r.seed.angle]}</text>
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
    schemaVersion: 1 as const, sku: SKU, task: "rotate", candidates: [], seedCursor: 0,
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
      answer: { mode: "derived", transform: { type: "rotate", deg: degOf(r.seed.angle) } },
      metrics: r.m,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("rotate", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log("書き込み完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
