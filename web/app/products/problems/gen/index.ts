/* =========================================================================
   ジェネレータ・レジストリ
   atelier（一覧・SKU ページ・generate API）はここだけを見る。
   タスクごとの生成方式の違い（copy=ランダムウォーク / motif=モチーフ展開）を
   吸収し、UI には lines 帯と generate() の共通インタフェースだけを渡す。
   ========================================================================= */

import type { Candidate, Problem } from "../schema";
import { generateCandidates } from "./copy";
import { COPY_LADDER } from "./ladder";
import { generateMotifCandidates, MOTIF_LADDER } from "./motif";

export type GenerateOptions = {
  existing?: Pick<Candidate, "edges" | "status" | "gen">[];
  linesOverride?: number;
  /* 兄弟巻で生きている変種キー（motif のみ意味を持つ） */
  excludeVariants?: Set<string>;
};

export type SkuGenerator = {
  kind: "copy" | "motif";
  lines: [number, number];
  /* motif はライブラリが有限＝兄弟巻との重複排除が必要 */
  crossVolExclusive: boolean;
  generate(sku: string, seed: number, count: number, opts?: GenerateOptions): Problem[];
};

export function generatorFor(sku: string): SkuGenerator | null {
  const copy = COPY_LADDER[sku];
  if (copy) {
    return {
      kind: "copy",
      lines: copy.lines,
      crossVolExclusive: false,
      generate: (s, seed, count, opts) =>
        generateCandidates(
          s, seed, count,
          (opts?.existing ?? []).filter((c) => c.status !== "rejected").map((c) => c.edges),
          opts?.linesOverride,
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
  return null;
}
