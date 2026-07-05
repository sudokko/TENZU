/* =========================================================================
   メーカー共通・盤面ジオメトリ（純 TS・React 非依存）
   全メーカー（正方格子）で byte-identical だった点・辺ユーティリティの単一ソース。
   立体（solid）は Edge に style を持つ独自型のため対象外（maker-solid 参照）。
   ========================================================================= */

export type Point = { c: number; r: number };
export type Edge = { a: Point; b: Point };

export const VIEW = 200;
// Soft ink color — used for all drawn dots/lines/labels in panes (printable side).
// UI chrome (toolbar buttons, etc.) stays at the original --fg.
export const INK = "#3A424E";
// 軸線・鏡面などの薄色（SkuPrintPreview と同色）
export const AXIS_INK = "#9AA0AA";

export function pointKey(p: Point) { return `${p.c},${p.r}`; }

export function samePoint(a: Point | null, b: Point | null) {
  return !!a && !!b && a.c === b.c && a.r === b.r;
}

export function edgeKey(e: Edge) {
  const [a, b] = [e.a, e.b].sort((p, q) => p.c - q.c || p.r - q.r);
  return `${a.c},${a.r}-${b.c},${b.r}`;
}

// 2つの辺集合が同一か（順序無視）。編集中の「未保存変更あり」判定に使う。
export function edgesEqual(a: Edge[], b: Edge[]) {
  if (a.length !== b.length) return false;
  const ka = new Set(a.map(edgeKey));
  return b.every((e) => ka.has(edgeKey(e)));
}

export function dotPos(c: number, r: number, dots: number) {
  if (dots <= 1) return { x: VIEW / 2, y: VIEW / 2 };
  const inset = VIEW * 0.10;
  const step = (VIEW - inset * 2) / (dots - 1);
  return { x: inset + c * step, y: inset + r * step };
}

export function uid(prefix = "p_") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}
