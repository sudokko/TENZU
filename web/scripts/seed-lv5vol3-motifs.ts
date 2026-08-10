/* copy-lv5-vol3（8×8）モチーフ新規バッチ
   （npx tsx scripts/seed-lv5vol3-motifs.ts [--write] [--preview <html>] [--png <png>]）

   模写 Lv.5 に最大盤面 8×8 の Vol.3 を新設し、手設計モチーフを 20 問投入する。
   内訳（2026-08-09 オーナー指示）: のみもの3・ロボット3・ずけい5・どうぶつのシルエット3・いえ3・くるま3。
   方針＝D 窓 [40,60]。8×8 は盤面の項 G=8 が固定なので、E（線の重み）を 30〜50 まで
   積む必要がある。非45°（4〜5/本）を 2〜4 本と交差を効かせて稼ぎ、
   対称くずしは 3 本以上（＝対称係数 k を 1.0 に保つ）ことで割引を避ける。

   - 本物の computeMetrics / baseDifficulty / COPY_LADDER で巻制約（slopes・fullGrid・D窓）を検証
   - published copy＋既存 candidates（全 status）＋生成ライブラリ全変種との形かぶりを検証
   - --preview で SVG 一覧 HTML、--png でコンタクトシートを書き出し（目視検品用）
   - --write で candidates/copy-lv5-vol3.json に status=pending で追記（手設計採番 -mNN）
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

const SKU = "copy-lv5-vol3";

type Seed = { label: string; category: string; paths: string[] };

/* 20 モチーフ。座標は "c,r"（r 下向き）・8×8 盤面（0..7）に直書き。
   fullGrid 巻のため 4 辺すべてに触れること（span 7×7）。 */
const SEEDS: Seed[] = [
  /* ======================= のみもの ======================= */
  {
    label: "クリームソーダ", category: "のみもの",
    paths: [
      "0,7 7,7",                                   // テーブル
      "1,1 1,6", "5,1 5,6", "1,6 5,6",             // せの たかい グラス
      "1,1 5,1",                                   // グラスの ふち
      "1,2 5,2",                                   // ソーダの めん
      "1,4 2,3 3,4 2,5 1,4",                       // こおり1（ひしがた）
      "3,5 4,4 5,5 4,6 3,5",                       // こおり2（ひしがた）
      "3,3 4,1", "4,1 7,0",                        // まがった ストロー（1:2・3:1 の ななめ）
      "1,1 2,0 3,1 2,2 1,1",                       // ふちの レモン（ひしがた）
    ],
  },
  {
    label: "ジュースのびんとコップ", category: "のみもの",
    paths: [
      "0,7 7,7",                                   // テーブル
      "1,2 1,6", "4,2 4,6", "1,6 4,6",             // びんの どう
      "1,2 2,1", "4,2 3,1",                        // びんの かた（45°×2）
      "2,1 2,0", "3,1 3,0", "2,0 3,0",             // びんの くちと ふた
      "1,3 4,3", "1,5 4,5",                        // ラベルの わく
      "1,3 4,5", "4,3 1,5",                        // ラベルの ばつ（3:2 の ななめ×2・交差）
      "5,4 5,6", "7,4 7,6", "5,6 7,6",             // コップ
      "5,4 7,4",                                   // コップの ふち
      "5,5 7,5",                                   // ジュースの めん
      "6,5 7,2",                                   // コップの ストロー（1:3 の ななめ・交差）
    ],
  },
  {
    label: "ティーポット", category: "のみもの",
    paths: [
      "0,7 7,7",                                   // テーブル
      "1,3 1,6", "5,3 5,6", "1,6 5,6",             // ポットの どう
      "1,3 5,3",                                   // ふたの した
      "2,2 4,2",                                   // ふたの うえ
      "1,3 2,2", "5,3 4,2",                        // ふた（45°×2）
      "3,1 4,1", "3,1 3,2", "4,1 4,2",             // つまみ
      "5,4 7,3", "5,5 7,4", "7,3 7,4",             // そそぎぐち（2:1 の ななめ×2）
      "7,3 6,1", "6,1 7,0",                        // ゆげ（1:2 の ななめ・45°）
      "0,4 1,4", "0,4 0,5", "0,5 1,5",             // とって
      "2,4 4,5", "4,4 2,5",                        // もようの ばつ（2:1 の ななめ×2・交差）
      "2,6 2,7", "4,6 4,7",                        // ポットの あし
    ],
  },

  /* ======================== ロボット ======================== */
  {
    label: "てをふるロボット", category: "ロボット",
    paths: [
      "2,1 5,1 5,3 2,3 2,1",           // あたま
      "3,1 3,0", "3,0 5,0",            // アンテナ
      "2,2 3,2", "4,2 5,2",            // め
      "3,3 3,4", "4,3 4,4",            // くび
      "1,4 6,4", "1,4 1,6", "6,4 6,6", "1,6 6,6",  // どうたい
      "1,5 0,3",                       // ひだりの うで（1:2 の ななめ）
      "6,5 7,7",                       // みぎの うで（1:2 の ななめ）
      "2,4 2,6", "5,4 5,6",            // むねの パネル
      "3,4 4,6", "4,4 3,6",            // むねの ばつ（1:2 の ななめ×2・交差）
      "2,6 2,7", "5,6 5,7",            // あし
    ],
  },
  {
    label: "キャタピラロボット", category: "ロボット",
    paths: [
      "0,7 7,7",                                   // ゆか
      "1,5 6,5", "1,5 1,6", "6,5 6,6", "1,6 6,6",  // キャタピラ
      "2,5 3,6", "3,5 2,6", "4,5 5,6", "5,5 4,6",  // キャタピラの ばつ（交差×2）
      "2,2 5,2", "2,2 2,5", "5,2 5,5",             // どうたい
      "2,3 5,3",                                   // どうたいの よこ
      "2,2 5,5", "5,2 2,5",                        // どうたいの ばつ（45°×2・交差）
      "3,0 4,0", "3,0 3,2", "4,0 4,2",             // あたま（ほそい はこ）
      "3,1 4,1",                                   // め
      "5,3 7,2", "7,2 7,4",                        // みぎの アーム（2:1 の ななめ）
      "2,4 0,5", "0,5 0,7",                        // ひだりの アーム（2:1 の ななめ）
    ],
  },
  {
    label: "ロボットのかお", category: "ロボット",
    paths: [
      "0,1 7,1", "0,1 0,6", "7,1 7,6", "0,6 7,6",  // かおの わく
      "1,0 2,1", "6,0 5,1",            // アンテナ（45°×2）
      "1,0 6,0",                       // アンテナの さき
      "1,2 3,2 3,4 1,4 1,2",           // ひだりの め
      "1,2 3,4", "3,2 1,4",            // ひだりの めの ばつ（交差）
      "4,2 6,2 6,3 4,3 4,2",           // みぎの め
      "4,2 6,3",                       // みぎの めの ななめ
      "2,5 6,5",                       // くち
      "2,6 0,7", "5,6 7,7",            // あし（2:1 の ななめ×2）
    ],
  },

  /* ========================= ずけい ========================= */
  {
    label: "かさなるさんかく", category: "ずけい",
    paths: [
      "0,7 4,0", "4,0 7,6", "7,6 0,7",   // さんかく1（4:7・1:2・7:1 の ななめ）
      "0,2 7,1", "7,1 3,7", "3,7 0,2",   // さんかく2（7:1・2:3・3:5 の ななめ）
    ],
  },
  {
    label: "ほうせき", category: "ずけい",
    paths: [
      "2,0 6,0", "6,0 7,3", "7,3 5,7",   // ろっかくの うえと みぎ
      "5,7 2,7", "2,7 0,2", "0,2 2,0",   // ろっかくの したと ひだり
      "2,0 5,7", "6,0 2,7",              // うちがわの ばつ（交差）
      "0,2 7,3",                         // よこぎる せん（7:1 の ななめ）
    ],
  },
  {
    label: "かざぐるま", category: "ずけい",
    paths: [
      "3,3 4,3", "4,3 4,4", "4,4 3,4", "3,4 3,3",   // まんなかの しかく
      "3,3 0,0", "0,0 2,0", "2,0 3,3",              // はね1
      "3,4 0,7", "0,7 0,5", "0,5 3,4",              // はね2
      "4,4 7,7", "7,7 5,7", "5,7 4,4",              // はね3
      "4,3 7,0", "7,0 7,2", "7,2 4,3",              // はね4
    ],
  },
  {
    label: "あみもよう", category: "ずけい",
    paths: [
      "0,0 7,0", "0,0 0,7", "7,0 7,7", "0,7 7,7",   // わく
      "0,2 5,7", "0,0 7,7", "2,0 7,5",              // 45°の ななめ（3本）
      "0,3 7,1", "0,5 7,3", "0,7 7,5",              // 7:2 の ななめ（3本・交差）
    ],
  },
  {
    label: "ほし", category: "ずけい",
    paths: [
      "4,0 7,3", "7,3 6,7", "6,7 1,7", "1,7 0,3", "0,3 4,0",   // ごかっけいの そとがわ
      "4,0 6,7", "6,7 0,3", "0,3 7,3", "7,3 1,7", "1,7 4,0",   // なかの ほし（交差×5）
    ],
  },

  /* ================= どうぶつの シルエット ================= */
  {
    label: "すわるねこ", category: "どうぶつのシルエット",
    paths: [
      "0,7 7,7",                                   // じめん
      "2,3 2,0", "2,0 3,1",                        // ひだりの みみ
      "5,3 5,0", "5,0 4,1",                        // みぎの みみ
      "3,1 4,1",                                   // あたまの うえ
      "2,2 3,1", "4,1 5,2",                        // あたまの かど（45°×2）
      "5,3 4,4", "4,4 3,4", "3,4 2,3",             // あたまの した（45°×2）
      "2,2 3,3", "3,2 2,3",                        // ひだりの め（ばつ・交差）
      "4,2 5,3", "5,2 4,3",                        // みぎの め（ばつ・交差）
      "2,3 1,7",                                   // からだ（1:4 の ななめ）
      "5,3 6,7",                                   // からだ（1:4 の ななめ）
      "6,7 7,5", "7,5 6,3",                        // しっぽ（1:2 の ななめ×2）
    ],
  },
  {
    label: "はくちょう", category: "どうぶつのシルエット",
    paths: [
      "0,7 7,7",                                   // みずも
      "0,6 7,6",                                   // みずの めん
      "1,6 2,4", "2,4 4,3", "4,3 6,4", "6,4 7,6",  // からだ（1:2・2:1・2:1・1:2）
      "4,3 3,1",                                   // くび（1:2 の ななめ）
      "3,1 6,1",                                   // あたまの した
      "4,0 6,0", "6,0 6,1", "4,0 4,1",             // あたま
      "5,0 5,1",                                   // め
      "6,0 7,2",                                   // くちばし（1:2 の ななめ）
      "2,5 4,6", "4,6 6,5",                        // はね（2:1 の ななめ×2）
    ],
  },
  {
    label: "ぞう", category: "どうぶつのシルエット",
    paths: [
      "0,7 7,7",                                   // じめん
      "1,3 3,0", "3,0 6,2", "6,2 7,5",             // ひたいから せなか・おしり
      "7,5 7,7", "6,7 6,5",                        // うしろあし
      "6,5 4,5", "4,5 4,7",                        // おなかと まえあし
      "3,7 3,5", "3,5 1,5",                        // まえあしと むね
      "1,5 1,3",                                   // かおの まえ
      "1,5 0,7",                                   // はな（1:2 の ななめ）
      "2,2 4,3", "4,3 2,5", "2,2 2,5",             // みみ
      "1,4 2,4",                                   // め
    ],
  },

  /* ========================== いえ ========================== */
  {
    label: "にかいだてのいえ", category: "いえ",
    paths: [
      "0,7 7,7",                                   // じめん
      "0,3 4,0", "4,0 7,3",                        // やね（4:3・1:1 の ななめ）
      "1,3 1,7", "6,3 6,7", "1,7 6,7",             // かべ
      "0,3 7,3",                                   // やねの した
      "1,5 6,5",                                   // かいの さかいめ
      "2,3 3,3 3,5 2,5 2,3",                       // 2かいの まど
      "2,3 3,5", "3,3 2,5",                        // まどの ばつ（交差）
      "4,4 5,4", "4,4 4,5", "5,4 5,5",             // 2かいの ちいさい まど
      "2,7 2,6 4,6 4,7",                           // げんかんの とびら
      "5,5 6,6",                                   // かべの もよう（45°）
      "5,0 6,0", "5,0 5,2", "6,0 6,2",             // えんとつ（やねと 交差）
    ],
  },
  {
    label: "とんがりやねのいえ", category: "いえ",
    paths: [
      "0,7 7,7",                                   // じめん
      "1,4 3,0", "3,0 6,4",                        // とんがりやね（1:2・3:4 の ななめ）
      "1,4 6,4",                                   // やねの した
      "1,4 1,7", "6,4 6,7",                        // かべ
      "3,1 4,2", "4,2 3,3", "3,3 2,2", "2,2 3,1",  // やねうらの まど（ひしがた）
      "3,1 3,3", "2,2 4,2",                        // まどの さん（交差）
      "4,1 4,2", "5,1 5,3", "4,1 5,1",             // えんとつ（やねと 交差）
      "2,5 2,7", "2,5 3,5", "3,5 3,7",             // とびら
      "4,5 5,5", "5,5 5,6", "5,6 4,6", "4,6 4,5",  // まど
      "4,5 5,6", "5,5 4,6",                        // まどの ばつ（交差）
      "0,5 0,7", "0,6 1,6",                        // フェンス
    ],
  },
  {
    label: "とけいのあるビル", category: "いえ",
    paths: [
      "0,7 7,7",                                   // じめん
      "1,2 1,7", "5,2 5,7", "1,2 5,2",             // ビルの かべ
      "1,2 3,0", "3,0 5,2",                        // やね（45°×2）
      "2,3 4,3", "4,3 4,5", "4,5 2,5", "2,5 2,3",  // とけいの わく
      "3,3 4,4", "4,4 3,5", "3,5 2,4", "2,4 3,3",  // とけいの もじばん（ひしがた）
      "3,3 3,4", "3,4 4,4",                        // とけいの はり
      "1,6 5,6",                                   // ビルの したの ライン
      "2,6 2,7", "4,6 4,7",                        // いりぐち
      "6,4 6,7", "7,4 7,7", "6,4 7,4",             // となりの ちいさい ビル
      "6,5 7,6", "7,5 6,6",                        // となりの まど（交差）
      "5,3 7,4",                                   // わたりろうか（2:1 の ななめ）
    ],
  },

  /* ========================= くるま ========================= */
  {
    label: "トラック", category: "くるま",
    paths: [
      "0,7 7,7",                                   // みち
      "0,6 7,6",                                   // しゃたいの した
      "0,2 4,2", "4,2 4,4", "0,2 0,6",             // にだいの はこ
      "4,3 5,3", "5,3 6,4",                        // うんてんせきの まえ（45°）
      "4,4 6,4",                                   // うんてんせきの した
      "6,4 7,4", "7,4 7,6",                        // ボンネット
      "1,6 2,7", "2,6 1,7",                        // まえの タイヤの ばつ（交差）
      "5,6 6,7", "6,6 5,7",                        // うしろの タイヤの ばつ（交差）
      "1,3 3,3", "1,4 3,4", "2,2 2,5",             // にだいの もよう
      "0,2 3,0", "3,0 4,2",                        // にもつ（3:2・1:2 の ななめ）
    ],
  },
  {
    label: "バス", category: "くるま",
    paths: [
      "0,7 7,7",                                   // みち
      "0,6 7,6",                                   // バスの ゆか
      "0,1 6,1", "0,1 0,6", "6,1 7,3", "7,3 7,6",  // バスの がいけい（2:1 の ななめ）
      "0,3 7,3",                                   // まどの ライン
      "1,1 1,3", "2,1 2,3", "3,1 3,3", "4,1 4,3",  // まどの さん
      "5,1 5,4", "5,4 6,4",                        // ドア
      "1,6 2,7", "2,6 1,7",                        // まえの タイヤ（交差）
      "5,6 6,7", "6,6 5,7",                        // うしろの タイヤ（交差）
      "0,4 3,5", "3,5 5,4",                        // よこの ライン（3:1・2:1 の ななめ）
      "2,0 3,1", "2,0 5,0",                        // やねの にだい
    ],
  },
  {
    label: "レーシングカー", category: "くるま",
    paths: [
      "0,7 7,7",                                   // コース
      "0,6 7,6",                                   // しゃたいの した
      "0,5 0,6", "0,5 2,5",                        // ノーズ
      "2,5 3,3",                                   // フロントの もりあがり（1:2 の ななめ）
      "3,3 5,3",                                   // コックピット
      "5,3 6,5",                                   // うしろの さがり（1:2 の ななめ）
      "6,5 7,5", "7,2 7,6",                        // リヤデッキと つばさの ささえ
      "5,2 7,2", "5,1 7,1", "5,1 5,2",             // うしろの つばさ
      "3,2 3,3", "3,2 4,2", "4,2 4,3",             // ヘルメット
      "4,4 5,4",                                   // ゼッケン
      "1,6 2,7", "2,6 1,7",                        // まえの タイヤ（交差）
      "5,6 6,7", "6,6 5,7",                        // うしろの タイヤ（交差）
      "0,0 0,3",                                   // はたの ぼう
      "0,0 2,1", "2,1 0,2",                        // はた（2:1 の ななめ×2）
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

/* 巻制約の検証（seed-lv5vol2-motifs.ts と同じ判定） */
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
  const cell = 30, pad = 14, size = (n - 1) * cell + pad * 2;
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
    if ((m.symMiss ?? 99) <= 2) warns.push(`ほぼ対称（くずし ${m.symMiss} 本）＝対称係数で D が割り引かれる`);

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
      ` comp=${r.m.components} stroke=${r.m.strokes} sym=${r.m.symAxis}/${r.m.symMiss} D=${r.D} 窓[${params.D[0]},${params.D[1]}]`,
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
    const html = `<!doctype html><meta charset="utf-8"><title>copy-lv5-vol3 モチーフ</title>
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
<h1>copy-lv5-vol3 モチーフ（${rows.length}問）</h1><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 5, cellW = 290, cellH = 310;
    const rowsN = Math.ceil(rows.length / cols);
    const size = (n - 1) * 30 + 28;
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
