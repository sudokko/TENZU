/* fold（折り重ね）4 巻へのモチーフ追加バッチ
   （npx tsx scripts/seed-fold-motifs.ts [--sku <sku>] [--preview <html>] [--png <png>] [--write]）

   目的（2026-08-04）: fold 4 巻は候補が自動生成のみ（各 20 問・全 pending）で
   「絵になる図形」がゼロ。かさね craft（product/motif-craft.md）を折り重ねへ展開する。
     fold-lv2-vol1（3×3・ortho45・絡み0-1・線2-4/図）: D 9〜15.5 未満
     fold-lv3-vol1（4×4・ortho45・45°必須・絡み0-1・線2-5/図）: D 13〜19 未満
     fold-lv4-vol1（5×5・any・非45°必須・絡み0-2・線3-6/図）: D 19〜29 未満
     fold-lv5-vol1（6×6・any・非45°必須・絡み3-10・線4-8/図）: D 28〜42 未満
   D 窓は自動候補の実測分布（lv2: 9.5-15 / lv3: 12.8-18.3 / lv4: 18.8-29 /
   lv5: 22.3-45）に合わせた手設計バッチの窓。

   折り重ねのデータモデル（gen/fold.ts と同一）:
     edges＝問題1（折り返す前の姿＝mirror(P, v)）・inputB＝問題2（Q）・
     answer(explicit).edges＝完成図 F（=P∪Q）・metrics＝F のもの。
     紙面は「問題1 →(おる) 問題2 ＝ □」の 3 ペイン。
   ★ 手設計は P（折ったあとの姿）と Q で書く。問題1 はスクリプトが
     mirrorEdges(P, n, "v") で焼く。折り重ねならではの味＝P を非対称 or
     片側寄せにして「折ると絵が完成する」構図を狙う。
     絡み＝P・Q 間の X 交差（interCrossings・格子点貫通もカウント・T字は数えない）。

   手設計の規約（gen/fold.ts→generateComposedCandidates のゲートに揃える）:
   - P・Q とも: 線本数（併合後）が ladder の窓内・連結 1 成分・
     ortho45 巻は非45° 0 本・ヒゲ ≤2 目安（超は warn）
   - F: 非45° ≤3・交差 ≤ crossHi・成分 ≤2（絡み 0 なら 1）・ヒゲ ≤4・
     閉路 ≥1（n≥4）・requireDiag45/requireNon45・P と Q は辺を共有しない
   - 本物の computeMetrics / taskDifficulty("fold") / FOLD_LADDER で検証
   - かぶり: 模写公開済み＋かさね・分解の完成図（published＋candidates 全 status）＋
     fold 候補の完成図（answer 側）＋生成ライブラリ（いずれも error）
   - --preview / --png で 3 ペイン（問題1 →おる Q ＝ F）を出して目視検品
   - --write で candidates/<sku>.json に status=pending で追記（手設計採番 -mNN）
   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, mirrorEdges, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics, interCrossings } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { FOLD_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

/* D 窓（自動候補の実測分布準拠・2026-08-04）と F の交差上限（gen/overlay.ts copyParamsFor） */
const D_WINDOW: Record<string, [number, number]> = {
  "fold-lv2-vol1": [9, 15.5],
  "fold-lv3-vol1": [13, 19],
  "fold-lv4-vol1": [19, 29],
  "fold-lv5-vol1": [28, 42],
};
const CROSS_HI: Record<number, number> = { 3: 4, 4: 8, 5: 10, 6: 12, 7: 12 };
const NON45_CAP_F = 3;
const DANGLING_MAX_F = 4;
const DANGLING_MAX_PART = 2;

type Seed = {
  sku: string; label: string; category: string;
  pathsP: string[];  // P＝折ったあとの姿（完成図の中で問題1が担う側）・盤面座標 "c,r"（r 下向き）
  pathsQ: string[];  // Q＝問題2（=inputB）
};

/* =========================================================================
   SEEDS — fold-lv2-vol1（3×3・ortho45・絡み0-1・線2-4/図・D9-15.5）
   3×3 は「かたちのカード 2 枚」の最小構図。P を片側寄せ・非対称にして
   折る意味（位置が飛ぶ・向きが変わる）を作る。
   ========================================================================= */
const SEEDS: Seed[] = [
  {
    sku: "fold-lv2-vol1", label: "いえ（はしらのいえ）", category: "いえ",
    pathsP: ["0,1 1,0 2,1", "2,1 2,2", "1,0 1,1"],       // やね・みぎのかべ・はしら
    pathsQ: ["0,1 0,2 2,2", "1,1 1,2"],                  // ひだりのかべとゆか・とびら
  },
  {
    sku: "fold-lv2-vol1", label: "どうぶつのかお（ねこ）", category: "どうぶつのかお",
    pathsP: ["0,1 0,0", "0,0 1,1", "1,1 2,0", "2,0 2,1"], // みみとひたい
    pathsQ: ["0,1 0,2 2,2 2,1 0,1"],                     // かおのわく
  },
  {
    sku: "fold-lv2-vol1", label: "ロボット（あるくロボ）", category: "ロボット",
    pathsP: ["0,0 2,0", "0,0 0,1", "0,1 1,1", "1,1 1,0"], // あたまとアンテナ
    pathsQ: ["0,2 1,2 1,1 2,2"],                         // あしとからだ
  },
  {
    sku: "fold-lv2-vol1", label: "ロボット（ロボのかお）", category: "ロボット",
    pathsP: ["0,0 2,0 2,2 0,2 0,0"],                     // かおのわく
    pathsQ: ["0,1 2,1", "1,1 1,2"],                      // めのせん・はな
  },
  {
    sku: "fold-lv2-vol1", label: "ロケット（よこむき）", category: "ロケット",
    pathsP: ["1,0 2,1 1,2", "1,1 2,1", "1,2 2,2"],       // せんたん・まどのせん・フィン
    pathsQ: ["1,0 0,0 0,2 1,2"],                         // きたい
  },
  {
    sku: "fold-lv2-vol1", label: "ロケット（ふんしゃ）", category: "ロケット",
    pathsP: ["0,0 2,0 2,1 0,1 0,0"],                     // きたい
    pathsQ: ["0,2 1,1", "1,1 1,2"],                      // ほのお
  },
  {
    sku: "fold-lv2-vol1", label: "はな（のはらのはな）", category: "はな",
    pathsP: ["0,0 1,1 2,0", "0,0 2,0"],                  // はなびら
    pathsQ: ["1,1 1,2", "0,2 2,2", "1,2 2,1"],           // くき・じめん・は
  },
  {
    sku: "fold-lv2-vol1", label: "はな（はちうえ）", category: "はな",
    pathsP: ["1,0 0,1", "0,1 2,1", "2,1 1,0"],           // はなびら（さんかく）
    pathsQ: ["0,1 0,2 2,2 2,1"],                         // うえきばち
  },
  {
    sku: "fold-lv2-vol1", label: "かさ（あめのかさ）", category: "かさ",
    pathsP: ["0,1 1,0 2,1", "0,1 2,1", "2,1 2,2"],       // かさのぬの・ほねのさき
    pathsQ: ["1,1 1,2", "1,2 0,2", "0,2 0,1"],           // えとまがったもちて
  },
  {
    sku: "fold-lv2-vol1", label: "かさ（げんかんのかさ）", category: "かさ",
    pathsP: ["1,0 2,1 1,2", "1,0 1,2"],                  // とじたぬの
    pathsQ: ["1,2 0,2", "0,2 0,0", "0,0 1,0"],           // ゆか・かべ・たな
  },
  {
    sku: "fold-lv2-vol1", label: "つき（まどのつき）", category: "つき",
    pathsP: ["1,0 0,1 1,2", "1,0 1,2"],                  // みかづき
    pathsQ: ["1,0 2,0", "2,0 2,2", "1,2 2,2"],           // まどのわく
  },
  {
    sku: "fold-lv2-vol1", label: "たいよう（まどべのあさ）", category: "たいよう",
    pathsP: ["1,0 0,1 1,2 2,1 1,0"],                     // たいよう
    pathsQ: ["0,0 2,0", "0,0 0,2", "2,0 2,2"],           // まどのわく（うえとりょうわき）
  },
  {
    sku: "fold-lv2-vol1", label: "ヨット（うみのヨット）", category: "ヨット",
    pathsP: ["1,0 1,2", "1,0 2,1", "2,1 1,2"],           // ほ
    pathsQ: ["0,2 2,2", "0,2 0,1", "2,2 2,1"],           // ふね
  },
  {
    sku: "fold-lv2-vol1", label: "き（プレゼントのき）", category: "き",
    pathsP: ["0,1 1,0 2,1", "0,1 2,1"],                  // は（さんかく）
    pathsQ: ["1,1 1,2", "0,2 2,2", "2,2 2,1"],           // みき・じめん・プレゼントばこ
  },

  /* =======================================================================
     fold-lv3-vol1（4×4・ortho45・45°必須・絡み0-1・線2-5/図・D13-19）
     ======================================================================= */
  {
    sku: "fold-lv3-vol1", label: "いえ（やねをおる）", category: "いえ",
    pathsP: ["0,1 1,0 2,0 3,1"],                         // やね
    pathsQ: ["0,1 0,3 3,3 3,1", "1,2 2,2 2,3"],          // かべ・まど
  },
  {
    sku: "fold-lv3-vol1", label: "いえ（へいのあるいえ）", category: "いえ",
    pathsP: ["0,2 0,3", "0,2 1,2", "0,3 1,3"],           // へい（はしらとよこいた2だん）
    pathsQ: ["1,1 2,0 3,1", "1,1 1,3 3,3 3,1"],          // やね・かべ
  },
  {
    sku: "fold-lv3-vol1", label: "ロボット（アンテナロボ）", category: "ロボット",
    pathsP: ["1,1 1,0 2,0 2,1", "2,1 3,0"],              // あたま・アンテナ
    pathsQ: ["1,1 1,2 2,2 2,1", "1,2 0,3", "2,2 3,3"],   // からだ・ひらいたあし
  },
  {
    sku: "fold-lv3-vol1", label: "ロボット（アームロボ）", category: "ロボット",
    pathsP: ["1,2 2,1 3,1", "3,1 3,2", "2,1 2,0"],       // アーム・てさき・アンテナ
    pathsQ: ["0,2 0,3 3,3 3,2 0,2", "1,3 1,2"],          // しゃたい・くるま
  },
  {
    sku: "fold-lv3-vol1", label: "ロケット（はっしゃ）", category: "ロケット",
    pathsP: ["0,2 0,1 1,0 2,1 2,2"],                     // せんたんときたい
    pathsQ: ["0,2 2,2", "0,2 1,3", "2,2 3,3"],           // そこ・りょうのフィン
  },
  {
    sku: "fold-lv3-vol1", label: "ロケット（ほしにとどく）", category: "ロケット",
    pathsP: ["0,1 1,0", "1,0 1,3", "0,1 0,3", "0,3 1,3"], // ロケット（ななめのせんたん）
    pathsQ: ["2,0 1,1 2,2 3,1 2,0"],                      // ほし
  },
  {
    sku: "fold-lv3-vol1", label: "はな（はなとめばえ）", category: "はな",
    pathsP: ["1,0 0,1 1,2 2,1 1,0"],                     // はな
    pathsQ: ["1,2 1,3", "0,3 3,3", "2,3 3,2"],           // くき・じめん・めばえ
  },
  {
    sku: "fold-lv3-vol1", label: "はな（チューリップ）", category: "はな",
    pathsP: ["0,0 1,1 2,0", "0,0 0,1", "2,0 2,1", "0,1 2,1"], // はなびら（カップ）
    pathsQ: ["1,1 1,3", "1,2 2,3", "1,2 0,3"],           // くき・りょうのは
  },
  {
    sku: "fold-lv3-vol1", label: "かさ（あめふり）", category: "かさ",
    pathsP: ["0,2 1,1 2,1 3,2", "2,1 2,3", "2,3 1,3"],   // かさのぬの・え・もちて
    pathsQ: ["1,0 3,0", "1,0 0,1", "2,0 1,1", "3,0 2,1"], // くも・あめ
  },
  {
    sku: "fold-lv3-vol1", label: "つき（つきとほし）", category: "つき",
    pathsP: ["2,0 1,1 1,2 2,3", "2,0 2,3"],              // みかづき
    pathsQ: ["1,1 0,2 1,3 2,2 1,1"],                     // ほし
  },
  {
    sku: "fold-lv3-vol1", label: "ヨット（はたのヨット）", category: "ヨット",
    pathsP: ["1,0 1,2", "1,0 3,2", "1,2 3,2", "1,0 2,0", "2,0 1,1"], // ほ・マスト・はた
    pathsQ: ["0,2 1,3 2,3 3,2"],                         // ふね
  },
  {
    sku: "fold-lv3-vol1", label: "き（こうえんのき）", category: "き",
    pathsP: ["1,0 0,1 1,2 2,1 1,0"],                     // じゅかん
    pathsQ: ["1,2 1,3", "0,3 3,3", "3,3 3,2"],           // みき・じめん・かんばん
  },
  {
    sku: "fold-lv3-vol1", label: "たいよう（やまのあさひ）", category: "たいよう",
    pathsP: ["2,0 1,1 2,2 3,1 2,0"],                     // たいよう
    pathsQ: ["0,3 2,1", "0,3 3,3"],                      // やまのしゃめん・じめん
  },
  {
    sku: "fold-lv3-vol1", label: "でんしゃ（パンタグラフ）", category: "でんしゃ",
    pathsP: ["0,1 3,1", "2,1 1,0", "1,0 0,0", "2,1 3,0"], // やね・パンタグラフ
    pathsQ: ["0,1 0,3 3,3 3,1", "1,2 1,3"],              // しゃたい・とびら
  },

  /* =======================================================================
     fold-lv4-vol1（5×5・any・非45°必須・絡み0-2・線3-6/図・D19-29）
     ======================================================================= */
  {
    sku: "fold-lv4-vol1", label: "くるま（バスてい）", category: "くるま",
    pathsP: ["0,1 3,1", "3,1 4,3", "0,1 0,3", "0,3 4,3", "1,1 1,2", "2,1 2,2"], // バスのしゃたい・まえのスラント・まど
    pathsQ: ["0,4 4,4", "1,3 1,4", "3,3 3,4", "4,4 4,2", "4,2 3,2"], // みち・タイヤ・バスていのポールとかんばん
  },
  {
    sku: "fold-lv4-vol1", label: "くるま（トンネル）", category: "くるま",
    pathsP: ["0,3 1,2 3,2 4,3", "0,3 4,3", "2,2 2,3"],   // くるま・まど
    pathsQ: ["0,4 0,1", "0,1 2,0", "2,0 4,0", "4,0 4,4", "0,4 4,4"], // トンネルのアーチ・みち
  },
  {
    sku: "fold-lv4-vol1", label: "どうぶつ（さんぽのいぬ）", category: "どうぶつ",
    pathsP: ["2,2 0,1", "0,1 0,0 1,0 1,1", "1,0 2,1"],   // くび・あたま・たれみみ
    pathsQ: ["1,2 4,2", "1,2 1,3", "4,2 4,3", "1,3 4,3", "3,3 3,4", "0,4 4,4"], // からだ・あし・じめん
  },
  {
    sku: "fold-lv4-vol1", label: "どうぶつ（はくちょう）", category: "どうぶつ",
    pathsP: ["2,2 1,0", "1,0 0,0", "0,0 0,1", "1,0 1,1"], // くび・くちばし・のど
    pathsQ: ["1,2 3,2", "3,2 4,1", "1,2 0,3", "0,3 3,3", "3,3 3,2", "3,3 4,4"], // からだ・お・みずのあと
  },
  {
    sku: "fold-lv4-vol1", label: "どうぶつのかお（きつね）", category: "どうぶつのかお",
    pathsP: ["1,1 3,1", "1,1 0,3", "3,1 4,3", "0,3 1,4", "1,4 3,4", "3,4 4,3"], // かおのりんかく（ほそながいほほ）
    pathsQ: ["1,1 1,0 2,1 3,0 3,1"],                     // とがったみみ
  },
  {
    sku: "fold-lv4-vol1", label: "どうぶつのかお（ぞう）", category: "どうぶつのかお",
    pathsP: ["1,0 3,0", "1,0 1,2", "3,0 3,2", "1,0 0,2", "3,0 4,2"], // かおのりんかく・たれみみ
    pathsQ: ["1,2 3,2", "2,2 2,4 3,4"],                  // あご・ながいはな
  },
  {
    sku: "fold-lv4-vol1", label: "き（はしごのき）", category: "き",
    pathsP: ["2,0 0,2", "0,2 2,3", "2,3 4,2", "4,2 2,0"], // じゅかん
    pathsQ: ["2,3 2,4", "0,4 4,4", "3,4 4,3"],           // みき・じめん・はしご
  },
  {
    sku: "fold-lv4-vol1", label: "き（ふたごのき）", category: "き",
    pathsP: ["1,0 0,1 1,2 2,1 1,0", "1,2 1,4"],          // き（ひし）とみき
    pathsQ: ["3,1 2,3", "2,3 4,3", "4,3 3,1", "3,3 3,4", "0,4 4,4"], // となりのき・じめん
  },
  {
    sku: "fold-lv4-vol1", label: "たいよう（てんきあめ）", category: "たいよう",
    pathsP: ["3,0 2,1 3,2 4,1 3,0", "2,1 1,0"],          // たいよう・こうせん
    pathsQ: ["0,2 3,2 3,3 0,3 0,2", "0,3 2,4", "3,3 3,4"], // くも・あめ
  },
  {
    sku: "fold-lv4-vol1", label: "たいよう（ゆうひのやま）", category: "たいよう",
    pathsP: ["2,0 1,1 2,2 3,1 2,0", "1,1 0,1", "3,1 4,1"], // たいよう・こうせん
    pathsQ: ["0,3 2,2 4,3", "4,3 4,4", "0,4 4,4", "0,3 0,4"], // やま・じめん
  },
  {
    sku: "fold-lv4-vol1", label: "こうじょう（ギザやね）", category: "こうじょう",
    pathsP: ["0,2 1,1 1,2 3,1 3,2 4,1"],                 // のこぎりやね
    pathsQ: ["0,2 0,4 4,4 4,2", "1,4 1,3 2,3 2,4"],      // たてや・とびら
  },
  {
    sku: "fold-lv4-vol1", label: "こうじょう（ベルトコンベア）", category: "こうじょう",
    pathsP: ["0,4 4,2", "2,3 2,4", "4,2 4,4"],           // ベルトコンベアとあし
    pathsQ: ["0,1 3,1", "0,1 0,3", "3,1 3,3", "0,3 3,3", "1,2 1,3"], // こうじょうのはこ・とびら
  },
  {
    sku: "fold-lv4-vol1", label: "でんしゃ（ふみきり）", category: "でんしゃ",
    pathsP: ["1,1 4,1", "1,1 0,3", "4,1 4,3", "0,3 4,3", "2,1 2,2"], // しゃたい・スラントのはな・まど
    pathsQ: ["1,3 1,4", "3,3 3,4", "0,4 4,4", "4,1 2,4"], // しゃりん・レール・しゃだんき
  },
  {
    sku: "fold-lv4-vol1", label: "でんしゃ（せきたんしゃ）", category: "でんしゃ",
    pathsP: ["0,2 2,1 4,2", "2,1 2,0", "2,0 3,0"],       // せきたんのやま・はた
    pathsQ: ["0,2 0,3", "4,2 4,3", "0,3 4,3", "1,3 1,4", "3,3 3,4"], // かしゃ・しゃりん
  },

  /* =======================================================================
     fold-lv5-vol1（6×6・any・非45°必須・絡み3-10・線4-8/図・D28-42）
     前景×背景の「重なる必然」構図で絡みを作る（おりのライオン型の
     顔グリッドは避ける・あめ/あしば/あみ/こうせん等の場面パターンで）
     ======================================================================= */
  {
    sku: "fold-lv5-vol1", label: "いえ（あらしのいえ）", category: "いえ",
    pathsP: ["1,2 2,1 4,2", "1,2 1,5", "1,5 4,5", "4,5 4,2", "2,5 2,4 3,4 3,5"], // やね・かべ・とびら
    pathsQ: ["0,0 5,0", "2,0 1,1", "4,0 2,2", "5,0 0,5", "3,0 2,1"], // くも・あめ
  },
  {
    sku: "fold-lv5-vol1", label: "ロボット（はしごとロボ）", category: "ロボット",
    pathsP: ["2,2 4,2", "2,2 2,4", "4,2 4,4", "2,4 4,4", "2,1 3,1", "2,1 2,2", "3,1 3,2", "4,2 5,1"], // からだ・あたま・うで
    pathsQ: ["1,5 3,1", "2,5 4,1", "1,5 2,5", "2,3 3,3"], // はしごのレールとだん
  },
  {
    sku: "fold-lv5-vol1", label: "ロケット（あまのがわ）", category: "ロケット",
    pathsP: ["1,1 2,0 3,1", "1,1 1,4", "3,1 3,4", "1,4 3,4", "1,4 0,5", "3,4 4,5"], // せんたん・きたい・はね
    pathsQ: ["0,3 4,1", "0,4 4,2", "0,3 0,4", "4,1 5,0"], // あまのがわのながれ・ほし
  },
  {
    sku: "fold-lv5-vol1", label: "はな（フェンスのはな）", category: "はな",
    pathsP: ["2,0 0,2 2,4 4,2 2,0", "2,4 2,5", "2,4 0,5"], // おおきなはなびら・くき・は
    pathsQ: ["1,1 4,1", "1,3 4,3", "1,0 1,5", "4,0 4,5", "0,5 5,5"], // フェンスとじめん
  },
  {
    sku: "fold-lv5-vol1", label: "かさ（どしゃぶり）", category: "かさ",
    pathsP: ["0,2 1,1 3,1 5,2", "0,2 5,2", "2,2 2,5", "2,5 1,5"], // かさのぬの・え・もちて
    pathsQ: ["1,0 5,0", "3,0 0,3", "5,0 2,3", "2,0 1,1"], // くも・あめ
  },
  {
    sku: "fold-lv5-vol1", label: "つき（ながれぼし）", category: "つき",
    pathsP: ["3,0 2,1", "2,1 2,4", "2,4 3,5", "3,0 3,5"], // みかづき
    pathsQ: ["0,1 4,3", "1,0 5,2", "0,1 1,0", "5,2 5,3", "4,3 4,4"], // ながれぼしふたつ
  },
  {
    sku: "fold-lv5-vol1", label: "ヨット（とうだい）", category: "ヨット",
    pathsP: ["2,0 2,4", "2,0 4,2", "2,2 4,2", "0,3 1,4 4,4 5,3"], // ほとマスト・ふね
    pathsQ: ["5,0 5,3", "5,0 1,2", "5,1 1,3", "4,3 5,3"], // とうだいとひかり
  },
  {
    sku: "fold-lv5-vol1", label: "くるま（こうじちゅう）", category: "くるま",
    pathsP: ["0,2 3,2", "3,2 4,4", "0,2 0,4", "0,4 4,4", "1,4 1,5", "3,4 3,5"], // くるま・タイヤ
    pathsQ: ["2,0 2,5", "4,0 4,5", "2,1 4,1", "0,3 4,3", "0,3 2,1", "0,5 5,5"], // あしばとすじかい・じめん
  },
  {
    sku: "fold-lv5-vol1", label: "どうぶつ（あみとさかな）", category: "どうぶつ",
    pathsP: ["0,2 2,0 4,2 2,4 0,2", "4,2 5,0", "4,2 5,4"], // さかなのからだとお
    pathsQ: ["0,1 4,5", "1,0 5,4", "0,1 1,0", "4,5 5,4"], // あみ
  },
  {
    sku: "fold-lv5-vol1", label: "どうぶつのかお（ひげのねこ）", category: "どうぶつのかお",
    pathsP: ["1,2 4,2", "1,2 1,5", "4,2 4,5", "1,5 4,5", "1,2 2,0", "2,0 2,2", "4,2 3,0", "3,0 3,2"], // かおとみみ
    pathsQ: ["0,3 5,3", "0,4 5,4", "5,3 5,4", "0,3 0,4"], // ひげ
  },
  {
    sku: "fold-lv5-vol1", label: "き（かぜのき）", category: "き",
    pathsP: ["3,0 1,2", "1,2 5,2", "5,2 3,0", "3,2 3,5", "2,5 4,5"], // は・みき・ね
    pathsQ: ["0,3 4,1", "0,4 4,2", "0,5 4,3", "0,3 0,5"], // かぜ
  },
  {
    sku: "fold-lv5-vol1", label: "たいよう（ひこうきぐも）", category: "たいよう",
    pathsP: ["3,0 1,2 3,4 5,2 3,0", "1,2 0,2", "3,4 3,5"], // たいよう・こうせん
    pathsQ: ["0,1 5,3", "0,2 5,4", "0,1 0,2", "5,3 5,4"], // ひこうきぐも
  },
  {
    sku: "fold-lv5-vol1", label: "こうじょう（パイプのこうじょう）", category: "こうじょう",
    pathsP: ["0,1 2,0 4,1", "0,1 0,5", "4,1 4,5", "0,5 4,5", "2,4 2,5"], // やねとたてや・とびら
    pathsQ: ["0,2 5,2", "0,3 5,3", "0,4 5,4", "5,2 5,4"], // パイプ
  },
  {
    sku: "fold-lv5-vol1", label: "でんしゃ（やまのトンネル）", category: "でんしゃ",
    pathsP: ["0,2 4,2", "0,2 0,4", "4,2 4,4", "0,4 4,4", "2,2 2,3", "2,4 2,5"], // しゃたい・まど・しゃりん
    pathsQ: ["1,0 1,5", "3,0 3,5", "0,2 1,0", "1,0 3,0", "3,0 4,2"], // トンネルのやまとかべ
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

/* 巻ゲート（FOLD_LADDER ＋ 合成コアの導出ゲート）の検証 */
function checkSeed(
  sku: string, P: EdgeT[], Q: EdgeT[], F: EdgeT[],
  mP: ProblemMetrics, mQ: ProblemMetrics, mF: ProblemMetrics, D: number,
): string[] {
  const p = FOLD_LADDER[sku];
  const errs: string[] = [];
  if (!p) return [`FOLD_LADDER に ${sku} が無い`];
  const n = p.grid;
  const [dLo, dHi] = D_WINDOW[sku];

  for (const [name, part, m] of [["P", P, mP], ["Q", Q, mQ]] as const) {
    if (m.lines < p.lines[0] || m.lines > p.lines[1])
      errs.push(`図${name}: 線 ${m.lines} 本が窓 [${p.lines[0]}, ${p.lines[1]}] の外`);
    if (componentsOf(part) !== 1) errs.push(`図${name}: かたちが ${componentsOf(part)} つ（カードは 1 つながり）`);
    if (p.slopes !== "any" && m.non45 > 0) errs.push(`図${name}: 非45° ${m.non45} 本（ortho45 巻は 0）`);
  }

  // P・Q の辺共有（データモデル上表現不能）
  const pKeys = new Set(P.map(edgeKey));
  for (const e of Q) if (pKeys.has(edgeKey(e))) errs.push(`P・Q が辺を共有: ${edgeKey(e)}`);

  // 完成図 F のゲート
  const b = bounds(F);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  if (b.cMax - b.cMin < n - 2 || b.rMax - b.rMin < n - 2)
    errs.push(`ひろがり不足 span ${b.cMax - b.cMin}×${b.rMax - b.rMin}（bbox ≥ ${n - 2}）`);
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本が上限 ${NON45_CAP_F} 超`);
  if (p.requireDiag45 && mF.diagonals - mF.non45 < 1) errs.push("45° のななめが 1 本もない（requireDiag45）");
  if (p.requireNon45 && mF.non45 < 1) errs.push("非45° が 1 本もない（requireNon45）");
  if (mF.crossings > CROSS_HI[n]) errs.push(`交差 ${mF.crossings} か所が上限 ${CROSS_HI[n]} 超`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)} 本が上限 ${DANGLING_MAX_F} 超`);
  if (n >= 4 && closedLoops(F, mF.components) < 1) errs.push("閉路なし（閉じた骨格が必要）");

  // 絡み（P・Q の線分同士の直接 X 交差＝ difficulty.ts と同じ計測・§3.98）
  const inter = interCrossings(P, Q);
  if (inter < p.entangle[0] || inter > p.entangle[1])
    errs.push(`絡み ${inter} が窓 [${p.entangle[0]}, ${p.entangle[1]}] の外`);
  const comps = componentsOf(F);
  if (comps > 2) errs.push(`完成図が ${comps} つに分かれている（≤2）`);
  if (inter === 0 && comps !== 1) errs.push("絡み 0 なのに P と Q が接していない（離れ小島）");

  if (D < dLo) errs.push(`D=${D} が下限 ${dLo} 未満`);
  if (D >= dHi) errs.push(`D=${D} が上限 ${dHi} 以上`);
  return errs;
}

/* ---- SVG 3 ペイン（問題1 →おる 問題2 ＝ F）---- */
function svgTriple(P1: EdgeT[], Q: EdgeT[], P: EdgeT[], n: number): string {
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
  const pane1 = board(P1.map((e) => line(e, "#2b2925", 2.4)).join(""));
  const pane2 = board(Q.map((e) => line(e, "#1a56a8", 2.4)).join(""));
  const paneF = board(
    P.map((e) => line(e, "#2b2925", 2.2)).join("") + Q.map((e) => line(e, "#1a56a8", 2.2)).join(""));
  return `<div class="pair">${pane1}<span class="op">→おる</span>${pane2}<span class="op">＝</span>${paneF}</div>`;
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
     模写公開済み＋かさね・分解の完成図（published＋candidates 全 status）＋
     fold 候補の完成図（answer 側）＋生成ライブラリ（error）。
     他タスク手設計モチーフ（warn）。 */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("overlay-") && !sku.startsWith("decompose-") && !sku.startsWith("fold-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      const F = sku.startsWith("fold-") && p.answer?.mode === "explicit" ? p.answer.edges : p.edges;
      known.set(shapeSignature(F), `published:${p.id}`);
    }
  }
  const allCandFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.endsWith(".json"));
  const liveBySku = new Map<string, EdgeT[][]>();
  for (const f of allCandFiles.filter((x) => x.startsWith("overlay-") || x.startsWith("decompose-") || x.startsWith("fold-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.grid.type !== "square") continue;
      const F = file.sku.startsWith("fold-") && c.answer?.mode === "explicit" ? c.answer.edges : c.edges;
      known.set(shapeSignature(F), `candidates:${c.id}(${c.status})`);
      if (file.sku.startsWith("fold-") && c.status !== "rejected") {
        const arr = liveBySku.get(file.sku) ?? [];
        arr.push(F);
        liveBySku.set(file.sku, arr);
      }
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }
  const warnSigs = new Map<string, string>();
  for (const f of allCandFiles.filter((x) => !x.startsWith("overlay-") && !x.startsWith("decompose-") && !x.startsWith("fold-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.grid.type !== "square") continue;
      if (c.gen?.kind === "manual") warnSigs.set(shapeSignature(c.edges), `${file.sku}:${c.provenance?.label ?? c.id}`);
    }
  }

  /* ---- 検証 ---- */
  type Row = {
    seed: Seed; P: EdgeT[]; Q: EdgeT[]; P1: EdgeT[]; F: EdgeT[];
    m: ProblemMetrics; D: number; inter: number; errs: string[]; warns: string[];
  };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();

  for (const seed of SEEDS) {
    if (skuFilter && seed.sku !== skuFilter) continue;
    const lp = FOLD_LADDER[seed.sku];
    const n = lp.grid;
    const errs: string[] = [];
    const warns: string[] = [];
    const P = normalizeEdges(parsePaths(seed.pathsP));
    const Q = normalizeEdges(parsePaths(seed.pathsQ));
    const F = normalizeEdges([...P, ...Q]);
    const P1 = mirrorEdges(P, n, "v");
    const mP = computeMetrics(P, n);
    const mQ = computeMetrics(Q, n);
    const mF = computeMetrics(F, n);
    const probe: Problem = {
      id: `${seed.sku}-probe`, grid: { type: "square", n }, edges: P1, inputB: Q,
      metrics: mF,
      answer: { mode: "explicit", edges: F },
      gen: { kind: "manual" },
    };
    const D = taskDifficulty("fold", probe).value;
    const inter = interCrossings(P, Q);
    errs.push(...checkSeed(seed.sku, P, Q, F, mP, mQ, mF, D));
    errs.push(...validateProblem(probe));
    errs.push(...validateProblem({ ...probe, id: `${seed.sku}-probeF`, edges: F }));
    for (const [name, part] of [["P", P], ["Q", Q]] as const) {
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

    rows.push({ seed, P, Q, P1, F, m: mF, D, inter, errs, warns });
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
    console.log(
      `${status}${r.seed.label}`
      + `  P:線${computeMetrics(r.P, r.m.boardN ?? 4).lines} Q:線${computeMetrics(r.Q, r.m.boardN ?? 4).lines}`
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
      const n = FOLD_LADDER[r.seed.sku].grid;
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.sku}</span></div>
  ${svgTriple(r.P1, r.Q, r.P, n)}
  <div class="meta">D=${r.D}・絡み${r.inter}・交差${r.m.crossings}・非45° ${r.m.non45}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    const html = `<!doctype html><meta charset="utf-8"><title>fold モチーフ追加</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.pair{display:flex;gap:6px;justify-content:center;align-items:center;margin:6px 0}
.op{font-size:13px;color:#666;white-space:nowrap}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{background:#fffdf9;border:1px dashed #eee}
</style>
<h1>fold モチーフ追加（${rows.length}問）</h1>
<p style="font-size:13px;color:#666">問題1（黒）→おる 問題2（青）＝ 完成図。完成図の黒＝折ったあとの問題1（P）</p><div class="grid">${cards}</div>`;
    await fs.writeFile(previewPath, html, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 2;
    const cellW = 3 * ((6 - 1) * 24 + 24) + 150, cellH = (6 - 1) * 24 + 24 + 44;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgTriple(r.P1, r.Q, r.P, FOLD_LADDER[r.seed.sku].grid)
        .replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const bw = (svgs[0]?.match(/width="(\d+)"/) ?? [])[1];
      const board = Number(bw ?? 100);
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 34)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("")
        + `<text x="${board + 3}" y="${board / 2 + 5}" font-size="12" font-family="sans-serif">→おる</text>`
        + `<text x="${2 * board + 40}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">＝</text>`;
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
      schemaVersion: 1 as const, sku, task: "fold", candidates: [], seedCursor: 0,
    };
    let maxM = file.candidates.reduce((mx, c) => {
      const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
      return Math.max(mx, k);
    }, 0);
    for (const r of skuRows) {
      const base: Problem = {
        id: `${sku}-m${String(++maxM).padStart(2, "0")}`,
        grid: { type: "square", n: FOLD_LADDER[sku].grid },
        edges: r.P1,
        inputB: r.Q,
        answer: { mode: "explicit", edges: r.F },
        metrics: r.m,
        provenance: { source: "blank", createdAt: today, label: r.seed.label },
        gen: { kind: "manual" },
      };
      const problem = migrateProblem("fold", base);
      file.candidates.push({ ...problem, status: "pending" });
      console.log(`write ${problem.id}  ${r.seed.label}`);
    }
    await fs.writeFile(path.join(CAND_DIR, `${sku}.json`), JSON.stringify(file, null, 1), "utf8");
    console.log(`書き込み完了 → ${sku}.json（${skuRows.length} 問）`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
