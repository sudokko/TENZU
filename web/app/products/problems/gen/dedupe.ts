/* =========================================================================
   かぶり除外 — 模写（copy）で公開済みの図形を他タスクの生成から弾く。
   fill / mirror は copy と同じ形ライブラリ（allVariants）から F を引くため、
   published/copy-*.json に載った図形が別タスクの候補として再登場し得る。
   形シグネチャ＝原点寄せ（移動不変）した unit 辺キーの整列結合。
   盤面サイズが違っても同じ図形なら一致する（大きい盤面での再出題も かぶり扱い）。
   公開済み以外（candidates 止まり）のかぶりは許容（オーナー判断 2026-07-01）。
   ========================================================================= */
import type { EdgeT } from "../schema";
import { edgeKey, normalizeEdge } from "../schema";
import { PUBLISHED } from "../published";

export function shapeSignature(edges: EdgeT[]): string {
  let cMin = Infinity, rMin = Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]);
    rMin = Math.min(rMin, p[1]);
  }
  return edges
    .map((e) => edgeKey(normalizeEdge([
      [e[0][0] - cMin, e[0][1] - rMin],
      [e[1][0] - cMin, e[1][1] - rMin],
    ] as EdgeT)))
    .sort()
    .join("|");
}

/* 左右反転（v ミラー）した形のシグネチャ。鏡タスクでは「こたえペインに公開済みの
   図形が現れる」かぶりも弾くために使う。 */
export function mirroredShapeSignature(edges: EdgeT[]): string {
  return shapeSignature(edges.map((e) => [
    [-e[0][0], e[0][1]], [-e[1][0], e[1][1]],
  ] as EdgeT));
}

let cache: Set<string> | null = null;

/* 模写の公開済み図形（published/copy-*）のシグネチャ集合。モジュール寿命でメモ化
   （published は静的レジストリ・dev 中に publish したら再起動/再コンパイルで反映）。 */
export function publishedCopySignatures(): Set<string> {
  if (cache) return cache;
  cache = new Set<string>();
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("copy-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      cache.add(shapeSignature(p.edges));
    }
  }
  return cache;
}
