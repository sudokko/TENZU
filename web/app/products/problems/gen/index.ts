/* =========================================================================
   ジェネレータ・レジストリ
   atelier（一覧・SKU ページ・generate API）はここだけを見る。
   タスクごとの生成方式の違い（copy=ランダムウォーク / motif=モチーフ展開）を
   吸収し、UI には lines 帯と generate() の共通インタフェースだけを渡す。
   ========================================================================= */

import type { Candidate, Problem } from "../schema";
import { generateCopyCandidates, COPY_LADDER } from "./copy";
import { generateMirrorCandidates, MIRROR_LADDER } from "./mirror";
import { generateFillCandidates, FILL_LADDER } from "./fill";
import { generateTranslateCandidates, TRANSLATE_LADDER } from "./translate";
import { generateRotateCandidates, ROTATE_LADDER } from "./rotate";
import { generateOverlayCandidates, OVERLAY_LADDER } from "./overlay";
import { generateDecomposeCandidates, DECOMPOSE_LADDER } from "./decompose";
import { generateFoldCandidates, FOLD_LADDER } from "./fold";

export type GenerateOptions = {
  existing?: Pick<Candidate, "edges" | "status" | "gen" | "answer">[];
  linesOverride?: number;
  /* fill のみ: 抜く線分の本数を固定（linesOverride は完成図の線分本数を指す） */
  gapOverride?: number;
  /* 兄弟巻で生きている変種キー（copy/motif/rotate＝crossVolExclusive のタスク） */
  excludeVariants?: Set<string>;
  /* 兄弟巻で生きている形シグネチャ（変種キーの補完＝別キー同形を塞ぐ。rotate が使う） */
  excludeShapeSigs?: Set<string>;
};

export type SkuGenerator = {
  kind: "copy" | "motif" | "mirror" | "fill" | "translate" | "rotate" | "overlay" | "decompose" | "fold";
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
  const translate = TRANSLATE_LADDER[sku];
  if (translate) {
    return {
      kind: "translate",
      lines: translate.lines,
      // 兄弟巻と同じ形を移動量違いで再売しない（形シグネチャで除外。
      // translate の variant は `key@dc,dr` 形式のためキー除外は使わない）
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateTranslateCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
          opts?.excludeShapeSigs,
        ),
    };
  }
  const rotate = ROTATE_LADDER[sku];
  if (rotate) {
    return {
      kind: "rotate",
      lines: rotate.lines,
      // 兄弟巻と同じ形を角度違いで再売しない（同一 4×4 の右回り/左回り巻が
      // ほぼ同じ形集合になるのを防ぐ）。変種キー＝ライブラリ/小箱キーで除外
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateRotateCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
          opts?.excludeVariants,
          opts?.excludeShapeSigs,
        ),
    };
  }
  const overlay = OVERLAY_LADDER[sku];
  if (overlay) {
    return {
      kind: "overlay",
      lines: overlay.lines, // 1 図あたり（A・B 各パート）の線本数帯
      // 兄弟巻と同じ完成図を分割違いで再売しない（形シグネチャ除外・decisions §3.68）
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateOverlayCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
          opts?.excludeShapeSigs,
        ),
    };
  }
  const decompose = DECOMPOSE_LADDER[sku];
  if (decompose) {
    return {
      kind: "decompose",
      lines: decompose.lines, // 1 図あたり（こたえ・引くもの各パート）の線本数帯
      // 兄弟巻＋かさねの完成図を再売しない（route が両タスクの sig を渡す・§3.73）
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateDecomposeCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
          opts?.excludeShapeSigs,
        ),
    };
  }
  const fold = FOLD_LADDER[sku];
  if (fold) {
    return {
      kind: "fold",
      lines: fold.lines, // 1 図あたり（問題1・問題2 各パート）の線本数帯
      // 兄弟巻＋かさね・分解の完成図を再売しない（route が 3 タスクの sig を渡す・§3.74）
      crossVolExclusive: true,
      generate: (s, seed, count, opts) =>
        generateFoldCandidates(
          s, seed, count,
          // fold の「完成図」は answer 側＝重複照合には answer.edges を渡す
          (opts?.existing ?? [])
            .filter((c) => c.status !== "rejected")
            .map((c) => (c.answer?.mode === "explicit" && c.answer.edges.length > 0 ? c.answer.edges : c.edges)),
          opts?.linesOverride,
          opts?.excludeShapeSigs,
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
