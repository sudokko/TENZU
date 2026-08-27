"use client";

/* =========================================================================
   模写メーカー（/maker・無料の入口）
   無料で 4×4 まで（decisions §4.6/§4.7）。ゲートはグリッドサイズ 1 本＝
   用紙・問数・記名欄・保存・DL は無料でも全開放。5×5〜8×8 は ¥980 買い切りで解放。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   完了画面（動的レコメンド）は DoneScreen.tsx。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  PAPER, paperMax, PRINT_INK, edgeWidth,
  type PaperKey, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import {
  capabilities, ownsMaker, FREE_MAKER, MAKER_PRICE, type MakerKey, type GridSize,
} from "../products/capabilities";
import { useAuth } from "../AuthContext";
import { buyMaker } from "./buyMaker";
import { ModeToggle } from "./erase";
import {
  AXIS_INK, VIEW, edgeKey, edgesEqual, samePoint, uid,
  type Edge, type Point,
} from "./core/geometry";
import {
  arrowSvgString, buildPageSvgFrame, paneFrameSvgString, paneSvgString, type LogoInfo,
} from "./core/page-svg";
import { exportPdf } from "./core/pdf-export";
import { ArrowSVG, PaperSVG, PreviewPage, PreviewPane, PrintPage } from "./core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "./core/useMakerEditor";
import { usePaperLayout } from "./core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, MakerFootSns, NoteBox, OneStrokeSeg,
  PaperGroup, PerPageGroup, PreviewShell, SavedPanel, SettingsFold,
} from "./core/chrome";
import { DoneScreen, hasDiagonal, recommendVols } from "./DoneScreen";

// =========================================================================
// Types
// GridSize（3..8）は capabilities.ts（ゲート SSOT）で定義。
// =========================================================================
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  selected: boolean;
};

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋模写固有のセル描画
// （みほん＋空欄ペイン＋矢印）。
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
  noDots?: boolean; // true=背景の点をとる（かくマス側に薄い枠を添える）
  ad?: boolean;     // true=無料版フッター広告（識別句＋URL＋QR）を載せる
}): string {
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const areaY = cy;
      const areaH = cellH;
      const aSize = gap * 0.9;
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        const ax = sx + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(ax, sy, pane, p.gridSize, [], false, dotScale, showDots);
        if (opts.noDots) body += paneFrameSvgString(ax, sy, pane);
        body += arrowSvgString(sx + pane + (gap - aSize) / 2, sy + pane / 2, aSize, "right");
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        const ay = sy + pane + gap;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(sx, ay, pane, p.gridSize, [], false, dotScale, showDots);
        if (opts.noDots) body += paneFrameSvgString(sx, ay, pane);
        body += arrowSvgString(sx + pane / 2, sy + pane + (gap - aSize) / 2, aSize, "down");
      }
      return body;
    },
  });
}

// =========================================================================
// MakerApp
// =========================================================================
export default function MakerApp({ initialOwned = [] }: { initialOwned?: MakerKey[] }) {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // ---- capabilities ----
  // 模写は無料で 4×4 まで（decisions §4.6/§4.7）。ゲートはグリッドサイズ 1 本＝
  // 用紙・問数・記名欄・保存・DL は無料でも全開放。5×5〜8×8 は ¥980 買い切りで解放。
  // 初期値は SSR の cookie（initialOwned）→ /api/me 確定値（useAuth）で置換。
  const { owned: liveOwned, ready } = useAuth();
  const owned = ready ? liveOwned : initialOwned;
  const isOwned = ownsMaker(owned, FREE_MAKER);
  const caps = capabilities(owned, FREE_MAKER);

  // 5×5 以上をクリック → 模写メーカーの買い切り（¥980）へ。owned になれば 8×8 まで解放。
  const [buying, setBuying] = useState(false);
  async function buyCopy() {
    if (buying) return;
    setBuying(true);
    try { await buyMaker(FREE_MAKER); }
    catch (e) { alert(e instanceof Error ? e.message : "購入に進めませんでした"); setBuying(false); }
  }
  // 大きい用紙など（COPY_FREE_CAPS では全開放なので未所有でも通常は出ない）の保険導線。
  function goMakers() {
    window.location.href = "/makers";
  }
  const lockHint = "ほかのメーカー（買い切り ¥980）で使えます";

  // ---- Editor state (current problem) ----
  // 初期グリッド: 所有なら 5×5、無料（4×4 上限）なら 4×4 から（SSR の initialOwned で確定）。
  const [gridSize, setGridSize] = useState<GridSize>(() => {
    const c = capabilities(initialOwned, FREE_MAKER);
    return (c.gridSizes.includes(5) ? 5 : c.gridSizes[c.gridSizes.length - 1]) as GridSize;
  });
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると終点クリック後にその点を次の線の始点として残す。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。細かいグリッドで連打が辛い人が ON にする。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を削除（描画は止まる）。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。ON でみほん・かくマスの点格子を消し、
  // かくマス側に薄い正方形の枠を残す。
  const [noDots, setNoDots] = useState(false);

  // history stack of edge arrays — index points at current state
  const hist = useEditorHistory<Edge[]>([], (s) => { setEdges(s); setSelected(null); });

  function clearAll() {
    hist.pushHistory([]);
    setEdges([]);
    setSelected(null);
  }

  // 消すモード: 線をクリック → その辺を削除
  function eraseEdge(i: number) {
    const updated = edges.filter((_, idx) => idx !== i);
    setEdges(updated);
    hist.pushHistory(updated);
  }

  function handleDot(p: Point) {
    if (erase) return; // 消すモードでは点クリックでは描かない
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    // 一筆書き ON: 線を引いた後、終点を次の線の始点として残す（連続描画）。
    // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
    const after = oneStroke ? p : null;
    if (edges.some((e) => edgeKey(e) === k)) {
      setSelected(after);
      return;
    }
    const updated = [...edges, next];
    setEdges(updated);
    hist.pushHistory(updated);
    setSelected(after);
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdges([]);
    setSelected(null);
    hist.resetHistory([]);
  }

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で上下/横を自動

  // Switching paper clamps a manual per-page count to that paper's legible maximum.
  function selectPaper(k: PaperKey) {
    if (!caps.papers.includes(k)) { goMakers(); return; }
    layout.selectPaper(k);
  }

  // 所有状態の確定（/api/me）で caps が変わったとき、各設定を現上限へ丸める。
  // caps は capabilities() が返すモジュール定数＝参照安定なので、所有が変化した時だけ発火する。
  useEffect(() => {
    if (!caps.gridSizes.includes(gridSize)) changeGridSize(caps.gridSizes[caps.gridSizes.length - 1]);
    if (!caps.papers.includes(paperKey)) layout.setPaperKey("A4-P");
    if (!caps.dotSizes.includes(dotSize)) setDotSize("m");
    if (!caps.nameField && nameField) setNameField(false);
    setPerPage((p) => (p !== "auto" && p > caps.perPageMax ? "auto" : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caps]);

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  const savedFull = saved.length >= caps.savedMax;
  // 編集後/新規保存の共通リセット（キャンバスを空に戻す）
  function resetCanvas() {
    setEdges([]);
    setSelected(null);
    hist.resetHistory([]);
  }
  function saveCurrent() {
    if (edges.length === 0) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    if (saved.length >= caps.savedMax) { goMakers(); return; } // 保存上限 → アップグレード導線
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
    hist.resetHistory(p.edges);
    setEditingId(id);
    hist.rerender();
  }
  // 編集をやめて新規モードへ（変更は破棄）
  function cancelEdit() {
    setEditingId(null);
    resetCanvas();
  }

  // ---- Derived: print payload ----
  // 1 ページ問数の実上限 = 用紙の上限 ∩ 所有の上限。
  const perPageCap = Math.min(paperMax(paperKey), caps.perPageMax);
  // おまかせ = 選択数を 1 ページに（上限でクランプ）。0 問時は 1 扱い。
  const effectivePerPage = perPage === "auto"
    ? Math.max(1, Math.min(perPageCap, selectedSaved.length))
    : Math.min(perPage, perPageCap);
  // おまかせ並び = 選択 2 問以下は上下（1 問でもスカスカに見えない）・3 問以上は横。
  const effectivePairLayout: PairLayout = pairLayout === "auto"
    ? (selectedSaved.length <= 2 ? "vertical" : "horizontal")
    : pairLayout;
  const pages = useMemo(
    () => chunkPages(selectedSaved, effectivePerPage),
    [selectedSaved, effectivePerPage]);

  // ---- 1 日の DL ソフトガード（ゲストのみ・localStorage・回避可能だが「無制限に見せない」）----
  const [todayExports, setTodayExports] = useState(0);
  const QUOTA_KEY = "tenzu_maker_quota";
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTA_KEY);
      if (raw) { const q = JSON.parse(raw); if (q && q.date === todayStr()) setTodayExports(q.count || 0); }
    } catch { /* 壊れた値は無視 */ }
  }, []);
  function bumpExports() {
    setTodayExports((n) => {
      const next = n + 1;
      try { localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: todayStr(), count: next })); } catch { /* quota 無視 */ }
      return next;
    });
  }
  const overDailyLimit = caps.dailyExports != null && todayExports >= caps.dailyExports;

  // ---- PDF ダウンロード → 完了画面 ----
  const [done, setDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  async function doExport() {
    if (selectedSaved.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportPdf({
        paper,
        pageCount: pages.length,
        buildPage: (pi, logo) => buildPageSvg({
          paper, problems: pages[pi],
          pageNo: pi + 1, pageCount: pages.length,
          marginMm, problemsPerPage: effectivePerPage, pairLayout: effectivePairLayout, nameField, dotScale, logo,
          noDots,
          // 無料版（4×4 まで・未所有）の紙にだけ店の導線を載せる。買った人の紙は従来どおり。
          ad: !isOwned,
        }),
        filename: (stamp) => `tenzu_${stamp}.pdf`,
      });
      bumpExports();
      setDone(true);
    } catch (err) {
      console.error("PDF export failed:", err);
      window.alert("PDF の作成に失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }

  // 書き出した問題から「最大グリッド」と「斜め線の使用」を判定
  const reco = useMemo(() => {
    if (selectedSaved.length === 0) return null;
    const maxGrid = Math.max(...selectedSaved.map((p) => p.gridSize)) as GridSize;
    const usedDiag = hasDiagonal(selectedSaved);
    return { maxGrid, usedDiag, vols: recommendVols(maxGrid, usedDiag) };
  }, [selectedSaved]);

  const editingTitle = editorTitle(saved, editingId);

  const paper = PAPER[paperKey];
  const frameStrokeWidth = Math.max(0.25, edgeWidth(VIEW) * 0.55);

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="模写メーカー">
        <div className="maker-auth">
          <a className="ma-link" href="/account">マイページ</a>
          <a className="ma-cta" href="/makers">ほかのメーカー</a>
        </div>
      </MakerHeader>

      {/* ============ DONE SCREEN ============ */}
      {done && reco ? (
        <DoneScreen reco={reco} count={selectedSaved.length} onBack={() => setDone(false)} />
      ) : (
      <>
      {/* ============ APP SHELL ============ */}
      <div className="app-shell">

        {/* ---------- CENTER ---------- */}
        <main className="canvas-area">
          <div className={`canvas-toolbar${isEditing ? " editing" : ""}`}>
            <div className="title">{editingTitle}</div>
          </div>

          {/* 作図の設定をタイトル直下のコンパクト帯に集約。各ラベル+操作は qb-group で一体折返し */}
          <div className="maker-quickbar" role="group" aria-label="作図の設定">
            <div className="qb-group">
              <span className="qb-label">グリッド</span>
              <select className="qb-select" aria-label="グリッドサイズ"
                value={gridSize}
                disabled={isEditing}
                onChange={(e) => {
                  const n = Number(e.target.value) as GridSize;
                  if (!caps.gridSizes.includes(n)) { buyCopy(); return; }
                  changeGridSize(n);
                }}>
                {([3, 4, 5, 6, 7, 8] as GridSize[]).map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}{caps.gridSizes.includes(n) ? "" : `（¥${MAKER_PRICE}で解放）`}
                  </option>
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
                  : !isOwned && (
                    <span className="qb-note">無料は 4×4 まで。5×5〜8×8 は ¥{MAKER_PRICE} の買い切りで解放できます。</span>
                  )}
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
                  dotScale={dotScale}
                />
                <div className="pp-stamp">{gridSize}×{gridSize}</div>
              </div>
            </div>
            <div className="canvas-actions">
              <button className="btn-save" type="button" onClick={saveCurrent}
                disabled={isEditing ? edges.length === 0 : (edges.length === 0 && !savedFull)}>
                {isEditing ? "変更を保存" : "この問題を保存する"}
              </button>
              {isEditing && (
                <button className="btn-cancel-edit" type="button" onClick={cancelEdit}>
                  やめる
                </button>
              )}
              {savedFull && !isEditing && (
                <p className="save-cap-note">
                  模写メーカーで保存できるのは {caps.savedMax} 問まで。
                  <a href="/makers">ほかのメーカー（買い切り）は保存無制限 →</a>
                </p>
              )}
            </div>
            <div className="canvas-help">
              {isEditing
                ? "保存済みの問題を編集中です。線を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : "点をクリックして線をつなぎます。印刷時は、同じ大きさの書き込み用の空欄がセットで付きます。仕上がりは「出力プレビュー」で確認できます。"}
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

          <SettingsFold
            current={`用紙: ${paper.label} · 問数: ${perPage === "auto" ? "おまかせ" : `${perPage}問/頁`} · 並び: ${pairLayout === "auto" ? "おまかせ" : pairLayout === "horizontal" ? "横" : "上下"} · 名前欄: ${nameField ? "あり" : "なし"} · 背景の点: ${noDots ? "なし" : "あり"}`}>
            <PaperGroup
              paperKey={paperKey}
              onSelect={selectPaper}
              isLocked={(k) => !caps.papers.includes(k)}
              lockHint={lockHint} />
            <PerPageGroup
              perPage={perPage}
              onAuto={() => setPerPage("auto")}
              onPick={setPerPage}
              paperKey={paperKey}
              pair={effectivePairLayout}
              marginMm={marginMm}
              isLocked={(v) => v > caps.perPageMax}
              onLockedPick={goMakers}
              lockHint={lockHint} />

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

            <NameFieldGroup
              value={nameField}
              onChange={setNameField}
              locked={!caps.nameField}
              onLockedPick={goMakers}
              lockHint={lockHint} />

            <div className="group">
              <h3>背景の点</h3>
              <label className="chk-row">
                <input type="checkbox" checked={noDots}
                  onChange={(e) => setNoDots(e.target.checked)} />
                <span>背景の点をとる</span>
              </label>
              <p className="seg-hint">
                見本・書き込み欄の両方から点を消します。書き込み欄には薄い枠だけが残ります（白紙模写の練習形式）。
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
            after={<>
              <div data-onsite-anchor="maker-pdf" />
              {overDailyLimit && (
                <p className="daily-nudge">
                  きょうは {caps.dailyExports} 枚そろいました。もっと作りたくなったら
                  <a href="/makers"> ほかのメーカーも（買い切り ¥980）→</a>
                </p>
              )}
              <button className="btn-export" type="button"
                onClick={doExport} disabled={selectedSaved.length === 0 || exporting}>
                {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
                {!exporting && selectedSaved.length > 0 && (
                  <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
                )}
              </button>
            </>}>
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
                  const aSize = gap * 0.9;
                  if (pair === "horizontal") {
                    const pairW = pane * 2 + gap;
                    const startX = (cellW - pairW) / 2;
                    const startY = (cellH - pane) / 2;
                    return (
                      <>
                        <PreviewPane x={startX} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds}
                          showDots={!noDots} />
                        <PreviewPane x={startX + pane + gap} y={startY} w={pane} h={pane}
                          gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds}
                          showDots={!noDots} frame={noDots} />
                        <ArrowSVG
                          x={startX + pane + (gap - aSize) / 2}
                          y={startY + pane / 2}
                          size={aSize}
                          dir="right"
                          color={PRINT_INK}
                        />
                      </>
                    );
                  }
                  const pairH = pane * 2 + gap;
                  const startX = (cellW - pane) / 2;
                  const startY = (cellH - pairH) / 2;
                  return (
                    <>
                      <PreviewPane x={startX} y={startY} w={pane} h={pane}
                        gridSize={p.gridSize} edges={p.edges} showLines={true} dotScale={ds}
                        showDots={!noDots} />
                      <PreviewPane x={startX} y={startY + pane + gap} w={pane} h={pane}
                        gridSize={p.gridSize} edges={[]} showLines={false} dotScale={ds}
                        showDots={!noDots} frame={noDots} />
                      <ArrowSVG
                        x={startX + pane / 2}
                        y={startY + pane + (gap - aSize) / 2}
                        size={aSize}
                        dir="down"
                        color={PRINT_INK}
                      />
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
          <button type="button" onClick={doExport} disabled={exporting}>
            {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
            {!exporting && (
              <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
            )}
          </button>
        </div>
      )}
      </>
      )}

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
// 模写固有の印刷サブコンポーネント（みほん → 矢印 → 空欄）。
// noDots=true で背景ドットを省き、かくマス側にだけ薄い正方形の枠を重ねる。
// =========================================================================
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
