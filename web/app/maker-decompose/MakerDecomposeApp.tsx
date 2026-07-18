"use client";

/* =========================================================================
   分解メーカー（内部用・/maker-decompose）
   かさね(overlay)の逆。重なった全体「正解の図」から片方「引くもの」を
   取り除いた残り（こたえ）を子に描かせる新タスク（data.ts slug=decompose・
   group C「重ねる・分ける」・answerMode=explicit）。
   - 編集は3キャンバス: 正解の図(C) 編集・引くもの(B) 編集・こたえ結果プレビュー（読み取り専用）
   - 保存問題は { gridSize, edgesA(=正解の図), edgesB(=引くもの) }
   - こたえ = C ∖ B（C の辺のうち B に無いもの＝集合差）
   - 結果プレビューは のこり=墨 / 取り除く線=teal で色分け（目視確認用・印刷は単色）
   - PDF/プレビューは 正解の図・引くもの・空欄を一列に。連結記号は − と ＝
   - 解答 PDF を別出力（用紙MAX・空欄に C∖B を描き込み・「かいとう」見出し）
   ヘッダー・LP・フッターから動線なし。robots noindex。
   レイアウトエンジン（PAPER/gridFor/paneSize）は products/print.ts（SSOT）を
   panes=3 で呼ぶ。ベース＝重ねメーカー（/maker-overlay・∪ を ∖ に差し替え）。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  PAPER, COUNT_OPTIONS, paperMax, gridFor, PRINT_INK, SCREEN_DOT, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout,
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
import { buildPageSvgFrame, paneFrameSvgString, paneSvgString, type LogoInfo } from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
import { PreviewPage, PreviewPane } from "../maker/core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "../maker/core/useMakerEditor";
import { usePaperLayout } from "../maker/core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, NoteBox, OneStrokeSeg,
  PaperGroup, SavedPanel, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types & constants
// =========================================================================
type GridSize = 3 | 4 | 5 | 6;
type Board = "A" | "B"; // A=正解の図 / B=引くもの

/* edgesA=正解の図（重なった全体 C）／edgesB=引くもの（取り除く片方 B）。
   こたえは描画時に C ∖ B（C の辺で B に無いもの）を算出する。 */
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edgesA: Edge[];
  edgesB: Edge[];
  selected: boolean;
};

type Snap = { edgesA: Edge[]; edgesB: Edge[] };

// 結果プレビューで「取り除く線」を示す teal（編集プレビューのみ・印刷は常に単色 PRINT_INK）
const INK_B = "#2C6E7F";
// 引くもの編集の下敷きに薄く出す「正解の図 C」のゴースト色（なぞって引くためのガイド・編集時のみ）
const GHOST_INK = "#3A424E";
const GHOST_OPACITY = 0.2;

/* 辺を「単位線分」（格子上の隣接点をつなぐ最小の線）へ分解する。
   長い線や、視覚的に重なるが端点が違う線どうしを、重なりで判定できるようにするため。
   例: (2,0)-(2,3) → (2,0)-(2,1) / (2,1)-(2,2) / (2,2)-(2,3) の 3 本。 */
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function unitSegments(e: Edge): Edge[] {
  const dc = e.b.c - e.a.c, dr = e.b.r - e.a.r;
  const g = gcd(Math.abs(dc), Math.abs(dr));
  if (g <= 1) return [e]; // これ以上分割できない（既に最小）
  const sc = dc / g, sr = dr / g;
  const segs: Edge[] = [];
  for (let i = 0; i < g; i++) {
    segs.push({
      a: { c: e.a.c + sc * i, r: e.a.r + sr * i },
      b: { c: e.a.c + sc * (i + 1), r: e.a.r + sr * (i + 1) },
    });
  }
  return segs;
}
/* こたえ＝C∖B／取り除く線＝C∩B を「単位線分」レベルで計算。
   B の線が C の線に視覚的に重なっていれば（端点が完全一致でなくても）その重なり部分を取り除く。
   C のどの単位線分とも重ならない B の線は無効＝こたえにも取り除きにも出ない。 */
function diffEdges(edgesA: Edge[], edgesB: Edge[]): { answer: Edge[]; removed: Edge[] } {
  const bUnits = new Set(edgesB.flatMap(unitSegments).map(edgeKey));
  const answer: Edge[] = [];
  const removed: Edge[] = [];
  for (const e of edgesA) {
    for (const u of unitSegments(e)) {
      (bUnits.has(edgeKey(u)) ? removed : answer).push(u);
    }
  }
  return { answer, removed };
}

/* 連結記号 − / ＝ — 細い SVG ストローク（中心 x,y）。React 用とPDF文字列用で同形。
   並びの流れに合わせて 90°回転（横並び=水平／縦並び=垂直）。重ね・折り重ねと同規約。 */
function opGlyphPath(x: number, y: number, size: number, kind: "minus" | "eq", vertical = false): string {
  const s = size / 2;
  const g = size * 0.24;
  if (kind === "minus") {
    return vertical
      ? `M${x} ${y - s} L${x} ${y + s}`
      : `M${x - s} ${y} L${x + s} ${y}`;
  }
  return vertical
    ? `M${x - g} ${y - s} L${x - g} ${y + s} M${x + g} ${y - s} L${x + g} ${y + s}`
    : `M${x - s} ${y - g} L${x + s} ${y - g} M${x - s} ${y + g} L${x + s} ${y + g}`;
}
function OpGlyph({ x, y, size, kind, color, vertical }: {
  x: number; y: number; size: number; kind: "minus" | "eq"; color: string; vertical?: boolean;
}) {
  return (
    <path d={opGlyphPath(x, y, size, kind, vertical)} fill="none" stroke={color}
      strokeWidth={Math.max(0.4, size * 0.1)} strokeLinecap="round" />
  );
}
function opGlyphSvgString(x: number, y: number, size: number, kind: "minus" | "eq", color: string, vertical = false): string {
  return `<path d="${opGlyphPath(x, y, size, kind, vertical)}" fill="none" stroke="${color}" stroke-width="${Math.max(0.4, size * 0.1)}" stroke-linecap="round"/>`;
}

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋分解固有のセル描画。
// panes=3 共有。連結記号は − / ＝。
// =========================================================================
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
  answer?: boolean; // true=解答ページ群（空欄ペインに C∖B を描画）
  noDots?: boolean; // true=背景の点をとる（出題時のみ、こたえペインに薄い枠を添える）
}): string {
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    panes: 3,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const opSize = gap * 0.5;
      const areaY = cy;
      const areaH = cellH;
      /* 出題: ペイン1=正解の図／ペイン2=引くもの／ペイン3=空欄（子が残りを描く）
         解答: ペイン3に C∖B を描き込み。連結記号は − / ＝（共通） */
      const resultEdges = opts.answer ? diffEdges(p.edgesA, p.edgesB).answer : [];
      const showResult = Boolean(opts.answer);
      // 枠は「こたえペインが空欄の出題時」のみ（解答時は線で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const blockW = pane * 3 + gap * 2;
        const sx = cx + (cellW - blockW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const x2 = sx + pane + gap;
        const x3 = sx + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale, showDots);
        body += paneSvgString(x2, sy, pane, p.gridSize, p.edgesB, true, dotScale, showDots);
        body += paneSvgString(x3, sy, pane, p.gridSize, resultEdges, showResult, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(x3, sy, pane);
        body += opGlyphSvgString(sx + pane + gap / 2, sy + pane / 2, opSize, "minus", PRINT_INK);
        body += opGlyphSvgString(x2 + pane + gap / 2, sy + pane / 2, opSize, "eq", PRINT_INK);
      } else {
        const blockH = pane * 3 + gap * 2;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - blockH) / 2;
        const y2 = sy + pane + gap;
        const y3 = sy + 2 * (pane + gap);
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edgesA, true, dotScale, showDots);
        body += paneSvgString(sx, y2, pane, p.gridSize, p.edgesB, true, dotScale, showDots);
        body += paneSvgString(sx, y3, pane, p.gridSize, resultEdges, showResult, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(sx, y3, pane);
        body += opGlyphSvgString(sx + pane / 2, sy + pane + gap / 2, opSize, "minus", PRINT_INK, true);
        body += opGlyphSvgString(sx + pane / 2, y2 + pane + gap / 2, opSize, "eq", PRINT_INK, true);
      }
      return body;
    },
  });
}

// =========================================================================
// Paper pane SVG（分解固有・core PaperSVG では再現不能なため温存）
// ghostEdges で「正解の図 C」の薄い下敷き（引くもの編集ガイド）、
// edgesB で「取り除く線」を teal 点線（strokeDasharray）で重ね描きする。
// =========================================================================
function PaperSVG({
  gridSize,
  edges,
  edgesB,
  ghostEdges,
  selected,
  onDotClick,
  onEdgeErase,
  erase = false,
  showLines,
  showActiveHighlight,
  ink = INK,
  inkB = INK_B,
  dotScale = 1,
  showDots = true,
  overlay,
}: {
  gridSize: GridSize;
  edges: Edge[];
  edgesB?: Edge[];
  ghostEdges?: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  inkB?: string;
  dotScale?: number;
  showDots?: boolean;          // false=背景ドットを描かない（図形模写トライアル）
  overlay?: React.ReactNode;   // 点を消したときの薄い枠など
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
      {/* ゴースト（正解の図 C の下敷き・最背面・編集ガイド）。なぞると上に本線が乗る */}
      {showLines && ghostEdges &&
        ghostEdges.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line key={`g${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={GHOST_INK} strokeWidth="1.6" opacity={GHOST_OPACITY}
              strokeLinecap="round" strokeLinejoin="round"
            />
          );
        })}
      {showLines &&
        edges.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line key={`a${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={ink} strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
            />
          );
        })}
      {showLines && edgesB &&
        edgesB.map((e, i) => {
          const a = dotPos(e.a.c, e.a.r, dots);
          const b = dotPos(e.b.c, e.b.r, dots);
          return (
            <line key={`b${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={inkB} strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="4 3"
            />
          );
        })}
      {points.map((p) => {
        const pos = dotPos(p.c, p.r, dots);
        const isSel = samePoint(selected ?? null, p);
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight ? (isSel ? "#2C6E7F" : SCREEN_DOT) : ink;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {showDots && <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />}
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
// MakerDecomposeApp
// =========================================================================
export default function MakerDecomposeApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "decompose");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edgesA, setEdgesA] = useState<Edge[]>([]); // 正解の図（全体 C）
  const [edgesB, setEdgesB] = useState<Edge[]>([]); // 引くもの（取り除く片方 B）
  const [selectedA, setSelectedA] = useState<Point | null>(null);
  const [selectedB, setSelectedB] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。両ボード（正解の図 A・引くもの B）に効く。
  const [oneStroke, setOneStroke] = useState(false);
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelectedA(null); setSelectedB(null); }
  // 引くもの(B)で「正解の図(C)に無い線」を引こうとしたときの一時警告
  const [bWarn, setBWarn] = useState(false);
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。出題時のみこたえペインに薄い枠を残す。
  const [noDots, setNoDots] = useState(false);

  // history stack — { edgesA, edgesB } snapshots（A/B 両ボード共通）
  function applySnap(s: Snap) {
    setEdgesA(s.edgesA);
    setEdgesB(s.edgesB);
    setSelectedA(null);
    setSelectedB(null);
  }
  const hist = useEditorHistory<Snap>({ edgesA: [], edgesB: [] }, applySnap);

  function clearAll() {
    hist.pushHistory({ edgesA: [], edgesB: [] });
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    setBWarn(false);
  }

  function eraseEdge(board: Board, i: number) {
    const isA = board === "A";
    const edges = isA ? edgesA : edgesB;
    const setEdges = isA ? setEdgesA : setEdgesB;
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
  }

  function handleDot(board: Board, p: Point) {
    if (erase) return;
    const isA = board === "A";
    const selected = isA ? selectedA : selectedB;
    const setSelected = isA ? setSelectedA : setSelectedB;
    const edges = isA ? edgesA : edgesB;
    const setEdges = isA ? setEdgesA : setEdgesB;
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    let updated: Edge[];
    if (edges.some((e) => edgeKey(e) === k)) {
      // 既存線をもう一度なぞる→消す
      updated = edges.filter((e) => edgeKey(e) !== k);
    } else {
      // 引くもの(B)は 正解の図(C) に「重なる」線をなぞって取り除く（端点が完全一致でなくてもよい）。
      // C のどの単位線分とも重ならない線は こたえ に反映されないので、引かせずに警告する。
      if (!isA) {
        const cUnits = new Set(edgesA.flatMap(unitSegments).map(edgeKey));
        const overlapsC = unitSegments(next).some((u) => cUnits.has(edgeKey(u)));
        if (!overlapsC) {
          setSelected(oneStroke ? p : null);
          setBWarn(true);
          return;
        }
      }
      updated = [...edges, next];
    }
    setBWarn(false);
    setEdges(updated);
    hist.pushHistory(isA ? { edgesA: updated, edgesB } : { edgesA, edgesB: updated });
    // 一筆書き ON: 線を引いた後、終点をこのボードの次の始点として残す（連続描画）。
    // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
    setSelected(oneStroke ? p : null);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    hist.resetHistory({ edgesA: [], edgesB: [] });
  }

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で縦/横を自動

  /* こたえ（のこり）= C∖B／取り除く線 = C∩B（検品用の本数表示と結果プレビューに使う） */
  const { answer: answerEdges, removed: removedEdges } = useMemo(
    () => diffEdges(edgesA, edgesB),
    [edgesA, edgesB],
  );

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  // 編集後/新規保存の共通リセット（両ボード・選択・履歴を空に戻す）
  function resetCanvas() {
    setEdgesA([]);
    setEdgesB([]);
    setSelectedA(null);
    setSelectedB(null);
    setBWarn(false);
    hist.resetHistory({ edgesA: [], edgesB: [] });
  }
  function saveCurrent() {
    if (edgesA.length === 0) return; // 正解の図（全体）が無ければ問題にならない
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edgesA, edgesB } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edgesA, edgesB, selected: true }]);
    setSavingNo((n) => n + 1);
    resetCanvas();
  }
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    // dirty 判定: 編集中は保存フィールド（A/B どちらか）が元と異なるか、新規は作りかけがあるか。
    const dirty = editingId
      ? (() => {
          const o = saved.find((x) => x.id === editingId);
          return !o || !edgesEqual(edgesA, o.edgesA) || !edgesEqual(edgesB, o.edgesB);
        })()
      : edgesA.length > 0 || edgesB.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    // 元図形（A）・引くもの（B）・グリッドを全て復元。active 選択は既定（未選択）へ。
    setGridSize(p.gridSize);
    setEdgesA(p.edgesA);
    setEdgesB(p.edgesB);
    setSelectedA(null);
    setSelectedB(null);
    setBWarn(false);
    hist.resetHistory({ edgesA: p.edgesA, edgesB: p.edgesB });
    setEditingId(id);
    hist.rerender();
  }
  // 編集をやめて新規モードへ（変更は破棄）
  function cancelEdit() {
    setEditingId(null);
    resetCanvas();
  }

  // ---- Derived: print payload ----
  // おまかせ = 選択数を 1 ページに（用紙上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(paperMax(paperKey), selectedSaved.length))
    : perPage;
  // おまかせ並び = 選択 2 問以下は縦一列（1 問でもスカスカに見えない）・3 問以上は横一列。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = useMemo(
    () => chunkPages(selectedSaved, effectivePerPage),
    [selectedSaved, effectivePerPage]);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* 出題 PDF と解答 PDF を別々に出力。
     mode="q"=出題ページ群（空欄）／mode="a"=解答ページ群（空欄ペインに C∖B を描き込み）。 */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("decompose").catch(() => {}); return; }
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
        filename: (stamp) => `tenzu_decompose_${mode}_${stamp}.pdf`,
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
      <MakerHeader appName="分解メーカー（内部用）" />

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

          {/* 作図の設定（グリッド・点の大きさ・一筆書き）をタイトル直下のコンパクト帯に集約 */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ" value={gridSize}
                disabled={isEditing}
                onChange={(e) => changeGridSize(Number(e.target.value) as GridSize)}>
                {([3, 4, 5, 6] as GridSize[]).map((n) => (
                  <option key={n} value={n}>{n}×{n}</option>
                ))}
              </select>
            </div>
            <ModeToggle erase={erase} onChange={changeErase} />
            <DotSizeSeg value={dotSize} onChange={setDotSize} />
            <OneStrokeSeg value={oneStroke} onChange={setOneStroke} />
            {isEditing
              ? <span className="qb-note">編集中はグリッドは固定されます。</span>
              : oneStroke
                ? <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>
                : null}
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()}
              canClear={edgesA.length > 0 || edgesB.length > 0} />
            <div className="paper-pair-label">問題（正解の図 − 引くもの ＝ のこり）</div>
            <div className="overlay-boards">
              <div className="overlay-board">
                <div className="ob-cap">正解の図（ぜんたい）</div>
                <div className="paper-pane problem" aria-label="正解の図 の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edgesA}
                    selected={selectedA}
                    onDotClick={(p) => handleDot("A", p)}
                    onEdgeErase={(i) => eraseEdge("A", i)}
                    erase={erase}
                    showLines={true}
                    showActiveHighlight={true}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op" aria-hidden="true">−</div>
              <div className="overlay-board">
                <div className="ob-cap">引くもの（うすい線をなぞる）</div>
                <div className="paper-pane problem" aria-label="引くもの の盤面">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={edgesB}
                    ghostEdges={edgesA}
                    selected={selectedB}
                    onDotClick={(p) => handleDot("B", p)}
                    onEdgeErase={(i) => eraseEdge("B", i)}
                    erase={erase}
                    showLines={true}
                    showActiveHighlight={true}
                  />
                  <div className="pp-stamp">{gridSize}×{gridSize}</div>
                </div>
              </div>
              <div className="overlay-op" aria-hidden="true">＝</div>
              <div className="overlay-board">
                <div className="ob-cap">こたえ（のこり）</div>
                <div className="paper-pane" aria-label="こたえ（正解の図から引くものを取り除いた残り）">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={answerEdges}
                    edgesB={removedEdges}
                    showLines={true}
                  />
                </div>
              </div>
            </div>
            {bWarn && (
              <p className="trace-warn" role="alert">
                引くものは「正解の図」に重なる線をなぞって取り除きます。図に重ならない線はこたえに反映されません。
              </p>
            )}
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={edgesA.length === 0}>
                {isEditing ? "変更を保存" : "この問題を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>
                  やめる
                </button>
              )}
            </div>
            <div className="canvas-help">
              {isEditing
                ? "保存済みの問題を編集中です。正解の図・引くものを直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : <>
                    「正解の図」に全体（重なった形）を引きます（点を 2 つクリック／同じ線をもう一度クリックで消えます）。
                    「引くもの」には<b>正解の図がうすく下敷き表示</b>されるので、取り去る線をなぞって引きます。
                    右の「こたえ（のこり）」＝正解の図から引くものを取り除いた残りが仕上がり（<b>青い点線＝取り除く線</b>・こたえには出ません）。
                    印刷では「正解の図 − 引くもの ＝ 空欄」が一列に並び、空欄に残りを描かせます。
                  </>}
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          <SavedPanel
            saved={saved}
            editingId={editingId}
            selectAllState={selectAllState}
            selectedCount={selectedSaved.length}
            onToggle={list.toggleSelectSaved}
            onEdit={startEdit}
            onDelete={(id) => list.deleteSaved(id, () => { if (id === editingId) cancelEdit(); })}
            onMove={list.moveSaved}
            onToggleAll={list.toggleSelectAll}
            renderThumb={(p) => (
              /* サムネは「正解の図 − 引くもの」の2枚セットで見分けやすく */
              <span className="thumb-pair">
                <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} />
                <span className="tp-op" aria-hidden="true">−</span>
                <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} />
              </span>
            )}
          />

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: ${pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横一列" : "縦一列"} · 名前欄: ${nameField ? "あり" : "なし"} · 背景の点: ${noDots ? "なし" : "あり"}`}>

            <PaperGroup paperKey={paperKey} onSelect={selectPaper} />

            {/* 1 ページに何問 — ミニ図は panes=3 の gridFor で組む（共通 PerPageGroup は 2 ペイン前提） */}
            <div className="group">
              <h3>1 ページに何問</h3>
              <div className="layout-grid" role="group" aria-label="1ページあたりの問題数">
                <button type="button"
                  aria-pressed={perPage === "auto"}
                  onClick={() => setPerPage("auto")}>
                  <span className="lauto">おまかせ</span>
                </button>
                {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => {
                  const g = gridFor(v, effectivePairLayout, paper.w, paper.h, marginMm, 3);
                  return (
                  <button key={v} type="button"
                    aria-pressed={perPage === v}
                    onClick={() => setPerPage(v)}>
                    <span className="ldiagram"
                      style={{
                        gridTemplateColumns: `repeat(${g.cols}, 1fr)`,
                        gridTemplateRows:    `repeat(${g.rows}, 1fr)`,
                      }}>
                      {Array.from({ length: g.cols * g.rows }, (_, i) => <span key={i} />)}
                    </span>
                    <span className="lnum">{v} 問</span>
                  </button>
                  );
                })}
              </div>
            </div>

            <div className="group">
              <h3>式の並び</h3>
              <div className="seg seg--pair" role="group" aria-label="式の並び">
                <button type="button"
                  aria-pressed={pairLayout === "auto"}
                  onClick={() => setPairLayout("auto")}>
                  おまかせ
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "horizontal"}
                  onClick={() => setPairLayout("horizontal")}>
                  <span className="seg-ic"><PairChipIcon pair="horizontal" /></span>
                  横一列
                </button>
                <button type="button"
                  aria-pressed={pairLayout === "vertical"}
                  onClick={() => setPairLayout("vertical")}>
                  <span className="seg-ic"><PairChipIcon pair="vertical" /></span>
                  縦一列
                </button>
              </div>
              {pairLayout === "auto" && (
                <p className="seg-hint">問題が 2 問までは縦一列、3 問以上は横一列に自動で並べます。</p>
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
                正解の図・引くもの・こたえの点を消します（出題側）。こたえの欄には薄い枠だけが残ります。解答側は対象外です。
              </p>
            </div>
          </SettingsFold>

          <div className="group">
            <h3>出力プレビュー（解答）<span className="pp-paperinfo">{paper.label} · {paper.w}×{paper.h}mm</span></h3>
            <div className="pdf-preview">
              {selectedSaved.length === 0 ? (
                <div className="pp-empty">
                  選択した問題が、ここに並びます。
                </div>
              ) : (
                <>
                  <div className="pp-pages">
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
                        panes={3}
                        renderCell={(p, { cellW, cellH, pane, gap, pairLayout, dotScale }) => {
                          const opSize = gap * 0.5;
                          // 出力プレビュー＝解答（ペイン3に C∖B）
                          const answer = diffEdges(p.edgesA, p.edgesB).answer;
                          let p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number };
                          let minus: { x: number; y: number }, eq: { x: number; y: number };
                          if (pairLayout === "horizontal") {
                            const blockW = pane * 3 + gap * 2;
                            const startX = (cellW - blockW) / 2;
                            const startY = (cellH - pane) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX + pane + gap, y: startY };
                            p3 = { x: startX + 2 * (pane + gap), y: startY };
                            minus = { x: startX + pane + gap / 2, y: startY + pane / 2 };
                            eq = { x: startX + 2 * pane + gap + gap / 2, y: startY + pane / 2 };
                          } else {
                            const blockH = pane * 3 + gap * 2;
                            const startX = (cellW - pane) / 2;
                            const startY = (cellH - blockH) / 2;
                            p1 = { x: startX, y: startY };
                            p2 = { x: startX, y: startY + pane + gap };
                            p3 = { x: startX, y: startY + 2 * (pane + gap) };
                            minus = { x: startX + pane / 2, y: startY + pane + gap / 2 };
                            eq = { x: startX + pane / 2, y: startY + 2 * pane + gap + gap / 2 };
                          }
                          return (
                            <>
                              <PreviewPane x={p1.x} y={p1.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesA} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <PreviewPane x={p2.x} y={p2.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={p.edgesB} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <PreviewPane x={p3.x} y={p3.y} w={pane} h={pane}
                                gridSize={p.gridSize} edges={answer} showLines={true} dotScale={dotScale}
                                showDots={!noDots} />
                              <OpGlyph x={minus.x} y={minus.y} size={opSize} kind="minus" color={PRINT_INK} vertical={pairLayout === "vertical"} />
                              <OpGlyph x={eq.x} y={eq.y} size={opSize} kind="eq" color={PRINT_INK} vertical={pairLayout === "vertical"} />
                            </>
                          );
                        }} />
                    ))}
                  </div>
                  <div className="pp-foot">
                    <span>合計 <strong>{selectedSaved.length} 問 / {pages.length} ページ</strong></span>
                    <span>{paper.label} · {effectivePerPage} 問 / ページ</span>
                  </div>
                </>
              )}
            </div>
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
          </div>

          <NoteBox />

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
            dotScale={dotScale}
            noDots={noDots}
            frameStrokeWidth={frameStrokeWidth} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// Sub-components: ProblemTriple & PrintPage（3 セル・panes=3 の印刷シート）
// ※ 共通 PrintPage は 2 ペイン（print-problem pair-*）で DOM が異なるため、
//   3 セル（triple クラス）の印刷シートはメーカー固有のまま残す。
// =========================================================================
// noDots=true で背景ドットを省き、こたえペイン（出題＝空欄）にだけ薄い正方形の枠を重ねる。
function ProblemTriple({ p, dotScale, noDots, frameStrokeWidth }: {
  p: Problem; dotScale: number; noDots: boolean; frameStrokeWidth: number;
}) {
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesA} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true">−</div>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edgesB} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
      <div className="print-op" aria-hidden="true">＝</div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題なので結果ペインは空（子が描く）。解答は PDF 側へ */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots}
            overlay={noDots ? (
              <rect x={VIEW * 0.02} y={VIEW * 0.02} width={VIEW * 0.96} height={VIEW * 0.96}
                fill="none" stroke={AXIS_INK} strokeWidth={frameStrokeWidth} />
            ) : undefined} />
        </div>
      </div>
    </>
  );
}

function PrintPage({
  paper, problems, pageNo, pageCount, marginMm, problemsPerPage, pairLayout, nameField, dotScale,
  noDots, frameStrokeWidth,
}: {
  paper: typeof PAPER[PaperKey];
  problems: Problem[];
  pageNo: number;
  pageCount: number;
  marginMm: number;
  problemsPerPage: number;
  pairLayout: PairLayout;
  nameField: boolean;
  dotScale: number;
  noDots: boolean;
  frameStrokeWidth: number;
}) {
  const layout = gridFor(problemsPerPage, pairLayout, paper.w, paper.h, marginMm, 3);
  // Gaps shrink as the page gets denser (gap比例化, print side).
  const dense = problemsPerPage <= 4 ? "8mm" : problemsPerPage <= 8 ? "5mm" : "3mm";
  return (
    <div className="print-page" style={{
      width: `${paper.w}mm`,
      height: `${paper.h}mm`,
    }}>
      <div className="print-page-inner">
        {nameField && (
          <div className="print-nameband" aria-hidden="true">
            <span className="nb-line nb-line--date" /><span className="nb-label">がつ</span>
            <span className="nb-line nb-line--date" /><span className="nb-label">にち</span>
            <span className="nb-label nb-label--name">なまえ</span><span className="nb-line nb-line--name" />
          </div>
        )}
        <div className="print-grid" style={{
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows:    `repeat(${layout.rows}, auto)`,
          gap: dense,
          ["--pgap" as string]: dense,
        }}>
          {problems.map((p) => (
            <div key={p.id} className={`print-problem triple pair-${pairLayout}`}>
              <ProblemTriple p={p} dotScale={dotScale} noDots={noDots} frameStrokeWidth={frameStrokeWidth} />
            </div>
          ))}
        </div>
        <div className="print-page-footer">
          <img className="print-logo" src="/assets/logo-horizontal.png"
            alt="点描写プリントの専門店 TENZU" />
          <span>P {pageNo} / {pageCount}</span>
        </div>
      </div>
    </div>
  );
}
