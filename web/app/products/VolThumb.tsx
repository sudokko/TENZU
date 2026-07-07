/* =========================================================================
   巻カードの設問サムネイル（/products/{task} 一覧・TaskListPage 用）
   published 問題データの 1 問目（出題順の先頭）をカード内 SVG で描画する。
   published/{sku}.json を再発行すれば 1 問目は自動で追随（ビルド時に静的解決）。
   - fill: 欠け図 G＝F∖R を実線・欠け線 R を薄い点線で見せる（設問の姿そのまま）
   - mirror: みほん F ＋ 右側に鏡面の点線（印刷紙面の見せ方と同じ語彙）
   - solid: 矩形点格子＋隠れ辺は点線
   - 準備中（scaffold）・未入稿の live 巻: 白紙の点格子だけ＝「枠」
   ========================================================================= */

import { publishedSet } from "./problems/published";
import { edgeKey, type EdgeT, type SolidEdge } from "./problems/schema";
import type { Vol } from "./data";

const INK = "#3A424E";
const DOT = "#A9AFB9";
const DOT_BLANK = "#C9CED6";   // 白紙枠の点（ひかえめ）
const GAP_INK = "#C4C9D1";     // fill の欠け線（薄い点線）
const AXIS_INK = "#9AA0AA";    // 鏡面の点線（SkuPrintPreview と同色）

const PAD = 12;
const SPAN = 76;

function pos(i: number, n: number): number {
  return PAD + (SPAN * i) / Math.max(1, n - 1);
}

/* ---- 正方格子（copy/fill/mirror ほか square タスク共通） ---- */
function SquareThumb({ n, edges, gapEdges, mirror, blank }: {
  n: number; edges: EdgeT[]; gapEdges?: EdgeT[]; mirror?: boolean; blank?: boolean;
}) {
  const w = mirror ? 108 : 100;
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      dots.push(<circle key={`${c}-${r}`} cx={pos(c, n)} cy={pos(r, n)} r={2.3}
        fill={blank ? DOT_BLANK : DOT} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${w} 100`} aria-hidden="true">
      {dots}
      {edges.map((e, k) => (
        <line key={k}
          x1={pos(e[0][0], n)} y1={pos(e[0][1], n)}
          x2={pos(e[1][0], n)} y2={pos(e[1][1], n)}
          stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      ))}
      {gapEdges?.map((e, k) => (
        <line key={`g${k}`}
          x1={pos(e[0][0], n)} y1={pos(e[0][1], n)}
          x2={pos(e[1][0], n)} y2={pos(e[1][1], n)}
          stroke={GAP_INK} strokeWidth={2.2} strokeDasharray="3 2.6" strokeLinecap="round" />
      ))}
      {mirror && (
        <line x1={103} y1={10} x2={103} y2={90}
          stroke={AXIS_INK} strokeWidth={1.6} strokeDasharray="3 2.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* ---- 立体の矩形点格子（隠れ辺＝点線） ---- */
function SolidThumb({ cols, rows, edges, blank }: {
  cols: number; rows: number; edges: SolidEdge[]; blank?: boolean;
}) {
  const step = SPAN / Math.max(1, Math.max(cols, rows) - 1);
  const ox = (100 - step * (cols - 1)) / 2;
  const oy = (100 - step * (rows - 1)) / 2;
  const px = (c: number) => ox + step * c;
  const py = (r: number) => oy + step * r;
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(<circle key={`${c}-${r}`} cx={px(c)} cy={py(r)} r={1.7}
        fill={blank ? DOT_BLANK : DOT} />);
    }
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {dots}
      {edges.map((e, k) => (
        <line key={k}
          x1={px(e.a.c)} y1={py(e.a.r)} x2={px(e.b.c)} y2={py(e.b.r)}
          stroke={INK} strokeWidth={2.2} strokeLinecap="round"
          strokeDasharray={e.style === "dashed" ? "3 2.4" : undefined} />
      ))}
    </svg>
  );
}

/* ---- 白紙枠（準備中・未入稿）: vol.grid から点格子だけ描く ---- */
function BlankThumb({ vol, taskSlug }: { vol: Vol; taskSlug: string }) {
  if (taskSlug === "solid") return <SolidThumb cols={7} rows={7} edges={[]} blank />;
  const m = vol.grid.match(/^(\d+)×(\d+)/);
  const n = m ? Math.min(7, Math.max(3, Number(m[1]))) : 4;
  return <SquareThumb n={n} edges={[]} blank />;
}

export default function VolThumb({ vol, taskSlug }: { vol: Vol; taskSlug: string }) {
  const set = vol.status === "live" ? publishedSet(vol.sku) : undefined;
  const p = set?.problems[0];

  let inner: React.ReactNode;
  if (p && p.grid.type === "solid") {
    inner = <SolidThumb cols={p.grid.cols} rows={p.grid.rows} edges={p.solidEdges ?? []} />;
  } else if (p && p.grid.type === "square") {
    let edges = p.edges;
    let gapEdges: EdgeT[] | undefined;
    if (taskSlug === "fill" && p.answer?.mode === "explicit") {
      const rKeys = new Set(p.answer.edges.map(edgeKey));
      gapEdges = p.answer.edges;
      edges = p.edges.filter((e) => !rKeys.has(edgeKey(e)));
    }
    const mirror = p.answer?.mode === "derived" && p.answer.transform.type === "mirror";
    inner = <SquareThumb n={p.grid.n} edges={edges} gapEdges={gapEdges} mirror={mirror} />;
  } else {
    inner = <BlankThumb vol={vol} taskSlug={taskSlug} />;
  }

  return <div className="plp-card-fig">{inner}</div>;
}
