"use client";

/* =========================================================================
   鏡メーカー（内部用・/maker-mirror）
   copy のおためし点描写メーカー（/maker）と同じ scaffolding で、F（みほん）
   ＋ 軸（左右反転=v ／ 上下反転=h）で R = mirror(F, axis) を自動算出。
   - 保存問題は { gridSize, edges: F, axis }
   - PDF/プレビューはみほんペイン=F・かくマスペイン=R（自動）
   - みほん⇔解答の境界は矢印じゃなく薄い点線（鏡面演出）
   - 解答 PDF を別出力（1問=1ページ・用紙MAX・F+R 完成図）
   ヘッダー・LP・フッターから動線なし。robots noindex。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useState } from "react";
import {
  PAPER, paperMax, PRINT_INK, edgeWidth,
  type PaperKey, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { ModeToggle } from "../maker/erase";
import {
  AXIS_INK, VIEW, edgeKey, edgesEqual, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import {
  buildPageSvgFrame, mirrorPlaneSvgString, paneFrameSvgString, paneSvgString, type LogoInfo,
} from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
import { axisOf, mirrorEdgesOf, type MirrorAxis } from "../maker/core/transforms";
import { PaperSVG, PreviewPage, PreviewPane, PrintPage } from "../maker/core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "../maker/core/useMakerEditor";
import { usePaperLayout } from "../maker/core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, NoteBox, OneStrokeSeg,
  PaperGroup, PerPageGroup, PreviewShell, SavedPanel, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types
// =========================================================================
type GridSize = 3 | 4 | 5 | 6;

/* edges = F（みほん）／ axis で R = mirror(F, axis) は描画時に自動算出 */
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  axis: MirrorAxis;
  selected: boolean;
};

type Snap = { edges: Edge[] };

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋鏡固有のセル描画。
// 鏡軸は並びに連動: 横並び=左右反転(v) / 縦並び=上下反転(h)。問題に焼き付けず描画時に導出
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
  answer?: boolean; // true=解答ページ群（かくマス側に R 描画）
  noDots?: boolean; // true=背景の点をとる（出題時のみ、かくマス側に薄い枠を添える）
}): string {
  const axis: MirrorAxis = opts.pairLayout === "horizontal" ? "v" : "h";
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const areaY = cy;
      const areaH = cellH;
      /* 出題と解答で同じペアレイアウトを共用。違いはかくマスペインの中身だけ。
         出題: みほん=F／かくマス=空欄（子が描く）
         解答: みほん=F／かくマス=R=mirror(F)（鏡として描き入れた状態）
         鏡面はペイン間の薄い点線（共通） */
      const answerEdges = opts.answer ? mirrorEdgesOf(p.edges, p.gridSize, axis) : [];
      const rightShow = Boolean(opts.answer);
      // 枠は「かくマスが空欄の出題時」のみ（解答時は R で埋まるため不要）。
      const showFrame = Boolean(opts.noDots) && !opts.answer;
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const ax = sx + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(ax, sy, pane, p.gridSize, answerEdges, rightShow, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(ax, sy, pane);
        body += mirrorPlaneSvgString(sx, sy, pane, gap, "horizontal");
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        const ay = sy + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(sx, ay, pane, p.gridSize, answerEdges, rightShow, dotScale, showDots);
        if (showFrame) body += paneFrameSvgString(sx, ay, pane);
        body += mirrorPlaneSvgString(sx, sy, pane, gap, "vertical");
      }
      return body;
    },
  });
}

// =========================================================================
// MakerMirrorApp
// =========================================================================
export default function MakerMirrorApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "mirror");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edges, setEdges] = useState<Edge[]>([]); // F
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を削除（描画は止まる）。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。出題時のみかくマス側に薄い枠を残す。
  const [noDots, setNoDots] = useState(false);
  /* 軸は「並び」と一意対応: 横並び→左右反転(v) / 縦並び→上下反転(h)。
     ユーザーは「並び」だけ選び、軸はそこから導出する */

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

  // 消すモード: 線をクリック → その辺を削除
  function eraseEdge(i: number) {
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory({ edges: updated });
  }

  function handleDot(p: Point) {
    if (erase) return; // 消すモードでは点クリックでは描かない
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
  const [pairLayout, setPairLayout] = useState<PairLayout>("horizontal");
  /* 並び→軸の導出（横並び=左右反転 / 縦並び=上下反転） */
  const axis: MirrorAxis = axisOf(pairLayout);

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
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る。
      // 鏡 spec の axis は新規保存と同じ算出元（現在の並び由来 axis）を書き戻す。
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges, axis } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, axis, selected: true }]);
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
    // gridSize・edges を復元（鏡 spec の axis は並びと連動するので、並びを spec に合わせる）。
    setGridSize(p.gridSize);
    setEdges(p.edges);
    setSelected(null);
    setPairLayout(p.axis === "v" ? "horizontal" : "vertical");
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
  const pages = chunkPages(selectedSaved, effectivePerPage);

  // ---- PDF ダウンロード（内部用なので完了画面なし） ----
  // 問題(q)と解答(a)を別々の PDF に分離（解答不要な家庭が印刷時に外す手間を回避）
  const [exporting, setExporting] = useState<false | "q" | "a">(false);
  /* mode="q" 出題のみ／mode="a" 解答のみ（かくマス側に R 完成図・鏡面の軸点線あり）。
     ページ番号は各 PDF 内で 1..pages.length に閉じる */
  async function doExport(mode: "q" | "a") {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("mirror").catch(() => {}); return; }
    setExporting(mode);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout, nameField, dotScale, logo,
          answer: mode === "a",
          noDots,
        }),
        filename: (stamp) => `tenzu_mirror_${mode}_${stamp}.pdf`,
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
      <MakerHeader appName="鏡メーカー（内部用）" />

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
            <div className="paper-pair">
              <div className="paper-pane problem" aria-label="編集中の盤面">
                <PaperSVG
                  gridSize={gridSize}
                  edges={edges}
                  selected={selected}
                  onDotClick={handleDot}
                  onEdgeErase={eraseEdge}
                  erase={erase}
                  showLines={true}
                  showActiveHighlight={true}
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
                ? "保存済みの問題を編集中です。線を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : "みほん側に線を引く（点を 2 つクリック／同じ線をもう一度で消える）。ペイン間の点線が鏡面。「並び」を切り替えると軸（左右／上下）と解答が連動する。"}
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
            renderThumb={(p) => <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} />}
          />

          {/* 並びは鏡タスクの肝（軸＝向き＝解答が変わる）。詳細設定の前に独立枠で出す */}
          <div className="group group--pair-frame"
            style={{
              border: "1px solid #d6d9dd",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 12,
              background: "#fafbfc",
            }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
              並び（鏡の向きと連動）
              <span style={{ marginLeft: 8, fontSize: 11, color: "#6b727b", fontWeight: "normal" }}>
                {pairLayout === "horizontal" ? "横並び＝左右反転" : "上下並び＝上下反転"}
              </span>
            </h3>
            <div className="seg seg--pair" role="group" aria-label="問題と書き込み欄の並び">
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
          </div>

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 名前欄: ${nameField ? "あり" : "なし"} · 背景の点: ${noDots ? "なし" : "あり"}`}>
            <PaperGroup paperKey={paperKey} onSelect={selectPaper} />
            <PerPageGroup
              perPage={perPage}
              onAuto={() => setPerPage("auto")}
              onPick={setPerPage}
              paperKey={paperKey}
              pair={pairLayout}
              marginMm={marginMm} />
            <NameFieldGroup value={nameField} onChange={setNameField} />

            <div className="group">
              <h3>背景の点</h3>
              <label className="chk-row">
                <input type="checkbox" checked={noDots}
                  onChange={(e) => setNoDots(e.target.checked)} />
                <span>背景の点をとる</span>
              </label>
              <p className="seg-hint">
                見本・書き込み欄の両方から点を消します（出題側）。書き込み欄には薄い枠だけが残ります。解答側は対象外です。
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
                pairLayout={pairLayout}
                nameField={nameField}
                dotScale={dotScale}
                renderCell={(p, { cellW, cellH, pane, gap, pairLayout: pair, dotScale: ds }) => {
                  /* 鏡: みほん→解答の境界は矢印じゃなく薄い点線（鏡面）。
                     出題 PDF と同じく解答ペインは空（軸線のみ）。R を見たい場合は
                     保存サムネ or 解答 PDF を使う */
                  if (pair === "horizontal") {
                    const pairW = pane * 2 + gap;
                    const startX = (cellW - pairW) / 2;
                    const startY = (cellH - pane) / 2;
                    const mx = startX + pane + gap / 2;
                    return (
                      <>
                        <PreviewPaneLocal x={startX} y={startY} pane={pane} p={p} ds={ds} showDots={!noDots} />
                        <PreviewPaneEmpty x={startX + pane + gap} y={startY} pane={pane} p={p} ds={ds}
                          showDots={!noDots} frame={noDots} />
                        <line x1={mx} y1={startY - pane * 0.05} x2={mx} y2={startY + pane * 1.05}
                          stroke={AXIS_INK} strokeWidth={Math.max(0.3, edgeWidth(pane) * 0.7)}
                          strokeDasharray={`${(pane * 0.025).toFixed(2)} ${(pane * 0.02).toFixed(2)}`}
                          strokeLinecap="round" />
                      </>
                    );
                  }
                  const pairH = pane * 2 + gap;
                  const startX = (cellW - pane) / 2;
                  const startY = (cellH - pairH) / 2;
                  const my = startY + pane + gap / 2;
                  return (
                    <>
                      <PreviewPaneLocal x={startX} y={startY} pane={pane} p={p} ds={ds} showDots={!noDots} />
                      <PreviewPaneEmpty x={startX} y={startY + pane + gap} pane={pane} p={p} ds={ds}
                        showDots={!noDots} frame={noDots} />
                      <line x1={startX - pane * 0.05} y1={my} x2={startX + pane * 1.05} y2={my}
                        stroke={AXIS_INK} strokeWidth={Math.max(0.3, edgeWidth(pane) * 0.7)}
                        strokeDasharray={`${(pane * 0.025).toFixed(2)} ${(pane * 0.02).toFixed(2)}`}
                        strokeLinecap="round" />
                    </>
                  );
                }} />
            ))}
          </PreviewShell>

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
            pairLayout={pairLayout}
            nameField={nameField}
            renderPair={(p) => (
              <ProblemPair p={p} pairLayout={pairLayout} dotScale={dotScale}
                noDots={noDots} frameStrokeWidth={frameStrokeWidth} />
            )} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// 鏡固有のプレビュー/印刷サブコンポーネント
// =========================================================================
function PreviewPaneLocal({ x, y, pane, p, ds, showDots }: {
  x: number; y: number; pane: number; p: Problem; ds: number; showDots: boolean;
}) {
  return <PreviewPane x={x} y={y} w={pane} h={pane}
    gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds} showDots={showDots} />;
}
function PreviewPaneEmpty({ x, y, pane, p, ds, showDots, frame }: {
  x: number; y: number; pane: number; p: Problem; ds: number; showDots: boolean; frame: boolean;
}) {
  return <PreviewPane x={x} y={y} w={pane} h={pane}
    gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds} showDots={showDots} frame={frame} />;
}

// noDots=true で背景ドットを省き、かくマス側（出題＝空欄）にだけ薄い正方形の枠を重ねる。
function ProblemPair({ p, pairLayout, dotScale, noDots, frameStrokeWidth }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; noDots: boolean; frameStrokeWidth: number;
}) {
  const isH = pairLayout === "horizontal";
  return (
    <>
      <div className="print-cell">
        <div className="print-pane">
          <PaperSVG gridSize={p.gridSize} edges={p.edges} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
      {/* 鏡面: みほん⇔解答の境界を矢印じゃなく薄い点線で */}
      <div className="print-arrow" aria-hidden="true">
        {isH ? (
          <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="1" x2="20" y2="21"
              stroke={AXIS_INK} strokeWidth={1.4} strokeDasharray="3 2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 22 40" xmlns="http://www.w3.org/2000/svg">
            <line x1="1" y1="20" x2="21" y2="20"
              stroke={AXIS_INK} strokeWidth={1.4} strokeDasharray="3 2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="print-cell">
        <div className="print-pane">
          {/* 出題 PDF と同じく解答ペインは空（子が描く）。R は解答 PDF へ */}
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
