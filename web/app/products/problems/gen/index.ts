/* =========================================================================
   ジェネレータ・レジストリ
   atelier（一覧・SKU ページ・generate API）はここだけを見る。
   タスクごとの生成方式の違い（copy=ランダムウォーク / motif=モチーフ展開）を
   吸収し、UI には lines 帯と generate() の共通インタフェースだけを渡す。
   ========================================================================= */

import type { Candidate, Problem } from "../schema";
import { generateCopyCandidates, COPY_LADDER } from "./copy";
import { generateMotifCandidates, MOTIF_LADDER } from "./motif";
import { generateMirrorCandidates, MIRROR_LADDER } from "./mirror";
import { generateFillCandidates, FILL_LADDER } from "./fill";

export type GenerateOptions = {
  existing?: Pick<Candidate, "edges" | "status" | "gen">[];
  linesOverride?: number;
  /* fill のみ: 抜く線分の本数を固定（linesOverride は完成図の線分本数を指す） */
  gapOverride?: number;
  /* 兄弟巻で生きている変種キー（motif のみ意味を持つ） */
  excludeVariants?: Set<string>;
};

export type SkuGenerator = {
  kind: "copy" | "motif" | "mirror" | "fill";
  /* 完成図の線分本数レンジ（検品ツールの「線分の本数」セレクタ範囲） */
  lines: [number, number];
  /* fill のみ: 欠け本数レンジ（「欠けの本数」セレクタ範囲） */
  gapLines?: [number, number];
  /* motif/copy はライブラリが有限＝兄弟巻との重複排除が必要 */
  crossVolExclusive: boolean;
  /* copy はライブラリ全件ロード方式（追加生成/線本数セレクタなし・seed 固定で冪等） */
  loadAll?: boolean;
  generate(sku: string, seed: number, count: number, opts?: GenerateOptions): Problem[];
};

export function generatorFor(sku: string): SkuGenerator | null {
  const copy = COPY_LADDER[sku];
  if (copy) {
    return {
      kind: "copy",
      // copy は D 窓方式で band lines を廃止＋ loadAll（線本数セレクタ非表示・AtelierApp §291）。
      // この範囲は UI に出ず未消費だが型のため全巻の線分本数スパンを概値で持つ。
      lines: [2, 36],
      crossVolExclusive: true,
      loadAll: true,
      generate: (s, seed, count, opts) =>
        generateCopyCandidates(
          s, seed, count,
          opts?.existing ?? [],          // gen/status 込みで渡す（変種重複排除のため）
          opts?.linesOverride,
          opts?.excludeVariants,
        ),
    };
  }
  const motif = MOTIF_LADDER[sku];
  if (motif) {
    return {
      kind: "motif",
      lines: motif.lines,
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateMotifCandidates(
          s, seed, count,
          opts?.existing ?? [],
          opts?.linesOverride,
          opts?.excludeVariants,
        ),
    };
  }
  const mirror = MIRROR_LADDER[sku];
  if (mirror) {
    return {
      kind: "mirror",
      lines: mirror.lines,
      crossVolExclusive: false,
      generate: (s, seed, count, opts) =>
        generateMirrorCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
        ),
    };
  }
  const fill = FILL_LADDER[sku];
  if (fill) {
    return {
      kind: "fill",
      lines: fill.lines,        // 線分の本数（完成図）
      gapLines: fill.missing,   // 欠けの本数
      crossVolExclusive: false,
      generate: (s, seed, count, opts) =>
        generateFillCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,   // 線分の本数
          opts?.gapOverride,     // 欠けの本数
        ),
    };
  }
  return null;
}
