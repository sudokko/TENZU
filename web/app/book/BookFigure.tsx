import { publishedSet } from "../products/problems/published";

const S = 20;

/** 本に入っている問題を1問、見本の姿で描く。sku と問題 id は公開済み JSON から引く。 */
export default function BookFigure({ sku, id }: { sku: string; id: string }) {
  const p = publishedSet(sku)?.problems.find((q) => q.id === id);
  if (!p || p.grid.type !== "square") return null;
  const n = p.grid.n;
  const w = (n - 1) * S;
  const lines = p.edges.map(([a, b]) => `M${a[0] * S} ${a[1] * S}L${b[0] * S} ${b[1] * S}`).join("");
  const dots = Array.from({ length: n * n }, (_, i) => `M${(i % n) * S} ${Math.floor(i / n) * S}h0`).join("");
  return <svg className="booklp-figure" viewBox={`-8 -8 ${w + 16} ${w + 16}`} aria-hidden="true">
    <path d={lines} fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
    <path d={dots} stroke="currentColor" strokeWidth={n < 5 ? 4.4 : 3.8} strokeLinecap="round" />
  </svg>;
}
