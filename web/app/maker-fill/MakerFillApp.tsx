"use client";

/* =========================================================================
   欠け補完メーカー（内部用・/maker-fill）
   copy のおためし点描写メーカー（/maker）と同じ scaffolding で、F（完全図）と
   R（抜く線）の二モード編集を持つ。R の選択 UI が本質的な差分。
   - 保存問題は { gridSize, edges: F, rEdges: R }
   - PDF/プレビューはみほんペイン=F・かくマスペイン=G(=F∖R)
   ヘッダー・LP・フッターから動線なし。robots noindex。
   共通実装（盤面・ページ SVG・PDF・保存パネル等）は maker/core/ を参照。
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  PAPER, paperMax, PRINT_INK, SCREEN_DOT,
  type PaperKey, type PairLayout,
} from "../products/print";
import { PairChipIcon } from "../products/SkuPrintPreview";
import { useAuth } from "../AuthContext";
import { ownsMaker } from "../products/capabilities";
import { buyMaker } from "../maker/buyMaker";
import { EdgeHitLayer } from "../maker/erase";
import {
  VIEW, INK, dotPos, edgeKey, edgesEqual, pointKey, samePoint, uid,
  type Edge, type Point,
} from "../maker/core/geometry";
import {
  arrowSvgString, buildPageSvgFrame, paneSvgString, type LogoInfo,
} from "../maker/core/page-svg";
import { exportPdf } from "../maker/core/pdf-export";
import { ArrowSVG, PreviewPage, PreviewPane, PrintPage } from "../maker/core/PaperSVG";
import {
  chunkPages, editorTitle, useEditorHistory, useSavedList,
} from "../maker/core/useMakerEditor";
import { usePaperLayout } from "../maker/core/usePaperLayout";
import {
  DotSizeSeg, EditActions, MakerHeader, NameFieldGroup, MakerFootSns, NoteBox, OneStrokeSeg,
  PaperGroup, PerPageGroup, PreviewShell, SavedPanel, SettingsFold,
} from "../maker/core/chrome";

// =========================================================================
// Types & constants
// レイアウトエンジン（PAPER/gridFor/paneSize 等）は products/print.ts（SSOT）から import
// =========================================================================
type GridSize = 3 | 4 | 5 | 6;

/* edges = F（完全図）／ rEdges = R（抜く線・F の部分集合）。G=F∖R は描画時に算出 */
type Problem = {
  id: string;
  name: string;
  gridSize: GridSize;
  edges: Edge[];
  rEdges: Edge[];
  selected: boolean;
};

const R_INK = "#AEB6BF"; // R の薄色（atelier GHOST と同色）

function gapOf(edges: Edge[], rEdges: Edge[]): Edge[] {
  if (rEdges.length === 0) return edges;
  const rKeys = new Set(rEdges.map(edgeKey));
  return edges.filter((e) => !rKeys.has(edgeKey(e)));
}

/* 内部用ツールのため完了画面のレコメンドは省略（copy 側のみ） */

// =========================================================================
// PDF ページ生成 — 共通フレーム（maker/core/page-svg）＋欠け補完固有のセル描画
// （みほんペイン=F・かくマスペイン=G(=F∖R)・矢印）。
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
  noDots?: boolean; // true=背景の点をとる（かくマス側は既に欠け図の線があるため枠は付けない）
}): string {
  const showDots = !opts.noDots;
  return buildPageSvgFrame<Problem>({
    ...opts,
    renderCell: (p, ctx) => {
      const { cx, cy, cellW, cellH, pane, gap, pairLayout, dotScale } = ctx;
      const areaY = cy;
      const areaH = cellH;
      const aSize = gap * 0.9;
      const gapEdges = gapOf(p.edges, p.rEdges);
      let body = "";
      if (pairLayout === "horizontal") {
        const pairW = pane * 2 + gap;
        const sx = cx + (cellW - pairW) / 2;
        const sy = areaY + (areaH - pane) / 2;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(sx + pane + gap, sy, pane, p.gridSize, gapEdges, true, dotScale, showDots);
        body += arrowSvgString(sx + pane + (gap - aSize) / 2, sy + pane / 2, aSize, "right");
      } else {
        const pairH = pane * 2 + gap;
        const sx = cx + (cellW - pane) / 2;
        const sy = areaY + (areaH - pairH) / 2;
        body += paneSvgString(sx, sy, pane, p.gridSize, p.edges, true, dotScale, showDots);
        body += paneSvgString(sx, sy + pane + gap, pane, p.gridSize, gapEdges, true, dotScale, showDots);
        body += arrowSvgString(sx + pane / 2, sy + pane + (gap - aSize) / 2, aSize, "down");
      }
      return body;
    },
  });
}

// =========================================================================
// Paper pane SVG (used both in canvas and PDF preview)
// fill 固有: rEdges（抜く線）を薄色点線で重ねる二層描画のため maker-local に保持
// =========================================================================
function PaperSVG({
  gridSize,
  edges,
  rEdges,
  selected,
  onDotClick,
  onEdgeErase,
  erase = false,
  showLines,
  showActiveHighlight,
  ink = INK,
  dotScale = 1,
  showDots = true,
}: {
  gridSize: GridSize;
  edges: Edge[];
  rEdges?: Edge[];
  selected?: Point | null;
  onDotClick?: (p: Point) => void;
  onEdgeErase?: (i: number) => void;
  erase?: boolean;
  showLines: boolean;
  showActiveHighlight?: boolean;
  ink?: string;
  dotScale?: number;
  showDots?: boolean; // false=背景ドットを描かない（図形模写トライアル）
}) {
  const rKeySet = rEdges && rEdges.length > 0 ? new Set(rEdges.map(edgeKey)) : null;
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
          const inR = rKeySet?.has(edgeKey(e));
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={inR ? R_INK : ink}
              strokeWidth="1.6"
              strokeDasharray={inR ? "4 3" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
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
      {interactive && erase && onEdgeErase && (
        <EdgeHitLayer edges={edges} pos={(c, r) => dotPos(c, r, dots)} onErase={onEdgeErase} />
      )}
    </svg>
  );
}

// =========================================================================
// MakerFillApp
// =========================================================================
type EditMode = "F" | "R";
type Snap = { edges: Edge[]; rEdges: Edge[] };

export default function MakerFillApp() {
  // Body class for global background
  useEffect(() => {
    document.body.classList.add("maker-page");
    return () => document.body.classList.remove("maker-page");
  }, []);

  // PDF 書き出しは買い切り所有が必要（未所有なら購入へ誘導）。
  const { owned, ready } = useAuth();
  const isOwned = ownsMaker(owned, "fill");

  // ---- Editor state (current problem) ----
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [edges, setEdges] = useState<Edge[]>([]);   // F
  const [rEdges, setREdges] = useState<Edge[]>([]); // R（F の部分集合）
  const [mode, setMode] = useState<EditMode>("F");
  const [selected, setSelected] = useState<Point | null>(null);
  // 一筆書きモード（既定 OFF）: ON にすると F モードで終点クリック後にその点を
  // 次の線の始点として残す（連続描画）。R モード（線の選択）には効かない。
  // 初見は「2 点クリックで 1 本」が直感的なので OFF 既定。
  const [oneStroke, setOneStroke] = useState(false);
  // 消す（消しゴム）モード。ON のあいだは線をクリックでその1本を F（＋連動する R）から削除。
  const [erase, setErase] = useState(false);
  function changeErase(v: boolean) { setErase(v); setSelected(null); }
  // 編集中の保存問題 id（null=新規作成モード）。set されると保存ボタンが「変更を保存」に変身。
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId != null;
  // 背景の点をとる（白紙模写形式）。かくマス側は元々欠け図の線があるため、枠は付けず点だけ消す。
  const [noDots, setNoDots] = useState(false);

  // history stack — both F and R per snapshot
  function applySnap(s: Snap) {
    setEdges(s.edges);
    setREdges(s.rEdges);
    setSelected(null);
  }
  const hist = useEditorHistory<Snap>({ edges: [], rEdges: [] }, applySnap);

  function clearAll() {
    /* F モード: 全消し（R も連動して空） / R モード: R だけ戻す */
    if (mode === "F") {
      hist.pushHistory({ edges: [], rEdges: [] });
      setEdges([]); setREdges([]);
    } else {
      hist.pushHistory({ edges, rEdges: [] });
      setREdges([]);
    }
    setSelected(null);
  }

  // 消すモード: 線をクリック → その辺を F から削除（R に入っていたら R からも消す）
  function eraseEdge(i: number) {
    const k = edgeKey(edges[i]);
    const updatedF = edges.filter((_, idx) => idx !== i);
    const updatedR = rEdges.filter((e) => edgeKey(e) !== k);
    setEdges(updatedF); setREdges(updatedR);
    hist.pushHistory({ edges: updatedF, rEdges: updatedR });
  }

  function handleDot(p: Point) {
    if (erase) return; // 消すモードでは点クリックでは描かない
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: Edge = { a: selected, b: p };
    const k = edgeKey(next);
    if (mode === "F") {
      // 一筆書き ON: 操作後、終点を次の線の始点として残す（連続描画）。
      // OFF: 従来どおり選択解除（線ごとに 2 点クリック）。
      const after = oneStroke ? p : null;
      if (edges.some((e) => edgeKey(e) === k)) {
        // 既存 F 線をもう一度なぞる→消す（R にも入っていたら R からも消す）
        const updatedF = edges.filter((e) => edgeKey(e) !== k);
        const updatedR = rEdges.filter((e) => edgeKey(e) !== k);
        setEdges(updatedF); setREdges(updatedR);
        hist.pushHistory({ edges: updatedF, rEdges: updatedR });
        setSelected(after);
        return;
      }
      const updated = [...edges, next];
      setEdges(updated);
      hist.pushHistory({ edges: updated, rEdges });
      setSelected(after);
    } else {
      // R モード: F の中からだけ R にできる
      const inF = edges.some((e) => edgeKey(e) === k);
      if (!inF) { setSelected(null); return; }
      const inR = rEdges.some((e) => edgeKey(e) === k);
      const updated = inR
        ? rEdges.filter((e) => edgeKey(e) !== k)
        : [...rEdges, next];
      setREdges(updated);
      hist.pushHistory({ edges, rEdges: updated });
      setSelected(null);
    }
  }

  function changeGridSize(n: GridSize) {
    if (n === gridSize) return;
    if (editingId) return; // 編集中はグリッド固定（変えると編集中の線が消える事故になる）
    setGridSize(n);
    setEdges([]); setREdges([]);
    setSelected(null);
    hist.resetHistory({ edges: [], rEdges: [] });
  }

  /* 公平性チェック（R の両端点が G に残るか）。fill.ts 由来の公平性ルール */
  const fairness = useMemo(() => {
    if (rEdges.length === 0) return { ok: true, msg: "" };
    const G = gapOf(edges, rEdges);
    const ptsG = new Set<string>();
    for (const e of G) { ptsG.add(pointKey(e.a)); ptsG.add(pointKey(e.b)); }
    const lonely = rEdges.filter((e) =>
      !ptsG.has(pointKey(e.a)) || !ptsG.has(pointKey(e.b)));
    return lonely.length === 0
      ? { ok: true, msg: `抜く線 ${rEdges.length} 本・公平性 OK` }
      : { ok: false, msg: `抜く線 ${rEdges.length} 本・つなぐ先が見えない ${lonely.length} 本` };
  }, [edges, rEdges]);

  // ---- Paper / layout state ----
  const layout = usePaperLayout();
  const { paperKey, selectPaper, marginMm, perPage, setPerPage, nameField, setNameField, dotSize, setDotSize, dotScale } = layout;
  const [pairLayout, setPairLayout] = useState<"auto" | PairLayout>("auto"); // おまかせ=選択数で上下/横を自動

  // ---- Saved problems ----
  const list = useSavedList<Problem>();
  const { saved, setSaved, savingNo, setSavingNo, selectedSaved, selectAllState } = list;

  // 編集後/新規保存の共通リセット（キャンバスを空に戻す。モードは既定 F へ）
  function resetCanvas() {
    setEdges([]); setREdges([]);
    setMode("F");
    setSelected(null);
    hist.resetHistory({ edges: [], rEdges: [] });
  }
  function saveCurrent() {
    if (edges.length === 0) return;
    if (editingId) {
      // 編集モード: その場で上書き（並び順・PDF 選択・名前は保持）→ 新規モードに戻る
      setSaved((s) => s.map((p) => (p.id === editingId ? { ...p, gridSize, edges, rEdges } : p)));
      setEditingId(null);
      resetCanvas();
      return;
    }
    const id = uid();
    const name = `無題 ${savingNo.toString().padStart(2, "0")}`;
    setSaved((s) => [...s, { id, name, gridSize, edges, rEdges, selected: true }]);
    setSavingNo((n) => n + 1);
    resetCanvas();
  }
  // 保存済み問題をエディタに読み込んで編集モードへ。未保存の変更があれば確認。
  function startEdit(id: string) {
    if (id === editingId) return; // すでにこれを編集中
    const p = saved.find((x) => x.id === id);
    if (!p) return;
    const dirty = editingId
      ? (() => {
          const o = saved.find((x) => x.id === editingId);
          return !o || !edgesEqual(edges, o.edges) || !edgesEqual(rEdges, o.rEdges);
        })()
      : edges.length > 0;
    if (dirty && !window.confirm(editingId
      ? "編集中の変更は保存されていません。破棄して別の問題を編集しますか？"
      : "作りかけの問題があります。破棄して編集しますか？")) return;
    setGridSize(p.gridSize);
    setEdges(p.edges);
    setREdges(p.rEdges);
    setMode("F");
    setSelected(null);
    hist.resetHistory({ edges: p.edges, rEdges: p.rEdges });
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
  const [exporting, setExporting] = useState(false);
  async function doExport() {
    if (selectedSaved.length === 0 || exporting) return;
    if (ready && !isOwned) { buyMaker("fill").catch(() => {}); return; }
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
        }),
        // tenzu_yyyymmddhhmm.pdf — 2回目以降の上書き事故を防ぐタイムスタンプ命名
        filename: (stamp) => `tenzu_${stamp}.pdf`,
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

  return (
    <>
      {/* dynamic @page size for print */}
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 0; } }`}</style>

      {/* ============ HEADER ============ */}
      <MakerHeader appName="欠け補完メーカー（内部用）" />

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

          {/* 作図の設定（グリッド・点の大きさ・一筆書き・編集モード）をタイトル直下のコンパクト帯に集約 */}
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
            <div className="qb-group">
              <span className="qb-label">モード</span>
              <div className="seg qb-seg modeseg" role="group" aria-label="モード">
                <button type="button" aria-pressed={!erase && mode === "F"}
                  onClick={() => { changeErase(false); setMode("F"); }}>描く</button>
                <button type="button" aria-pressed={!erase && mode === "R"}
                  onClick={() => { changeErase(false); setMode("R"); }}
                  disabled={edges.length === 0}>抜く線を選ぶ</button>
                <button type="button" aria-pressed={erase}
                  onClick={() => changeErase(true)}>消す</button>
              </div>
            </div>
            <DotSizeSeg value={dotSize} onChange={setDotSize} />
            <OneStrokeSeg value={oneStroke} onChange={setOneStroke} />
            {isEditing && <span className="qb-note">編集中はグリッドは固定されます。</span>}
            {fairness.msg && (
              <span className={`qb-note${fairness.ok ? "" : " is-bad"}`}>{fairness.msg}</span>
            )}
            {oneStroke && <span className="qb-note">一筆書き ON：点を続けてクリックすると、線がつながります。</span>}
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
                  rEdges={rEdges}
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
                ? "保存済みの問題を編集中です。線（完成図・抜く線）を直して「変更を保存」を押すと、元の問題が上書きされます（並び順とPDF選択はそのまま）。"
                : mode === "F"
                  ? "「完成図を描く」: 点を 2 つクリックして線を引く／同じ線をもう一度なぞると消える。先にこちらで完成図を作ってから「抜く線を選ぶ」へ。"
                  : "「抜く線を選ぶ」: 完成図の上の線をクリックすると、子が描き足す欠けに。もう一度クリックで戻る。抜いた線は薄色点線で表示。"}
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
            renderThumb={(p) => <PaperSVG gridSize={p.gridSize} edges={p.edges} rEdges={p.rEdges} showLines={true} />}
          />

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
                完成図・欠け図の両方から点を消します。欠け図は元々線があるため枠は付きません。
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
              <button className="btn-export" type="button"
                onClick={doExport} disabled={selectedSaved.length === 0 || exporting}>
                {exporting ? "PDF を作成中…" : "PDF をダウンロード"}
                {!exporting && selectedSaved.length > 0 && (
                  <span className="x">{selectedSaved.length} 問 / {pages.length} ページ</span>
                )}
              </button>
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
                  const aSize = gap * 0.9;
                  const gapEdges = gapOf(p.edges, p.rEdges);
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
                          gridSize={p.gridSize} edges={gapEdges} showLines={true} dotScale={ds}
                          showDots={!noDots} />
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
                        gridSize={p.gridSize} edges={gapEdges} showLines={true} dotScale={ds}
                        showDots={!noDots} />
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
            renderPair={(p) => <ProblemPair p={p} pairLayout={effectivePairLayout} dotScale={dotScale} noDots={noDots} />} />
        ))}
      </div>
    </>
  );
}

// =========================================================================
// 欠け補完固有の印刷サブコンポーネント（みほん=F → 矢印 → かくマス=G(=F∖R)）
// =========================================================================
function ProblemPair({ p, pairLayout, dotScale, noDots }: {
  p: Problem; pairLayout: PairLayout; dotScale: number; noDots: boolean;
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
          <PaperSVG gridSize={p.gridSize} edges={gapOf(p.edges, p.rEdges)} showLines={true} ink={PRINT_INK}
            dotScale={dotScale} showDots={!noDots} />
        </div>
      </div>
    </>
  );
}
