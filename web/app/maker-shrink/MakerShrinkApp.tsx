"use client";

/* =========================================================================
   縮小メーカー（内部用・/maker-shrink）
   拡大メーカー（/maker-scale）の反対。F（もとの図）＋ 縮小率（×1/2・×1/3）で
   R = scale(F, 1/denom) を自動算出。割り算でなく「分数倍」＝拡大と同じ scalePoint を流用。
   - 縮小＝単位分数倍。固定点(始点=最初に置いた点)を不動点に 新点 = start + (1/denom)·(点 − start)
   - 自動補正なし（固定点は図形位置で切り替えない）。始点 = draw 順の先頭 edges[0].a。
   - 縮小は内側に縮むので枠は常に収まる。代わりに「格子に乗るか」をライブ判定
     （始点から奇数マスの点は 1/2 が半マスに落ちる）。乗らないと保存・PDF を抑止
   - 編集画面に「もとの図 ×1/N けっか」の 2 ペインを並べて結果をライブ表示
   - 保存問題は { gridSize, edges: F, factor }（factor=分母 2|3・アンカーは描画時に算出）
   - PDF/プレビューはもとの図ペイン=F・かくマスペイン=R（出題は空・解答は描き入れ）
   - 始点(★)を強調表示・F/R 同座標（縮小の不動点）。格子外れ時は結果ペイン非表示＋警告
   - 出題 PDF と解答 PDF を別々に書き出す（解答ページ上端に「かいとう」見出し）
   - 並びは答えに影響しない（紙面レイアウトだけ）
   ヘッダー・LP・フッターから動線なし。robots noindex。
   共通実装（盤面ジオメトリ・ページフレーム・PDF・UI シェル等）は maker/core/ を参照。
   ★（始点）マーカー・縦組み分数（×1/N）付きの描画は縮小固有のため本ファイルに残す。
   ========================================================================= */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  PAPER, paperMax, PRINT_INK, SCREEN_DOT, dotRadius, edgeWidth,
  type PaperKey, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { EdgeHitLayer, ModeToggle } from "../maker/erase";
import {
  AXIS_INK, VIEW, INK, dotPos, edgeKey, edgesEqual, pointKey, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import { buildPageSvgFrame, paneFrameSvgString, type LogoInfo } from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
import { ArrowSVG, PreviewPage, PrintPage } from "../maker/core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "../maker/core/useMakerEditor";
import { usePaperLayout } from "../maker/core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, MakerFootSns, NoteBox, OneStrokeSeg,
  PaperGroup, PerPageGroup, PreviewShell, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types & constants
// レイアウトエンジン（PAPER/gridFor/paneSize 等）は products/print.ts（SSOT）から import
// =========================================================================
type GridSize = 5 | 6 | 7 | 8; // 拡大と同じく 5×5〜8×8（偶数/大きめほど 1/2 が乗る点が多い）
type ShrinkFactor = 2 | 3; // 分母。×1/2（既定）/ ×1/3。乗数 = 1/denom

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  factor: ShrinkFactor; // この問題に焼き付けた分母（保存時に確定・格子に乗ることを検証済）
  selected: boolean;
};

/* 固定点(anchor)まわりの整数倍。anchor 自身は動かず、各点は anchor から factor 倍遠ざかる */
function scalePoint(p: Point, factor: number, anchor: Point): Point {
  return {
    c: anchor.c + factor * (p.c - anchor.c),
    r: anchor.r + factor * (p.r - anchor.r),
  };
}
function scaleEdgesOf(edges: Edge[], factor: number, anchor: Point): Edge[] {
  return edges.map((e) => ({ a: scalePoint(e.a, factor, anchor), b: scalePoint(e.b, factor, anchor) }));
}
function inGrid(edges: Edge[], n: number): boolean {
  return edges.every((e) => [e.a, e.b].every((p) => p.c >= 0 && p.c <= n - 1 && p.r >= 0 && p.r <= n - 1));
}

/* 全頂点が整数座標（格子点）に乗っているか。1/2 縮小は始点から奇数マスの点が
   半マス（点と点の間）に落ちるため、これを保存ゲートにする。 */
function onLattice(edges: Edge[]): boolean {
  const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
  return edges.every((e) => [e.a, e.b].every((p) => isInt(p.c) && isInt(p.r)));
}
/* 格子に乗ったら微小な浮動小数誤差を払ってドット直上へ。 */
function roundEdges(edges: Edge[]): Edge[] {
  const rp = (p: Point) => ({ c: Math.round(p.c), r: Math.round(p.r) });
  return edges.map((e) => ({ a: rp(e.a), b: rp(e.b) }));
}

/* 始点（最初に置いた点 edges[0].a）＝固定点。そこを不動点に 1/denom 倍するだけ（拡大の
   反対・分数倍）。自動補正なし：固定点は図形位置で切り替えない（仕様を明快に保つ）。
   縮小は内側に縮むので inGrid は常に真。実質チェックは onLattice（半マスに落ちないか）。
   外れても自動では動かさない（始点・分数・グリッドで人が調整）。 */
function computeShrink(edges: Edge[], denom: ShrinkFactor, n: number): { edges: Edge[]; star: Point | undefined; fits: boolean } {
  if (edges.length === 0) return { edges: [], star: undefined, fits: true };
  const start = edges[0].a; // 始点
  const R = scaleEdgesOf(edges, 1 / denom, start); // ← 分数乗数。scaleEdgesOf を流用
  const ok = onLattice(R) && inGrid(R, n);
  return { edges: ok ? roundEdges(R) : R, star: start, fits: ok };
}

/* 5 角星 SVG path 文字列。pos 中心・size=外接半径。dot に重ねて基準マーカーとして使う */
function starPathD(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.4;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
  }
  return d + "Z";
}

/* 1/den を縦組みで表示（分数表記・割り算記号は使わない）。
   maker.css を触らないためインライン style のみで自己完結。 */
function Frac({ den }: { den: number }) {
  return (
    <span aria-label={`1/${den}`} style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      lineHeight: 1, verticalAlign: "middle", fontSize: "0.78em",
    }}>
      <span>1</span>
      <span style={{ borderTop: "1px solid currentColor", padding: "1px 3px 0" }}>{den}</span>
    </span>
  );
}

/* opFracSvgString の JSX 版（印刷シート・サイドバープレビューの SVG 内で使用）。
   「×1/N」を (cx,cy) 中心に縦組み分数で描き、矢印と重ならないよう横幅を圧縮する。 */
function OpFrac({ cx, cy, fs, den, color }: { cx: number; cy: number; fs: number; den: number; color: string }) {
  const jp = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
  const g = fs * 0.42, mul = fs * 0.5, bar = fs * 0.42, sw = Math.max(0.2, fs * 0.05), gapx = fs * 0.1;
  const totalW = mul * 0.7 + gapx + bar;
  const leftX = cx - totalW / 2;
  const mulCx = leftX + mul * 0.35;
  const fracCx = leftX + mul * 0.7 + gapx + bar / 2;
  return (
    <g fill={color} fontWeight={700} style={{ fontFamily: jp }}>
      <text x={mulCx} y={cy + mul * 0.35} textAnchor="middle" fontSize={mul}>×</text>
      <text x={fracCx} y={cy - bar * 0.18} textAnchor="middle" fontSize={g}>1</text>
      <line x1={fracCx - bar / 2} y1={cy} x2={fracCx + bar / 2} y2={cy} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <text x={fracCx} y={cy + g + bar * 0.04} textAnchor="middle" fontSize={g}>{den}</text>
    </g>
  );
}

/* 内部用ツールのため完了画面のレコメンドは省略（copy 側のみ） */

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋縮小固有のセル描画。
// ★（始点）マーカーがペイン内の点を置換するため、ペイン描画は共通 paneSvgString
// でなく縮小ローカル実装のまま（byte-identical 維持）。
// =========================================================================

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
// starAt: その位置の点を ★ マーカーに置換（縮小の不動点を示す・showDots=false でも常に描画）
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
  dotScale: number, starAt?: Point, showDots: boolean = true,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = dotRadius(pane, dotScale);
  const starR = Math.max(dotR * 4.2, pane * 0.035); // 始点★（強調・大きめ）
  const labelFs = Math.max(2.2, pane * 0.058);
  const jpFont = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
  const lineW = edgeWidth(pane);
  let s = "";
  if (showLines) {
    for (const e of edges) {
      const a = P(e.a.c, e.a.r), b = P(e.b.c, e.b.r);
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${PRINT_INK}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const p = P(c, r);
      if (starAt && c === starAt.c && r === starAt.r) {
        const labelY = r === gridSize - 1 ? p.y - starR - labelFs * 0.3 : p.y + starR + labelFs;
        s += `<path d="${starPathD(p.x, p.y, starR)}" fill="${PRINT_INK}"/>`;
        s += `<text x="${p.x}" y="${labelY}" text-anchor="middle" font-family="${jpFont}" font-size="${labelFs}" font-weight="700" fill="${PRINT_INK}">きてん</text>`;
      } else if (showDots) {
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
      }
    }
  }
  return s;
}

/* もとの図⇔かくマスの境界に細線矢印（模写と同じ）。縮小の不動点は ★ マーカーの位置で示す */
function arrowSvgString(
  cx: number, cy: number, pane: number, gap: number, pair: PairLayout,
): string {
  const aSize = gap * 0.9;
  const hd = aSize * 0.3;
  const sw = Math.max(0.35, aSize * 0.04);
  if (pair === "horizontal") {
    return `<path d="M0 0 L${aSize} 0 M${aSize - hd} ${-hd} L${aSize} 0 L${aSize - hd} ${hd}" transform="translate(${cx + pane + (gap - aSize) / 2},${cy + pane / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  return `<path d="M0 0 L0 ${aSize} M${-hd} ${aSize - hd} L0 ${aSize} L${hd} ${aSize - hd}" transform="translate(${cx + pane / 2},${cy + pane + (gap - aSize) / 2})" fill="none" stroke="${PRINT_INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/* 「×1/N」を (cx,cy) 中心に縦組み分数で描く（string SVG・PDF/プレビュー用）。
   インライン "×1/2" は横長で矢印と重なるため、分数を縦組みにして横幅を 1 文字ぶんに圧縮する。
   cy は分数バー（＝全体の縦中心）の y。 */
function opFracSvgString(cx: number, cy: number, fs: number, denom: number, color: string): string {
  const jp = "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
  const g = fs * 0.42;          // 分子・分母の字サイズ
  const mul = fs * 0.5;         // × の字サイズ
  const bar = fs * 0.42;        // 分数バー幅（＝分数列の横幅）
  const sw = Math.max(0.2, fs * 0.05);
  const gapx = fs * 0.1;        // × と分数の間
  const totalW = mul * 0.7 + gapx + bar;
  const leftX = cx - totalW / 2;
  const mulCx = leftX + mul * 0.35;
  const fracCx = leftX + mul * 0.7 + gapx + bar / 2;
  let s = `<text x="${mulCx}" y="${cy + mul * 0.35}" text-anchor="middle" font-family="${jp}" font-size="${mul}" font-weight="700" fill="${color}">×</text>`;
  s += `<text x="${fracCx}" y="${cy - bar * 0.18}" text-anchor="middle" font-family="${jp}" font-size="${g}" font-weight="700" fill="${color}">1</text>`;
  s += `<line x1="${fracCx - bar / 2}" y1="${cy}" x2="${fracCx + bar / 2}" y2="${cy}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  s += `<text x="${fracCx}" y="${cy + g + bar * 0.04}" text-anchor="middle" font-family="${jp}" font-size="${g}" font-weight="700" fill="${color}">${denom}</text>`;
  return s;
}

export function buildPageSvg(opts: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  logo: LogoInfo | null;
  answer?: boolean; // true=解答ページ群（かくマス側に R 描画）
  noDots?: boolean; // true=背景の点をとる（出題時のみ、かくマス側に薄い枠を添える）
}): string {
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const fs = Math.max(3, gap * 0.6); // ×1/N ラベルの字サイズ

      const areaY = cy;
      const areaH = cellH;
      /* 出題と解答で同じペアレイアウトを共用。違いはかくマスペインの中身だけ。
         出題: もとの図=F＋★(不動点)／かくマス=空欄＋同じ★（子が描く目印）
         解答: もとの図=F＋★／かくマス=R＋同じ★（描き入れた状態）
         境界は標準の細線矢印＋「×1/N」ラベル */
      const sc = computeShrink(p.edges, p.factor, p.gridSize);
      const star = sc.star;
      const answerEdges = opts.answer ? sc.edges : [];
      const rightShow = Boolean(opts.answer);
      // 枠は「かくマスが空欄の出題時」のみ（解答時は R で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const ax = sx + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, star, showDots);
        body += paneSvgString(ax, sy, pane, p.gridSize, answerEdges, rightShow, dotScale, star, showDots);
        if (showFrame) body += paneFrameSvgString(ax, sy, pane);
        body += arrowSvgString(sx, sy, pane, gap, "horizontal");
        // 矢印の上に縦組み分数（矢じり半分 0.27·gap ＋ 分数の高さ 0.48·fs ＋ 余白で逃がす＝幅も圧縮）
        body += opFracSvgString(sx + pane + gap / 2, sy + pane / 2 - (gap * 0.27 + fs * 0.48 + 0.6), fs, p.factor, PRINT_INK);
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        const ay = sy + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, star, showDots);
        body += paneSvgString(sx, ay, pane, p.gridSize, answerEdges, rightShow, dotScale, star, showDots);
        if (showFrame) body += paneFrameSvgString(sx, ay, pane);
        body += arrowSvgString(sx, sy, pane, gap, "vertical");
        // 縦並びは矢印の右に縦組み分数
        body += opFracSvgString(sx + pane / 2 + fs * 1.15, sy + pane + gap / 2, fs, p.factor, PRINT_INK);
      }
      return body;
    },
  });
}

// =========================================================================
// Paper pane SVG (used both in canvas and PDF preview)
// ★（始点）が点そのものを置換するため、共通 PaperSVG でなく縮小ローカル実装。
// =========================================================================
function PaperSVG({
  gridSize,
  edges,
  selected,
  onDotClick,
  showLines,
  showActiveHighlight,
  ink = INK,
  dotScale = 1,
  starAt,
  starInk = "#2C6E7F",
  starLabel = true,
  onEdgeErase,
  erase = false,
  showDots = true,
  overlay,
}: {
  gridSize: GridSize;
  edges: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  dotScale?: number;
  starAt?: Point;
  starInk?: string;   // 始点★の色（画面=teal 強調 / 印刷経路=PRINT_INK）
  starLabel?: boolean; // 「きてん」ラベルを出すか（サムネは false）
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showDots?: boolean;         // false=背景ドットを描かない（★マーカーは常に描く）
  overlay?: React.ReactNode;  // 点を消したときの薄い枠など
}) {
  const dots = gridSize;
  const points: Point[] = [];
  for (let r = 0; r < dots; r++) {
    for (let c = 0; c < dots; c++) points.push({ c, r });
  }
  const interactive = !!onDotClick;
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      role={interactive ? "application" : "img"}
      aria-label="点描写の盤面"
    >
      {showLines &&
        edges.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={ink}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const isStar = starAt && p.c === starAt.c && p.r === starAt.r;
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight ? (isSel ? "#2C6E7F" : SCREEN_DOT) : ink;
        const starR = Math.max(1.6 * dotScale * 4.4, 8); // 始点★を大きく
        const lastRow = p.r === dots - 1;
        const labelY = lastRow ? pos.y - starR - 4 : pos.y + starR + 12;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {isStar
              ? <>
                  <circle cx={pos.x} cy={pos.y} r={starR * 1.5} fill={starInk} opacity={0.12} />
                  <path d={starPathD(pos.x, pos.y, starR)} fill={starInk} />
                  {starLabel && (
                    <text x={pos.x} y={labelY} textAnchor="middle" fontSize={12} fontWeight={700}
                      fill={starInk} style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>きてん</text>
                  )}
                </>
              : (showDots && <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />)}
            {interactive && !erase && (
              <circle
                cx={pos.x} cy={pos.y} r={9}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onDotClick?.(p)}
              />
            )}
          </g>
        );
      })}
      {overlay}
      {interactive && erase && onEdgeErase && (
        <EdgeHitLayer edges={edges} pos={(c, r) => dotPos(c, r, dots)} onErase={onEdgeErase} />
      )}
    </svg>
  );
}

// =========================================================================
// MakerShrinkApp
// =========================================================================
type Snap = { edges: Edge[] };

export default function MakerShrinkApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "shrink");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [edges, setEdges] = useState<Edge[]>([]); // F
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。
  const [oneStroke, setOneStroke] = useState(false);
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  /* 縮小率は独立選択（並びとは無関係に縮小図が決まる）。2 択: ×1/2 / ×1/3。保存時に問題へ焼き付ける */
  const [factor, setFactor] = useState<ShrinkFactor>(2);
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。★マーカーは残し、通常の点だけ消す。
  const [noDots, setNoDots] = useState(false);

  // history stack — F snapshots
  function applySnap(s: Snap) {
    setEdges(s.edges);
    setSelected(null);
  }
  const hist = useEditorHistory<Snap>({ edges: [] }, applySnap);

  function clearAll() {
    hist.pushHistory({ edges: [] });
    setEdges([]);
    setSelected(null);
  }

  function eraseEdge(i: number) {
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory({ edges: updated });
  }

  function handleDot(p: Point) {
    if (erase) return;
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    // 一筆書き ON: 線を引いた（消した）後、終点を次の線の始点として残す（連続描画）。
    // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
    const after = oneStroke ? p : null;
    if (edges.some((e) => edgeKey(e) === k)) {
      // 既存線をもう一度なぞる→消す
      const updated = edges.filter((e) => edgeKey(e) !== k);
      setEdges(updated);
      hist.pushHistory({ edges: updated });
      setSelected(after);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated);
    hist.pushHistory({ edges: updated });
    setSelected(after);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    hist.resetHistory({ edges: [] });
  }

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で上下/横を自動

  // ---- Derived: 現在編集中の図形の縮小結果（ライブ） ----
  const cur = useMemo(() => computeShrink(edges, factor, gridSize), [edges, factor, gridSize]);
  const resultEdges = cur.edges;
  const canSave = edges.length > 0 && cur.fits;
  const startPoint = edges.length > 0 ? edges[0].a : undefined; // 始点（最初に置いた点）＝固定点
  const resultStar = cur.fits ? cur.star : undefined;

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState, toggleSelectSaved, moveSaved, toggleSelectAll } = list;

  // 編集後/新規保存の共通リセット（キャンバスを空に戻す）
  function resetCanvas() {
    setEdges([]);
    setSelected(null);
    hist.resetHistory({ edges: [] });
  }
  function saveCurrent() {
    if (!canSave) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges, factor } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, factor, selected: true }]);
    setSavingNo((n) => n + 1);
    resetCanvas();
  }
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    const dirty = editingId
      ? (() => { const o = saved.find((x) => x.id === editingId); return !o || !edgesEqual(edges, o.edges); })()
      : edges.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    setGridSize(p.gridSize);
    setEdges(p.edges);
    setFactor(p.factor);
    setSelected(null);
    hist.resetHistory({ edges: p.edges });
    setEditingId(id);
    hist.rerender();
  }
  // 編集をやめて新規モードへ（変更は破棄）
  function cancelEdit() {
    setEditingId(null);
    resetCanvas();
  }
  function deleteSaved(id: string) {
    list.deleteSaved(id, () => { if (id === editingId) cancelEdit(); }); // 編集中の問題を消したら編集モードも解除
  }

  // ---- Derived: print payload ----
  // おまかせ = 選択数を 1 ページに（用紙上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  // おまかせ並び = 選択 2 問以下は上下（1 問でもスカスカに見えない）・3 問以上は横。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = chunkPages(selectedSaved, effectivePerPage);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* 出題（問題）と解答を別々の PDF に書き出す。
     分母は各問題に焼き付けた p.factor を使用（混在可） */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("shrink").catch(() => {}); return; }
    setExporting(mode);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
          answer: mode === "a",
          noDots,
        }),
        filename: (stamp) => `tenzu_shrink_${mode}_${stamp}.pdf`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  const editingTitle = editorTitle(saved, editingId);
  const paper = PAPER[paperKey];
  const frameStrokeWidth = Math.max(0.25, edgeWidth(VIEW) * 0.55);

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="縮小メーカー（内部用）" />

      {/* 内部用ツールのため完了画面なし */}
      <>
      {/* ============ APP SHELL ============ */}
      <div className="app-shell">

        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className={`canvas-toolbar${isEditing ? " editing" : ""}`}>
            <div className="title">
              {editingTitle}
            </div>
          </div>

          {/* 作図の設定（グリッド・縮小率・点の大きさ・一筆書き）をタイトル直下のコンパクト帯に集約 */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ"
                value={gridSize}
                disabled={isEditing}
                onChange={(e) => changeGridSize(Number(e.target.value) as GridSize)}>
                {([5, 6, 7, 8] as GridSize[]).map((n) => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
            </div>
            <ModeToggle erase={erase} onChange={changeErase} />
            <div className="qb-group">
              <span className="qb-label">縮小率</span>
              <div className="seg qb-seg" role="group" aria-label="縮小率">
                {([2, 3] as ShrinkFactor[]).map((f) => (
                  <button key={f} type="button"
                    aria-pressed={factor === f}
                    onClick={() => setFactor(f)}>
                    ×<Frac den={f} />
                  </button>
                ))}
              </div>
            </div>
            <DotSizeSeg value={dotSize} onChange={setDotSize} />
            <OneStrokeSeg value={oneStroke} onChange={setOneStroke} />
            {isEditing
              ? <span className="qb-note">編集中はグリッドは固定されます。</span>
              : oneStroke && <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>}
          </div>

          <div className="canvas-stage">
            {/* 戻る・進む・全消去 — 作図盤面の真上に（スマホで指の近く・2026-06-25） */}
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()} canClear={edges.length > 0} />
            {/* もとの図 ×1/N けっか の 3 要素（重ね/折りメーカーと同じ overlay-boards を流用） */}
            <div className="overlay-boards">
              <div className="overlay-board">
                <span className="ob-cap">もとの図（★＝始点）</span>
                <div className="paper-pane problem" aria-label="編集中の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edges}
                    selected={selected}
                    onDotClick={handleDot}
                    showLines={true}
                    showActiveHighlight={true}
                    dotScale={dotScale}
                    starAt={startPoint}
                    onEdgeErase={eraseEdge}
                    erase={erase}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op">×<Frac den={factor} /></div>
              <div className="overlay-board">
                <span className="ob-cap">縮小した図（じどう）</span>
                <div className="paper-pane" aria-label="縮小結果のプレビュー">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={resultEdges}
                    showLines={cur.fits}
                    ink={INK}
                    dotScale={dotScale}
                    starAt={resultStar}
                  />
                  <div className="pp-stamp">けっか</div>
                </div>
              </div>
            </div>

            {edges.length > 0 && !cur.fits && (
              <div role="alert" style={{
                width: "100%", maxWidth: 760,
                background: "#fdecec", border: "1px solid #e3a0a0", color: "#b33a3a",
                borderRadius: 8, padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
              }}>
                この分数では、点がマスにぴったり乗りません（半マスになります）。<br />
                始点から たて・よこ とも {factor === 2 ? "偶数" : "3 の倍数"} マス離れた点で描いてください。
              </div>
            )}

            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent} disabled={!canSave}>
                {isEditing ? "変更を保存" : "この問題を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>
                  やめる
                </button>
              )}
            </div>
            <div className="canvas-help">
              {isEditing ? (
                <>
                  <strong>保存済みの問題を編集中です。</strong>
                  線や始点・縮小率を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。
                </>
              ) : (
              <>
              <strong>最初に置いた点が「始点」（★）になります。</strong>
              ★は動きません。そこを固定して 1/{factor} に縮みます。
              線を引く＝点を 2 つクリック（同じ線をもう一度で消える）。
              始点から たて・よこ とも {factor === 2 ? "偶数" : "3 の倍数"}マス離れた点で描くと、ぴったり格子に乗ります。
              </>
              )}
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          {/* 保存パネルは共通 SavedPanel でなくローカル実装のまま
             （サムネ aria-label と番号バッジに ×1/N（縮小率）を含める縮小固有仕様のため） */}
          <div className="group">
            <h3>保存済みの問題</h3>
            {saved.length === 0 ? (
              <p className="saved-empty">
                まだ保存された問題はありません。<br />1 問作って「この問題を保存する」を押すと、ここに並びます。
              </p>
            ) : (
              <div className="saved-grid">
                {saved.map((p, i) => {
                  const num = (i + 1).toString().padStart(2, "0");
                  const sc = computeShrink(p.edges, p.factor, p.gridSize);
                  const beingEdited = editingId === p.id;
                  return (
                    <div className={`saved-cell${p.selected ? " sel" : ""}${beingEdited ? " editing" : ""}`} key={p.id}>
                      <button className="thumb" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label={`問題 ${num}（×1/${p.factor}）を PDF に含める`}
                        onClick={() => toggleSelectSaved(p.id)}>
                        <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true}
                          starAt={sc.star} starLabel={false} />
                      </button>
                      {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      {beingEdited && <span className="edit-mark" aria-hidden="true">編集中</span>}
                      <span className="cnum">{num} · ×1/{p.factor}</span>
                      {/* 編集・削除は大きいラベル付きボタンを横並び（角の極小×は廃止＝誤タップ対策・案B 2026-06-21） */}
                      <div className="cell-actions">
                        <button className="act-edit" type="button"
                          aria-label={`問題 ${num} を編集`}
                          aria-pressed={beingEdited}
                          onClick={() => startEdit(p.id)}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M10.5 2.5 L13.5 5.5 L5.5 13.5 L2.5 13.5 L2.5 10.5 Z"
                              fill="none" stroke="currentColor" strokeWidth="1.4"
                              strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                          <span className="lbl">{beingEdited ? "編集中" : "編集"}</span>
                        </button>
                        <button className="act-del" type="button" aria-label={`問題 ${num} を削除`}
                          onClick={() => {
                            if (window.confirm(`この問題（#${num}）を削除しますか？`)) deleteSaved(p.id);
                          }}>
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M 2.5 4.5 L 13.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 6 4.5 L 6 3 L 10 3 L 10 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M 4 4.5 L 5 13.5 L 11 13.5 L 12 4.5" stroke="currentColor" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                      </div>
                      <div className="order">
                        <button type="button" aria-label="ひとつ前へ" disabled={i === 0}
                          onClick={() => moveSaved(p.id, -1)}>‹</button>
                        <button type="button" aria-label="ひとつ後へ" disabled={i === saved.length - 1}
                          onClick={() => moveSaved(p.id, 1)}>›</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {saved.length > 0 && (
              <div className="saved-count">
                <div className="left">
                  <button className="chk-all" type="button"
                    role="checkbox" aria-checked={selectAllState}
                    aria-label="すべて選択" onClick={toggleSelectAll} />
                  <span>選択中 {selectedSaved.length} / {saved.length} 問</span>
                </div>
              </div>
            )}
          </div>

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: ${pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横" : "上下"} · 名前欄: ${nameField ? "あり" : "なし"} · 背景の点: ${noDots ? "なし" : "あり"}`}>
            <PaperGroup paperKey={paperKey} onSelect={selectPaper} />
            <PerPageGroup
              perPage={perPage}
              onAuto={() => setPerPage("auto")}
              onPick={setPerPage}
              paperKey={paperKey}
              pair={effectivePairLayout}
              marginMm={marginMm} />

            <div className="group">
              <h3>問題と書き込み欄の並び</h3>
              <div className="seg seg--pair" role="group" aria-label="問題と書き込み欄の並び">
                <button type="button"
                  aria-pressed={pairLayout === "auto"}
                  onClick={() => setPairLayout("auto")}>
                  おまかせ
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "horizontal"}
                  onClick={() => setPairLayout("horizontal")}>
                  <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>
                  横に並べる
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "vertical"}
                  onClick={() => setPairLayout("vertical")}>
                  <span className="seg-ic"><PairChipIcon pair="vertical" /></span>
                  上下に並べる
                </button>
              </div>
              {pairLayout === "auto" && (
                <p className="seg-hint">問題が 2 問までは上下、3 問以上は横に自動で並べます。</p>
              )}
            </div>

            <NameFieldGroup value={nameField} onChange={setNameField} />

            <div className="group">
              <h3>背景の点</h3>
              <label className="chk-row">
                <input type="checkbox" checked={noDots}
                  onChange={(e) => setNoDots(e.target.checked)} />
                <span>背景の点をとる</span>
              </label>
              <p className="seg-hint">
                もとの図・かくマスの点を消します（出題側）。★マーカーは残ります。かくマスには薄い枠だけが残ります。解答側は対象外です。
              </p>
            </div>
          </SettingsFold>

          <PreviewShell
            paperLabel={paper.label} paperW={paper.w} paperH={paper.h}
            isEmpty={selectedSaved.length === 0}
            foot={<>
              <span>合計 <strong>{selectedSaved.length} 問 / {pages.length} ページ</strong></span>
              <span>{paper.label} · {effectivePerPage} 問 / ページ</span>
            </>}
            after={
              <div className="export-actions">
                <button className="btn-export" type="button"
                  onClick={() => doExport("q")} disabled={selectedSaved.length === 0 || exporting !== false}>
                  {exporting === "q" ? "PDF を作成中…" : "問題をダウンロード"}
                  {exporting !== "q" && selectedSaved.length > 0 && (
                    <span className="x">{selectedSaved.length} 問 / {pages.length}p</span>
                  )}
                </button>
                <button className="btn-export" type="button"
                  onClick={() => doExport("a")} disabled={selectedSaved.length === 0 || exporting !== false}>
                  {exporting === "a" ? "PDF を作成中…" : "解答をダウンロード"}
                  {exporting !== "a" && selectedSaved.length > 0 && (
                    <span className="x">{selectedSaved.length} 問 / {pages.length}p</span>
                  )}
                </button>
              </div>
            }>
            {pages.map((page, pi) => (
              <PreviewPage key={pi}
                paper={paper}
                problems={page}
                pageNo={pi + 1}
                pageCount={pages.length}
                marginMm={marginMm}
                problemsPerPage={effectivePerPage}
                pairLayout={effectivePairLayout}
                nameField={nameField}
                dotScale={dotScale}
                renderCell={(p, { cellW, cellH, pane, gap, pairLayout: pair, dotScale: ds }) => {
                  const fs = Math.max(2.4, gap * 0.6);
                  let aX: number, aY: number, bX: number, bY: number;
                  /* 縮小: 境界に標準の細線矢印（模写と同じ）＋ ×1/N。縮小の不動点は ★ で示す */
                  let arrowEl: ReactNode;
                  let opEl: ReactNode;
                  if (pair === "horizontal") {
                    const pairW = pane * 2 + gap;
                    const startX = (cellW - pairW) / 2;
                    const startY = (cellH - pane) / 2;
                    aX = startX;                  aY = startY;
                    bX = startX + pane + gap;     bY = startY;
                    const aSize = gap * 0.9;
                    arrowEl = (
                      <ArrowSVG x={startX + pane + (gap - aSize) / 2} y={startY + pane / 2}
                        size={aSize} dir="right" color={PRINT_INK} />
                    );
                    opEl = (
                      <OpFrac cx={startX + pane + gap / 2} cy={startY + pane / 2 - (gap * 0.27 + fs * 0.48 + 0.6)}
                        fs={fs} den={p.factor} color={PRINT_INK} />
                    );
                  } else {
                    const pairH = pane * 2 + gap;
                    const startX = (cellW - pane) / 2;
                    const startY = (cellH - pairH) / 2;
                    aX = startX; aY = startY;
                    bX = startX; bY = startY + pane + gap;
                    const aSize = gap * 0.9;
                    arrowEl = (
                      <ArrowSVG x={startX + pane / 2} y={startY + pane + (gap - aSize) / 2}
                        size={aSize} dir="down" color={PRINT_INK} />
                    );
                    opEl = (
                      <OpFrac cx={startX + pane / 2 + fs * 1.15} cy={startY + pane + gap / 2}
                        fs={fs} den={p.factor} color={PRINT_INK} />
                    );
                  }
                  const sc = computeShrink(p.edges, p.factor, p.gridSize);
                  const star = sc.star;
                  return (
                    <>
                      <PreviewPane x={aX} y={aY} w={pane} h={pane}
                        gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} starAt={star}
                        showDots={!noDots} />
                      <PreviewPane x={bX} y={bY} w={pane} h={pane}
                        gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} starAt={star}
                        showDots={!noDots} frame={noDots} />
                      {arrowEl}
                      {opEl}
                    </>
                  );
                }} />
            ))}
          </PreviewShell>

          <NoteBox />
          <MakerFootSns />

        </aside>
      </div>

      {/* モバイル（≤1200px）専用・画面下固定の DL バー */}
      {selectedSaved.length > 0 && (
        <div className="mobile-export-bar">
          <button type="button" onClick={() => doExport("q")} disabled={exporting !== false}>
            {exporting === "q" ? "PDF を作成中…" : "問題をダウンロード"}
            {exporting !== "q" && (
              <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
            )}
          </button>
          <button type="button" onClick={() => doExport("a")} disabled={exporting !== false}>
            {exporting === "a" ? "PDF を作成中…" : "解答をダウンロード"}
            {exporting !== "a" && (
              <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
            )}
          </button>
        </div>
      )}
      </>

      {/* ============ PRINT-ONLY SHEETS ============ */}
      <div className="print-only" aria-hidden="true">
        {pages.map((page, pi) => (
          <PrintPage key={pi}
            paper={paper}
            problems={page}
            pageNo={pi + 1}
            pageCount={pages.length}
            marginMm={marginMm}
            problemsPerPage={effectivePerPage}
            pairLayout={effectivePairLayout}
            nameField={nameField}
            renderPair={(p) => (
              <ProblemPair p={p} pairLayout={effectivePairLayout} dotScale={dotScale}
                noDots={noDots} frameStrokeWidth={frameStrokeWidth} />
            )} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// 縮小固有のプレビュー/印刷サブコンポーネント
// （★＝始点マーカーが点を置換するため、共通 PreviewPane でなくローカル実装）
// =========================================================================
// noDots=true で背景ドットを省き（★マーカーは残す）、かくマス側にだけ薄い正方形の枠を重ねる。
function ProblemPair({ p, pairLayout, dotScale, noDots, frameStrokeWidth }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; noDots: boolean; frameStrokeWidth: number;
}) {
  const isH = pairLayout === "horizontal";
  const sc = computeShrink(p.edges, p.factor, p.gridSize);
  const star = sc.star;
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK} dotScale={dotScale} starAt={star} starInk={PRINT_INK}
            showDots={!noDots} />
        </div>
      </div>
      {/* 模写と同じ標準の細線矢印＋「×1/N」 */}
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <OpFrac cx={14} cy={7} fs={8.5} den={p.factor} color={PRINT_INK} />
            <path d="M2 13 L38 13 M28 6 L38 13 L28 20"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <OpFrac cx={15} cy={18} fs={8.5} den={p.factor} color={PRINT_INK} />
            <path d="M8 2 L8 38 M1 28 L8 38 L15 28"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題 PDF と同じく解答ペインは空。縮小の起点だけ ★ で示す */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} starAt={star}
            showDots={!noDots}
            overlay={noDots ? (
              <rect x={VIEW * 0.02} y={VIEW * 0.02} width={VIEW * 0.96} height={VIEW * 0.96}
                fill="none" stroke={AXIS_INK} strokeWidth={frameStrokeWidth} />
            ) : undefined} />
        </div>
      </div>
    </>
  );
}

function PreviewPane({
  x, y, w, h, gridSize, edges, showLines, dotScale, starAt, showDots = true, frame = false,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean; dotScale: number;
  starAt?: Point;
  showDots?: boolean; // false=背景ドットを描かない（★マーカーは常に描く）
  frame?: boolean;    // true=薄い正方形の枠を添える
}) {
  // inner dots
  const dots = gridSize;
  const inset = Math.min(w, h) * 0.10;
  const stepX = (w - inset * 2) / (dots - 1);
  const stepY = (h - inset * 2) / (dots - 1);
  // 印刷（paneSvgString）と同じ比率 — プレビュー＝仕上がり
  const dotR = dotRadius(Math.min(w, h), dotScale);
  const paneMin = Math.min(w, h);
  const starR = Math.max(dotR * 4.2, paneMin * 0.035);
  const labelFs = Math.max(2.0, paneMin * 0.058);
  const lineW = edgeWidth(paneMin);
  const pos = (c: number, r: number) => ({
    x: x + inset + c * stepX,
    y: y + inset + r * stepY,
  });
  return (
    <g>
      <g fill={PRINT_INK}>
        {Array.from({ length: dots }, (_, r) =>
          Array.from({ length: dots }, (_, c) => {
            const p = pos(c, r);
            if (starAt && c === starAt.c && r === starAt.r) {
              const labelY = r === dots - 1 ? p.y - starR - labelFs * 0.3 : p.y + starR + labelFs;
              return (
                <g key={`s-${c}-${r}`}>
                  <path d={starPathD(p.x, p.y, starR)} />
                  <text x={p.x} y={labelY} textAnchor="middle" fontSize={labelFs} fontWeight={700}
                    style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>きてん</text>
                </g>
              );
            }
            return showDots ? <circle key={`${c}-${r}`} cx={p.x} cy={p.y} r={dotR} /> : null;
          })
        )}
      </g>
      {frame && (
        <rect x={x + paneMin * 0.02} y={y + paneMin * 0.02}
          width={w - paneMin * 0.04} height={h - paneMin * 0.04}
          fill="none" stroke={AXIS_INK} strokeWidth={Math.max(0.25, lineW * 0.55)} />
      )}
      {showLines && edges.map((e, i) => {
        const a = pos(e.a.c, e.a.r);
        const b = pos(e.b.c, e.b.r);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={PRINT_INK} strokeWidth={lineW}
          strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  );
}
