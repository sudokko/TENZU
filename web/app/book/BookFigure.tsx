import { publishedSet } from "../products/problems/published";
import { edgeKey, type EdgeT } from "../products/problems/schema";

const S = 20;

/** 本に入っている問題を1問描く。show="sample" は見本、"task" は子が書き込む側（模写は点だけ、欠け補完は足りない線を抜いた形）。 */
export default function BookFigure({ sku, id, show = "sample" }: { sku: string; id: string; show?: "sample" | "task" }) {
  const p = publishedSet(sku)?.problems.find((q) => q.id === id);
  if (!p || p.grid.type !== "square") return null;
  const n = p.grid.n;
  const w = (n - 1) * S;
  let edges: EdgeT[] = p.edges;
  if (show === "task") {
    const gaps = p.answer?.mode === "explicit" ? new Set(p.answer.edges.map(edgeKey)) : null;
    edges = gaps ? p.edges.filter((e) => !gaps.has(edgeKey(e))) : [];
  }
  const lines = edges.map(([a, b]) => `M${a[0] * S} ${a[1] * S}L${b[0] * S} ${b[1] * S}`).join("");
  const dots = Array.from({ length: n * n }, (_, i) => `M${(i % n) * S} ${Math.floor(i / n) * S}h0`).join("");
  return <svg className="booklp-figure" viewBox={`-8 -8 ${w + 16} ${w + 16}`} aria-hidden="true">
    {lines && <path d={lines} fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />}
    <path d={dots} stroke="currentColor" strokeWidth={n < 5 ? 4.4 : 3.8} strokeLinecap="round" />
  </svg>;
}
