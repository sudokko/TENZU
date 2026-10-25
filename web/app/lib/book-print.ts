import { BOOK_VOLUMES } from "../book/hajimete/catalog";
import { volBySku } from "../products/data";
import { publishedSet } from "../products/problems/published";
import { toRenderProblems, type RenderProblem } from "../products/problems/render";
import type { SolidEdge } from "../products/problems/schema";

export type BookPrintVolume = {
  sku: string;
  grid: string;
  from: number;
  to: number;
  problems?: RenderProblem[];
  solidProblems?: { cols: number; rows: number; edges: SolidEdge[] }[];
};

/** 書籍に収録した巻だけ。書籍コードで他の有料商品を開放しない。
 * 巻の中は本と同じく難易度Dの低い順（同点は元の順）に並べ、本の問題番号と揃える。 */
export function bookPrintVolume(sku: string): BookPrintVolume | null {
  const entry = BOOK_VOLUMES.find((v) => v.sku === sku);
  if (!entry) return null;
  const source = publishedSet(sku) ?? (entry.standIn ? publishedSet(entry.standIn) : undefined);
  if (!source || source.problems.length !== 12) throw new Error("Book print source is unavailable");
  const order = source.problems.map((p, i) => ({ p, i })).sort((a, b) => (a.p.difficulty?.value ?? 0) - (b.p.difficulty?.value ?? 0) || a.i - b.i);
  const set = { ...source, problems: order.map((o) => o.p) };
  const metadata = { sku, grid: volBySku(sku)?.vol.grid ?? entry.grid, from: entry.from, to: entry.to };
  if (set.task === "solid") {
    return { ...metadata, solidProblems: set.problems.map((problem) => {
      if (problem.grid.type !== "solid") throw new Error("Invalid book solid source");
      return { cols: problem.grid.cols, rows: problem.grid.rows, edges: problem.solidEdges ?? [] };
    }) };
  }
  return { ...metadata, problems: toRenderProblems(set) };
}
