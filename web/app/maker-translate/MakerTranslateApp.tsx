"use client";

/* =========================================================================
   移動メーカー（内部用・/maker-translate）
   拡大メーカー（/maker-scale）と同じ scaffolding で、F（もとの図）＋ 移動先（●）から
   R = translate(F, dc, dr) を自動算出。
   - 起点 = 最初に置いた点 edges[0].a（★「きてん」）。拡大の不動点と同じ思想。
   - 移動先 = 盤面を 1 クリックで置く点（●「ここへ」）。起点 ★ がここへ着地するよう
     図形全体を移動する。ベクトル (dc,dr) = 移動先 − 起点（距離入力はしない）。
   - 移動図が n×n 枠に収まるかをライブ判定。はみ出すと保存・PDF を抑止。
   - 編集画面に「もとの図 → うつした図（けっか）」の 2 ペインを並べてライブ表示。
   - 保存問題は { gridSize, edges: F, dc, dr }（schema の translate と整合）。
   - PDF/プレビューはもとの図ペイン=F＋★／かくマスペイン=出題は空＋●・解答は R＋★。
   - 出題 PDF と解答 PDF を別々に書き出す（解答ページ上端に「かいとう」見出し）。
   - 並びは答えに影響しない（紙面レイアウトだけ）。
   ヘッダー・LP・フッターから動線なし。robots noindex。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
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
  AXIS_INK, INK, VIEW, dotPos, edgeKey, edgesEqual, pointKey, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import {
  arrowSvgString, buildPageSvgFrame, paneFrameSvgString, type LogoInfo,
} from "../maker/core/page-svg";
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
// Types
// =========================================================================
type GridSize = 3 | 4 | 5 | 6; // 移動は family 標準（3×3〜6×6・商品の 3×3/4×4 に整合）

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  dc: number; // 移動ベクトル（保存時に確定・収まることを検証済）
  dr: number;
  selected: boolean;
};

type Snap = { edges: Edge[] };

/* 各点を (dc,dr) だけ移動。形・向き・大きさは変えない */
function translatePoint(p: Point, dc: number, dr: number): Point {
  return { c: p.c + dc, r: p.r + dr };
}
function translateEdgesOf(edges: Edge[], dc: number, dr: number): Edge[] {
  return edges.map((e) => ({ a: translatePoint(e.a, dc, dr), b: translatePoint(e.b, dc, dr) }));
}
function inGrid(edges: Edge[], n: number): boolean {
  return edges.every((e) => [e.a, e.b].every((p) => p.c >= 0 && p.c <= n - 1 && p.r >= 0 && p.r <= n - 1));
}

/* 起点（最初に置いた点 edges[0].a・★）が移動先 target（●）へ着地するよう全点を移動。
   target 未指定（クリック前）は移動なし＝ fits=true で警告を出さない。
   移動後が枠を超えるかは判定するが、自動では動かさない（起点・移動先・グリッドで人が調整）。 */
function computeTranslate(edges: Edge[], target: Point | null, n: number):
  { edges: Edge[]; star?: Point; targetMark?: Point; dc: number; dr: number; fits: boolean } {
  if (edges.length === 0) return { edges: [], dc: 0, dr: 0, fits: true };
  const start = edges[0].a; // 起点 ★
  if (!target) return { edges: [], star: start, dc: 0, dr: 0, fits: true };
  const dc = target.c - start.c, dr = target.r - start.r;
  const R = translateEdgesOf(edges, dc, dr);
  return { edges: R, star: start, targetMark: target, dc, dr, fits: inGrid(R, n) };
}

/* 移動量を日本語の方向ラベルに（右2・下1 など）。ラベル表示専用 */
function dirText(dc: number, dr: number): string {
  if (dc === 0 && dr === 0) return "移動なし";
  const h = dc > 0 ? `右${dc}` : dc < 0 ? `左${-dc}` : "";
  const v = dr > 0 ? `下${dr}` : dr < 0 ? `上${-dr}` : "";
  return [h, v].filter(Boolean).join("・");
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

/* 内部用ツールのため完了画面のレコメンドは省略（copy 側のみ） */

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋移動固有のセル描画。
// ★（きてん）・●（ここへ）マーカーが点を置換するため、ペイン描画は
// メーカー固有実装を維持する。
// =========================================================================

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
// starAt=起点★（「きてん」）／ targetAt=移動先●（「ここへ」・中空リング）。
// showDots=false でも ★／● は常に描画（位置情報として必須）。
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
  dotScale: number, starAt?: Point, targetAt?: Point, showDots: boolean = true,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = dotRadius(pane, dotScale);
  const starR = Math.max(dotR * 4.2, pane * 0.035); // 起点★（強調・大きめ）
  const tR = Math.max(dotR * 3.4, pane * 0.030);    // 移動先●（リング）
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
      } else if (targetAt && c === targetAt.c && r === targetAt.r) {
        const labelY = r === gridSize - 1 ? p.y - tR - labelFs * 0.3 : p.y + tR + labelFs;
        const ring = Math.max(0.5, pane * 0.012);
        s += `<circle cx="${p.x}" cy="${p.y}" r="${tR}" fill="none" stroke="${PRINT_INK}" stroke-width="${ring}"/>`;
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
        s += `<text x="${p.x}" y="${labelY}" text-anchor="middle" font-family="${jpFont}" font-size="${labelFs}" font-weight="700" fill="${PRINT_INK}">ここへ</text>`;
      } else if (showDots) {
        s += `<circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${PRINT_INK}"/>`;
      }
    }
  }
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
      const areaY = cy;
      const areaH = cellH;
      /* 出題と解答で同じペアレイアウトを共用。違いはかくマスペインの中身だけ。
         出題: もとの図=F＋★(起点)／かくマス=空欄＋●(移動先・ここへ)
         解答: もとの図=F＋★／かくマス=R＋★(起点が着地した位置)
         境界は標準の細線矢印 */
      const start = p.edges[0]?.a;
      if (!start) return "";
      const tgt = { c: start.c + p.dc, r: start.r + p.dr };
      const answerEdges = opts.answer ? translateEdgesOf(p.edges, p.dc, p.dr) : [];
      const rightEdges = answerEdges;
      const rightShow = Boolean(opts.answer);
      const rightStar = opts.answer ? tgt : undefined;       // 解答=★(着地位置)
      const rightTarget = opts.answer ? undefined : tgt;     // 出題=●(行き先)
      const aSize = gap * 0.9;
      // 枠は「かくマスが空欄の出題時」のみ（解答時は R で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const ax = sx + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, start, undefined, showDots);
        body += paneSvgString(ax, sy, pane, p.gridSize, rightEdges, rightShow, dotScale, rightStar, rightTarget, showDots);
        if (showFrame) body += paneFrameSvgString(ax, sy, pane);
        body += arrowSvgString(sx + pane + (gap - aSize) / 2, sy + pane / 2, aSize, "right");
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        const ay = sy + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, start, undefined, showDots);
        body += paneSvgString(sx, ay, pane, p.gridSize, rightEdges, rightShow, dotScale, rightStar, rightTarget, showDots);
        if (showFrame) body += paneFrameSvgString(sx, ay, pane);
        body += arrowSvgString(sx + pane / 2, sy + pane + (gap - aSize) / 2, aSize, "down");
      }
      return body;
    },
  });
}

// =========================================================================
// MakerTranslateApp
// =========================================================================
export default function MakerTranslateApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "translate");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edges, setEdges] = useState<Edge[]>([]); // F
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  const [oneStroke, setOneStroke] = useState(false);
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  // target は移動先（●・盤面の格子点）。右（結果）盤面のクリックで置く（モード切替なし）。
  const [target, setTarget] = useState<Point | null>(null);
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。★●マーカーは残し、通常の点だけ消す。
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
    setTarget(null);
  }

  // 移動先を置く（右＝結果盤面のクリック・同点クリックで解除。図形未描画なら無視）
  function handleTarget(p: Point) {
    if (edges.length === 0) return;
    setTarget((t) => (t && samePoint(t, p) ? null : p));
  }

  // 消すモード: 線をクリック＝その 1 本を削除（pushHistory は Snap 形）
  function eraseEdge(i: number) {
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory({ edges: updated });
  }

  // 図形を描く（左盤面・拡大メーカーと同じ）
  function handleDot(p: Point) {
    if (erase) return;
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    // 一筆書き ON: 線を引いた（消した）後、終点を次の線の始点として残す（連続描画）。
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
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    if (n === gridSize) return;
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    setTarget(null);
    hist.resetHistory({ edges: [] });
  }

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で上下/横を自動

  // ---- Derived: 現在編集中の図形の移動結果（ライブ） ----
  const cur = useMemo(() => computeTranslate(edges, target, gridSize), [edges, target, gridSize]);
  const resultEdges = cur.edges;
  const isZeroMove = target !== null && cur.dc === 0 && cur.dr === 0;
  const canSave = edges.length > 0 && target !== null && !isZeroMove && cur.fits;
  const startPoint = edges.length > 0 ? edges[0].a : undefined; // 起点（最初に置いた点）
  const resultStar = cur.fits ? cur.targetMark : undefined;     // 着地位置（けっか）の ★

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const {
    saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState,
    toggleSelectSaved, moveSaved, toggleSelectAll,
  } = list;

  // 編集後/新規保存の共通リセット（キャンバスを空に戻す）
  function resetCanvas() {
    setEdges([]);
    setSelected(null);
    setTarget(null);
    hist.resetHistory({ edges: [] });
  }
  function saveCurrent() {
    if (!canSave) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      // dc,dr は新規保存と同じく cur（computeTranslate の結果）から確定する
      setSaved((s) => s.map((p) =>
        (p.id === editingId ? { ...p, gridSize, edges, dc: cur.dc, dr: cur.dr } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, dc: cur.dc, dr: cur.dr, selected: true }]);
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
    setSelected(null);
    // 移動先（●）は保存時の dc,dr から復元（起点 edges[0].a + ベクトル）
    setTarget({ c: p.edges[0].a.c + p.dc, r: p.edges[0].a.r + p.dr });
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
  const pages = useMemo(
    () => chunkPages(selectedSaved, effectivePerPage),
    [selectedSaved, effectivePerPage]);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* 出題ページ群 → 解答ページ群 を 1 つの PDF に連結。
     移動ベクトルは各問題に焼き付けた (dc,dr) を使用（混在可） */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("translate").catch(() => {}); return; }
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
        filename: (stamp) => `tenzu_translate_${mode}_${stamp}.pdf`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  // 右（結果）盤面のキャプションを状態で出し分け（操作の主役）
  const resultCap = edges.length === 0
    ? "うつす先（まず左で図形を描いてね）"
    : target === null
      ? "ここをクリックして移動先（●）をおく"
      : cur.fits
        ? "うつした図（クリックで移動先を変更）"
        : "移動先（枠からはみ出します）";
  const editingTitle = editorTitle(saved, editingId);

  const paper = PAPER[paperKey];
  const frameStrokeWidth = Math.max(0.25, edgeWidth(VIEW) * 0.55);

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="移動メーカー（内部用）" />

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
              : oneStroke && <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>}
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()} canClear={edges.length > 0} />
            {/* もとの図 → うつした図 の 3 要素（重ね/折り/拡大メーカーと同じ overlay-boards を流用） */}
            <div className="overlay-boards">
              <div className="overlay-board">
                <span className="ob-cap">もとの図（★＝起点）</span>
                <div className="paper-pane problem" aria-label="図形を描く盤面">
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
              <div className="overlay-op">ずらす</div>
              <div className="overlay-board">
                <span className="ob-cap">{resultCap}</span>
                <div className="paper-pane" aria-label="移動先を置く盤面（クリックで配置）">
                  <PaperSVG
                    gridSize={gridSize}
                    edges={resultEdges}
                    onDotClick={handleTarget}
                    showLines={cur.fits}
                    ink={INK}
                    dotScale={dotScale}
                    starAt={resultStar}
                    targetAt={target ?? undefined}
                  />
                  <div className="pp-stamp">けっか</div>
                </div>
              </div>
            </div>

            {edges.length > 0 && target !== null && !cur.fits && (
              <div role="alert" style={{
                width: "100%", maxWidth: 760,
                background: "#fdecec", border: "1px solid #e3a0a0", color: "#b33a3a",
                borderRadius: 8, padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
              }}>
                この移動先では移動した図が枠からはみ出します。<br />
                もとの図を小さく描く／移動先を起点に近づける／グリッドを大きくしてください。
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
                <>保存済みの問題を編集中です。図形や移動先を直して「変更を保存」を押すと、元の問題が上書きされます（並び順と PDF 選択はそのまま）。</>
              ) : (
                <>
                  <strong>① 左で図形を描く</strong>（線を引く＝点を 2 つクリック）。最初に置いた点が「起点」（★）。
                  <strong> ② 右の盤面をクリック</strong>して移動先（●）をおく。起点 ★ がそこへ移動した図が右に出ます。
                  はみ出すときは、もとの図を小さく描く／移動先を近くにする／グリッドを大きく。
                </>
              )}
            </div>
          </div>
        </main>

        {/* ---------- RIGHT ---------- */}
        <aside className="sidebar right">

          {/* 保存パネルは共通 SavedPanel でなくローカル実装（サムネが F→R のペア・
              番号ラベルに移動量「右2・下1」を併記するため） */}
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
                  const start = p.edges[0].a;
                  const tgt = { c: start.c + p.dc, r: start.r + p.dr };
                  const move = dirText(p.dc, p.dr);
                  const beingEdited = editingId === p.id;
                  return (
                    <div className={`saved-cell${p.selected ? " sel" : ""}${beingEdited ? " editing" : ""}`} key={p.id}>
                      <button className="thumb" type="button"
                        role="checkbox"
                        aria-checked={p.selected}
                        aria-label={`問題 ${num}（${move}）を PDF に含める`}
                        onClick={() => toggleSelectSaved(p.id)}>
                        <span className="thumb-pair">
                          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true}
                            starAt={start} starLabel={false} />
                          <span className="tp-op" aria-hidden="true">→</span>
                          <PaperSVG gridSize={p.gridSize} edges={translateEdgesOf(p.edges, p.dc, p.dr)}
                            showLines={true} starAt={tgt} starLabel={false} />
                        </span>
                      </button>
                      {p.selected && <span className="sel-mark" aria-hidden="true">✓</span>}
                      {beingEdited && <span className="edit-mark" aria-hidden="true">編集中</span>}
                      <span className="cnum">{num} · {move}</span>
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
                もとの図・かくマスの点を消します（出題側）。★きてん・●ここへは残ります。かくマスには薄い枠だけが残ります。解答側は対象外です。
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
                  /* 移動: 境界に標準の細線矢印（模写と同じ）。移動方向は ★→● で示す */
                  const start = p.edges[0].a;
                  const tgt = { c: start.c + p.dc, r: start.r + p.dr };
                  const aSize = gap * 0.9;
                  if (pair === "horizontal") {
                    const pairW = pane * 2 + gap;
                    const startX = (cellW - pairW) / 2;
                    const startY = (cellH - pane) / 2;
                    return (
                      <>
                        <PreviewPane x={startX} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} starAt={start}
                          showDots={!noDots} />
                        <PreviewPane x={startX + pane + gap} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} targetAt={tgt}
                          showDots={!noDots} frame={noDots} />
                        <ArrowSVG x={startX + pane + (gap - aSize) / 2} y={startY + pane / 2}
                          size={aSize} dir="right" color={PRINT_INK} />
                      </>
                    );
                  }
                  const pairH = pane * 2 + gap;
                  const startX = (cellW - pane) / 2;
                  const startY = (cellH - pairH) / 2;
                  return (
                    <>
                      <PreviewPane x={startX} y={startY} w={pane} h={pane}
                        gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} starAt={start}
                        showDots={!noDots} />
                      <PreviewPane x={startX} y={startY + pane + gap} w={pane} h={pane}
                        gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} targetAt={tgt}
                        showDots={!noDots} frame={noDots} />
                      <ArrowSVG x={startX + pane / 2} y={startY + pane + (gap - aSize) / 2}
                        size={aSize} dir="down" color={PRINT_INK} />
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
// 移動固有の盤面/プレビュー/印刷サブコンポーネント
// （★「きてん」・●「ここへ」マーカーが点を置換するため、core の
//   PaperSVG/PreviewPane は使わない）
// =========================================================================

// Paper pane SVG (used both in canvas and PDF preview)
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
  targetAt,
  targetInk = "#2C6E7F",
  targetLabel = true,
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
  starInk?: string;   // 起点★の色（画面=teal 強調 / 印刷経路=PRINT_INK）
  starLabel?: boolean; // 「きてん」ラベルを出すか（サムネは false）
  targetAt?: Point;
  targetInk?: string;  // 移動先●の色（画面=teal / 印刷経路=PRINT_INK）
  targetLabel?: boolean; // 「ここへ」ラベルを出すか（サムネは false）
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showDots?: boolean;         // false=背景ドットを描かない（★●マーカーは常に描く）
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
        const isStar = !!starAt && p.c === starAt.c && p.r === starAt.r;
        const isTarget = !isStar && !!targetAt && p.c === targetAt.c && p.r === targetAt.r;
        const r = showActiveHighlight && isSel ? 4 : 1.6 * dotScale;
        const fill = showActiveHighlight ? (isSel ? "#2C6E7F" : SCREEN_DOT) : ink;
        const starR = Math.max(1.6 * dotScale * 4.4, 8); // 起点★を大きく
        const targetR = Math.max(1.6 * dotScale * 4.0, 7); // 移動先●リング
        const lastRow = p.r === dots - 1;
        const labelY = lastRow ? pos.y - starR - 4 : pos.y + starR + 12;
        const tLabelY = lastRow ? pos.y - targetR - 4 : pos.y + targetR + 12;
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {isStar ? (
              <>
                <circle cx={pos.x} cy={pos.y} r={starR * 1.5} fill={starInk} opacity={0.12} />
                <path d={starPathD(pos.x, pos.y, starR)} fill={starInk} />
                {starLabel && (
                  <text x={pos.x} y={labelY} textAnchor="middle" fontSize={12} fontWeight={700}
                    fill={starInk} style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>きてん</text>
                )}
              </>
            ) : isTarget ? (
              <>
                <circle cx={pos.x} cy={pos.y} r={targetR * 1.5} fill={targetInk} opacity={0.10} />
                <circle cx={pos.x} cy={pos.y} r={targetR} fill="none" stroke={targetInk} strokeWidth={2} />
                <circle cx={pos.x} cy={pos.y} r={Math.max(1.6 * dotScale, 1.4)} fill={targetInk} />
                {targetLabel && (
                  <text x={pos.x} y={tLabelY} textAnchor="middle" fontSize={12} fontWeight={700}
                    fill={targetInk} style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>ここへ</text>
                )}
              </>
            ) : (
              showDots && <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
            )}
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

function PreviewPane({
  x, y, w, h, gridSize, edges, showLines, dotScale, starAt, targetAt, showDots = true, frame = false,
}: {
  x: number; y: number; w: number; h: number;
  gridSize: GridSize; edges: Edge[]; showLines: boolean; dotScale: number;
  starAt?: Point; targetAt?: Point;
  showDots?: boolean; // false=背景ドットを描かない（★●マーカーは常に描く）
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
  const tR = Math.max(dotR * 3.4, paneMin * 0.030);
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
            if (targetAt && c === targetAt.c && r === targetAt.r) {
              const labelY = r === dots - 1 ? p.y - tR - labelFs * 0.3 : p.y + tR + labelFs;
              return (
                <g key={`t-${c}-${r}`}>
                  <circle cx={p.x} cy={p.y} r={tR} fill="none" stroke={PRINT_INK} strokeWidth={Math.max(0.5, paneMin * 0.012)} />
                  <circle cx={p.x} cy={p.y} r={dotR} />
                  <text x={p.x} y={labelY} textAnchor="middle" fontSize={labelFs} fontWeight={700}
                    style={{ fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif" }}>ここへ</text>
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

// noDots=true で背景ドットを省き（★●マーカーは残す）、かくマス側にだけ薄い正方形の枠を重ねる。
function ProblemPair({ p, pairLayout, dotScale, noDots, frameStrokeWidth }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; noDots: boolean; frameStrokeWidth: number;
}) {
  const isH = pairLayout === "horizontal";
  const start = p.edges[0].a;
  const tgt = { c: start.c + p.dc, r: start.r + p.dr };
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK} dotScale={dotScale} starAt={start} starInk={PRINT_INK}
            showDots={!noDots} />
        </div>
      </div>
      {/* 模写と同じ標準の細線矢印（移動方向は ★→● で示す） */}
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 13 L38 13 M28 6 L38 13 L28 20"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2 L8 38 M1 28 L8 38 L15 28"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題は解答ペイン空。移動先だけ ● で示す */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} targetAt={tgt} targetInk={PRINT_INK}
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
