/* =========================================================================
   Truchet タイルエンジン（織り／迷路風パターン）
   盤面を u×u セルに分割し、各セルに seed で斜めタイル（主対角 / or 反対角 \）を
   割り付けて盤面いっぱいの織り模様を作る。任意で格子線を重ねる。セル単位で full-grid
   を構造保証・seed 決定的。出力は copy.ts の ShapeVariant 型。
   ========================================================================= */

import type { EdgeT } from "../schema";
import { edgeKey, normalizeEdges } from "../schema";
import { randInt, seededRng, type Rng } from "./rng";
import type { ShapeVariant } from "./copy";

/* span を割り切るセルサイズ（セル数 2 以上） */
function cellSizes(span: number): number[] {
  const out: number[] = [];
  for (let u = 1; u <= span / 2; u++) if (span % u === 0) out.push(u);
  return out;
}

function tiling(rnd: Rng, span: number, u: number, withGrid: boolean): EdgeT[] {
  const edges: EdgeT[] = [];
  if (withGrid) {
    for (let c = 0; c <= span; c += u) edges.push([[c, 0], [c, span]]);
    for (let r = 0; r <= span; r += u) edges.push([[0, r], [span, r]]);
  }
  for (let i = 0; i < span; i += u) for (let j = 0; j < span; j += u) {
    const t = randInt(rnd, 0, 2); // 0=主対角 1=反対角 2=両方（まれ）
    if (t !== 1) edges.push([[i, j], [i + u, j + u]]);
    if (t !== 0) edges.push([[i + u, j], [i, j + u]]);
  }
  return normalizeEdges(edges);
}

export function generateTruchetVariants(n: number, seed = 1, attempts = 120): ShapeVariant[] {
  const span = n - 1;
  const us = cellSizes(span);
  if (us.length === 0) return [];
  const rnd = seededRng(`truchet#${n}#${seed}`);
  const out: ShapeVariant[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < attempts; i++) {
    const u = us[randInt(rnd, 0, us.length - 1)];
    const withGrid = rnd() < 0.5;
    const full = tiling(rnd, span, u, withGrid);
    const sig = full.map(edgeKey).sort().join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      key: `truchet#${n}#${seed}-${i}/0`, name: "おりもの", family: "truchet",
      edges: full, spanC: span, spanR: span,
    });
  }
  return out;
}
