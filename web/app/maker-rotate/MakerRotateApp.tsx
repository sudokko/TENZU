"use client";

/* =========================================================================
   回転メーカー（内部用・/maker-rotate）
   copy のおためし点描写メーカー（/maker）と同じ scaffolding で、F（みほん）
   ＋ 回転角（90°/180°/270°右回り）で R = rotate(F, deg) を自動算出。
   - 保存問題は { gridSize, edges: F }（回転角は描画時に opts から導出）
   - PDF/プレビューはみほんペイン=F・かくマスペイン=R（出題は空・解答は描き入れ）
   - みほん⇔解答の境界は「↻ N°」テキスト＋細い矢印で回転を演出
   - 出題 PDF と解答 PDF を別々に書き出す（解答ページ上端に「かいとう」見出し）
   - 並びは答えに影響しない（紙面レイアウトだけ）
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
  PaperGroup, PerPageGroup, PreviewShell, SavedPanel, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types
// =========================================================================
type GridSize = 3 | 4 | 5 | 6;
type RotateDeg = 90 | 180 | 270; // 全て右回り

type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  selected: boolean;
};

type Snap = { edges: Edge[] };

/* 点を盤面中心まわりに度数で右回り回転（schema.ts TransformSpec と同規約・90/180/270 のみ）。
   maker は { c, r } 表現を使うのでここに小さく実装 */
function rotatePoint(p: Point, n: number, deg: RotateDeg): Point {
  if (deg === 90)  return { c: n - 1 - p.r, r: p.c };
  if (deg === 180) return { c: n - 1 - p.c, r: n - 1 - p.r };
  return { c: p.r, r: n - 1 - p.c }; // 270 = -90
}
function rotateEdgesOf(edges: Edge[], n: number, deg: RotateDeg): Edge[] {
  return edges.map((e) => ({ a: rotatePoint(e.a, n, deg), b: rotatePoint(e.b, n, deg) }));
}
/* 左上点(0,0)が deg 度回転後にどこへ行くか。
   90°→右上(n-1,0) / 180°→右下(n-1,n-1) / 270°→左下(0,n-1) */
function rotatedAnchor(n: number, deg: RotateDeg): Point {
  return rotatePoint({ c: 0, r: 0 }, n, deg);
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
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋回転固有のセル描画。
// ★ マーカーが点を置換するため、ペイン描画はメーカー固有実装を維持する。
// =========================================================================

// 1ペイン（盤面）を mm 座標の SVG 断片で描く。比率は PaperSVG（r=1.6/VIEW200）準拠。
// starAt: その位置の点を ★ マーカーに置換（回転基準点示し・showDots=false でも常に描画）
function paneSvgString(
  x: number, y: number, pane: number, gridSize: GridSize, edges: Edge[], showLines: boolean,
  dotScale: number, starAt?: Point, showDots: boolean = true,
): string {
  const inset = pane * 0.10;
  const step = (pane - inset * 2) / (gridSize - 1);
  const P = (c: number, r: number) => ({ x: x + inset + c * step, y: y + inset + r * step });
  const dotR = dotRadius(pane, dotScale);
  const starR = Math.max(dotR * 3.0, pane * 0.025); // 点が小さくても見えるように下限
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
        s += `<path d="${starPathD(p.x, p.y, starR)}" fill="${PRINT_INK}"/>`;
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
  rotateDeg: RotateDeg;
  noDots?: boolean; // true=背景の点をとる（出題時のみ、かくマス側に薄い枠を添える）
}): string {
  // 回転角は opts から（並びとは独立・問題に焼き付けない）
  const deg = opts.rotateDeg;
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const areaY = cy;
      const areaH = cellH;
      /* 出題と解答で同じペアレイアウトを共用。違いはかくマスペインの中身だけ。
         出題: みほん=F＋左上★／かくマス=空欄＋回転先の★（子が描く目印）
         解答: みほん=F＋左上★／かくマス=R＋回転先の★（描き入れた状態）
         境界は標準の細線矢印（模写と同じ） */
      const answerEdges = opts.answer ? rotateEdgesOf(p.edges, p.gridSize, deg) : [];
      const rightShow = Boolean(opts.answer);
      const starF: Point = { c: 0, r: 0 };
      const starR = rotatedAnchor(p.gridSize, deg);
      const aSize = gap * 0.9;
      // 枠は「かくマスが空欄の出題時」のみ（解答時は R で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const ax = sx + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, starF, showDots);
        body += paneSvgString(ax, sy, pane, p.gridSize, answerEdges, rightShow, dotScale, starR, showDots);
        if (showFrame) body += paneFrameSvgString(ax, sy, pane);
        body += arrowSvgString(sx + pane + (gap - aSize) / 2, sy + pane / 2, aSize, "right");
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        const ay = sy + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, starF, showDots);
        body += paneSvgString(sx, ay, pane, p.gridSize, answerEdges, rightShow, dotScale, starR, showDots);
        if (showFrame) body += paneFrameSvgString(sx, ay, pane);
        body += arrowSvgString(sx + pane / 2, sy + pane + (gap - aSize) / 2, aSize, "down");
      }
      return body;
    },
  });
}

// =========================================================================
// MakerRotateApp
// =========================================================================
export default function MakerRotateApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "rotate");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edges, setEdges] = useState<Edge[]>([]); // F
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。みほん側の作図のみに効く。
  const [oneStroke, setOneStroke] = useState(false);
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  /* 回転角は独立選択（並びとは無関係に答えが変わる）。3 択: 90/180/270 全て右回り */
  const [rotateDeg, setRotateDeg] = useState<RotateDeg>(90);
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
  /* R は描画時に自動算出（検品表示は廃止） */

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  // 編集後/新規保存の共通リセット（キャンバスを空に戻す）
  function resetCanvas() {
    setEdges([]);
    setSelected(null);
    hist.resetHistory({ edges: [] });
  }
  function saveCurrent() {
    if (edges.length === 0) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      // 回転角はグローバル状態（問題に焼き付けない）なので保存対象は gridSize・edges のみ
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, selected: true }]);
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
    hist.resetHistory({ edges: p.edges });
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
  // おまかせ並び = 選択 2 問以下は上下（1 問でもスカスカに見えない）・3 問以上は横。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = useMemo(
    () => chunkPages(selectedSaved, effectivePerPage),
    [selectedSaved, effectivePerPage]);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* 出題（問題）と解答を別 PDF として書き出す。mode で出し分け。 */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("rotate").catch(() => {}); return; }
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
          rotateDeg,
          noDots,
        }),
        filename: (stamp) => `tenzu_rotate_${mode}_${stamp}.pdf`,
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
      <MakerHeader appName="回転メーカー（内部用）" />

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
            {erase
              ? <span className="qb-note">消すモード：線をクリックすると、その線だけ消えます。</span>
              : isEditing
                ? <span className="qb-note">編集中はグリッドは固定されます。</span>
                : oneStroke
                  ? <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>
                  : null}
          </div>

          <div className="canvas-stage">
            <EditActions
              onUndo={hist.undo} onRedo={hist.redo} onClear={clearAll}
              canUndo={hist.canUndo()} canRedo={hist.canRedo()} canClear={edges.length > 0} />
            <div className="paper-pair">
              <div className="paper-pane problem" aria-label="編集中の盤面">
                <PaperSVG
                  gridSize={gridSize}
                  edges={edges}
                  selected={selected}
                  onDotClick={handleDot}
                  showLines={true}
                  showActiveHighlight={true}
                  starAt={{ c: 0, r: 0 }}
                  onEdgeErase={eraseEdge}
                  erase={erase}
                />
                <div className="pp-stamp">{gridSize}×{gridSize}</div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent} disabled={edges.length === 0}>
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
                ? "保存済みの問題を編集中です。線を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。回転角は全体設定なので、保存済みの問題すべてに同じ角度が適用されます。"
                : "みほん側に線を引く（点を 2 つクリック／同じ線をもう一度で消える）。回転角は全体設定で、解答に連動する。"}
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
            renderThumb={(p) => <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} starAt={{ c: 0, r: 0 }} />}
          />

          {/* 回転角は鏡と並んでこの巻の肝（角度で解答が変わる）。詳細設定の前に独立枠で出す。
              鏡と違って並びとは独立＝答えに影響しない */}
          <div className="group group--rotate-frame"
            style={{
              border: "1px solid #d6d9dd",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              background: "#fafbfc",
            }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
              回転角（解答が連動）
              <span style={{ marginLeft: 8, fontSize: 11, color: "#6b727b", fontWeight: "normal" }}>
                ↻ {rotateDeg}° 右回り
              </span>
            </h3>
            <div className="seg" role="group" aria-label="回転角">
              {([90, 180, 270] as RotateDeg[]).map((d) => (
                <button key={d} type="button"
                  aria-pressed={rotateDeg === d}
                  onClick={() => setRotateDeg(d)}>
                  {d}°
                </button>
              ))}
            </div>
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
                見本・書き込み欄の点を消します（出題側）。★マーカーは残ります。書き込み欄には薄い枠だけが残ります。解答側は対象外です。
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
                  /* 回転: 境界に標準の細線矢印（模写と同じ）。回転の方向性は ★ で示す */
                  const starFP: Point = { c: 0, r: 0 };
                  const starRP = rotatedAnchor(p.gridSize, rotateDeg);
                  const aSize = gap * 0.9;
                  if (pair === "horizontal") {
                    const pairW = pane * 2 + gap;
                    const startX = (cellW - pairW) / 2;
                    const startY = (cellH - pane) / 2;
                    return (
                      <>
                        <PreviewPane x={startX} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} starAt={starFP}
                          showDots={!noDots} />
                        <PreviewPane x={startX + pane + gap} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} starAt={starRP}
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
                        gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} starAt={starFP}
                        showDots={!noDots} />
                      <PreviewPane x={startX} y={startY + pane + gap} w={pane} h={pane}
                        gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} starAt={starRP}
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
              <ProblemPair p={p} pairLayout={effectivePairLayout} dotScale={dotScale} rotateDeg={rotateDeg}
                noDots={noDots} frameStrokeWidth={frameStrokeWidth} />
            )} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// 回転固有の盤面/プレビュー/印刷サブコンポーネント
// （★ マーカーが点を置換するため、core の PaperSVG/PreviewPane は使わない）
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
      {/* ペイン内軸点線は廃止（鏡面はペイン間の点線一本で示す） */}
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
        const starR = Math.max(1.6 * dotScale * 3.0, 5);
        return (
          <g key={pointKey(p)}>
            {showActiveHighlight && isSel && (
              <circle cx={pos.x} cy={pos.y} r={7} fill="#2C6E7F" opacity={0.18} />
            )}
            {isStar
              ? <path d={starPathD(pos.x, pos.y, starR)} fill={ink} />
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
  const starR = Math.max(dotR * 3.0, paneMin * 0.025);
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
              return <path key={`s-${c}-${r}`} d={starPathD(p.x, p.y, starR)} />;
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

// noDots=true で背景ドットを省き（★マーカーは残す）、かくマス側にだけ薄い正方形の枠を重ねる。
function ProblemPair({ p, pairLayout, dotScale, rotateDeg, noDots, frameStrokeWidth }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; rotateDeg: RotateDeg;
  noDots: boolean; frameStrokeWidth: number;
}) {
  const isH = pairLayout === "horizontal";
  const starF = { c: 0, r: 0 };
  const starR = rotatedAnchor(p.gridSize, rotateDeg);
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK} dotScale={dotScale} starAt={starF}
            showDots={!noDots} />
        </div>
      </div>
      {/* 模写と同じ標準の細線矢印 */}
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 11 L38 11 M28 3 L38 11 L28 19"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 2 L11 38 M3 28 L11 38 L19 28"
              fill="none" stroke={PRINT_INK} strokeWidth={1.6}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題 PDF と同じく解答ペインは空。回転先の位置だけ ★ で示す */}
          <PaperSVG gridSize={p.gridSize} edges={[]} showLines={false} ink={PRINT_INK} dotScale={dotScale} starAt={starR}
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
