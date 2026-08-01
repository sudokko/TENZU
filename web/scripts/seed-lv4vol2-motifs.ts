/* copy-lv4-vol2（5×5・非45°必須・盤面いっぱい）D30 帯のモチーフ追加バッチ
   （npx tsx scripts/seed-lv4vol2-motifs.ts [--write] [--preview <html>] [--png <png>]）

   この巻は D 窓 [15.9, 48] に対し候補が D24 以下に密集し、D28〜34 が 5 問しかない。
   中盤〜終盤の山が作れないため、D30 帯を手設計モチーフ 20 問で厚くする。
   内訳（2026-07-29 オーナー指示）: どうぶつ6・たべもの5・しょくぶつ5・いえ4。

   ★ D30 の作り方（5×5・fullGrid なので盤面項 G は常に 5）
       D = 対称係数 k × E ＋ 5 ＋ 0.7×(画数−1) ＋ 3×対称くずし
       E = たてよこ×1 ＋ 45°ななめ×1.5 ＋ 非45°(2:1系)×4 ＋ 非45°(急)×5
     左右対称の絵は k=0.7 が掛かって D が 3 割落ちるので、同じ D30 でも
     「非対称の絵は線ひかえめ・対称の絵は線多め」に振り分けている。

   - 本物の computeMetrics / baseDifficulty / COPY_LADDER で巻制約（slopes・fullGrid・
     requireNon45・D 窓）を検証。式を script 側に複製しない
   - published copy＋既存 candidates 全 status＋生成ライブラリ全変種との形かぶりを検証
   - --preview で SVG 一覧 HTML、--png でコンタクトシート（目視検品用）
   - --write で candidates/copy-lv4-vol2.json に status=pending で追記（手設計採番 -mNN）
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

const SKU = "copy-lv4-vol2";
const D_LO = 28;   // このバッチの狙い（窓ではなく「D30 帯」の目安）
const D_HI = 35;

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

type Seed = { label: string; category: string; paths: string[] };

/* 20 モチーフ。座標は "c,r"（r 下向き）・5×5 盤面（0..4）に直書き。
   fullGrid 巻のため c も r も 0 と 4 に必ず触れること（span 4×4）。
   非45°必須のため、各図に「2マス進んで1マス下がる」系の線を最低 1 本入れる。 */
const SEEDS: Seed[] = [
  /* ========================= どうぶつ ========================= */
  {
    label: "よこむきのねこ", category: "どうぶつ",
    paths: [
      "0,3 1,0",      // せなかからみみ（非45° 1:3）
      "1,0 2,1",      // みみ（45°）
      "2,1 4,0",      // せなか（非45° 2:1）
      "4,0 4,2",      // しっぽ
      "4,2 3,4",      // おしり（非45° 1:2）
      "3,4 1,4",      // ゆかのあし
      "1,4 0,3",      // むね（45°）
      "0,3 3,2",      // おなかの線（非45° 3:1）
      "2,4 2,3",      // あし
    ],
  },
  {
    label: "はしるいぬ", category: "どうぶつ",
    paths: [
      "0,0 2,1",      // たれみみの上（非45° 2:1）
      "2,1 4,0",      // あたま（非45° 2:1）
      "0,0 1,3",      // みみ（非45° 1:3）
      "1,3 0,4",      // まえあし（45°）
      "0,4 4,4",      // じめん
      "1,3 4,2",      // せなか（非45° 3:1）
      "4,2 4,4",      // しっぽ
      "2,3 2,4",      // あし
      "3,2 3,4",      // うしろあし
      "1,1 2,1",      // め
    ],
  },
  {
    label: "よこむきのうさぎ", category: "どうぶつ",
    paths: [
      "1,0 2,2",      // みみ（非45° 1:2）
      "2,0 3,2",      // みみ（非45° 1:2）
      "2,2 4,3",      // せなか（非45° 2:1）
      "4,3 4,4",      // しっぽ
      "4,4 1,4",      // じめん
      "1,4 0,2",      // むね（非45° 1:2）
      "0,2 2,2",      // かおのした
      "0,2 3,3",      // おなか（非45° 3:1）
      "3,3 3,4",      // うしろあし
      "2,3 2,4",      // まえあし
    ],
  },
  {
    label: "およぐさかな", category: "どうぶつ",
    paths: [
      "1,1 3,0",      // せなか（非45° 2:1）
      "3,0 4,2",      // あたま（非45° 1:2）
      "4,2 3,4",      // あご（非45° 1:2）
      "3,4 1,3",      // おなか（非45° 2:1）
      "1,3 1,1",      // からだのつけね
      "1,1 0,0",      // おびれの上（45°）
      "1,3 0,4",      // おびれの下（45°）
      "0,0 0,4",      // おびれのはし
      "2,1 2,2",      // えら
      "3,1 3,2",      // め
    ],
  },
  {
    label: "つばさをひろげたとり", category: "どうぶつ",
    paths: [
      "0,1 2,0",      // 左のつばさの上（非45° 2:1）
      "2,0 4,1",      // 右のつばさの上（非45° 2:1）
      "4,1 2,2",      // 右のつばさの下（非45° 2:1）
      "2,2 0,1",      // 左のつばさの下（非45° 2:1）
      "2,2 3,4",      // からだの右（非45° 1:2）
      "3,4 1,4",      // しっぽ
      "1,4 2,2",      // からだの左（非45° 1:2）
      "2,0 2,2",      // せなかの線
      "1,1 3,1",      // つばさの線
      "2,2 3,3",      // 右のあし（45°・左右を崩す）
    ],
  },
  {
    label: "ぞうのよこがお", category: "どうぶつ",
    paths: [
      "1,0 4,1",      // せなか（非45° 3:1）
      "4,1 4,3",      // おしり
      "4,3 3,4",      // うしろあし（45°）
      "3,4 1,4",      // じめん
      "1,4 0,2",      // はな（非45° 1:2）
      "0,2 1,0",      // あたま（非45° 1:2）
      "0,2 2,3",      // ほほ（非45° 2:1）
      "2,3 3,1",      // みみ（非45° 1:2）
      "2,4 2,3",      // まえあし
      "3,1 4,1",      // せなかの線
    ],
  },

  /* ========================= たべもの ========================= */
  {
    label: "アイスクリーム", category: "たべもの",
    paths: [
      "1,1 2,0",      // アイスの左上（45°）
      "2,0 4,1",      // アイスの右上（非45° 2:1）
      "4,1 3,2",      // アイスの右下（45°）
      "3,2 1,1",      // アイスの左下（非45° 2:1）
      "3,2 2,4",      // コーンの右（非45° 1:2）
      "2,4 1,2",      // コーンの左（非45° 1:2）
      "1,2 3,2",      // コーンの口
      "1,3 3,3",      // コーンのもよう
      "0,4 2,4",      // テーブル
      "0,3 0,4",      // テーブルのはし
    ],
  },
  {
    label: "ショートケーキ", category: "たべもの",
    paths: [
      "0,4 0,2",      // 左のかべ
      "0,2 4,1",      // 上の面（非45° 4:1）
      "4,1 4,3",      // 右のかべ
      "4,3 1,4",      // そこ（非45° 3:1）
      "1,4 0,4",      // そこのはし
      "0,3 4,2",      // クリームの層（非45° 4:1）
      "1,1 2,0",      // いちご（45°）
      "2,0 2,2",      // いちごのたて
      "1,1 3,1",      // いちごのよこ
      "3,4 3,2",      // きりくちの線
    ],
  },
  {
    label: "はのついたりんご", category: "たべもの",
    paths: [
      "2,1 4,0",      // は（非45° 2:1）
      "2,0 2,1",      // じく
      "2,1 4,2",      // 右かた（非45° 2:1）
      "4,2 3,4",      // 右した（非45° 1:2）
      "3,4 1,4",      // そこ
      "1,4 0,2",      // 左した（非45° 1:2）
      "0,2 2,1",      // 左かた（非45° 2:1）
      "0,2 3,3",      // なかの線（非45° 3:1）
      "1,3 2,2",      // なかの線（45°）
    ],
  },
  {
    label: "おにぎり", category: "たべもの",
    paths: [
      "2,0 0,3",      // 左かた（非45° 2:3）
      "0,3 1,4",      // 左した（45°）
      "1,4 4,3",      // そこ（非45° 3:1）
      "4,3 2,0",      // 右かた（非45° 2:3）
      "0,3 3,4",      // のりの上ふち（非45° 3:1）
      "1,1 2,2",      // ごまのしるし（45°）
      "2,2 3,2",      // ごまのしるし
    ],
  },
  {
    label: "ジュースのコップ", category: "たべもの",
    paths: [
      "1,1 3,1",      // コップの口
      "1,1 2,4",      // 左のかべ（非45° 1:3）
      "3,1 4,4",      // 右のかべ（非45° 1:3）
      "2,4 4,4",      // そこ
      "1,2 3,2",      // ジュースの線
      "3,1 4,0",      // ストロー（45°）
      "2,0 4,0",      // ストローのはし
      "0,4 2,4",      // テーブル
      "0,3 0,4",      // テーブルのはし
      "1,3 3,3",      // コップのもよう
      "0,3 2,2",      // テーブルのふち（非45° 2:1）
    ],
  },

  /* ======================== しょくぶつ ======================== */
  {
    label: "おかのうえのき", category: "しょくぶつ",
    paths: [
      "0,3 2,0",      // はっぱの左（非45° 2:3）
      "2,0 4,3",      // はっぱの右（非45° 2:3）
      "0,3 4,3",      // はっぱのそこ
      "2,3 2,4",      // みき
      "2,2 0,3",      // えだ左（非45° 2:1）
      "2,2 4,3",      // えだ右（非45° 2:1）
      "0,4 4,4",      // じめん
      "0,4 2,3",      // おかのななめ（非45° 2:1）
      "1,1 3,1",      // はっぱの中の線
      "2,2 4,1",      // 右のえだ（非45° 2:1・左右を崩す）
    ],
  },
  {
    label: "チューリップ", category: "しょくぶつ",
    paths: [
      "1,0 3,0",      // はなびらの上
      "1,0 2,3",      // はなの左（非45° 1:3）
      "3,0 2,3",      // はなの右（非45° 1:3）
      "2,0 2,1",      // はなびらの切れこみ
      "2,3 2,4",      // くき
      "2,3 0,2",      // 左のは（非45° 2:1）
      "2,3 4,2",      // 右のは（非45° 2:1）
      "0,2 0,4",      // 左のはのはし
      "4,2 4,4",      // 右のはのはし
      "0,4 4,4",      // じめん
      "2,3 4,4",      // 右のはのすじ（非45° 2:1・左右を崩す）
    ],
  },
  {
    label: "きのこ", category: "しょくぶつ",
    paths: [
      "0,3 1,0",      // かさの左（非45° 1:3）
      "1,0 3,0",      // かさの上
      "3,0 4,3",      // かさの右（非45° 1:3）
      "0,3 4,3",      // かさのふち
      "1,3 1,4",      // じく左
      "3,3 3,4",      // じく右
      "1,4 3,4",      // じくのそこ
      "2,0 2,3",      // かさのまんなか
      "1,3 4,4",      // じめんのななめ（非45° 3:1）
      "0,3 2,4",      // 左のじめん（非45° 2:1）
      "2,1 3,2",      // かさの右のもよう（45°・左右を崩す）
    ],
  },
  {
    label: "はっぱ", category: "しょくぶつ",
    paths: [
      "0,4 2,0",      // はの左ふち（非45° 1:2）
      "2,0 4,1",      // はの右ふち（非45° 2:1）
      "4,1 4,3",      // はのはし
      "4,3 0,4",      // はの下ふち（非45° 4:1）
      "0,4 4,1",      // ようみゃく（非45° 4:3）
      "1,3 2,2",      // みゃく（45°）
      "2,2 3,1",      // みゃく（45°）
      "2,2 3,3",      // みゃく（45°）
    ],
  },
  {
    label: "ひまわり", category: "しょくぶつ",
    paths: [
      "0,1 2,0",      // はなびらの左上（非45° 2:1）
      "2,0 4,1",      // はなびらの右上（非45° 2:1）
      "4,1 2,2",      // はなびらの右下（非45° 2:1）
      "2,2 0,1",      // はなびらの左下（非45° 2:1）
      "1,1 3,1",      // はなの中の線
      "2,2 2,4",      // くき
      "2,3 0,4",      // 左のは（非45° 2:1）
      "2,3 4,3",      // 右のは（非45° 2:1）
      "0,4 4,4",      // じめん
    ],
  },

  /* =========================== いえ =========================== */
  {
    label: "えんとつのあるいえ", category: "いえ",
    paths: [
      "0,3 2,0",      // やね左（非45° 2:3）
      "2,0 4,1",      // やね右（非45° 2:1）
      "0,3 0,4",      // 左かべ
      "4,1 4,4",      // 右かべ
      "0,4 4,4",      // そこ
      "0,3 4,1",      // やねのふち（非45° 2:1）
      "3,1 3,0",      // えんとつ
      "3,0 4,0",      // えんとつの上
      "1,4 1,3",      // ドア
      "1,3 2,4",      // ドアのななめ（45°）
      "0,3 2,2",      // まどのななめ（非45° 2:1）
      "2,2 4,3",      // かべのななめ（非45° 2:1）
    ],
  },
  {
    label: "ななめのとけいだい", category: "いえ",
    paths: [
      "1,0 3,1",      // やね（非45° 2:1）
      "1,0 0,2",      // やね左（非45° 1:2）
      "0,2 3,1",      // やねのふち（非45° 3:1）
      "0,2 1,4",      // 左かべ（非45° 1:2）
      "3,1 4,4",      // 右かべ（非45° 1:3）
      "1,4 4,4",      // そこ
      "1,2 3,2",      // とけいのわく
      "2,2 2,3",      // はり
      "2,2 3,3",      // はり（45°）
      "0,4 1,4",      // じめん
    ],
  },
  {
    label: "ふうしゃのいえ", category: "いえ",
    paths: [
      "1,2 2,0",      // やね左（非45° 1:2）
      "2,0 3,2",      // やね右（非45° 1:2）
      "1,2 1,4",      // 左かべ
      "3,2 3,4",      // 右かべ
      "1,4 3,4",      // そこ
      "2,0 4,1",      // はね（非45° 2:1）
      "2,0 0,1",      // はね（非45° 2:1）
      "2,0 3,3",      // はね（非45° 1:3）
      "1,3 3,3",      // まどの線
      "0,4 4,4",      // じめん
      "3,2 4,3",      // こやのやね（45°・左右を崩す）
    ],
  },
  {
    label: "いわのとうだい", category: "いえ",
    paths: [
      "1,0 3,0",      // ランプの上
      "1,0 1,1",      // ランプ左
      "3,0 3,1",      // ランプ右
      "1,1 3,1",      // ランプのそこ
      "1,1 0,4",      // とうの左（非45° 1:3）
      "3,1 4,4",      // とうの右（非45° 1:3）
      "0,4 4,4",      // そこ
      "1,2 3,2",      // よこじま
      "1,3 3,3",      // よこじま
      "2,1 2,3",      // まんなかの線
      "0,4 2,3",      // いわ（非45° 2:1）
      "3,3 4,2",      // ひかり（45°）
      "3,2 4,1",      // ひかり（45°）
    ],
  },
];

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

function checkAgainstLadder(p: CopyShapeParams, edges: EdgeT[], m: ProblemMetrics, D: number): string[] {
  const errs: string[] = [];
  const n = p.grid;
  const b = bounds(edges);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  const spanC = b.cMax - b.cMin, spanR = b.rMax - b.rMin;
  if (p.fullGrid && (spanC !== n - 1 || spanR !== n - 1)) {
    errs.push(`盤面いっぱい不成立 span=${spanC}×${spanR}（要 ${n - 1}×${n - 1}）`);
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

function svgOf(edges: EdgeT[], n: number): string {
  const S = 34, M = 16, W = (n - 1) * S + M * 2;
  const dots: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    dots.push(`<circle cx="${M + c * S}" cy="${M + r * S}" r="2.6" fill="#9AA0AA"/>`);
  }
  const lines = edges.map((e) =>
    `<line x1="${M + e[0][0] * S}" y1="${M + e[0][1] * S}" x2="${M + e[1][0] * S}" y2="${M + e[1][1] * S}"`
    + ` stroke="#3A424E" stroke-width="3" stroke-linecap="round"/>`);
  return `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + lines.join("") + "</svg>";
}

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
  const liveSameSku: { edges: EdgeT[]; id: string }[] = [];
  for (const f of candFiles) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSameSku.push({ edges: c.edges, id: c.id });
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
    if (D < D_LO || D > D_HI) warns.push(`D=${D} が狙い帯 [${D_LO}, ${D_HI}] の外`);

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
      const j = jaccard(other.edges, edges);
      if (j > 0.6) warns.push(`同巻の既存候補 ${other.id} と類似 J=${j.toFixed(2)}`);
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
      `${status}${r.seed.label}（${r.seed.category}）`
      + ` D=${r.D}  線${r.m.lines}（たてよこ${r.m.lines - r.m.diagonals}/45°${r.m.diagonals - r.m.non45}`
      + `/非45°${r.m.non45}:ゆる${r.m.non45Gentle}）画${r.m.strokes} 対称${r.m.symAxis}${r.m.symMiss}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const inBand = rows.filter((r) => r.D >= D_LO && r.D <= D_HI).length;
  const ds = rows.map((r) => r.D).sort((a, b) => a - b);
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  狙い帯 [${D_LO},${D_HI}] に ${inBand}/${rows.length}`);
  console.log(`D 分布: ${ds.join(" ")}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? (r.warns.length === 0 ? "#2e7d32" : "#b26a00") : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  ${svgOf(r.edges, n)}
  <div class="meta">D=${r.D}・線${r.m.lines}・非45° ${r.m.non45}・画${r.m.strokes}・対称${r.m.symAxis}(${r.m.symMiss})</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>copy-lv4-vol2 モチーフ追加</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;width:250px}
.head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{display:block;margin:6px auto;background:#fffdf9;border:1px dashed #eee}
</style>
<h1>copy-lv4-vol2 モチーフ追加（${rows.length}問・狙い D${D_LO}〜${D_HI}）</h1><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 5, cellW = 250, cellH = 260;
    const rowsN = Math.ceil(rows.length / cols);
    const size = (n - 1) * 34 + 32;
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgOf(r.edges, n).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
      const off = (cellW - size) / 2;
      return `<g transform="translate(${x},${y})">
<rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" fill="#fff" stroke="#ccc"/>
<text x="${cellW / 2}" y="24" text-anchor="middle" font-size="14" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D}</text>
<g transform="translate(${off},${36 + (cellH - 56 - size) / 2})">${inner}</g>
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
    console.log(`write ${problem.id}  ${r.seed.label}  D=${problem.difficulty?.value}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log("書き込み完了");
}

main().catch((e) => { console.error(e); process.exit(1); });
