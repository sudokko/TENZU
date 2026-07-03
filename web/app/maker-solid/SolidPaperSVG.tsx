// =========================================================================
// 立体模写の対話盤面 SVG（MakerSolidApp から抽出・atelier 検品でも共有）
//   cols×rows の点・辺（実線=見える辺 / 点線=かくれた辺）・選択点ハイライト・
//   辺クリック反転／削除。点間隔は固定で cols/rows が増えると viewBox が広がる。
// 純粋な描画コンポーネント（フックなし・onClick はすべて props 経由）。
// =========================================================================
import { SCREEN_DOT } from "../products/print";
import type { SEdge, SPoint } from "./solid-print";

export type Point = SPoint;
export type Edge = SEdge;

const INK = "#3A424E";        // 線（見える辺・点線）はしっかり濃く
const ACCENT = "#2C6E7F";     // 選択点ハイライト（格子ドットは SCREEN_DOT）
// 盤面 SVG（viewBox）の 1 セル幅と外周余白。点間隔は固定。
export const E_STEP = 12;
export const E_INSET = 14;
export function editorVB(cols: number, rows: number) {
  return { vw: E_INSET * 2 + (cols - 1) * E_STEP, vh: E_INSET * 2 + (rows - 1) * E_STEP };
}
export function pointKey(p: Point) { return `${p.c},${p.r}`; }

export function SolidPaperSVG({
  cols, rows, edges, selected, tool = "draw", onDotClick, onEdgeClick, showLines, interactive, dotScale = 1,
}: {
  cols: number;
  rows: number;
  edges: Edge[];
  selected?: Point | null;
  tool?: "draw" | "erase";
  onDotClick?: (p: Point) => void;
  onEdgeClick?: (i: number) => void;
  showLines: boolean;
  interactive?: boolean;
  dotScale?: number;
}) {
  const erasing = tool === "erase";
  const { vw, vh } = editorVB(cols, rows);
  const step = E_STEP;
  const pos = (c: number, r: number) => ({ x: E_INSET + c * step, y: E_INSET + r * step });
  const hitR = Math.max(3, Math.min(9, step * 0.45));
  // 点・選択点・ハイライト輪は模写メーカー（PaperSVG）と同じ基準（1.6·scale / 4 / 7）。
  const dotR = Math.min(1.6 * dotScale, step * 0.42);
  const selR = Math.min(4, step * 0.5);
  const ringR = Math.min(7, step * 0.9);
  const dash = `${(step * 0.55).toFixed(2)} ${(step * 0.4).toFixed(2)}`;
  const points: Point[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) points.push({ c, r });
  // 消すモード＝常に辺クリック可（線の削除）。描くモード＝線分の途中でないときだけ（スタイル反転）。
  const canEdgeClick = !!(interactive && onEdgeClick && (erasing || !selected));
  // 描くモードのときだけ点で線を引く。消すモードでは点は触れない（クリックは線へ通す）。
  const canDotClick = !!(interactive && onDotClick && !erasing);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
      role={interactive ? "application" : "img"}
      aria-label="立体模写の盤面"
    >
      {/* 1. 格子ドット（薄灰）— 最下層。線が上に来るのでドットで線が途切れない。 */}
      {points.map((p) => {
        const ps = pos(p.c, p.r);
        return <circle key={pointKey(p)} cx={ps.x} cy={ps.y} r={dotR} fill={SCREEN_DOT} />;
      })}
      {/* 2. 線（見える辺・点線）— ドットの上 */}
      {showLines && edges.map((e, i) => {
        const a = pos(e.a.c, e.a.r), b = pos(e.b.c, e.b.r);
        return (
          <line key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={INK} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={e.style === "dashed" ? dash : undefined}
          />
        );
      })}
      {/* 3. 選択中の点のハイライト — 線の上（操作の焦点を見せる） */}
      {selected && (() => {
        const ps = pos(selected.c, selected.r);
        return (
          <>
            <circle cx={ps.x} cy={ps.y} r={ringR} fill={ACCENT} opacity={0.18} />
            <circle cx={ps.x} cy={ps.y} r={selR} fill={ACCENT} />
          </>
        );
      })()}
      {/* 4. クリック判定（透明）— 最前面。辺クリック（消す/反転）＋点クリック（描く）。 */}
      {canEdgeClick && edges.map((e, i) => {
        const a = pos(e.a.c, e.a.r), b = pos(e.b.c, e.b.r);
        return (
          <line key={`hit${i}`}
            className={erasing ? "erase-hit" : undefined}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="transparent" strokeWidth={Math.max(erasing ? 6 : 4, step * (erasing ? 0.7 : 0.5))}
            strokeLinecap="round"
            style={{ cursor: "pointer" }}
            onClick={() => onEdgeClick?.(i)}
          />
        );
      })}
      {canDotClick && points.map((p) => {
        const ps = pos(p.c, p.r);
        return (
          <circle key={`dh${pointKey(p)}`} cx={ps.x} cy={ps.y} r={hitR} fill="transparent"
            style={{ cursor: "pointer" }} onClick={() => onDotClick?.(p)} />
        );
      })}
    </svg>
  );
}
