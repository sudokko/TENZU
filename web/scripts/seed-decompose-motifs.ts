/* decompose（分解）3 巻へのモチーフ一括投入バッチ
   （npx tsx scripts/seed-decompose-motifs.ts [--sku <sku>] [--preview <html>] [--png <png>] [--write]）

   オーナー指示（2026-08-02）: 分解 Lv.3〜5 の既存候補を全削除のうえ、かさね Lv.3〜5 の
   採用実績（各12問）を参考に各 24 問を再生成する。
     decompose-lv3-vol1（4×4・ortho45・45°必須・絡み0-1・線2-5/図）: D 14〜20 未満
     decompose-lv4-vol1（5×5・非45°必須・絡み0-2・線3-6/図）: D 20〜30 未満
     decompose-lv5-vol1（6×6・非45°必須・絡み3-10・線4-8/図）: D 30〜40 未満

   分解のデータモデル（gen/decompose.ts＝かさねと完全同型）:
     edges＝完成図 C（=A∪B）・answer(explicit).edges＝引くもの（図形B）・
     こたえ＝図形A＝C∖B（描画時に導出）。紙面は「C − 引くもの ＝ □」の 3 ペイン。
     絡み＝A・B 間の X 交差数＝cross(C) − cross(A) − cross(B)。
     D ＝ E(A) ＋ E(B) ＋ 2×絡み ＋ ばらけ ＋ 盤面項（対称係数・画数は使わない）。

   かさね採用実績から読んだ設計方針（motif-craft §3〜§6 準拠）:
   - 図A（こたえ）＝単体で名前が言える閉じた形。「とりのぞくと〇〇が みえる」の主役
   - 図B（引くもの）＝1つのもの or 同じものの繰り返し（くも・あめ・さく・トンネル等）
   - 完成図 C は最初から見せる図なので、重ねても両方が読める構図だけを採る
   - かぶり照合はかさねより厳しく、overlay/decompose の全候補・published・生成
     ライブラリと完成図シグネチャで照合（同じ重なり図を合成と分解で再売しない）

   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { DECOMPOSE_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

/* D 窓（オーナー指示 2026-08-02・かさね 3 巻と同窓）と C の交差上限 */
const D_WINDOW: Record<string, [number, number]> = {
  "decompose-lv3-vol1": [14, 20],
  "decompose-lv4-vol1": [20, 30],
  "decompose-lv5-vol1": [30, 40],
};
const CROSS_HI: Record<number, number> = { 3: 4, 4: 8, 5: 10, 6: 12, 7: 12 };
const NON45_CAP_F = 3;      // union ゲート（gen/overlay.ts tryCompose）
const DANGLING_MAX_F = 4;   // カード 2 枚ぶん
const DANGLING_MAX_PART = 2;

type Seed = {
  sku: string; label: string; category: string;
  pathsA: string[];  // 図形A（=こたえ=C∖B）・盤面座標 "c,r"（r 下向き）
  pathsB: string[];  // 図形B（=引くもの=answer.edges）
};

/* =========================================================================
   SEEDS — decompose-lv3-vol1（4×4・ortho45・45°必須・絡み0-1・線2-5/図・D14-20）
   ========================================================================= */
const SEEDS: Seed[] = [
  {
    sku: "decompose-lv3-vol1", label: "いえ（えんとつ）", category: "いえ",
    pathsA: ["0,2 0,3 3,3 3,2 0,2", "1,3 1,2"],           // いえのはこ・とびら
    pathsB: ["0,2 1,1 2,1 3,2", "2,1 2,0 3,0"],           // やね・えんとつとけむり
  },
  {
    sku: "decompose-lv3-vol1", label: "いえ（まどのいえ）", category: "いえ",
    pathsA: ["0,1 0,3 3,3 3,1", "1,2 2,2", "2,3 2,2"],    // かべ・まど・とびらのせん
    pathsB: ["0,1 1,0 2,0 3,1", "1,0 1,1"],               // やね・むねかざり
  },
  {
    sku: "decompose-lv3-vol1", label: "いえ（さくのいえ）", category: "いえ",
    pathsA: ["0,3 0,1 1,0 2,1 2,3 0,3"],                  // やねまでひとつづきのいえ
    pathsB: ["3,1 3,3", "2,1 3,1", "2,2 3,2", "2,3 3,3"], // さくのはしらとよこいた
  },
  {
    sku: "decompose-lv3-vol1", label: "ロケット（ほのお）", category: "ロケット",
    pathsA: ["1,2 1,0 2,0 2,2", "1,2 0,3", "2,2 3,3"],    // きたい・りょうのはね
    pathsB: ["1,2 2,3", "2,2 1,3", "1,3 2,3"],            // ふきだすほのお
  },
  {
    sku: "decompose-lv3-vol1", label: "ロケット（せいびやぐら）", category: "ロケット",
    pathsA: ["1,3 1,1 2,0 2,3 1,3", "1,2 2,2"],           // きたい・まど
    pathsB: ["0,3 0,1 1,0", "0,1 1,1", "0,2 1,2"],        // やぐらのとうとうで
  },
  {
    sku: "decompose-lv3-vol1", label: "はな（はちのはな）", category: "はな",
    pathsA: ["2,0 1,1 2,2 3,1 2,0", "2,2 2,3"],           // はなびら・くき
    pathsB: ["1,2 3,2", "1,2 1,3 3,3 3,2"],               // うえきばち
  },
  {
    sku: "decompose-lv3-vol1", label: "はな（あまやどり）", category: "はな",
    pathsA: ["1,0 0,1 1,2 2,1 1,0", "1,2 1,3"],           // はなびら・くき
    pathsB: ["2,0 3,0", "2,0 2,1", "3,0 3,1"],            // くもとあめ
  },
  {
    sku: "decompose-lv3-vol1", label: "かさ（かぜのひ）", category: "かさ",
    pathsA: ["2,0 1,1 2,2", "2,0 2,3", "2,3 3,3 3,2"],    // とじたかさ・え・もちて
    pathsB: ["0,1 1,1", "0,2 1,2", "0,3 1,3", "0,1 0,3"], // ふきつけるかぜ
  },
  {
    sku: "decompose-lv3-vol1", label: "かさ（みずたまり）", category: "かさ",
    pathsA: ["0,1 1,0 2,0 3,1", "0,1 3,1", "2,1 2,3"],    // ひらいたかさ・え
    pathsB: ["0,3 1,3", "1,2 0,3", "2,2 1,3"],            // みずたまりとあめ
  },
  {
    sku: "decompose-lv3-vol1", label: "つき（あまぐも）", category: "つき",
    pathsA: ["0,1 1,0 2,0 3,1", "0,1 3,1"],               // ふねがたのつき
    pathsB: ["0,2 0,3 3,3 3,2 0,2", "1,1 0,2"],           // あまぐもとあめ
  },
  {
    sku: "decompose-lv3-vol1", label: "つき（やまのよる）", category: "つき",
    pathsA: ["3,0 2,1 2,2 3,3", "3,0 3,3"],               // みかづき
    pathsB: ["0,3 1,2 2,3", "0,3 3,3", "2,3 3,2"],        // ふたつのやま
  },
  {
    sku: "decompose-lv3-vol1", label: "ヨット（はしけ）", category: "ヨット",
    pathsA: ["0,2 0,3 3,3 3,2 0,2", "0,2 1,3"],           // ふね・かじのせん
    pathsB: ["1,2 1,0", "1,0 3,2", "1,0 2,0", "1,1 3,1"], // マスト・ほ・はた・よこぼう
  },
  {
    sku: "decompose-lv3-vol1", label: "ヨット（おおきなほ）", category: "ヨット",
    pathsA: ["0,2 1,3 2,3 3,2", "0,2 3,2", "2,2 2,0"],    // ふね・かんぱん・マスト
    pathsB: ["2,0 0,2", "2,0 3,1", "2,1 1,1"],            // ほ・はた・よこぼう
  },
  {
    sku: "decompose-lv3-vol1", label: "き（プレゼント）", category: "き",
    pathsA: ["1,1 2,0 3,1 1,1", "2,1 2,3"],               // このは・みき
    pathsB: ["0,2 1,2", "0,2 0,3", "1,2 1,3", "0,3 3,3", "1,2 0,3"], // はことリボン・じめん
  },
  {
    sku: "decompose-lv3-vol1", label: "き（ふゆのき）", category: "き",
    pathsA: ["1,3 1,2 0,1 0,0", "1,2 3,0", "2,1 2,0"],    // みきとえだ
    pathsB: ["0,3 3,3", "2,3 3,2", "3,2 3,3"],            // じめんとゆきのおか
  },
  {
    sku: "decompose-lv3-vol1", label: "たいよう（くもま）", category: "たいよう",
    pathsA: ["2,1 1,2 2,3 3,2 2,1"],                      // たいよう
    pathsB: ["0,0 0,1 3,1 3,0 0,0"],                      // よこながのくも
  },
  {
    sku: "decompose-lv3-vol1", label: "たいよう（にじ）", category: "たいよう",
    pathsA: ["1,3 2,2 3,3", "1,3 3,3", "2,2 2,1"],        // のぼるたいよう・こうせん
    pathsB: ["0,1 1,0 2,0 3,1", "0,1 0,3", "3,1 3,3"],    // にじのアーチ
  },
  {
    sku: "decompose-lv3-vol1", label: "たいよう（ゆうやけのうみ）", category: "たいよう",
    pathsA: ["1,0 0,1 1,2 2,1 1,0"],                      // しずむたいよう
    pathsB: ["0,2 3,2", "0,2 1,3", "2,2 3,3"],            // すいへいせんとなみ
  },
  {
    sku: "decompose-lv3-vol1", label: "くるま（はいたつ）", category: "くるま",
    pathsA: ["0,1 3,1 3,2 0,2 0,1", "2,1 3,2"],           // しゃたい・フロントガラス
    pathsB: ["0,2 0,3", "1,2 1,3", "2,2 2,3", "3,2 3,3", "0,3 3,3"], // タイヤとじめん
  },
  {
    sku: "decompose-lv3-vol1", label: "くるま（トラック）", category: "くるま",
    pathsA: ["0,2 0,1 3,1 3,2", "0,2 3,2", "1,1 0,0"],    // しゃたい・キャビンのせん
    pathsB: ["1,1 1,0", "2,1 2,0", "3,1 3,0", "1,0 3,0", "1,0 2,1"], // にもつのはことロープ
  },
  {
    sku: "decompose-lv3-vol1", label: "でんしゃ（しんごう）", category: "でんしゃ",
    pathsA: ["0,1 2,1 2,2 0,2 0,1", "1,1 0,0"],           // しゃたい・パンタグラフ
    pathsB: ["3,3 3,0", "3,0 2,0", "2,0 2,1", "0,3 3,3", "1,3 1,2"], // しんごうきとせんろ
  },
  {
    sku: "decompose-lv3-vol1", label: "どうぶつのかお（ねこ）", category: "どうぶつのかお",
    pathsA: ["0,1 2,1 2,3 0,3 0,1", "1,2 2,3"],           // かお・くち
    pathsB: ["0,1 1,0 1,1", "1,1 2,0 2,1"],                // りょうみみ
  },
  {
    sku: "decompose-lv3-vol1", label: "どうぶつ（えだのことり）", category: "どうぶつ",
    pathsA: ["1,1 2,0 3,1 2,2 1,1", "1,1 0,1"],           // ことりのからだ・くちばし
    pathsB: ["0,2 3,2", "1,2 0,3", "3,2 3,3"],            // えだとこえだ
  },
  {
    sku: "decompose-lv3-vol1", label: "ロボット（リュック）", category: "ロボット",
    pathsA: ["1,3 1,0 2,0 2,3 1,3", "2,0 3,1"],            // からだ・アンテナ
    pathsB: ["0,1 0,3", "0,1 1,1", "0,3 1,3", "0,1 1,2"],  // リュックとベルト
  },

  /* =======================================================================
     decompose-lv4-vol1（5×5・any・非45°必須・絡み0-2・線3-6/図・D20-30）
     ======================================================================= */
  {
    sku: "decompose-lv4-vol1", label: "くるま（トンネル）", category: "くるま",
    pathsA: ["0,3 2,2 3,2 4,3", "0,3 4,3", "2,3 2,2", "3,3 3,2"], // しゃたい・ゆか・まど
    pathsB: ["0,4 0,1 1,0 3,0 4,1 4,4"],                   // トンネル
  },
  {
    sku: "decompose-lv4-vol1", label: "くるま（さかみち）", category: "くるま",
    pathsA: ["1,2 2,1 3,1 4,2", "1,2 4,2", "2,2 2,3", "3,2 3,3"], // しゃたい・タイヤ
    pathsB: ["0,4 4,2", "4,2 4,4", "0,4 4,4"],             // さかみちのおか
  },
  {
    sku: "decompose-lv4-vol1", label: "どうぶつ（うし）", category: "どうぶつ",
    pathsA: ["2,2 4,2 4,3 2,3 2,2", "2,3 2,4", "4,3 4,4", "4,2 3,1"], // からだ・あし・しっぽ
    pathsB: ["2,2 1,0", "1,0 0,0 0,1 1,1 1,0", "1,0 2,1"], // くび・かお・みみ
  },
  {
    sku: "decompose-lv4-vol1", label: "どうぶつ（わに）", category: "どうぶつ",
    pathsA: ["1,2 4,2 4,3 1,3 1,2", "2,3 2,4", "4,2 3,1"], // からだ・あし・しっぽ
    pathsB: ["1,2 0,0", "1,2 0,3", "0,0 0,1", "0,1 1,1", "1,1 1,2"], // ひらいたくちとは
  },
  {
    sku: "decompose-lv4-vol1", label: "どうぶつのかお（たれみみのいぬ）", category: "どうぶつのかお",
    pathsA: ["1,1 3,1 4,2 3,3 1,3 0,2 1,1"],               // かおのりんかく
    pathsB: ["1,0 3,0", "1,0 1,1", "3,0 3,1", "1,1 0,3", "3,1 4,3"], // ぼうしとたれみみ
  },
  {
    sku: "decompose-lv4-vol1", label: "どうぶつのかお（ねずみ）", category: "どうぶつのかお",
    pathsA: ["1,2 2,1 3,1 4,2 3,3 2,3 1,2"],               // かおのりんかく
    pathsB: ["2,1 1,0", "2,1 3,0", "2,1 2,2", "0,2 4,2", "0,0 1,2"], // みみ・はな・くちとひげ
  },
  {
    sku: "decompose-lv4-vol1", label: "き（おかのき）", category: "き",
    pathsA: ["1,0 3,0 4,1 2,2 0,1 1,0"],                   // じゅかん
    pathsB: ["2,2 2,4", "0,4 4,4", "2,3 3,4"],             // みき・じめん・ね
  },
  {
    sku: "decompose-lv4-vol1", label: "き（とりのき）", category: "き",
    pathsA: ["2,0 0,2 2,4 4,2 2,0"],                       // まるいじゅかん
    pathsB: ["0,1 1,0 2,2 3,0 4,1"],                       // とりのむれ
  },
  {
    sku: "decompose-lv4-vol1", label: "たいよう（ビルのあさひ）", category: "たいよう",
    pathsA: ["2,1 1,2 2,3 3,2 2,1", "2,1 2,0", "2,1 4,0"], // たいよう・こうせん
    pathsB: ["0,4 0,2 1,2 1,3 3,3 3,1 4,1"],               // ビルのスカイライン
  },
  {
    sku: "decompose-lv4-vol1", label: "たいよう（やまのゆうひ）", category: "たいよう",
    pathsA: ["2,0 1,1 2,2 3,1 2,0", "1,1 0,0", "3,1 4,0"], // たいよう・こうせん
    pathsB: ["0,3 2,2", "2,2 4,3", "0,3 0,4 4,4 4,3"],     // やまとふもと
  },
  {
    sku: "decompose-lv4-vol1", label: "こうじょう（のこぎりやね）", category: "こうじょう",
    pathsA: ["0,4 0,1 2,0 2,1 4,0 4,4 0,4"],               // たてやとのこぎりやね
    pathsB: ["1,2 3,2", "0,3 4,3", "1,2 1,3", "2,2 2,3", "3,2 3,3"], // こうしまど
  },
  {
    sku: "decompose-lv4-vol1", label: "こうじょう（クレーン）", category: "こうじょう",
    pathsA: ["0,2 0,4 2,4 2,2 0,2", "0,2 1,1 2,2"],        // たてや・やね
    pathsB: ["3,0 3,4", "3,0 1,1", "3,0 4,1", "4,1 4,2", "2,4 4,4"], // クレーンとじめん
  },
  {
    sku: "decompose-lv4-vol1", label: "でんしゃ（かもつ）", category: "でんしゃ",
    pathsA: ["0,3 0,1 2,1 2,2 4,2 4,3", "1,1 3,0"],        // しゃたい・パンタグラフ
    pathsB: ["0,3 4,3", "0,4 4,4", "1,3 1,4", "2,3 2,4", "3,3 3,4", "1,2 1,3"], // ゆか・レール・しゃりん・ドア
  },
  {
    sku: "decompose-lv4-vol1", label: "でんしゃ（よるのとっきゅう）", category: "でんしゃ",
    pathsA: ["4,3 4,1 1,1 0,3", "1,2 4,2", "3,1 1,0"],     // りゅうせんけいのしゃたい・まどのおび・パンタグラフ
    pathsB: ["0,3 4,3", "0,4 4,4", "1,3 1,4", "3,3 3,4", "4,3 4,4"], // ゆか・レール・しゃりん・れんけつき
  },
  {
    sku: "decompose-lv4-vol1", label: "いえ（ふたつのまど）", category: "いえ",
    pathsA: ["0,2 0,4 4,4 4,2", "0,2 2,1 4,2", "3,3 3,4"], // かべ・やね・とびら
    pathsB: ["0,2 1,2", "1,2 1,3", "3,2 4,2", "3,2 3,3", "0,3 4,3"], // まどとまどだい
  },
  {
    sku: "decompose-lv4-vol1", label: "いえ（とんがりやね）", category: "いえ",
    pathsA: ["1,2 1,4 3,4 3,2", "1,2 2,0 3,2", "2,3 2,4"], // かべ・とんがりやね・とびら
    pathsB: ["0,3 0,4", "0,3 1,3", "0,3 1,2"],             // かいだんとてすり
  },
  {
    sku: "decompose-lv4-vol1", label: "ロケット（はっしゃ！）", category: "ロケット",
    pathsA: ["1,2 1,3 3,3 3,2", "1,2 2,0 3,2", "2,2 2,3"], // きたい・せんたん・まど
    pathsB: ["1,3 0,4", "3,3 4,4", "2,3 2,4", "0,4 4,4"],  // ほのおとじめん
  },
  {
    sku: "decompose-lv4-vol1", label: "ロケット（ちゃくりく）", category: "ロケット",
    pathsA: ["1,2 1,1 2,0 3,1 3,2", "1,2 0,4", "3,2 4,4"], // きたい・ちゃくりくきゃく
    pathsB: ["0,4 4,4", "1,4 2,3 3,4"],                    // じめんといわ
  },
  {
    sku: "decompose-lv4-vol1", label: "ヨット（とりのむれ）", category: "ヨット",
    pathsA: ["0,3 1,4 3,4 4,3", "0,3 4,3", "2,3 2,0", "2,0 4,3"], // ふね・かんぱん・マスト・ほ
    pathsB: ["0,1 1,0 2,1 3,0 4,1"],                       // とりのむれ
  },
  {
    sku: "decompose-lv4-vol1", label: "ヨット（とうだい）", category: "ヨット",
    pathsA: ["1,3 2,4 3,4 4,3", "1,3 4,3", "2,3 2,1", "2,1 4,3"], // ふね・かんぱん・マスト・ほ
    pathsB: ["0,4 0,1 1,1 1,3", "1,1 3,0", "1,2 3,1"],     // とうだいとひかり
  },
  {
    sku: "decompose-lv4-vol1", label: "はな（あめとはな）", category: "はな",
    pathsA: ["2,0 1,1 2,2 3,1 2,0", "2,2 2,4", "2,3 1,4"], // はなびら・くき・は
    pathsB: ["0,0 3,0", "0,0 1,2", "1,0 2,2"],             // くもとあめ
  },
  {
    sku: "decompose-lv4-vol1", label: "はな（かびん）", category: "はな",
    pathsA: ["2,0 1,1 2,2 3,1 2,0", "2,2 2,3", "2,2 0,3"], // はなびら・くき・は
    pathsB: ["1,3 3,3", "1,3 1,4", "3,3 3,4", "1,4 3,4", "1,3 2,4"], // かびんともよう
  },
  {
    sku: "decompose-lv4-vol1", label: "かさ（あめのひ）", category: "かさ",
    pathsA: ["0,2 2,1 4,2", "0,2 4,2", "2,1 2,4", "2,4 1,4"], // かさ・え・もちて
    pathsB: ["0,0 4,0", "0,0 0,1", "2,0 2,1", "4,0 4,1"],  // くもとあめ
  },
  {
    sku: "decompose-lv4-vol1", label: "ロボット（ながいうで）", category: "ロボット",
    pathsA: ["1,4 1,0 3,0 3,4 1,4", "1,1 3,1", "3,0 4,1"], // からだ・くびのせん・アンテナ
    pathsB: ["1,2 0,4", "3,2 4,4", "1,2 3,2"],             // ながいうでとベルト
  },

  /* =======================================================================
     decompose-lv5-vol1（6×6・any・非45°必須・絡み3-10・線4-8/図・D30-40）
     ======================================================================= */
  {
    sku: "decompose-lv5-vol1", label: "くるま（あめのドライブ）", category: "くるま",
    pathsA: ["0,4 1,3 4,3 5,4", "0,4 5,4", "2,3 2,4"],     // しゃたい・ゆか・まど
    pathsB: ["0,0 3,0", "1,0 3,4", "2,0 4,4", "0,0 2,4"],  // くもとあめ
  },
  {
    sku: "decompose-lv5-vol1", label: "くるま（ふみきり）", category: "くるま",
    pathsA: ["0,3 1,2 5,2 5,3 0,3", "1,3 1,4", "3,3 3,4"], // しゃたい・タイヤ
    pathsB: ["2,0 2,5", "4,0 4,5", "2,0 4,0", "2,4 4,3", "0,5 5,5"], // ふみきりのポールとしゃだんき・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "どうぶつ（さくとうま）", category: "どうぶつ",
    pathsA: ["1,1 4,1 4,3 1,3 1,1", "2,3 2,5", "3,3 3,5", "1,3 0,5", "4,1 5,0"], // からだ・あし・しっぽ・かお
    pathsB: ["0,2 5,2", "0,4 5,4", "0,2 0,5", "5,2 5,5", "0,5 5,5"], // さくのよこいたとはしら・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "どうぶつ（ぞうのシャワー）", category: "どうぶつ",
    pathsA: ["1,2 4,2", "1,4 4,4", "1,2 1,5", "4,2 4,5", "1,2 0,4", "4,2 5,4"], // からだとあし・はな・しっぽ
    pathsB: ["0,0 5,0", "2,0 2,5", "3,0 3,5", "0,5 5,5", "0,0 0,5"], // くもとあめ・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "どうぶつ（あみとさかな）", category: "どうぶつ",
    pathsA: ["1,3 2,2 4,2 5,3 4,4 2,4 1,3", "1,3 0,2", "1,3 0,4"], // さかなのからだ・お
    pathsB: ["0,1 4,5", "1,0 5,4", "0,0 2,4", "0,0 0,1", "0,0 1,0"], // あみ
  },
  {
    sku: "decompose-lv5-vol1", label: "どうぶつのかお（たてがみのライオン）", category: "どうぶつのかお",
    pathsA: ["2,2 4,2 4,4 2,4 1,3 2,2", "1,3 0,2", "1,3 0,4", "3,2 5,0"], // かお・ひげ
    pathsB: ["0,3 1,1", "1,1 3,0", "3,0 5,1", "5,1 5,3", "5,3 4,3", "0,3 1,4"], // たてがみ
  },
  {
    sku: "decompose-lv5-vol1", label: "どうぶつのかお（やなぎとうさぎ）", category: "どうぶつのかお",
    pathsA: ["1,0 1,4", "3,0 3,4", "1,2 3,2", "1,4 3,4", "2,3 2,4"], // ながいみみとかお・はな
    pathsB: ["0,0 2,1", "2,0 4,1", "0,2 2,3", "0,0 0,2", "0,0 2,0"], // やなぎのえだ
  },
  {
    sku: "decompose-lv5-vol1", label: "き（かぜとおちば）", category: "き",
    pathsA: ["2,0 0,2 2,4 4,2 2,0", "2,4 2,5", "1,5 3,5"], // じゅかん・みき・ね
    pathsB: ["0,1 5,1", "0,3 5,3", "5,1 5,3", "0,1 0,3", "4,3 5,5", "1,1 0,0"], // かぜとまいあがるは
  },
  {
    sku: "decompose-lv5-vol1", label: "き（ゆきのもみのき）", category: "き",
    pathsA: ["2,0 0,4 4,4 2,0", "2,4 2,5"],                // もみのき・みき
    pathsB: ["0,0 5,0", "1,0 1,5", "3,0 3,5", "5,0 4,2", "0,5 5,5"], // くもとゆき・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "たいよう（あまぐもとたいよう）", category: "たいよう",
    pathsA: ["3,1 2,2 3,3 4,2 3,1", "3,1 3,0", "2,2 0,2", "4,2 5,2"], // たいよう・こうせん
    pathsB: ["0,0 2,0 2,1 0,1 0,0", "1,1 3,5", "2,1 3,3", "0,1 2,5", "2,5 5,5"], // くもとあめ・みずたまり
  },
  {
    sku: "decompose-lv5-vol1", label: "つき（ほしのながれ）", category: "つき",
    pathsA: ["0,2 2,4 4,2", "0,2 2,3 4,2"],                // よこむきのつき
    pathsB: ["1,0 1,4", "3,0 3,4", "1,0 3,0", "3,0 4,1", "4,1 5,0"], // ほしのながれ
  },
  {
    sku: "decompose-lv5-vol1", label: "こうじょう（クレーンごし）", category: "こうじょう",
    pathsA: ["0,5 0,2 2,1 2,2 4,1 4,5 0,5", "0,3 4,3"],    // のこぎりやねのたてや・まどのおび
    pathsB: ["5,0 5,5", "5,0 1,0", "1,0 1,4", "3,0 3,4"],  // クレーンのとうとワイヤー
  },
  {
    sku: "decompose-lv5-vol1", label: "こうじょう（けむりとかぜ）", category: "こうじょう",
    pathsA: ["0,3 0,5 5,5 5,3 0,3", "1,1 1,3", "2,1 2,3", "1,1 2,1", "4,1 4,3"], // たてや・えんとつ
    pathsB: ["0,0 5,0", "0,2 5,2", "0,0 0,2", "2,1 4,0", "4,1 2,0"], // かぜとけむり
  },
  {
    sku: "decompose-lv5-vol1", label: "でんしゃ（てつどうばし）", category: "でんしゃ",
    pathsA: ["0,2 5,2 5,4 0,4 0,2", "0,3 5,3", "2,2 3,1"], // しゃたい・まどのおび・パンタグラフ
    pathsB: ["0,0 4,0", "0,0 2,4", "2,0 4,4", "4,0 5,1"],  // てっきょうのけたとすじかい
  },
  {
    sku: "decompose-lv5-vol1", label: "でんしゃ（かせんちゅう）", category: "でんしゃ",
    pathsA: ["0,2 5,2 5,4 0,4 0,2", "0,3 5,3", "2,2 0,1"], // しゃたい・まどのおび・パンタグラフ
    pathsB: ["1,0 1,5", "4,0 4,5", "1,0 4,0", "0,5 5,5"],  // かせんちゅうとビーム・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "いえ（さくごしのいえ）", category: "いえ",
    pathsA: ["1,1 1,5", "5,1 5,5", "1,1 3,0 5,1", "1,5 5,5", "1,2 5,2", "1,3 5,3"], // かべ・やね・ゆか・かいのしきり
    pathsB: ["0,4 5,4", "2,1 2,5", "4,2 4,5", "0,3 0,5"],  // さくのよこいたとはしら
  },
  {
    sku: "decompose-lv5-vol1", label: "いえ（にわのき）", category: "いえ",
    pathsA: ["0,2 0,5 3,5 3,2", "0,2 1,1 2,1 3,2"],        // かべ・やね
    pathsB: ["4,0 4,5", "4,2 2,3", "4,3 2,4", "4,4 2,5", "3,5 5,5"], // きのみきとえだ・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "ロケット（くもをぬけて）", category: "ロケット",
    pathsA: ["2,1 2,4 4,4 4,1", "2,1 3,0 4,1", "3,3 3,4", "2,4 0,5", "4,4 5,5"], // きたい・せんたん・まど・はね
    pathsB: ["0,2 5,2", "0,3 5,3", "0,2 0,3", "5,2 5,3", "0,2 1,1", "5,2 4,1"], // くものおび
  },
  {
    sku: "decompose-lv5-vol1", label: "ロケット（せいびやぐら）", category: "ロケット",
    pathsA: ["2,1 2,4 3,4", "3,0 3,4", "2,1 3,0", "2,4 0,5", "3,4 5,5"], // きたい・せんたん・はね
    pathsB: ["0,0 0,5", "1,0 1,5", "4,0 4,5", "5,0 5,5", "0,2 5,2", "0,0 5,0"], // せいびやぐら
  },
  {
    sku: "decompose-lv5-vol1", label: "ヨット（はしのした）", category: "ヨット",
    pathsA: ["0,4 1,5 4,5 5,4", "0,4 5,4", "2,4 2,0", "2,0 4,4"], // ふね・かんぱん・マスト・ほ
    pathsB: ["0,1 5,1", "1,1 1,4", "3,1 3,4", "1,1 3,3", "3,1 1,3"], // はしのけたとすじかい
  },
  {
    sku: "decompose-lv5-vol1", label: "かさ（どしゃぶり）", category: "かさ",
    pathsA: ["0,2 2,1 4,2", "0,2 4,2", "2,1 2,5", "2,5 1,5"], // かさ・え・もちて
    pathsB: ["0,0 5,0", "1,0 1,5", "2,0 4,4", "5,0 5,3"],  // くもとあめ
  },
  {
    sku: "decompose-lv5-vol1", label: "ロボット（あしばとロボ）", category: "ロボット",
    pathsA: ["2,0 2,1", "3,0 3,1", "2,0 3,0", "1,1 1,4 4,4 4,1 1,1", "4,1 5,3"], // あたま・からだ・うで
    pathsB: ["0,2 5,2", "0,3 5,3", "0,0 0,5", "0,5 5,5"],  // あしばとじめん
  },
  {
    sku: "decompose-lv5-vol1", label: "はな（かだんのさく）", category: "はな",
    pathsA: ["2,0 1,1 2,2 3,1 2,0", "2,2 2,5", "2,3 0,2", "2,2 4,3"], // はなびら・くき・は
    pathsB: ["0,3 5,3", "0,4 5,4", "1,2 1,5", "4,2 4,5", "0,2 0,5", "5,3 5,5", "0,5 5,5"], // かだんのさく・じめん
  },
  {
    sku: "decompose-lv5-vol1", label: "はな（ながれぼしとはな）", category: "はな",
    pathsA: ["2,1 1,2 2,3 3,2 2,1", "2,3 2,5", "2,4 1,3", "2,4 3,3", "1,2 0,0"], // はなびら・くき・は・がく
    pathsB: ["0,0 3,3", "4,0 1,3", "0,0 4,0", "4,0 5,1"],  // ながれぼし
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

/* 巻ゲート（DECOMPOSE_LADDER ＋ 合成コアの導出ゲート）の検証 */
function checkSeed(
  sku: string, A: EdgeT[], B: EdgeT[], F: EdgeT[],
  mA: ProblemMetrics, mB: ProblemMetrics, mF: ProblemMetrics, D: number,
): string[] {
  const p = DECOMPOSE_LADDER[sku];
  const errs: string[] = [];
  if (!p) return [`DECOMPOSE_LADDER に ${sku} が無い`];
  const n = p.grid;
  const [dLo, dHi] = D_WINDOW[sku];

  for (const [name, part, m] of [["A", A, mA], ["B", B, mB]] as const) {
    if (m.lines < p.lines[0] || m.lines > p.lines[1])
      errs.push(`図${name}: 線 ${m.lines} 本が窓 [${p.lines[0]}, ${p.lines[1]}] の外`);
    if (componentsOf(part) !== 1) errs.push(`図${name}: かたちが ${componentsOf(part)} つ（カードは 1 つながり）`);
    if (p.slopes !== "any" && m.non45 > 0) errs.push(`図${name}: 非45° ${m.non45} 本（ortho45 巻は 0）`);
  }

  // A・B の辺共有（データモデル上表現不能）
  const aKeys = new Set(A.map(edgeKey));
  for (const e of B) if (aKeys.has(edgeKey(e))) errs.push(`A・B が辺を共有: ${edgeKey(e)}`);

  // 完成図 C のゲート
  const b = bounds(F);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  if (b.cMax - b.cMin < n - 2 || b.rMax - b.rMin < n - 2)
    errs.push(`ひろがり不足 span ${b.cMax - b.cMin}×${b.rMax - b.rMin}（bbox ≥ ${n - 2}）`);
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本が上限 ${NON45_CAP_F} 超`);
  if (p.requireDiag45 && mF.diagonals - mF.non45 < 1) errs.push("45° のななめが 1 本もない（requireDiag45）");
  if (p.requireNon45 && mF.non45 < 1) errs.push("非45° が 1 本もない（requireNon45）");
  if (mF.crossings > CROSS_HI[n]) errs.push(`交差 ${mF.crossings} か所が上限 ${CROSS_HI[n]} 超`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)} 本が上限 ${DANGLING_MAX_F} 超`);
  if (closedLoops(F, mF.components) < 1) errs.push("閉路なし（閉じた骨格が必要）");

  // 絡み（A・B 間の X 交差）＝ Vol 分けドライバー
  const inter = mF.crossings - mA.crossings - mB.crossings;
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
  const cell = n <= 4 ? 30 : 24, pad = 12, size = (n - 1) * cell + pad * 2;
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
  const skuIdx = process.argv.indexOf("--sku");
  const skuFilter = skuIdx >= 0 ? process.argv[skuIdx + 1] : null;

  const seeds = skuFilter ? SEEDS.filter((s) => s.sku === skuFilter) : SEEDS;
  if (seeds.length === 0) throw new Error(`SEEDS が空（--sku ${skuFilter}）`);

  /* ---- かぶり台帳 ----
     published copy＋published overlay/decompose＋overlay・decompose candidates
     全 status＋生成ライブラリ全変種（error）。fold ほか他タスクの手設計（warn）。
     かさねと分解は完成図を共有できない（同じ重なり図の再売禁止＝decisions §3.73）
     ため、overlay 候補も error 扱いにする。 */
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
  const liveBySku = new Map<string, EdgeT[][]>();
  for (const f of allCandFiles.filter((x) => x.startsWith("overlay-") || x.startsWith("decompose-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      known.set(shapeSignature(c.edges), `candidates:${c.id}(${c.status})`);
      if (f.startsWith("decompose-") && c.status !== "rejected") {
        const arr = liveBySku.get(file.sku) ?? [];
        arr.push(c.edges);
        liveBySku.set(file.sku, arr);
      }
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
    m: ProblemMetrics; D: number; inter: number; errs: string[]; warns: string[];
  };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();

  for (const seed of SEEDS) {
    if (skuFilter && seed.sku !== skuFilter) continue;
    const p = DECOMPOSE_LADDER[seed.sku];
    const n = p.grid;
    const errs: string[] = [];
    const warns: string[] = [];
    const A = normalizeEdges(parsePaths(seed.pathsA));
    const B = normalizeEdges(parsePaths(seed.pathsB));
    const F = normalizeEdges([...A, ...B]);
    const mA = computeMetrics(A, n);
    const mB = computeMetrics(B, n);
    const mF = computeMetrics(F, n);
    const probe: Problem = {
      id: `${seed.sku}-probe`, grid: { type: "square", n }, edges: F, metrics: mF,
      answer: { mode: "explicit", edges: B },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("decompose", probe).value;
    const inter = mF.crossings - mA.crossings - mB.crossings;
    errs.push(...checkSeed(seed.sku, A, B, F, mA, mB, mF, D));
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
    for (const other of liveBySku.get(seed.sku) ?? []) {
      const j = jaccard(other, F);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    for (const r of rows) {
      if (r.seed.sku !== seed.sku) continue;
      const j = jaccard(r.F, F);
      if (j > 0.6) warns.push(`バッチ内で類似 J=${j.toFixed(2)}（${r.seed.label}）`);
    }

    rows.push({ seed, A, B, F, m: mF, D, inter, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  let curSku = "";
  for (const r of rows) {
    if (r.seed.sku !== curSku) {
      curSku = r.seed.sku;
      const [lo, hi] = D_WINDOW[curSku];
      console.log(`\n===== ${curSku}（D ${lo}〜${hi} 未満） =====`);
    }
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    const n = DECOMPOSE_LADDER[r.seed.sku].grid;
    console.log(
      `${status}${r.seed.label}`
      + `  A:線${computeMetrics(r.A, n).lines} B:線${computeMetrics(r.B, n).lines}`
      + ` 絡み${r.inter} 交差${r.m.crossings} 非45°${r.m.non45}`
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
      const n = DECOMPOSE_LADDER[r.seed.sku].grid;
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.sku}</span></div>
  ${svgTriple(r.A, r.B, n)}
  <div class="meta">D=${r.D}・絡み${r.inter}・交差${r.m.crossings}・非45° ${r.m.non45}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>decompose モチーフ再生成</title>
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
<h1>decompose モチーフ再生成（${rows.length}問）</h1>
<p style="font-size:13px;color:#666">完成図（黒＋青）− 引くもの（青）＝ こたえ（黒）</p><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 2;
    const cellW = 3 * ((6 - 1) * 24 + 24) + 120, cellH = (6 - 1) * 24 + 24 + 44;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgTriple(r.A, r.B, DECOMPOSE_LADDER[r.seed.sku].grid)
        .replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const bw = (svgs[0]?.match(/width="(\d+)"/) ?? [])[1];
      const board = Number(bw ?? 100);
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
  const bySku = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = bySku.get(r.seed.sku) ?? [];
    arr.push(r);
    bySku.set(r.seed.sku, arr);
  }
  for (const [sku, skuRows] of bySku) {
    const file = (await readCandidateFileRaw(sku)) ?? {
      schemaVersion: 1 as const, sku, task: "decompose", candidates: [], seedCursor: 0,
    };
    let maxM = file.candidates.reduce((mx, c) => {
      const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
      return Math.max(mx, k);
    }, 0);
    for (const r of skuRows) {
      const base: Problem = {
        id: `${sku}-m${String(++maxM).padStart(2, "0")}`,
        grid: { type: "square", n: DECOMPOSE_LADDER[sku].grid },
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
    await fs.writeFile(path.join(CAND_DIR, `${sku}.json`), JSON.stringify(file, null, 1), "utf8");
    console.log(`書き込み完了 → ${sku}.json（${skuRows.length} 問）`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
