"use client";

/* =========================================================================
   検品 UI 本体（dev 限定・/atelier/[sku]）
   候補サムネ一覧 → 採用トグル → 採用レーンで並び替え（＝巻内出題順）→
   12 問ちょうどで「公開する」。変更は都度 /api/atelier/candidates へ書き戻し。
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Candidate, CandidateFile, EdgeT, Pt, Problem, SolidEdge, SolidGrid,
} from "../products/problems/schema";
import {
  metricsLabel, normalizeEdges, splitAtLattice, edgeKey, mirrorEdges, TASK_ANSWER_MODE,
  solidEdgeKey, normalizeSolidEdges, applySolidHidden, solidHiddenIsOn,
} from "../products/problems/schema";
import { computeMetrics, computeSolidMetrics, interCrossings, mergedSegments } from "../products/problems/gen/metrics";
import {
  ladderChips, ladderFieldsFor, GRID_MIN, GRID_MAX, type LadderField,
} from "../products/problems/ladder-schema";
import {
  baseDifficulty, separationLoad, taskDifficulty, boardTermText,
  foldFactor, foldInvariance,
  D_BASE_FORMULA, D_TASK_FULL_FORMULA, D_TASK_EXCLUDES,
} from "../products/problems/gen/difficulty";
import { dBreakdown } from "../products/coverage";
import { QUESTIONS_PER_VOL } from "../products/data";
import { EdgeHitLayer } from "../maker/erase";
import { SCREEN_DOT } from "../products/print";
import { SolidPaperSVG, editorVB, type Point } from "../maker-solid/SolidPaperSVG";
import type { LineStyle } from "../maker-solid/solid-print";

const INK = "#3A424E";
const ACCENT = "#2C6E7F";
const GHOST = "#AEB6BF";   // 折り返した解答側（みほんと区別する薄色）

/* derived(mirror) answer なら対称軸の種類を返す。それ以外は null */
function mirrorAxisOf(answer: Problem["answer"]): "v" | "h" | "d1" | "d2" | null {
  return answer?.mode === "derived" && answer.transform.type === "mirror"
    ? answer.transform.axis
    : null;
}

/* answer の種類に応じて「実線（子が見る出題図）」と「ゴースト（解答側＝薄色点線）」へ
   辺を振り分ける（mirror 以外用）。
   - fill(explicit) : edges＝完全図 F・answer.edges＝抜いた線 R。実線＝F∖R（欠け図 G）
     ／ゴースト＝R（子が描き足す線）
   - none           : 実線＝edges のみ
   mirror(derived) は ProblemSvg 側で別ペイン描画するので、ここでは扱わない */
function splitForDisplay(
  edges: EdgeT[], answer: Problem["answer"],
): { solid: EdgeT[]; ghost: EdgeT[] } {
  if (answer?.mode === "explicit") {
    const removed = new Set(answer.edges.map(edgeKey));
    return { solid: edges.filter((e) => !removed.has(edgeKey(e))), ghost: answer.edges };
  }
  return { solid: edges, ghost: [] };
}

/* 軸の点線（1 ペイン 0..100 のローカル座標） */
function AxisLineLocal({ axis }: { axis: "v" | "h" | "d1" | "d2" }) {
  const p = { stroke: ACCENT, strokeWidth: 0.7, strokeDasharray: "3 2", opacity: 0.75 } as const;
  if (axis === "v") return <line x1={50} y1={4} x2={50} y2={96} {...p} />;
  if (axis === "h") return <line x1={4} y1={50} x2={96} y2={50} {...p} />;
  if (axis === "d1") return <line x1={6} y1={6} x2={94} y2={94} {...p} />;
  return <line x1={94} y1={6} x2={6} y2={94} {...p} />; // d2
}

/* 1 ペイン分の描画（格子点＋辺＋軸線）— 0..100 のローカル座標で完結。
   ox/oy: viewBox 内の左上原点。across-pane レイアウトでこれを 2 つ並べる。
   ghost=辺を薄色点線で（移動の解答プレビュー）／star=★きてん／ring=●ここへ */
function PaneFig({
  n, edges, axis, ox = 0, oy = 0, ghost = false, star, ring, ghostOverlay,
}: {
  n: number; edges: EdgeT[]; axis?: "v" | "h" | "d1" | "d2"; ox?: number; oy?: number;
  ghost?: boolean; star?: Pt; ring?: Pt;
  /* 実線ペインの上へ薄色点線で重ねる辺（fold＝折り返した問題1のプレビュー） */
  ghostOverlay?: EdgeT[];
}) {
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  return (
    <g transform={`translate(${ox} ${oy})`}>
      <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
      {Array.from({ length: n * n }, (_, i) => (
        <circle key={`d${i}`} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.6} fill={INK} />
      ))}
      {axis && <AxisLineLocal axis={axis} />}
      {edges.map((e, i) => (
        <line key={i}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={ghost ? GHOST : INK} strokeWidth={ghost ? 1.5 : 1.7}
          {...(ghost ? { strokeDasharray: "3 2" } : {})} strokeLinecap="round" />
      ))}
      {ghostOverlay?.map((e, i) => (
        <line key={`go${i}`}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={GHOST} strokeWidth={1.5} strokeDasharray="3 2" strokeLinecap="round" />
      ))}
      {star && <circle cx={pos(star[0])} cy={pos(star[1])} r={3.4} fill={ACCENT} opacity={0.9} />}
      {ring && (
        <circle cx={pos(ring[0])} cy={pos(ring[1])} r={3.4}
          fill="none" stroke={ACCENT} strokeWidth={1.2} opacity={0.9} />
      )}
    </g>
  );
}

/* ---- 候補サムネ SVG。
   mirror: 左ペイン=F・右ペイン=mirror(F)（解答）の across-pane で表示。
           h 軸だけは上下に並べる。検品者が「出題→解答」の対応を一目で確認できる。
   fill   : 実線=F∖R（欠け図 G）／ゴースト=R を 1 ペイン重ね描き
   none   : F のみ 1 ペイン
   ---- */
function ProblemSvg({
  n, edges, answer, inputB, size = 132,
}: { n: number; edges: EdgeT[]; answer?: Problem["answer"]; inputB?: EdgeT[]; size?: number }) {
  /* 折り重ね（fold）: 問題1(A=edges) ｜ 問題2(B=inputB) の across-pane。
     右ペインに折り返した問題1（=mirror(A,v)）を薄色点線で重ねる＝
     折り重ね結果（実線∪点線）まで一目で検品できる。 */
  if (inputB) {
    return (
      <svg viewBox="0 0 200 100" width={size * 2} height={size}
        className="atl-thumb" aria-label="折り重ね: 左=問題1／右=問題2（うすい線=折り返した問題1）">
        <PaneFig n={n} edges={edges} />
        <PaneFig n={n} edges={inputB} ghostOverlay={mirrorEdges(edges, n, "v")} ox={100} />
      </svg>
    );
  }
  const axis = mirrorAxisOf(answer);
  /* mirror: across-pane（左=みほん F／右=解答 mirror(F)）。
     ★ 軸によらず必ず横並び（2026-07-31・translate と同じ理由）。以前は h 軸のとき
       上下に積んでいたが、鏡の軸は問題の性質ではない：
       ①子が見る軸（左右反転か上下反転か）は印刷時の並び選択で決まり、answer の
         axis は「サムネ・難易度計算のための代表値」として v を焼いているだけ
         （gen/mirror.ts の冒頭・decisions §3.59）。ladder にも軸フィールドは無い
       ②実データは candidates・published とも全問 axis="v"＝縦積みは一度も発動しない
         死に分岐だった（atelier の作成も axis:"v" 固定・軸を選ぶ UI は無い）
       ③エディタの回答ペインは元から常に横並び＝サムネだけ食い違っていた */
  if (axis) {
    const R = mirrorEdges(edges, n, axis);
    return (
      <svg viewBox="0 0 200 100" width={size * 2} height={size}
        className="atl-thumb" aria-label="鏡: 左=みほん／右=解答">
        <PaneFig n={n} edges={edges} />
        <PaneFig n={n} edges={R} ox={100} />
      </svg>
    );
  }
  /* translate: across-pane（左=もとの図 F＋★きてん／右=解答 F'（薄色点線）＋●ここへ）。
     紙面の右ペインは空＋●だけ＝検品では解答をゴーストで重ねて見せる。
     ★＝F の辞書順最小点・●＝★+(dc,dr)（gen/translate.ts と同じ導出規約）。
     ★ 移動の向きによらず必ず横並び（2026-07-31）。以前は縦移動（dc=0）だけ
       上下に積んでいたが、これは間違いだった：
       ①紙面の並び（pair）は買った人が印刷時に選ぶ設定で、既定は「横に並べる」。
         移動ベクトルでは決まらない（SkuPrintPreview）
       ②lv2 は dir:hv＝1 巻に左右と上下が混在する（decisions §3.85）ため、
         積むとカードの縦横比が巻の中でバラバラになり一覧が読みにくい
       ③エディタの回答ペインは元から常に横並び＝サムネだけ食い違っていた
     移動の向きは ★→● の目じるしで読み取る（紙面と同じ手がかり）。 */
  const tr = answer?.mode === "derived" && answer.transform.type === "translate"
    ? answer.transform : null;
  if (tr && edges.length > 0) {
    const F2 = edges.map((e) => [
      [e[0][0] + tr.dc, e[0][1] + tr.dr], [e[1][0] + tr.dc, e[1][1] + tr.dr],
    ] as EdgeT);
    let anchor: Pt = edges[0][0];
    for (const e of edges) for (const p of e) {
      if (p[0] < anchor[0] || (p[0] === anchor[0] && p[1] < anchor[1])) anchor = p;
    }
    const target: Pt = [anchor[0] + tr.dc, anchor[1] + tr.dr];
    return (
      <svg viewBox="0 0 200 100" width={size * 2} height={size}
        className="atl-thumb" aria-label="移動: 左=もとの図／右=うつした図（うすい線=こたえ）">
        <PaneFig n={n} edges={edges} star={anchor} />
        <PaneFig n={n} edges={F2} ghost ring={target} ox={100} />
      </svg>
    );
  }
  /* rotate: across-pane（左=みほん F／右=解答=盤面中心まわりに回した図・薄色点線）。
     回転規約は maker-rotate / schema TransformSpec と同一（deg=90 右回り・-90 左回り・180）。 */
  const rot = answer?.mode === "derived" && answer.transform.type === "rotate"
    ? answer.transform : null;
  if (rot && edges.length > 0) {
    const rp = (p: Pt): Pt =>
      rot.deg === 90 ? [n - 1 - p[1], p[0]]
        : rot.deg === -90 ? [p[1], n - 1 - p[0]]
          : [n - 1 - p[0], n - 1 - p[1]];
    const R = edges.map((e) => [rp(e[0]), rp(e[1])] as EdgeT);
    const degLabel = rot.deg === -90 ? "90°左回り" : rot.deg === 90 ? "90°右回り" : "180°";
    return (
      <svg viewBox="0 0 200 100" width={size * 2} height={size}
        className="atl-thumb" aria-label={`回転: 左=みほん／右=解答（${degLabel}・うすい線）`}>
        <PaneFig n={n} edges={edges} />
        <PaneFig n={n} edges={R} ghost ox={100} />
      </svg>
    );
  }
  /* mirror 以外: 従来通り 1 ペイン */
  const { solid, ghost } = splitForDisplay(edges, answer);
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="atl-thumb" aria-hidden>
      <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
      {Array.from({ length: n * n }, (_, i) => (
        <circle key={i} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.6} fill={INK} />
      ))}
      {ghost.map((e, i) => (
        <line key={`g${i}`}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={GHOST} strokeWidth={1.5} strokeDasharray="3 2" strokeLinecap="round" />
      ))}
      {solid.map((e, i) => (
        <line key={i}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
      ))}
    </svg>
  );
}


/* 立体の候補サムネ（読取専用）。抽出した SolidPaperSVG を viewBox 比で箱に収める。
   隠れ辺は点線で描かれる（buildSolidPageSvg と同じ規約）。 */
function SolidThumb({ grid, edges, size = 120 }: { grid: SolidGrid; edges: SolidEdge[]; size?: number }) {
  const { vw, vh } = editorVB(grid.cols, grid.rows);
  const H = size;
  const W = Math.round((size * vw) / vh);
  return (
    <div className="atl-thumb atl-thumb--solid" style={{ width: W, height: H }}>
      <SolidPaperSVG cols={grid.cols} rows={grid.rows} edges={edges} showLines />
    </div>
  );
}

/* 候補がどの生成エンジンで作られたか（gen.variant 接頭辞から）。撤去した枠分割の代わりに
   各カードの D 内訳の隣に小さく出す。rand#=ランダム分割／blob#=自由形／hybrid#=合成／他=対称・幾何。 */
function engineLabel(variant?: string): string {
  if (variant?.startsWith("rand#")) return "ランダム";
  if (variant?.startsWith("blob#")) return "自由形";
  if (variant?.startsWith("hybrid#")) return "ハイブリッド";
  return "対称・幾何";
}

/* 移動量の言い回し（右1・下2 など。maker-translate と同じ規約）。
   カードのラベル・編集ペインの表示・移動マス目の tooltip が共用する。 */
function moveWords(dc: number, dr: number): string {
  if (dc === 0 && dr === 0) return "移動なし";
  return [
    dc > 0 ? `右${dc}` : dc < 0 ? `左${-dc}` : "",
    dr > 0 ? `下${dr}` : dr < 0 ? `上${-dr}` : "",
  ].filter(Boolean).join("・");
}

/* 移動カードの方向・量ラベル（右1・下1・右2 など）。answer.transform から導出＝
   一覧で「12 問の方向の散らばり」を一目で検品できる。 */
function moveLabelOf(c: Candidate): string {
  const t = c.answer?.mode === "derived" && c.answer.transform.type === "translate"
    ? c.answer.transform : null;
  if (!t) return "";
  if (t.dc === 0 && t.dr === 0) return "移動なし";
  return [
    t.dc > 0 ? `右${t.dc}` : t.dc < 0 ? `左${-t.dc}` : "",
    t.dr > 0 ? `下${t.dr}` : t.dr < 0 ? `上${-t.dr}` : "",
  ].filter(Boolean).join("・");
}

/* このタスクの完全な難易度式（atl-dhelp 見出し用）。
   検品中は「土台の式のまま」と言われても手が止まるので、単体で読める形を出す。
   文言 SSOT＝gen/difficulty.ts の D_TASK_FULL_FORMULA（式のコードと同居・部品から合成）。
   ここに式を直書きしない＝式改訂時にここが古いまま残る事故を防ぐ。 */
function dFormulaLabel(kind?: string): string {
  return (kind && D_TASK_FULL_FORMULA[kind]) ?? D_BASE_FORMULA;
}

/* カードに出すタイトル。白紙作成＝provenance.label／編集で付けた名前＝gen.motif。全カード共通。 */
function cardLabel(c: Candidate): string | undefined {
  return c.provenance?.label ?? c.gen?.motif;
}

/* レベル定義エントリ → 編集フォーム state（入力は文字列・range は [min,max] の文字列対）。 */
function initLform(task: string, entry: Record<string, unknown> | null): Record<string, unknown> | null {
  const fields = ladderFieldsFor(task);
  if (!fields || !entry) return null;
  const f: Record<string, unknown> = {};
  for (const fd of fields) {
    const val = entry[fd.key];
    switch (fd.kind) {
      case "grid": f[fd.key] = Number(val) || GRID_MIN; break;
      case "select": f[fd.key] = val == null ? "" : String(val); break;
      case "bool": f[fd.key] = val === true; break;
      case "range": f[fd.key] = Array.isArray(val) ? [String(val[0]), String(val[1])] : ["", ""]; break;
      default: f[fd.key] = val == null ? "" : String(val); // int / float
    }
  }
  return f;
}

/* 編集フォーム state → API patch（型を数値・配列へ戻す。optional select の "" は null＝省略）。 */
function lformToPatch(task: string, lform: Record<string, unknown>): Record<string, unknown> {
  const fields = ladderFieldsFor(task) ?? [];
  const patch: Record<string, unknown> = {};
  for (const fd of fields) {
    const v = lform[fd.key];
    switch (fd.kind) {
      case "grid": patch[fd.key] = Number(v); break;
      case "select": patch[fd.key] = v === "" ? null : v; break;
      case "bool": patch[fd.key] = v === true; break;
      case "range": { const r = v as [string, string]; patch[fd.key] = [Number(r[0]), Number(r[1])]; break; }
      default: patch[fd.key] = Number(v); // int / float
    }
  }
  return patch;
}

type Update = {
  id: string; status?: Candidate["status"]; order?: number | null;
  solidEdges?: SolidEdge[]; solidHiddenParked?: SolidEdge[];
  solidHidden?: boolean;
};

/* 隠れ線（点線）まわりの補助（立体のみ）。ON/OFF の実体は「dashed を solidHiddenParked へ
   出し入れする」＝印刷・商品ページ・サムネは solidEdges しか見ないので無改変で追従し、
   metrics/D はサーバ（refreshMeta）が焼き直す。OFF は可逆＝いつでも ON に戻せる。 */
const stripDashed = (c: Candidate): SolidEdge[] => (c.solidEdges ?? []).filter((e) => e.style !== "dashed");
const hasDashed = (c: Candidate): boolean => (c.solidEdges ?? []).some((e) => e.style === "dashed");
/* この問題が隠れ線を「持っている」か（表示中＋退避中のどちらでも）＝トグルを出す条件 */
const hasHiddenLines = (c: Candidate): boolean => hasDashed(c) || (c.solidHiddenParked?.length ?? 0) > 0;

export default function AtelierApp({
  sku, title, blurb, meate, hasGenerator, genKind, linesRange, gapRange, motifInspoEnabled = false,
  blankGridN, ladderEntry = null, isSolid = false,
  prevSku, prevLabel, nextSku, nextLabel,
}: {
  sku: string; title: string;
  /* 同一タスク内の前後の Vol（端では undefined）。ヘッダの戻る/進むで移動する。 */
  prevSku?: string; prevLabel?: string; nextSku?: string; nextLabel?: string;
  /* この巻のキャッチコピー（各巻1文）と めあて（この巻で鍛えたい力）。
     live 商品詳細と同じ Vol メタ。タイトル下に出して検品時に狙いを確認する。 */
  blurb?: string; meate?: string;
  hasGenerator: boolean;
  genKind?: "copy" | "motif" | "mirror" | "fill" | "translate" | "rotate" | "overlay" | "decompose" | "fold" | "solid";
  linesRange?: [number, number]; gapRange?: [number, number];
  /* true なら初回ロード時に /api/atelier/seed-motif-inspo を一度叩いて
     模様候補（gen.generator="motif"）を candidates JSON に注入する。
     注入後は通常の pending 候補と同じく採用/編集/不採用が効く */
  motifInspoEnabled?: boolean;
  /* 白紙作成で使う盤面サイズ（正方タスクのみ。非対応タスクは undefined＝ボタン非表示） */
  blankGridN?: number;
  /* この巻のレベル定義（生成パラメータ）の現値。基準編集パネルの初期値・チップ表示に使う。
     生成器の無いタスクや未定義 SKU は null（編集 UI 非表示）。 */
  ladderEntry?: Record<string, unknown> | null;
  /* 立体タスク（solid）。白紙作成を立体エディタに切り替え、サムネを SolidThumb で描く。 */
  isSolid?: boolean;
}) {
  const task = sku.split("-")[0];
  const lfields = ladderFieldsFor(task);
  const [file, setFile] = useState<CandidateFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [genLines, setGenLines] = useState<number | "">(""); // "" = おまかせ（全帯域）
  const [genGap, setGenGap] = useState<number | "">("");     // fill のみ（欠けの本数）
  const [editing, setEditing] = useState<Candidate | null>(null); // 編集中の問題
  const [creating, setCreating] = useState(false);                // 白紙からの新規作成中
  const [ladderEdit, setLadderEdit] = useState(false);            // 巻のレベル定義編集中
  const [lentry, setLentry] = useState<Record<string, unknown> | null>(ladderEntry); // 現値（保存で更新）
  const [lform, setLform] = useState<Record<string, unknown> | null>(
    () => initLform(task, ladderEntry),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);   // ドラッグ中の採用カード（採用レーン内 index）
  const [overIdx, setOverIdx] = useState<number | null>(null);   // ドロップ先のハイライト index

  const load = useCallback(async () => {
    const res = await fetch(`/api/atelier/candidates?sku=${sku}`);
    setFile(await res.json());
  }, [sku]);

  useEffect(() => { load(); }, [load]);

  /* 模様候補シード: 対象 sku のうち、まだ「gen.generator=motif」の候補が
     1 つも入っていなければ /api/atelier/seed-motif-inspo を 1 回叩く。
     成功したら load() で取り直す。サーバ側は idempotent なので二重投入なし */
  const [motifSeeded, setMotifSeeded] = useState(false);
  useEffect(() => {
    if (!motifInspoEnabled || !file || motifSeeded) return;
    const hasMotif = file.candidates.some((c) => c.gen?.generator === "motif");
    if (hasMotif) { setMotifSeeded(true); return; }
    (async () => {
      setMotifSeeded(true);
      const res = await fetch("/api/atelier/seed-motif-inspo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      if (res.ok) await load();
    })();
  }, [motifInspoEnabled, file, motifSeeded, sku, load]);

  async function save(updates: Update[]) {
    // 楽観更新 → 書き戻し
    setFile((f) => {
      if (!f) return f;
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        ...f,
        candidates: f.candidates.map((c) => {
          const u = byId.get(c.id);
          if (!u) return c;
          const next = { ...c };
          if (u.status) next.status = u.status;
          if (u.order === null) delete next.order;
          else if (typeof u.order === "number") next.order = u.order;
          if (u.solidEdges) next.solidEdges = u.solidEdges;
          if (u.solidHiddenParked) next.solidHiddenParked = u.solidHiddenParked;
          if (u.solidHidden !== undefined) {
            const applied = applySolidHidden(next, u.solidHidden);
            next.solidEdges = applied.solidEdges;
            next.solidHiddenParked = applied.solidHiddenParked;
          }
          return next;
        }),
      };
    });
    await fetch("/api/atelier/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, updates }),
    });
    // 辺の編集・隠れ線 ON/OFF を含む保存は、サーバ焼き直しの metrics/難易度を取り直す
    if (updates.some((u) => u.solidEdges || u.solidHidden !== undefined)) await load();
  }

  /* 隠れ線 ON/OFF（問題ごと・可逆）。OFF＝点線を退避 → 紙面にも D にも出ない。 */
  function toggleHidden(c: Candidate) {
    save([{ id: c.id, solidHidden: !solidHiddenIsOn(c) }]);
  }

  /* 点線（隠れ辺）なしモード（立体巻のみ）: 表示・難易度とも点線 0 として扱い、
     採用時に点線を取り除く。採用済みには「点線を外す」ボタンで個別適用。 */
  const [noDashed, setNoDashed] = useState(false);
  const noDashOn = noDashed && sku.startsWith("solid-");

  const adopted = useMemo(
    () => (file?.candidates ?? [])
      .filter((c) => c.status === "adopted")
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [file],
  );
  const pending = useMemo(
    () => {
      // 点線なしモード中は「除去後の D」で一枚壁を並べ直す（表示と整列を一致させる）
      const d = (c: Candidate) => noDashOn && c.grid.type === "solid"
        ? baseDifficulty(computeSolidMetrics(stripDashed(c)))
        : (c.difficulty?.value ?? 0);
      return (file?.candidates ?? [])
        .filter((c) => c.status === "pending" && c.gen?.generator !== "motif")
        .sort((a, b) => d(a) - d(b));
    },
    [file, noDashOn],
  );
  const pendingMotif = useMemo(
    () => (file?.candidates ?? [])
      .filter((c) => c.status === "pending" && c.gen?.generator === "motif")
      .sort((a, b) => (a.difficulty?.value ?? 0) - (b.difficulty?.value ?? 0)),
    [file],
  );
  const rejected = useMemo(
    () => (file?.candidates ?? []).filter((c) => c.status === "rejected"),
    [file],
  );

  /* 白紙作成モードで EditOverlay に渡す空の合成 candidate（盤面サイズ・解答モードを task から組む）。
     none=copy系（edges のみ）／explicit=fill/かさね/分解（F＋R）／derived(mirror)=軸ゴースト表示。 */
  const blankCandidate: Candidate | null = ((): Candidate | null => {
    if (isSolid) {
      // 立体は矩形点格子（既定 7×7）。cols/rows は SolidEditOverlay で選び直せる。
      return {
        id: "__new__",
        grid: { type: "solid", cols: 7, rows: 7 },
        edges: [],
        solidEdges: [],
        metrics: computeSolidMetrics([]),
        difficulty: { task: "solid", value: 0, auto: 0 },
        provenance: { source: "blank", createdAt: "" },
        gen: { kind: "manual" },
        status: "pending",
      };
    }
    if (blankGridN === undefined) return null;
    const n = blankGridN as 3 | 4 | 5 | 6 | 7 | 8;
    const mode = TASK_ANSWER_MODE[task] ?? "none";
    /* 移動の白紙作成: 巻の方向（ladder の dir）に合わせた既定ベクトルを焼く。
       hv（左右上下）は右1を既定に。移動先は編集モーダルの回答ペインで選び直せる。 */
    const tDir = String(lentry?.dir ?? "h");
    const tVec = tDir === "v" ? { dc: 0, dr: 1 }
      : tDir === "diag" ? { dc: 1, dr: 1 }
        : tDir === "compound" ? { dc: 2, dr: 1 }
          : { dc: 1, dr: 0 };
    /* 回転の白紙作成: 巻の回転角（ladder の angle・90cw/90ccw/180）を derived answer に焼く */
    // 混在巻（angle="mixed"）は編集画面の角度ボタンで選ぶ。ここは初期値＝みぎ 90°
    const rDeg: 90 | -90 | 180 =
      lentry?.angle === "90ccw" ? -90 : lentry?.angle === "180" ? 180 : 90;
    const answer: Problem["answer"] =
      mode === "explicit" ? { mode: "explicit", edges: [] }
        : mode === "derived" && task === "mirror"
          // 鏡は軸レス（軸＝印刷時の並び選択・decisions §3.59）。代表値 v を焼く
          ? { mode: "derived", transform: { type: "mirror", axis: "v" } }
          : mode === "derived" && task === "translate"
            ? { mode: "derived", transform: { type: "translate", ...tVec } }
            : mode === "derived" && task === "rotate"
              ? { mode: "derived", transform: { type: "rotate", deg: rDeg } }
              : undefined;
    return {
      id: "__new__",
      grid: { type: "square", n },
      edges: [],
      ...(answer ? { answer } : {}),
      metrics: computeMetrics([], n),
      difficulty: { task, value: 0, auto: 0 },
      provenance: { source: "blank", createdAt: "" },
      gen: { kind: "manual" },
      status: "pending",
    };
  })();

  function adopt(c: Candidate) {
    const maxOrder = adopted.reduce((m, a) => Math.max(m, a.order ?? 0), 0);
    // 点線なしモード: 採用と同時に隠れ線を OFF（退避）にする（可逆・D はサーバが焼き直す）
    const off = noDashOn && c.grid.type === "solid" && hasDashed(c);
    save([{ id: c.id, status: "adopted", order: maxOrder + 1, ...(off ? { solidHidden: false } : {}) }]);
  }

  function unadopt(c: Candidate) {
    // 抜いた後ろの order を詰める
    const updates: Update[] = [{ id: c.id, status: "pending", order: null }];
    adopted
      .filter((a) => (a.order ?? 0) > (c.order ?? 0))
      .forEach((a) => updates.push({ id: a.id, order: (a.order ?? 1) - 1 }));
    save(updates);
  }

  function move(c: Candidate, dir: -1 | 1) {
    const idx = adopted.findIndex((a) => a.id === c.id);
    const other = adopted[idx + dir];
    if (!other) return;
    save([
      { id: c.id, order: other.order ?? idx + dir + 1 },
      { id: other.id, order: c.order ?? idx + 1 },
    ]);
  }

  /* 採用カードを from→to へ差し込んで出題順を組み替える（ドラッグ＆ドロップ用）。
     order を 1..n に振り直し、変わった分だけ save する。 */
  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const arr = adopted.slice();
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    const updates: Update[] = [];
    arr.forEach((c, i) => {
      if ((c.order ?? 999) !== i + 1) updates.push({ id: c.id, order: i + 1 });
    });
    if (updates.length) save(updates);
  }

  async function generate() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku, count: 5,
          ...(genLines !== "" && { lines: genLines }),
          ...(genGap !== "" && { gap: genGap }),
        }),
      });
      const j = await res.json();
      setMsg(res.ok
        ? (j.added === 0
            ? (genKind === "motif" || genKind === "copy"
                ? "新しい候補はもうありません（有限ライブラリ・既出と似すぎを除いて打ち止め）。今ある候補から選んでください"
                : "新しい候補が出ませんでした。もう一度試してください")
            : genKind === "copy"
              ? `ライブラリを読み込みました（+${j.added} 問）`
              : `+${j.added} 問（seed ${j.seed}${genLines !== "" ? `・線${genLines}本` : ""}${genGap !== "" ? `・欠け${genGap}本` : ""}）`)
        : j.error);
      await load();
    } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const j = await res.json();
      setMsg(res.ok ? `公開しました（${j.questions} 問）→ /products/${sku}` : j.error);
    } finally { setBusy(false); }
  }

  async function saveEdit(
    id: string, edges: EdgeT[], motif?: string, answerEdges?: EdgeT[],
    transform?: { dc: number; dr: number }, rotateDeg?: 90 | -90 | 180,
    inputB?: EdgeT[],
  ) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          updates: [{
            id, edges,
            ...(motif !== undefined && { motif }),
            ...(answerEdges !== undefined && { answerEdges }),
            ...(transform !== undefined && { transform }),
            ...(rotateDeg !== undefined && { rotateDeg }),
            ...(inputB !== undefined && { inputB }),
          }],
        }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "保存に失敗しました"); return; }
      await load();            // metrics はサーバ権威で取り直す
      setEditing(null);
      setMsg("保存しました");
    } finally { setBusy(false); }
  }

  /* 難易度の人手 override（手動ティア付け）。空欄で自動へ戻す。auto は保全される。 */
  async function saveManual(id: string, manual: number | null) {
    setBusy(true); setMsg("");
    try {
      await fetch("/api/atelier/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, updates: [{ id, manual }] }),
      });
      await load();
      setMsg(manual === null ? "難易度を自動に戻しました" : `難易度を ${manual} に手動設定しました`);
    } finally { setBusy(false); }
  }
  function promptManual(c: Candidate) {
    const auto = c.difficulty?.auto;
    const cur = c.difficulty?.manual;
    const v = window.prompt(
      `「${c.id}」の難易度を手動指定（空欄で自動に戻す）\n自動値 = ${auto != null ? auto : "?"}`,
      cur != null ? String(cur) : "",
    );
    if (v === null) return;
    const t = v.trim();
    if (t === "") { saveManual(c.id, null); return; }
    const num = Number(t);
    if (Number.isNaN(num)) { setMsg("数値を入力してください"); return; }
    saveManual(c.id, num);
  }

  /* 白紙からの新規作成を保存（provenance=blank で candidates に1問追加） */
  async function createNew(
    edges: EdgeT[], title?: string, answerEdges?: EdgeT[],
    transform?: { dc: number; dr: number }, rotateDeg?: 90 | -90 | 180,
    inputB?: EdgeT[],
  ) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku, edges,
          ...(answerEdges !== undefined && { answerEdges }),
          ...(transform !== undefined && { transform }),
          ...(rotateDeg !== undefined && { rotateDeg }),
          ...(inputB !== undefined && { inputB }),
          ...(title && { title }),
        }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "作成に失敗しました"); return; }
      await load();
      setCreating(false);
      setMsg(`新規作成しました（${j.id}）`);
    } finally { setBusy(false); }
  }

  /* 立体の編集を保存（既存候補の solidEdges を差し替え。grid は不変）。
     隠れ線 OFF で編集した分は solidHiddenParked として対で送る（＝可逆のまま保存）。 */
  async function saveSolidEdit(id: string, solidEdges: SolidEdge[], solidHiddenParked: SolidEdge[]) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, updates: [{ id, solidEdges, solidHiddenParked }] }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "保存に失敗しました"); return; }
      await load();
      setEditing(null);
      setMsg("保存しました");
    } finally { setBusy(false); }
  }

  /* 立体の白紙作成を保存（cols/rows＋solidEdges で candidates に1問追加）。 */
  async function createSolid(
    cols: number, rows: number, solidEdges: SolidEdge[], solidHiddenParked: SolidEdge[],
  ) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, cols, rows, solidEdges, solidHiddenParked }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "作成に失敗しました"); return; }
      await load();
      setCreating(false);
      setMsg(`新規作成しました（${j.id}）`);
    } finally { setBusy(false); }
  }

  /* この巻のレベル定義（grid・線の向き・各範囲・ゲート・D 窓）を保存（copy/fill/mirror/motif）。
     ladder.json を書き戻す。生成器は静的 import で読むので、反映には再生成（生成ボタン）が要る。
     grid を変えると catalog-extra に表示メタ patch も書かれ、既存問題は旧 grid のまま不整合になる。 */
  async function saveLadder() {
    if (!lform || !lfields) return;
    setBusy(true); setMsg("");
    try {
      const patch = lformToPatch(task, lform);
      const res = await fetch("/api/atelier/ladder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, patch }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "保存に失敗しました"); return; }
      setLentry(j.entry);
      setLform(initLform(task, j.entry));
      setLadderEdit(false);
      setMsg(j.gridChanged
        ? "盤面サイズを変更しました。既存の候補/公開問題は旧 grid のまま不整合です。生成ボタンで作り直して採用し直し、D 窓も grid に合わせて見直してください。"
        : "レベル定義を保存しました（生成ボタンで再生成して反映）");
    } finally { setBusy(false); }
  }

  /* この巻を複製して同 Lv の次の Vol を作る（ladder.json ＋ catalog-extra.json に追記）。 */
  async function addVol() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/ladder/add-vol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "Vol 追加に失敗しました"); return; }
      setMsg(`Vol を追加しました → ${j.sku}（基準を調整して問題を作成。開く: /atelier/${j.sku}）`);
    } finally { setBusy(false); }
  }

  /* 難易度 D を全タスクでカードの外・上に前面化する（atelier の独自要素）。
     candidates は readCandidates で migrate 済み＝c.difficulty.{value,auto,parts,manual} を持つ。
     value＝実効値（手動 manual があればそれ・無ければ機械算出 auto）。✎ で手動上書き／自動へ戻す。
     式は gen/difficulty.ts（taskDifficulty）。内訳の意味は上部 atl-dhelp で定義。 */
  /* D 窓はラダーに窓を持つ巻だけ（現状 copy と solid・他タスクは band で刻む）。
     タスク名で絞らず「窓を持っているか」で判定＝将来ほかのタスクに窓を足しても出る。 */
  const win = Array.isArray(lentry?.D) && lentry!.D.length === 2
    ? (lentry!.D as [number, number]) : undefined;
  /* 盤面の項をこの巻の盤面サイズで具体化するための n（ラダーの grid）。
     立体は問題ごとに盤面が変わるので一般形のまま出す。 */
  const dGrid = task !== "solid" && typeof lentry?.grid === "number"
    ? (lentry.grid as number) : undefined;
  const dExcludes = D_TASK_EXCLUDES[genKind ?? task];
  const fmtD = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const dValueOf = (c: Candidate): number =>
    c.difficulty
      ? c.difficulty.value
      : c.grid.type === "solid"
        ? 0
        : baseDifficulty(computeMetrics(c.edges, c.grid.n));
  /* 内訳の文字列は商品ページ・設計台帳と同じビルダー（products/coverage.ts）を使う。
     ここで Object.values(parts) を素で並べると、対称係数 k が加算項のように見えてしまう。 */
  const partsTitle = (c: Candidate): string | undefined => {
    const body = dBreakdown(c.difficulty?.parts, c.difficulty?.value);
    if (!body) return undefined;
    return win ? `${body}（窓 D ${win[0]}–${win[1]}）` : body;
  };
  const withDScore = (c: Candidate, fig: ReactNode): ReactNode => {
    /* 点線なしモード: 立体カードは「除去後の姿」で D・内訳をプレビュー（点線ありの実データは不変）。
       式・parts とも taskDifficulty（SSOT）で出す＝ここに式を複製しない */
    const preview = noDashOn && c.grid.type === "solid" && hasDashed(c)
      ? (() => {
          const stripped = stripDashed(c);
          const m = computeSolidMetrics(stripped);
          return taskDifficulty("solid", { ...c, solidEdges: stripped, metrics: m });
        })()
      : undefined;
    const manual = !preview && c.difficulty?.manual != null;
    const parts = preview ? preview.parts : c.difficulty?.parts;
    const title = preview
      ? `${dBreakdown(preview.parts, preview.value) ?? ""}（点線なしプレビュー）`
      : partsTitle(c);
    return (
      <div key={c.id} className="atl-cell">
        <div className={`atl-dscore${manual ? " is-manual" : ""}`} title={title}>
          <span className="atl-dval">
            D {fmtD(preview ? preview.value : dValueOf(c))}
            {manual && <em className="atl-dman">手動</em>}
            {preview && <em className="atl-dman">点線0</em>}
            {!solidHiddenIsOn(c) && <em className="atl-dman">隠れ線OFF</em>}
          </span>
          <span className="atl-dbreak">
            {dBreakdown(parts, preview ? preview.value : dValueOf(c)) ?? ""}
            {genKind === "copy" && <span className="atl-deng">{engineLabel(c.gen.variant)}</span>}
            {genKind === "translate" && <span className="atl-deng atl-dmove">{moveLabelOf(c)}</span>}
          </span>
          <button type="button" className="atl-dedit" title="難易度を手動指定／自動へ戻す"
            onClick={(e) => { e.stopPropagation(); promptManual(c); }}>✎</button>
        </div>
        {fig}
      </div>
    );
  };

  /* 候補サムネ＝立体は SolidThumb・それ以外は ProblemSvg（grid.type で分岐） */
  const renderThumb = (c: Candidate, size?: number): ReactNode =>
    c.grid.type === "solid"
      ? <SolidThumb grid={c.grid} edges={noDashOn ? stripDashed(c) : c.solidEdges ?? []} {...(size ? { size } : {})} />
      : <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} inputB={c.inputB} {...(size ? { size } : {})} />;

  /* 隠れ線 ON/OFF ボタン（問題ごと・可逆）。隠れ線を 1 本でも持つ立体カードにだけ出す。
     OFF＝点線を退避＝紙面にも D にも出ない。ON で元通り戻る（線は捨てない）。 */
  const hiddenBtn = (c: Candidate, stop = false): ReactNode => {
    if (c.grid.type !== "solid" || !hasHiddenLines(c)) return null;
    const on = solidHiddenIsOn(c);
    const n = on ? (c.solidEdges ?? []).filter((e) => e.style === "dashed").length
      : (c.solidHiddenParked?.length ?? 0);
    return (
      <button type="button"
        title={on
          ? `この問題の隠れ線 ${n} 本を外す（退避＝いつでも戻せる。難易度も焼き直す）`
          : `退避中の隠れ線 ${n} 本を戻す`}
        onClick={(e) => { if (stop) e.stopPropagation(); toggleHidden(c); }}>
        隠れ線 {on ? "OFF" : "ON"}
      </button>
    );
  };

  const renderPendingCard = (c: Candidate) => withDScore(c,
    <figure key={c.id} className="atl-card" onClick={() => adopt(c)} title="クリックで採用">
      {renderThumb(c)}
      {cardLabel(c) && <figcaption className="atl-card-name">{cardLabel(c)}</figcaption>}
      <div className="atl-card-actions">
        <button type="button" style={{ color: ACCENT }}
          onClick={(e) => { e.stopPropagation(); adopt(c); }}>採用</button>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(c); }}>編集</button>
        {hiddenBtn(c, true)}
        <button type="button"
          onClick={(e) => { e.stopPropagation(); save([{ id: c.id, status: "rejected" }]); }}>
          不採用
        </button>
      </div>
    </figure>
  );

  /* レベル定義フォームの 1 フィールド描画（lform は呼び出し側で non-null を保証）。 */
  const setLf = (key: string, val: unknown) =>
    setLform({ ...(lform as Record<string, unknown>), [key]: val });
  const setLfRange = (key: string, idx: 0 | 1, val: string) => {
    const cur = ((lform as Record<string, unknown>)[key] as [string, string]) ?? ["", ""];
    setLf(key, (idx === 0 ? [val, cur[1]] : [cur[0], val]) as [string, string]);
  };
  const renderLadderField = (fd: LadderField): ReactNode => {
    const v = (lform as Record<string, unknown>)[fd.key];
    switch (fd.kind) {
      case "grid":
        return (
          <label key={fd.key}>{fd.label}
            <select value={String(v)} onChange={(e) => setLf(fd.key, Number(e.target.value))}>
              {Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, i) => GRID_MIN + i).map((g) => (
                <option key={g} value={g}>{g}×{g}</option>
              ))}
            </select>
          </label>
        );
      case "select":
        return (
          <label key={fd.key}>{fd.label}
            <select value={String(v ?? "")} onChange={(e) => setLf(fd.key, e.target.value)}>
              {fd.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        );
      case "bool":
        return (
          <label key={fd.key} className="atl-le-chk">
            <input type="checkbox" checked={v === true}
              onChange={(e) => setLf(fd.key, e.target.checked)} /> {fd.label}
          </label>
        );
      case "range": {
        const r = (v as [string, string]) ?? ["", ""];
        return (
          <label key={fd.key}>{fd.label}
            <input type="number" value={r[0]} className="atl-le-num"
              onChange={(e) => setLfRange(fd.key, 0, e.target.value)} />
            <span> 〜 </span>
            <input type="number" value={r[1]} className="atl-le-num"
              onChange={(e) => setLfRange(fd.key, 1, e.target.value)} />
          </label>
        );
      }
      default: // int / float
        return (
          <label key={fd.key}>{fd.label}
            <input type="number" step={fd.kind === "float" ? 0.05 : 1} value={String(v ?? "")}
              className="atl-le-num" onChange={(e) => setLf(fd.key, e.target.value)} />
          </label>
        );
    }
  };

  if (!file) return <main className="atl-wrap"><p>読み込み中…</p></main>;

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <div className="atl-topbar">
          <p className="atl-crumb"><a href="/atelier">atelier</a> / {sku}</p>
          <nav className="atl-volnav" aria-label="前後の Vol へ移動">
            {prevSku ? (
              <a className="atl-volnav-btn" href={`/atelier/${prevSku}`}
                title={`前の巻へ: ${prevLabel}`}>← 戻る{prevLabel && <span className="atl-volnav-lv"> {prevLabel}</span>}</a>
            ) : (
              <span className="atl-volnav-btn is-disabled" aria-disabled>← 戻る</span>
            )}
            {nextSku ? (
              <a className="atl-volnav-btn" href={`/atelier/${nextSku}`}
                title={`次の巻へ: ${nextLabel}`}>{nextLabel && <span className="atl-volnav-lv">{nextLabel} </span>}進む →</a>
            ) : (
              <span className="atl-volnav-btn is-disabled" aria-disabled>進む →</span>
            )}
          </nav>
        </div>
        <h1>{title}</h1>
        {blurb && <p className="atl-blurb">{blurb}</p>}
        {meate && (
          <p className="atl-meate">
            <span className="atl-meate-label">この巻のめあて</span>
            {meate}
          </p>
        )}
        {lfields && lentry && !ladderEdit && (
          <div className="atl-spec-wrap">
            <dl className="atl-spec" aria-label="この巻のレベル定義">
              {ladderChips(task, lentry).map((s, i) => (
                <div key={i} className="atl-spec-item">
                  <dt>{s.k}</dt>
                  <dd>{s.v}</dd>
                </div>
              ))}
            </dl>
            {lform && (
              <button type="button" className="atl-spec-edit" onClick={() => setLadderEdit(true)}>
                レベル定義を編集
              </button>
            )}
          </div>
        )}
        {lfields && ladderEdit && lform && (
          <form className="atl-ladder-edit" aria-label="巻のレベル定義を編集"
            onSubmit={(e) => { e.preventDefault(); saveLadder(); }}>
            <div className="atl-le-row">
              {lfields.map((fd) => renderLadderField(fd))}
            </div>
            <div className="atl-le-row">
              <span className="atl-editor-spacer" />
              <button type="submit" className="atl-btn" disabled={busy}>レベル定義を保存</button>
              <button type="button"
                onClick={() => { setLform(initLform(task, lentry)); setLadderEdit(false); }}>
                やめる
              </button>
            </div>
          </form>
        )}
        <div className="atl-actions">
          {hasGenerator && genKind !== "copy" && (
            <>
              <label className="atl-gen-lines">
                {genKind === "fill" ? "線分の本数" : genKind === "overlay" || genKind === "decompose" || genKind === "fold" ? "1図あたりの線" : "線の本数"}
                <select value={genLines}
                  onChange={(e) => setGenLines(e.target.value === "" ? "" : Number(e.target.value))}>
                  <option value="">おまかせ</option>
                  {linesRange &&
                    Array.from(
                      { length: linesRange[1] - linesRange[0] + 1 },
                      (_, i) => linesRange[0] + i,
                    ).map((L) => (
                      <option key={L} value={L}>{L} 本</option>
                    ))}
                </select>
              </label>
              {genKind === "fill" && gapRange && (
                <label className="atl-gen-lines">
                  欠けの本数
                  <select value={genGap}
                    onChange={(e) => setGenGap(e.target.value === "" ? "" : Number(e.target.value))}>
                    <option value="">おまかせ</option>
                    {Array.from(
                      { length: gapRange[1] - gapRange[0] + 1 },
                      (_, i) => gapRange[0] + i,
                    ).map((L) => (
                      <option key={L} value={L}>{L} 本</option>
                    ))}
                  </select>
                </label>
              )}
              <button type="button" className="atl-btn" disabled={busy} onClick={generate}>
                候補を追加生成（+5 問）
              </button>
            </>
          )}
          {hasGenerator && genKind === "copy" && (
            <button type="button" className="atl-btn" disabled={busy} onClick={generate}>
              ライブラリを読み込む
            </button>
          )}
          {(blankGridN !== undefined || isSolid) && (
            <button type="button" className="atl-btn" disabled={busy} onClick={() => setCreating(true)}>
              ＋ 新規作成（白紙）
            </button>
          )}
          <button type="button" className="atl-btn" disabled={busy} onClick={addVol}
            title="この巻を複製して同 Lv の次の Vol を作る">
            Vol を追加
          </button>
          <button type="button" className="atl-btn atl-btn--pub"
            disabled={busy || adopted.length !== QUESTIONS_PER_VOL} onClick={publish}>
            公開する（{adopted.length} / {QUESTIONS_PER_VOL}）
          </button>
          {/* 鏡タスクの検品用: 採用済から「解答 PDF」を生成して目視確認 */}
          {genKind === "mirror" && adopted.length > 0 && (
            <button type="button" className="atl-btn" disabled={busy}
              onClick={async () => {
                const { downloadAnswerPdf } = await import("../products/SkuPrintPreview");
                const probs = adopted.map((c) => ({
                  n: c.grid.type === "square" ? c.grid.n : 0, edges: c.edges,
                  ...(c.answer?.mode === "derived" && c.answer.transform.type === "mirror"
                    && { mirrorAxis: c.answer.transform.axis }),
                }));
                await downloadAnswerPdf(sku, "A4-P", probs);
              }}>
              解答 PDF を確認（{adopted.length} 問）
            </button>
          )}
          {msg && <span className="atl-msg">{msg}</span>}
        </div>
      </header>

      <section className="atl-dhelp">
        {/* このタスクの完全な式（SSOT＝difficulty.ts・部品から合成）。
            「土台の式のまま」では検品中に式が読めないので、単体で読める形を出す。 */}
        <p className="atl-dhelp-formula">
          <strong>この巻の D の式</strong>：{dFormulaLabel(genKind ?? task)}
        </p>
        {/* 盤面の項をこの巻の盤面サイズで具体化＋タスク固有の但し書き */}
        <p className="atl-dhelp-base">
          {boardTermText(dGrid)}
          {dExcludes && <>　／　{dExcludes}</>}
        </p>
        <p className="atl-dhelp-note">
          12 問の中で難易度を散らすための指標（全タスク共通でカード上に前面表示）。
          各カードの <strong>✎</strong> で難易度を手動上書き／自動へ戻せる（人手ティア付け・auto は保全）。
          {win && <>　この巻の窓は <strong>D {win[0]}–{win[1]}</strong>。</>}
        </p>
        {task === "solid" && (
          <label className="atl-nodash">
            <input type="checkbox" checked={noDashed}
              onChange={(e) => setNoDashed(e.target.checked)} />
            <span>
              点線（隠れ辺）なしモード — 候補の表示・難易度を点線 0 でプレビューし、
              <strong>採用時に隠れ線を OFF にします</strong>。
              OFF は問題ごとの可逆スイッチ（各カードの「隠れ線 OFF/ON」ボタン・退避した点線は編集画面で薄く見えます）
            </span>
          </label>
        )}
      </section>

      {/* ---- 採用レーン（＝巻内出題順） ---- */}
      <section className="atl-lane">
        <h2>採用 — 出題順 <span className="atl-count">{adopted.length} / {QUESTIONS_PER_VOL}</span></h2>
        {adopted.length === 0 && <p className="atl-empty">下の候補をクリックして採用してください。</p>}
        <div className="atl-grid">
          {adopted.map((c, i) => withDScore(c,
            <figure key={c.id}
              className={`atl-card atl-card--adopted${dragIdx === i ? " is-dragging" : ""}${overIdx === i && dragIdx !== null && dragIdx !== i ? " is-dropover" : ""}`}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overIdx !== i) setOverIdx(i); }}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}>
              <span className="atl-order" title="ドラッグして並び替え">⠿ 問 {i + 1}</span>
              {renderThumb(c)}
              {cardLabel(c) && <figcaption className="atl-card-name">{cardLabel(c)}</figcaption>}
              <div className="atl-card-actions">
                <button type="button" onClick={() => move(c, -1)} disabled={i === 0}>↑</button>
                <button type="button" onClick={() => move(c, 1)} disabled={i === adopted.length - 1}>↓</button>
                <button type="button" onClick={() => setEditing(c)}>編集</button>
                {hiddenBtn(c)}
                <button type="button" onClick={() => unadopt(c)}>外す</button>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* ---- 候補レーン ---- */}
      <section className="atl-lane">
        <h2>候補 <span className="atl-count">{pending.length}</span></h2>
        {pending.length === 0 && (
          <p className="atl-empty">
            候補がありません。{hasGenerator
              ? (genKind === "copy" ? "「ライブラリを読み込む」を押してください。" : "「候補を追加生成」を押してください。")
              : "手設計の問題を candidates JSON に追記してください。"}
          </p>
        )}
        {/* カードは難易度 D 昇順の一枚壁（pending は difficulty.value で整列済み）。
            「12 問の中の散らし」を一目で見る。 */}
        <div className="atl-grid">
          {pending.map((c) => renderPendingCard(c))}
        </div>
      </section>

      {/* ---- 不採用（復帰可能） ---- */}
      {rejected.length > 0 && (
        <section className="atl-lane atl-lane--rejected">
          <h2>不採用 <span className="atl-count">{rejected.length}</span></h2>
          <div className="atl-grid">
            {rejected.map((c) => withDScore(c,
              <figure key={c.id} className="atl-card atl-card--rejected">
                {renderThumb(c, 92)}
                {cardLabel(c) && <figcaption className="atl-card-name">{cardLabel(c)}</figcaption>}
                <div className="atl-card-actions">
                  <button type="button" onClick={() => save([{ id: c.id, status: "pending" }])}>
                    戻す
                  </button>
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---- 候補（模様）— 同盤面の motif 由来。採用/編集/不採用は figure と同じパイプライン ---- */}
      {motifInspoEnabled && (
        <section className="atl-lane atl-lane--motif">
          <h2>候補（模様）<span className="atl-count">{pendingMotif.length}</span></h2>
          {pendingMotif.length === 0 && (
            <p className="atl-empty">
              模様候補がありません（同タスクの兄弟巻で使い切った可能性あり）。
            </p>
          )}
          <div className="atl-grid">
            {pendingMotif.map((c) => withDScore(c,
              <figure key={c.id} className="atl-card atl-card--motif" onClick={() => adopt(c)} title="クリックで採用">
                {renderThumb(c)}
                {cardLabel(c) && <figcaption className="atl-inspo-name">{cardLabel(c)}</figcaption>}
                <div className="atl-card-actions">
                  <button type="button" style={{ color: ACCENT }}
                    onClick={(e) => { e.stopPropagation(); adopt(c); }}>採用</button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setEditing(c); }}>編集</button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); save([{ id: c.id, status: "rejected" }]); }}>
                    不採用
                  </button>
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      {editing && (editing.grid.type === "solid" ? (
        <SolidEditOverlay
          key={editing.id}
          candidate={editing}
          busy={busy}
          onSave={(_cols, _rows, solidEdges, parked) => saveSolidEdit(editing.id, solidEdges, parked)}
          onClose={() => setEditing(null)}
        />
      ) : (
        <EditOverlay
          key={editing.id}
          candidate={editing}
          busy={busy}
          task={task}
          onSave={(edges, motif, answerEdges, transform, rotateDeg, inputB) =>
            saveEdit(editing.id, edges, motif, answerEdges, transform, rotateDeg, inputB)}
          onClose={() => setEditing(null)}
        />
      ))}
      {creating && blankCandidate && (blankCandidate.grid.type === "solid" ? (
        <SolidEditOverlay
          key="__new__"
          candidate={blankCandidate}
          busy={busy}
          createMode
          onSave={(cols, rows, solidEdges, parked) => createSolid(cols, rows, solidEdges, parked)}
          onClose={() => setCreating(false)}
        />
      ) : (
        <EditOverlay
          key="__new__"
          candidate={blankCandidate}
          busy={busy}
          createMode
          task={task}
          onSave={(edges, title, answerEdges, transform, rotateDeg, inputB) =>
            createNew(edges, title, answerEdges, transform, rotateDeg, inputB)}
          onClose={() => setCreating(false)}
        />
      ))}
    </main>
  );
}

/* =========================================================================
   かさね（overlay）編集の 1 ペイン — 図形A / 図形B を直接描く盤面
   操作は他モードと同じ（点を 2 つクリックで線／同じ線をなぞると消える／
   消すモードで線をクリック＝1 本削除）。色分け: A=INK・B=ACCENT。
   ========================================================================= */
function ABPane({
  n, size, edges, ink, first, eraseMode, onPoint, onErase,
}: {
  n: number; size: number; edges: EdgeT[]; ink: string;
  first: Pt | null;   // この盤面で作図中の始点（別の盤面を触っているときは null）
  eraseMode: boolean;
  onPoint: (p: Pt) => void;
  onErase: (index: number) => void;
}) {
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="atl-editor-svg">
      <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
      {edges.map((e, i) => (
        <line key={i}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={ink} strokeWidth={1.7} strokeLinecap="round" />
      ))}
      {Array.from({ length: n * n }, (_, i) => {
        const c = i % n, r = Math.floor(i / n);
        const selected = !!first && first[0] === c && first[1] === r;
        return (
          <g key={i}>
            <circle cx={pos(c)} cy={pos(r)} r={selected ? 3 : 1.8}
              fill={selected ? ACCENT : SCREEN_DOT} />
            {/* 当たり判定を広く（タップしやすく）。消すモードでは点は触らせない。 */}
            {!eraseMode && (
              <circle cx={pos(c)} cy={pos(r)} r={6} fill="transparent"
                style={{ cursor: "pointer" }} onClick={() => onPoint([c, r])} />
            )}
          </g>
        );
      })}
      {eraseMode && (
        <EdgeHitLayer
          edges={edges.map((e) => ({ a: { c: e[0][0], r: e[0][1] }, b: { c: e[1][0], r: e[1][1] } }))}
          pos={(c, r) => ({ x: pos(c), y: pos(r) })}
          onErase={onErase}
          step={80 / Math.max(1, n - 1)}
        />
      )}
    </svg>
  );
}

/* =========================================================================
   線の手直しモーダル（点を 2 つクリック → その間の線分をトグル）
   metrics はライブで computeMetrics 表示。保存はサーバ権威で再算出される。
   fill 候補のときは F/R モード切替を出し、R モードでは F の部分集合として
   R をトグル（公平性=「R の両端点が G に残るか」をライブで注記）。
   ========================================================================= */
function EditOverlay({
  candidate, busy, onSave, onClose, createMode = false, task = "",
}: {
  candidate: Candidate;
  busy: boolean;
  onSave: (
    edges: EdgeT[], motif?: string, answerEdges?: EdgeT[],
    transform?: { dc: number; dr: number }, rotateDeg?: 90 | -90 | 180,
    /* 折り重ね（fold）の問題2。edges＝問題1・answerEdges＝完成図 と 3 点セットで送る */
    inputB?: EdgeT[],
  ) => void;
  onClose: () => void;
  createMode?: boolean;
  /* 呼び出し元 SKU のタスク。explicit 解答の意味がタスクで違う（fill=抜く線 R／
     overlay=図形B）ため、R モードの文言と公平性チェックの表示を出し分ける */
  task?: string;
}) {
  // EditOverlay は square 専用（solid は SolidEditOverlay へ分岐済み）。型を絞る。
  const n = candidate.grid.type === "square" ? candidate.grid.n : 3;
  const isFill = candidate.answer?.mode === "explicit";
  /* 移動（translate）: 解答＝derived transform。移動ベクトルも編集対象にする
     （maker-translate と同じ操作＝回答ペインの点クリックで移動先●を置く） */
  const tr0 = candidate.answer?.mode === "derived" && candidate.answer.transform.type === "translate"
    ? candidate.answer.transform : null;
  const isTranslate = tr0 !== null;
  /* 回転（rotate）: 角度も編集対象にする。混在巻（ladder angle="mixed"）は 1 問 1 角度で
     3 角度を配るので、候補ごとに右・左・180° を選べる必要がある（decisions §3.87）。 */
  const rot0 = candidate.answer?.mode === "derived" && candidate.answer.transform.type === "rotate"
    ? candidate.answer.transform : null;
  const isRotate = rot0 !== null;
  const [rDeg, setRDeg] = useState<90 | -90 | 180>(rot0?.deg ?? 90);
  // explicit の R の呼び名: fill=「抜く線」（公平性チェックあり）／
  // overlay=「図形B」／decompose=「引くもの（図形B）」
  const fillWording = task === "fill";
  const rLabel = task === "fill" ? "抜く線"
    : task === "decompose" ? "引くもの（図形B）" : "図形B";
  /* かさね（overlay）は「図形A ＋ 図形B ＝ □」の 3 ペイン編集にする。
     従来の「完成図から B を拾う」方式では、A に無い線を B に描けなかった（消すしかできない）。
     データモデルは gen/overlay.ts と同じ F=A∪B・R=B・A=F∖R。A∩B は表現できないので、
     片方の盤面に描いた線がもう片方にあれば「移る」＝重複を作らせない。
     分解（decompose）は B ⊂ 完成図 が定義なので、従来の選択方式を残す。 */
  const isAB = isFill && task === "overlay";
  /* 折り重ね（fold）も「問題1 →(折る) 問題2 ＝ 完成図」の 3 ペイン編集にする。
     データモデルは gen/fold.ts と同じ edges＝問題1（折る前の姿）・inputB＝問題2・
     answer.edges＝完成図（=mirror(問題1, v)∪問題2）。完成図は 2 枚から導出＝読取専用。
     ここでは rEdges を「問題2」として持つ（他タスクの R とは別物・保存時に振り分ける）。 */
  const isFold = task === "fold";
  const [edges, setEdges] = useState<EdgeT[]>(candidate.edges);
  const [rEdges, setREdges] = useState<EdgeT[]>(
    isFold ? (candidate.inputB ?? [])
      : isFill && candidate.answer?.mode === "explicit" ? candidate.answer.edges : [],
  );
  const [mode, setMode] = useState<"F" | "R">("F");
  const [first, setFirst] = useState<Pt | null>(null);
  const [firstPane, setFirstPane] = useState<"A" | "B" | null>(null); // かさね/折り重ね: 作図中の点がどちらの盤面か
  const [oneStroke, setOneStroke] = useState(false);   // 一筆書き: 線を引いた後、終点を次の始点に残す
  const [eraseMode, setEraseMode] = useState(false);   // 消す（消しゴム）: 線をクリックで1本削除
  const [history, setHistory] = useState<{ edges: EdgeT[]; rEdges: EdgeT[] }[]>([]);
  const [title, setTitle] = useState(candidate.provenance?.label ?? candidate.gen?.motif ?? "");

  const SIZE = 360;
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  const samePt = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

  /* 折り重ね: 折り返した問題1（代表軸 v・gen/fold.ts と同規約）と、完成図＝それと問題2の和。
     完成図は「子が描く図」＝metrics・D・かぶり判定の土台なので、ここを唯一の導出点にする。 */
  const foldMirrored = useMemo(
    () => (isFold ? mirrorEdges(edges, n, "v") : []),
    [isFold, edges, n],
  );
  const foldResult = useMemo(
    () => (isFold ? normalizeEdges([...foldMirrored, ...rEdges]) : []),
    [isFold, foldMirrored, rEdges],
  );

  // 折り重ねの metrics は完成図から（difficulty.ts の metricsEdges と同じ規約）
  const liveMetrics = useMemo(
    () => computeMetrics(isFold ? foldResult : edges, n),
    [isFold, foldResult, edges, n],
  );
  const axis = mirrorAxisOf(candidate.answer);
  const mirrorGhost = useMemo(() => (axis ? mirrorEdges(edges, n, axis) : []), [axis, edges, n]);
  /* 回転の回答ペイン（選んだ角度でまわした形）。角度ボタンを押すとその場で結果が見える。
     回転規約は gen/rotate.ts・schema TransformSpec と同一（盤面中心まわり）。 */
  const rotated = useMemo<EdgeT[]>(() => {
    if (!isRotate) return [];
    const f = (p: Pt): Pt => rDeg === 90 ? [n - 1 - p[1], p[0]]
      : rDeg === -90 ? [p[1], n - 1 - p[0]] : [n - 1 - p[0], n - 1 - p[1]];
    return edges.map((e) => [f(e[0]), f(e[1])] as EdgeT);
  }, [isRotate, edges, n, rDeg]);

  /* ---- 移動（translate）: ベクトル編集 ----
     ★きてん＝F の辞書順最小点（gen/translate.ts・サムネと同じ導出規約）。
     回答ペインの点クリック＝●ここへ を置く → vec = ● − ★。 */
  const [tVec, setTVec] = useState<{ dc: number; dr: number }>(
    tr0 ? { dc: tr0.dc, dr: tr0.dr } : { dc: 0, dr: 0 });
  const tAnchor = useMemo<Pt | null>(() => {
    if (!isTranslate || edges.length === 0) return null;
    let a: Pt = edges[0][0];
    for (const e of edges) for (const p of e) {
      if (p[0] < a[0] || (p[0] === a[0] && p[1] < a[1])) a = p;
    }
    return a;
  }, [isTranslate, edges]);
  const tMoved = useMemo<EdgeT[]>(
    () => isTranslate ? edges.map((e) => [
      [e[0][0] + tVec.dc, e[0][1] + tVec.dr], [e[1][0] + tVec.dc, e[1][1] + tVec.dr],
    ] as EdgeT) : [],
    [isTranslate, edges, tVec],
  );
  const tFits = useMemo(
    () => tMoved.every((e) => e.every((p) => p[0] >= 0 && p[0] <= n - 1 && p[1] >= 0 && p[1] <= n - 1)),
    [tMoved, n],
  );
  const tZero = tVec.dc === 0 && tVec.dr === 0;
  const tTarget: Pt | null = tAnchor ? [tAnchor[0] + tVec.dc, tAnchor[1] + tVec.dr] : null;
  /* 回答ペインの点クリック＝移動先●を置く（同点クリックは何もしない＝移動なしは保存側で弾く） */
  function clickTargetDot(p: Pt) {
    if (!tAnchor) return;
    setTVec({ dc: p[0] - tAnchor[0], dr: p[1] - tAnchor[1] });
  }
  /* 移動量ラベル（右1・下2 など。maker-translate と同じ言い回し） */
  const tMoveLabel = moveWords(tVec.dc, tVec.dr);
  /* 図形のスパン（c/r 方向の広がり）。盤面いっぱいの方向へは移動の余地がない＝
     ●もずらしボタンも効かない理由を検品者に明示する（旧 h 生成の縦長形が該当）。 */
  const tSpan = useMemo(() => {
    if (!isTranslate || edges.length === 0) return null;
    let cMin = 99, cMax = -99, rMin = 99, rMax = -99;
    for (const e of edges) for (const p of e) {
      cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
      rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
    }
    return { c: cMax - cMin, r: rMax - rMin };
  }, [isTranslate, edges]);
  const tNoVert = tSpan ? tSpan.r >= n - 1 : false; // 縦いっぱい＝縦移動不可
  const tNoHorz = tSpan ? tSpan.c >= n - 1 : false; // 横いっぱい＝横移動不可

  /* ---- 移動ワンタッチ選択 ----
     ボタンで (dc,dr) を選ぶと、今の配置で収まらなければ F∪F' の union bbox を
     盤面中央へ置き直して成立させる（gen/translate.ts placeWithVector と同じ規約）。
     「下1にしたい→図形の置き場所は勝手に整う」＝メーカー同様のワンタッチ操作。 */
  function pickVec(dc: number, dr: number) {
    if (!tSpan) return;
    if (tSpan.c + Math.abs(dc) > n - 1 || tSpan.r + Math.abs(dr) > n - 1) return; // 形が大きすぎて不成立
    const fitsNow = edges.every((e) => e.every((p) =>
      p[0] >= 0 && p[0] <= n - 1 && p[1] >= 0 && p[1] <= n - 1
      && p[0] + dc >= 0 && p[0] + dc <= n - 1 && p[1] + dr >= 0 && p[1] + dr <= n - 1));
    if (!fitsNow) {
      // union bbox を中央へ（F は負方向移動のとき union の反対側に寄る）
      let cMin = 99, rMin = 99;
      for (const e of edges) for (const p of e) {
        cMin = Math.min(cMin, p[0]); rMin = Math.min(rMin, p[1]);
      }
      const uC = tSpan.c + Math.abs(dc), uR = tSpan.r + Math.abs(dr);
      const offC = Math.floor((n - 1 - uC) / 2) + (dc < 0 ? -dc : 0) - cMin;
      const offR = Math.floor((n - 1 - uR) / 2) + (dr < 0 ? -dr : 0) - rMin;
      pushHistory({ edges, rEdges });
      setEdges(edges.map((e) => [
        [e[0][0] + offC, e[0][1] + offR], [e[1][0] + offC, e[1][1] + offR],
      ] as EdgeT));
      setFirst(null);
    }
    setTVec({ dc, dr });
  }
  /* 移動の候補＝この形が盤面内で動ける範囲の全域を、そのままマス目に並べる。
     列＝左右（dc）・行＝上下（dr）で、中央が「移動なし」＝今の位置。
     量の上限は形の大きさだけが決める（span + |d| ≤ n-1）＝盤面の余白いっぱいまで選べる。 */
  const tVecGrid = useMemo(() => {
    if (!tSpan) return null;
    const hMax = Math.max(0, n - 1 - tSpan.c);
    const vMax = Math.max(0, n - 1 - tSpan.r);
    if (hMax === 0 && vMax === 0) return null; // 盤面いっぱい＝動く余地なし
    const cells: { dc: number; dr: number; label: string }[] = [];
    for (let dr = -vMax; dr <= vMax; dr++) {
      for (let dc = -hMax; dc <= hMax; dc++) cells.push({ dc, dr, label: moveWords(dc, dr) });
    }
    return { cells, cols: hMax * 2 + 1 };
  }, [tSpan, n]);
  /* 図形ごと 1 マスずらす（形は不変・盤面内に収まるときだけ）。
     生成済みの配置（例: 縦いっぱい）に移動の余白を作るための手当て。
     ★は F と一緒に動き、●＝★+vec も追従する（vec は保持）。 */
  const canShiftF = (dc: number, dr: number): boolean =>
    edges.length > 0 && edges.every((e) => e.every((p) =>
      p[0] + dc >= 0 && p[0] + dc <= n - 1 && p[1] + dr >= 0 && p[1] + dr <= n - 1));
  function shiftF(dc: number, dr: number) {
    if (!canShiftF(dc, dr)) return;
    pushHistory({ edges, rEdges });
    setEdges(edges.map((e) => [
      [e[0][0] + dc, e[0][1] + dr], [e[1][0] + dc, e[1][1] + dr],
    ] as EdgeT));
    setFirst(null);
  }

  /* fill の R が F の部分集合か。F の手直しで R が孤立した場合の検品サイン */
  const fSet = useMemo(() => new Set(edges.map(edgeKey)), [edges]);
  const rOrphan = useMemo(
    () => isFill ? rEdges.filter((e) => !fSet.has(edgeKey(e))) : [],
    [isFill, rEdges, fSet],
  );
  /* 公平性チェック: R の両端点が G=F∖R に必ず残るか */
  const fairness = useMemo(() => {
    if (!isFill || rEdges.length === 0) return { ok: true, msg: "" };
    const rSet = new Set(rEdges.map(edgeKey));
    const G = edges.filter((e) => !rSet.has(edgeKey(e)));
    const ptsG = new Set<string>();
    for (const e of G) { ptsG.add(`${e[0][0]},${e[0][1]}`); ptsG.add(`${e[1][0]},${e[1][1]}`); }
    // R は単位辺なので両端点をそのまま見れば良い
    const lonely = rEdges.filter((e) =>
      !ptsG.has(`${e[0][0]},${e[0][1]}`) || !ptsG.has(`${e[1][0]},${e[1][1]}`));
    return lonely.length === 0
      ? { ok: true, msg: `抜く線 ${rEdges.length} 本・公平性 OK` }
      : { ok: false, msg: `抜く線 ${rEdges.length} 本・孤立端 ${lonely.length} 本（つなぐ先が見えない）` };
  }, [isFill, rEdges, edges]);

  function pushHistory(prev: { edges: EdgeT[]; rEdges: EdgeT[] }) {
    setHistory((h) => [...h, prev]);
  }

  // 消すモード: 線をクリック → その辺を F から削除（R に入っていたら R からも消す）
  function eraseUnit(i: number) {
    pushHistory({ edges, rEdges });
    const k = edgeKey(edges[i]);
    setEdges(edges.filter((_, idx) => idx !== i));
    if (isFill) setREdges(rEdges.filter((e) => edgeKey(e) !== k));
    setFirst(null);
  }

  function clickPoint(p: Pt) {
    if (eraseMode) return; // 消すモードでは点クリックでは描かない
    if (!first) { setFirst(p); return; }
    if (samePt(first, p)) { setFirst(null); return; } // 同点 = 選択解除
    const units = splitAtLattice([first, p]);
    if (mode === "F") {
      const keys = new Set(edges.map(edgeKey));
      const allPresent = units.every((u) => keys.has(edgeKey(u)));
      pushHistory({ edges, rEdges });
      if (allPresent) {
        const drop = new Set(units.map(edgeKey));
        setEdges(edges.filter((e) => !drop.has(edgeKey(e))));
        // F から消えた辺は R からも消す（孤立 R 防止）
        if (isFill) setREdges(rEdges.filter((e) => !drop.has(edgeKey(e))));
      } else {
        setEdges(normalizeEdges([...edges, ...units]));
      }
    } else {
      // R モード: F の中からだけ拾える
      const inF = units.every((u) => fSet.has(edgeKey(u)));
      if (!inF) { setFirst(null); return; } // F に無い辺は R にできない
      const rKeys = new Set(rEdges.map(edgeKey));
      const allInR = units.every((u) => rKeys.has(edgeKey(u)));
      pushHistory({ edges, rEdges });
      if (allInR) {
        const drop = new Set(units.map(edgeKey));
        setREdges(rEdges.filter((e) => !drop.has(edgeKey(e))));
      } else {
        setREdges(normalizeEdges([...rEdges, ...units]));
      }
    }
    // 一筆書き ON: 終点を次の線の始点として残す（連続描画）。OFF: 選択解除。
    setFirst(oneStroke ? p : null);
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setEdges(prev.edges);
      setREdges(prev.rEdges);
      setFirst(null); setFirstPane(null);
      return h.slice(0, -1);
    });
  }

  function clearAll() {
    if (mode === "F") {
      if (edges.length === 0 && rEdges.length === 0) return;
      pushHistory({ edges, rEdges });
      setEdges([]); setREdges([]);
    } else {
      if (rEdges.length === 0) return;
      pushHistory({ edges, rEdges });
      setREdges([]);
    }
    setFirst(null);
  }

  /* fill の R 集合（描画用） */
  const rSetView = useMemo(() => new Set(rEdges.map(edgeKey)), [rEdges]);

  /* ---- かさね（overlay）の 3 ペイン編集 ----
     図形A＝F∖R（導出）・図形B＝R。どちらの盤面も「点 2 つで線」で直接描ける。 */
  const aEdges = useMemo(
    () => (isAB ? edges.filter((e) => !rSetView.has(edgeKey(e))) : []),
    [isAB, edges, rSetView],
  );
  /* 検品用の内訳。絡み＝A・B の線分同士の直接交差（＝Vol 分けドライバー・
     gen/overlay.ts / difficulty.ts と同じ計測・decisions §3.98）。
     ばらけ＝図ごとの離れ小島の負荷（decisions §3.97・同じ完成図でも分け方で D が変わる）。 */
  const abStats = useMemo(() => {
    if (!isAB) return null;
    const mA = computeMetrics(aEdges, n), mB = computeMetrics(rEdges, n);
    return {
      aLines: mA.lines, bLines: mB.lines,
      entangle: interCrossings(aEdges, rEdges),
      sep: separationLoad(aEdges) + separationLoad(rEdges),
    };
  }, [isAB, aEdges, rEdges, n]);

  /* 盤面クリック（A / B 共通）。同じ線をもう一度なぞる＝その盤面から消す。
     A に描いた線が B にあれば B から外す（逆も同じ）＝A∩B を作らせない。 */
  function clickPointAB(pane: "A" | "B", p: Pt) {
    if (eraseMode) return;
    if (!first || firstPane !== pane) { setFirst(p); setFirstPane(pane); return; }
    if (samePt(first, p)) { setFirst(null); setFirstPane(null); return; } // 同点 = 選択解除
    const units = splitAtLattice([first, p]);
    const uKeys = new Set(units.map(edgeKey));
    const rKeys = new Set(rEdges.map(edgeKey));
    const fKeys = new Set(edges.map(edgeKey));
    const inPane = (u: EdgeT) => pane === "B"
      ? rKeys.has(edgeKey(u))
      : fKeys.has(edgeKey(u)) && !rKeys.has(edgeKey(u));
    pushHistory({ edges, rEdges });
    if (units.every(inPane)) {
      setEdges(edges.filter((e) => !uKeys.has(edgeKey(e))));
      if (pane === "B") setREdges(rEdges.filter((e) => !uKeys.has(edgeKey(e))));
    } else {
      setEdges(normalizeEdges([...edges, ...units]));
      setREdges(pane === "B"
        ? normalizeEdges([...rEdges, ...units])
        : rEdges.filter((e) => !uKeys.has(edgeKey(e))));
    }
    // 一筆書き ON: 終点を次の線の始点として残す（その盤面の中でつながる）
    setFirst(oneStroke ? p : null);
    setFirstPane(oneStroke ? pane : null);
  }

  /* 消すモード: その盤面の線を 1 本削除（F からも外す＝完成図に残骸を残さない） */
  function eraseAB(pane: "A" | "B", e: EdgeT) {
    const k = edgeKey(e);
    pushHistory({ edges, rEdges });
    setEdges(edges.filter((x) => edgeKey(x) !== k));
    if (pane === "B") setREdges(rEdges.filter((x) => edgeKey(x) !== k));
    setFirst(null); setFirstPane(null);
  }

  function clearPane(pane: "A" | "B") {
    const target = pane === "A" ? aEdges : rEdges;
    if (target.length === 0) return;
    const k = new Set(target.map(edgeKey));
    pushHistory({ edges, rEdges });
    setEdges(edges.filter((e) => !k.has(edgeKey(e))));
    if (pane === "B") setREdges([]);
    setFirst(null); setFirstPane(null);
  }

  /* ---- 折り重ね（fold）の 3 ペイン編集 ----
     かさねと違い、問題1（edges）と問題2（rEdges）は別々の紙＝独立した辺集合。
     同じ線を両方が持ってもよい（折ったとき重なるだけ）ので「移る」制約は無い。 */
  const foldStats = useMemo(() => {
    if (!isFold) return null;
    const bk = new Set(rEdges.map(edgeKey));
    const afterFold = foldMirrored.filter((e) => !bk.has(edgeKey(e)));  // 折った後の A'（difficulty.ts と同じ取り方）
    return {
      aLines: computeMetrics(edges, n).lines,
      bLines: computeMetrics(rEdges, n).lines,
      entangle: interCrossings(afterFold, rEdges),
      sep: separationLoad(edges) + separationLoad(rEdges),
      kf: foldFactor(foldInvariance(edges, n)),
      dup: foldMirrored.length - afterFold.length,   // 折ると問題2に重なって消える線
    };
  }, [isFold, edges, rEdges, foldMirrored, n]);

  function clickPointFold(pane: "A" | "B", p: Pt) {
    if (eraseMode) return;
    if (!first || firstPane !== pane) { setFirst(p); setFirstPane(pane); return; }
    if (samePt(first, p)) { setFirst(null); setFirstPane(null); return; } // 同点 = 選択解除
    const units = splitAtLattice([first, p]);
    const uKeys = new Set(units.map(edgeKey));
    const cur = pane === "A" ? edges : rEdges;
    const setCur = pane === "A" ? setEdges : setREdges;
    const curKeys = new Set(cur.map(edgeKey));
    pushHistory({ edges, rEdges });
    setCur(units.every((u) => curKeys.has(edgeKey(u)))
      ? cur.filter((e) => !uKeys.has(edgeKey(e)))       // もう一度なぞる = その紙から消す
      : normalizeEdges([...cur, ...units]));
    setFirst(oneStroke ? p : null);
    setFirstPane(oneStroke ? pane : null);
  }

  function eraseFold(pane: "A" | "B", e: EdgeT) {
    const k = edgeKey(e);
    pushHistory({ edges, rEdges });
    if (pane === "A") setEdges(edges.filter((x) => edgeKey(x) !== k));
    else setREdges(rEdges.filter((x) => edgeKey(x) !== k));
    setFirst(null); setFirstPane(null);
  }

  function clearFoldPane(pane: "A" | "B") {
    if ((pane === "A" ? edges : rEdges).length === 0) return;
    pushHistory({ edges, rEdges });
    if (pane === "A") setEdges([]); else setREdges([]);
    setFirst(null); setFirstPane(null);
  }

  /* 「質問＋回答」の2要素があるタスクは、maker 同様に右へ回答ペイン（読取専用ライブプレビュー）を並べる。
     左＝編集中（完成図/抜く線）・右＝子が見る結果。重ね描きの読みにくさを解消する。 */
  const previewKind: "fill" | "mirror" | "translate" | "rotate" | null =
    isFill ? "fill" : axis ? "mirror" : isRotate ? "rotate"
      : isTranslate ? "translate" : null;
  const previewSolid: EdgeT[] =
    previewKind === "fill" ? edges.filter((e) => !rSetView.has(edgeKey(e)))
      : previewKind === "mirror" ? mirrorGhost
        : previewKind === "rotate" ? rotated
          : previewKind === "translate" ? tMoved
            : [];
  // fill のみ: 抜いた線（子が描き足す＝解答）をアクセント点線で重ねる
  const previewAccent: EdgeT[] =
    previewKind === "fill" ? rEdges.filter((e) => fSet.has(edgeKey(e))) : [];
  const previewLabel =
    previewKind === "fill" ? (fillWording ? "回答ペイン（欠け図＋抜いた線）" : "紙面イメージ（図形A=実線・図形B=点線）")
      : previewKind === "mirror" ? "回答ペイン（折り返した形）"
        : previewKind === "rotate" ? "回答ペイン（まわした形）"
          : previewKind === "translate" ? "回答ペイン（うつした図）・点をクリックで移動先●" : "";
  const editSize = previewKind ? 300 : SIZE;

  /* =======================================================================
     かさね（overlay）: 「図形A ＋ 図形B ＝ 重ねた結果」の 3 ペイン編集
     左 2 枚は独立した編集盤面（どちらも直接描ける）・右 1 枚は読取専用の
     重ね結果（A=実線・B=点線）。紙面の並び（maker-overlay）と同じ読み方向。
     ======================================================================= */
  if (isAB) {
    const AB_SIZE = 236;
    return (
      <div className="atl-overlay" role="dialog" aria-modal>
        <div className="atl-editor has-trio">
          <header className="atl-editor-head">
            <h2>{createMode ? "新規作成（かさね・白紙）" : "かさねの手直し"}</h2>
            <p className="atl-editor-hint">
              図形A・図形B のどちらの盤面でも、点を 2 つクリックして線を引けます
              （同じ線をもう一度なぞると、その盤面から消えます）。
              A と B は同じ線を持てないため、片方に描いた線がもう片方にあると移ります。
            </p>
          </header>

          <label className="atl-editor-title">
            タイトル（名前・任意）
            <input type="text" value={title}
              placeholder="かいだん・いえ など"
              onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="atl-editor-onestroke" role="group" aria-label="モード">
            <span className="atl-os-label">モード</span>
            <div className="atl-seg">
              <button type="button" aria-pressed={!eraseMode}
                onClick={() => { setEraseMode(false); setFirst(null); setFirstPane(null); }}>描く</button>
              <button type="button" aria-pressed={eraseMode}
                onClick={() => { setEraseMode(true); setFirst(null); setFirstPane(null); }}>消す</button>
            </div>
            <span className="atl-os-label">一筆書き</span>
            <div className="atl-seg">
              <button type="button" aria-pressed={!oneStroke} onClick={() => setOneStroke(false)} disabled={eraseMode}>OFF</button>
              <button type="button" aria-pressed={oneStroke} onClick={() => setOneStroke(true)} disabled={eraseMode}>ON</button>
            </div>
            {abStats && (
              <span className="atl-fair">
                図形A {abStats.aLines} 本・図形B {abStats.bLines} 本・絡み {abStats.entangle}
                {abStats.sep > 0 && `・ばらけ +${abStats.sep}`}
              </span>
            )}
          </div>

          <div className="atl-editor-pair atl-editor-trio">
            <div className="atl-editor-paneblock">
              <ABPane n={n} size={AB_SIZE} edges={aEdges} ink={INK}
                first={firstPane === "A" ? first : null} eraseMode={eraseMode}
                onPoint={(p) => clickPointAB("A", p)}
                onErase={(i) => eraseAB("A", aEdges[i])} />
              <span className="atl-pane-label">図形A（編集できます）</span>
            </div>

            <span className="atl-editor-arrow" aria-hidden>＋</span>

            <div className="atl-editor-paneblock">
              <ABPane n={n} size={AB_SIZE} edges={rEdges} ink={ACCENT}
                first={firstPane === "B" ? first : null} eraseMode={eraseMode}
                onPoint={(p) => clickPointAB("B", p)}
                onErase={(i) => eraseAB("B", rEdges[i])} />
              <span className="atl-pane-label">図形B（編集できます）</span>
            </div>

            <span className="atl-editor-arrow" aria-hidden>＝</span>

            <div className="atl-editor-paneblock">
              <svg viewBox="0 0 100 100" width={AB_SIZE} height={AB_SIZE}
                className="atl-preview-svg" aria-label="重ねた結果（図形A=実線・図形B=点線）">
                <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
                {aEdges.map((e, i) => (
                  <line key={`ra${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
                ))}
                {rEdges.map((e, i) => (
                  <line key={`rb${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={ACCENT} strokeWidth={1.9} strokeDasharray="3 2" strokeLinecap="round" />
                ))}
                {Array.from({ length: n * n }, (_, i) => (
                  <circle key={i} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.8} fill={INK} />
                ))}
              </svg>
              <span className="atl-pane-label">重ねた結果（A=実線・B=点線）</span>
            </div>
          </div>

          <p className="atl-editor-metrics">{metricsLabel(liveMetrics, candidate.grid)}</p>

          <div className="atl-editor-actions">
            <button type="button" onClick={undo} disabled={history.length === 0}>ひとつ戻す</button>
            <button type="button" onClick={() => clearPane("A")} disabled={aEdges.length === 0}>図形Aを全消し</button>
            <button type="button" onClick={() => clearPane("B")} disabled={rEdges.length === 0}>図形Bを全消し</button>
            <span className="atl-editor-spacer" />
            <button type="button" onClick={onClose} disabled={busy}>キャンセル</button>
            <button type="button" className="atl-btn atl-btn--pub"
              disabled={busy || aEdges.length === 0 || rEdges.length === 0}
              onClick={() => onSave(edges, title.trim(), rEdges)}>
              {aEdges.length === 0 ? "図形Aが空です"
                : rEdges.length === 0 ? "図形Bが空です"
                  : "保存する"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================================
     折り重ね（fold）: 「問題1 →(折る) 問題2 ＝ 完成図」の 3 ペイン編集
     左 2 枚は独立した紙（どちらも直接描ける）・右 1 枚は読取専用の完成図
     ＝mirror(問題1, v) ∪ 問題2。紙面（maker-fold / render.ts の composeTriple）と
     同じ読み方向。完成図ペインには折り返した問題1 を薄色点線で重ね、
     「どの線が折り返しで来たか」を検品者が一目で追えるようにする。
     ======================================================================= */
  if (isFold) {
    const AB_SIZE = 236;
    const bKeys = new Set(rEdges.map(edgeKey));
    const afterFold = foldMirrored.filter((e) => !bKeys.has(edgeKey(e)));
    return (
      <div className="atl-overlay" role="dialog" aria-modal>
        <div className="atl-editor has-trio">
          <header className="atl-editor-head">
            <h2>{createMode ? "新規作成（折り重ね・白紙）" : "折り重ねの手直し"}</h2>
            <p className="atl-editor-hint">
              問題1・問題2 のどちらの紙でも、点を 2 つクリックして線を引けます
              （同じ線をもう一度なぞると、その紙から消えます）。
              完成図は「問題1 を左右に折り返して問題2 へ重ねた図」＝自動で出ます。
            </p>
          </header>

          <label className="atl-editor-title">
            タイトル（名前・任意）
            <input type="text" value={title}
              placeholder="かいだん・いえ など"
              onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="atl-editor-onestroke" role="group" aria-label="モード">
            <span className="atl-os-label">モード</span>
            <div className="atl-seg">
              <button type="button" aria-pressed={!eraseMode}
                onClick={() => { setEraseMode(false); setFirst(null); setFirstPane(null); }}>描く</button>
              <button type="button" aria-pressed={eraseMode}
                onClick={() => { setEraseMode(true); setFirst(null); setFirstPane(null); }}>消す</button>
            </div>
            <span className="atl-os-label">一筆書き</span>
            <div className="atl-seg">
              <button type="button" aria-pressed={!oneStroke} onClick={() => setOneStroke(false)} disabled={eraseMode}>OFF</button>
              <button type="button" aria-pressed={oneStroke} onClick={() => setOneStroke(true)} disabled={eraseMode}>ON</button>
            </div>
            {foldStats && (
              <span className="atl-fair">
                問題1 {foldStats.aLines} 本・問題2 {foldStats.bLines} 本・絡み {foldStats.entangle}
                {foldStats.sep > 0 && `・ばらけ +${foldStats.sep}`}
                {foldStats.kf < 1 && `・折り係数 ${foldStats.kf}`}
              </span>
            )}
          </div>

          <div className="atl-editor-pair atl-editor-trio">
            <div className="atl-editor-paneblock">
              <ABPane n={n} size={AB_SIZE} edges={edges} ink={INK}
                first={firstPane === "A" ? first : null} eraseMode={eraseMode}
                onPoint={(p) => clickPointFold("A", p)}
                onErase={(i) => eraseFold("A", edges[i])} />
              <span className="atl-pane-label">問題1（編集できます）</span>
            </div>

            <span className="atl-editor-arrow" aria-hidden>⇢折る</span>

            <div className="atl-editor-paneblock">
              <ABPane n={n} size={AB_SIZE} edges={rEdges} ink={INK}
                first={firstPane === "B" ? first : null} eraseMode={eraseMode}
                onPoint={(p) => clickPointFold("B", p)}
                onErase={(i) => eraseFold("B", rEdges[i])} />
              <span className="atl-pane-label">問題2（編集できます）</span>
            </div>

            <span className="atl-editor-arrow" aria-hidden>＝</span>

            <div className="atl-editor-paneblock">
              <svg viewBox="0 0 100 100" width={AB_SIZE} height={AB_SIZE}
                className="atl-preview-svg" aria-label="完成図（問題2=実線・折り返した問題1=うすい点線）">
                <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
                {rEdges.map((e, i) => (
                  <line key={`fb${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
                ))}
                {afterFold.map((e, i) => (
                  <line key={`fa${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={GHOST} strokeWidth={1.9} strokeDasharray="3 2" strokeLinecap="round" />
                ))}
                {Array.from({ length: n * n }, (_, i) => (
                  <circle key={i} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.8} fill={INK} />
                ))}
              </svg>
              <span className="atl-pane-label">完成図（うすい点線＝折り返した問題1）</span>
            </div>
          </div>

          <p className="atl-editor-metrics">{metricsLabel(liveMetrics, candidate.grid)}</p>
          {foldStats && foldStats.dup > 0 && (
            <p className="atl-editor-metrics">
              折ると問題2 に重なって消える線が {foldStats.dup} 本あります（完成図では 1 本になります）
            </p>
          )}

          <div className="atl-editor-actions">
            <button type="button" onClick={undo} disabled={history.length === 0}>ひとつ戻す</button>
            <button type="button" onClick={() => clearFoldPane("A")} disabled={edges.length === 0}>問題1を全消し</button>
            <button type="button" onClick={() => clearFoldPane("B")} disabled={rEdges.length === 0}>問題2を全消し</button>
            <span className="atl-editor-spacer" />
            <button type="button" onClick={onClose} disabled={busy}>キャンセル</button>
            <button type="button" className="atl-btn atl-btn--pub"
              disabled={busy || edges.length === 0 || rEdges.length === 0}
              /* 保存は 3 点セット: edges=問題1・inputB=問題2・answerEdges=完成図 */
              onClick={() => onSave(edges, title.trim(), foldResult, undefined, undefined, rEdges)}>
              {edges.length === 0 ? "問題1が空です"
                : rEdges.length === 0 ? "問題2が空です"
                  : "保存する"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="atl-overlay" role="dialog" aria-modal>
      <div className={`atl-editor${previewKind ? " has-pair" : ""}`}>
        <header className="atl-editor-head">
          <h2>{createMode ? "新規作成（白紙）" : "問題の手直し"}</h2>
          <p className="atl-editor-hint">
            {mode === "F"
              ? "点を 2 つクリックして線を引く／同じ線をもう一度なぞると消える"
              : `完成図の線をクリックすると「${rLabel}」へ／もう一度で戻る`}
          </p>
        </header>

        <label className="atl-editor-title">
          タイトル（名前・任意）
          <input type="text" value={title}
            placeholder="かいだん・いえ など"
            onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="atl-editor-onestroke" role="group" aria-label="モード">
          <span className="atl-os-label">モード</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={!eraseMode && mode === "F"}
              onClick={() => { setEraseMode(false); setMode("F"); setFirst(null); }}>描く</button>
            {isFill && (
              <button type="button" aria-pressed={!eraseMode && mode === "R"}
                onClick={() => { setEraseMode(false); setMode("R"); setFirst(null); }}>{rLabel}を選ぶ</button>
            )}
            <button type="button" aria-pressed={eraseMode}
              onClick={() => { setEraseMode(true); setFirst(null); }}>消す</button>
          </div>
          {/* 公平性（R の両端点が G に残るか）は fill 固有。overlay の図形B には適用しない */}
          {isFill && fillWording && <span className={`atl-fair${fairness.ok ? "" : " is-bad"}`}>{fairness.msg}</span>}
          {isFill && !fillWording && (
            <span className="atl-fair">{rLabel} {rEdges.length ? mergedSegments(rEdges).length : 0} 本（点線）・のこり＝実線</span>
          )}
          {isTranslate && (
            <span className={`atl-fair${tZero || !tFits ? " is-bad" : ""}`}>
              移動: {tMoveLabel}{!tFits ? "（枠からはみ出します）" : ""}
            </span>
          )}
          {eraseMode && <span className="atl-os-note">線をクリックすると、その線だけ消えます。</span>}
        </div>

        {isRotate && (
          <div className="atl-editor-onestroke" role="group" aria-label="回転を選ぶ">
            <span className="atl-os-label">回転を選ぶ</span>
            <div className="atl-seg">
              {([[90, "みぎ 90°"], [-90, "ひだり 90°"], [180, "180°"]] as const).map(([d, label]) => (
                <button key={d} type="button" aria-pressed={rDeg === d}
                  onClick={() => setRDeg(d)}>{label}</button>
              ))}
            </div>
            <span className="atl-os-note">
              1 問 1 角度。混在巻はこの選択が問題ごとに散る（紙面は弧の矢印＋目じるしで示す）
            </span>
          </div>
        )}

        {isTranslate && (
          <div className="atl-editor-onestroke" role="group" aria-label="移動を選ぶ">
            <span className="atl-os-label">移動を選ぶ</span>
            {tVecGrid ? (
              <div className="atl-tgrid"
                style={{ gridTemplateColumns: `repeat(${tVecGrid.cols}, 20px)` }}>
                {tVecGrid.cells.map((o) => (
                  <button key={`${o.dc},${o.dr}`} type="button"
                    className={o.dc === 0 && o.dr === 0 ? "is-origin" : ""}
                    title={o.label} aria-label={o.label}
                    aria-pressed={tVec.dc === o.dc && tVec.dr === o.dr}
                    disabled={o.dc === 0 && o.dr === 0}
                    onClick={() => pickVec(o.dc, o.dr)} />
                ))}
              </div>
            ) : (
              <span className="atl-os-note">
                この形は盤面いっぱいのため移動できません。線を消して形を小さくしてください。
              </span>
            )}
          </div>
        )}

        {isTranslate && (
          <div className="atl-editor-onestroke" role="group" aria-label="図形ごと動かす">
            <span className="atl-os-label">図形ごと動かす</span>
            <div className="atl-seg">
              <button type="button" aria-label="図形を左へ1マス" disabled={!canShiftF(-1, 0)}
                onClick={() => shiftF(-1, 0)}>←</button>
              <button type="button" aria-label="図形を右へ1マス" disabled={!canShiftF(1, 0)}
                onClick={() => shiftF(1, 0)}>→</button>
              <button type="button" aria-label="図形を上へ1マス" disabled={!canShiftF(0, -1)}
                onClick={() => shiftF(0, -1)}>↑</button>
              <button type="button" aria-label="図形を下へ1マス" disabled={!canShiftF(0, 1)}
                onClick={() => shiftF(0, 1)}>↓</button>
            </div>
            <span className="atl-os-note">
              {tNoVert && tNoHorz
                ? "この形は盤面いっぱいのため移動できません。線を消して形を小さくしてください。"
                : tNoVert
                  ? "この形は縦いっぱいのため縦移動はできません（横のみ）。縦に動かすには線を消して形を低くしてください。"
                  : tNoHorz
                    ? "この形は横いっぱいのため横移動はできません（縦のみ）。横に動かすには線を消して形を細くしてください。"
                    : "形はそのまま盤面内で位置だけずらします（移動の余白づくり）。"}
            </span>
          </div>
        )}

        <div className="atl-editor-onestroke" role="group" aria-label="一筆書きモード">
          <span className="atl-os-label">一筆書き</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={!oneStroke} onClick={() => setOneStroke(false)} disabled={eraseMode}>OFF</button>
            <button type="button" aria-pressed={oneStroke} onClick={() => setOneStroke(true)} disabled={eraseMode}>ON</button>
          </div>
          {oneStroke && <span className="atl-os-note">点を続けてクリックすると線がつながります。</span>}
        </div>

        <div className={previewKind ? "atl-editor-pair" : undefined}>
        <div className="atl-editor-paneblock">
        <svg viewBox="0 0 100 100" width={editSize} height={editSize} className="atl-editor-svg">
          <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
          {axis && <AxisLineLocal axis={axis} />}
          {mirrorGhost.map((e, i) => (
            <line key={`mg${i}`}
              x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
              stroke={GHOST} strokeWidth={1.5} strokeDasharray="3 2" strokeLinecap="round" />
          ))}
          {/* F の辺。fill かつ R に含まれている辺は R モードで強調、F モードでゴースト */}
          {edges.map((e, i) => {
            const inR = isFill && rSetView.has(edgeKey(e));
            if (!isFill) {
              return <line key={i}
                x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                stroke={INK} strokeWidth={1.7} strokeLinecap="round" />;
            }
            if (mode === "R") {
              return <line key={i}
                x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                stroke={inR ? ACCENT : INK} strokeWidth={inR ? 2.2 : 1.7}
                strokeDasharray={inR ? "3 2" : undefined} strokeLinecap="round" />;
            }
            return <line key={i}
              x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
              stroke={inR ? GHOST : INK} strokeWidth={1.7}
              strokeDasharray={inR ? "3 2" : undefined} strokeLinecap="round" />;
          })}
          {/* F に含まれない孤立 R（編集途中で出ることがある） */}
          {rOrphan.map((e, i) => (
            <line key={`ro${i}`}
              x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
              stroke="#D04848" strokeWidth={1.5} strokeDasharray="2 2" strokeLinecap="round" />
          ))}
          {Array.from({ length: n * n }, (_, i) => {
            const c = i % n, r = Math.floor(i / n);
            const selected = first && samePt(first, [c, r]);
            return (
              <g key={i}>
                <circle cx={pos(c)} cy={pos(r)} r={selected ? 3 : 1.8}
                  fill={selected ? ACCENT : SCREEN_DOT} />
                {/* 当たり判定を広く（タップしやすく）。消すモードでは点は触らせない。 */}
                {!eraseMode && (
                  <circle cx={pos(c)} cy={pos(r)} r={6} fill="transparent"
                    style={{ cursor: "pointer" }} onClick={() => clickPoint([c, r])} />
                )}
              </g>
            );
          })}
          {/* 移動: ★きてん（F の辞書順最小点・クリックは透過） */}
          {isTranslate && tAnchor && (
            <circle cx={pos(tAnchor[0])} cy={pos(tAnchor[1])} r={3.4}
              fill={ACCENT} opacity={0.9} style={{ pointerEvents: "none" }} />
          )}
          {eraseMode && (
            <EdgeHitLayer
              edges={edges.map((e) => ({ a: { c: e[0][0], r: e[0][1] }, b: { c: e[1][0], r: e[1][1] } }))}
              pos={(c, r) => ({ x: pos(c), y: pos(r) })}
              onErase={eraseUnit}
              step={80 / Math.max(1, n - 1)}
            />
          )}
        </svg>
        {previewKind && (
          <span className="atl-pane-label">
            編集中（{isFill ? (mode === "F" ? "完成図" : "抜く線") : "みほん"}）
          </span>
        )}
        </div>
        {previewKind && (
          <>
            <span className="atl-editor-arrow" aria-hidden>→</span>
            <div className="atl-editor-paneblock">
              <svg viewBox="0 0 100 100" width={editSize} height={editSize}
                className="atl-preview-svg" aria-label={previewLabel}>
                <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
                {previewKind === "mirror" && axis && <AxisLineLocal axis={axis} />}
                {previewSolid.map((e, i) => (
                  <line key={`ps${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
                ))}
                {previewAccent.map((e, i) => (
                  <line key={`pa${i}`}
                    x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
                    stroke={ACCENT} strokeWidth={1.9} strokeDasharray="3 2" strokeLinecap="round" />
                ))}
                {Array.from({ length: n * n }, (_, i) => {
                  const c = i % n, r = Math.floor(i / n);
                  const isTgt = previewKind === "translate"
                    && tTarget?.[0] === c && tTarget?.[1] === r;
                  return (
                    <g key={i}>
                      <circle cx={pos(c)} cy={pos(r)} r={1.8} fill={INK} />
                      {/* 移動: ●ここへ（きてん★の着地点） */}
                      {isTgt && (
                        <circle cx={pos(c)} cy={pos(r)} r={3.4}
                          fill="none" stroke={ACCENT} strokeWidth={1.2} opacity={0.9} />
                      )}
                      {/* 移動: 点クリックで移動先を選ぶ（vec = ● − ★） */}
                      {previewKind === "translate" && (
                        <circle cx={pos(c)} cy={pos(r)} r={6} fill="transparent"
                          style={{ cursor: "pointer" }} onClick={() => clickTargetDot([c, r])} />
                      )}
                    </g>
                  );
                })}
              </svg>
              <span className="atl-pane-label">{previewLabel}</span>
            </div>
          </>
        )}
        </div>

        <p className="atl-editor-metrics">
          {metricsLabel(liveMetrics, candidate.grid)}
        </p>

        <div className="atl-editor-actions">
          <button type="button" onClick={undo} disabled={history.length === 0}>ひとつ戻す</button>
          <button type="button" onClick={clearAll}
            disabled={mode === "F" ? edges.length === 0 && rEdges.length === 0 : rEdges.length === 0}>
            {mode === "F" ? "全消し" : "抜く線を全部戻す"}
          </button>
          <span className="atl-editor-spacer" />
          <button type="button" onClick={onClose} disabled={busy}>キャンセル</button>
          <button type="button" className="atl-btn atl-btn--pub"
            disabled={busy || edges.length === 0 || (isFill && rEdges.length === 0)
              || (isTranslate && (tZero || !tFits))}
            onClick={() => onSave(edges, title.trim(), isFill ? rEdges : undefined,
              isTranslate ? tVec : undefined, isRotate ? rDeg : undefined)}>
            {edges.length === 0 ? "線が空です"
              : isFill && rEdges.length === 0 ? "抜く線が空です"
              : isTranslate && tZero ? "移動先を選んでください"
              : isTranslate && !tFits ? "はみ出しています"
              : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   立体の作成／手直しモーダル（抽出した SolidPaperSVG を内蔵）
   点を2つクリックで線／描いた線をクリックで実線⇔点線／消すモードで1本削除。
   createMode では盤面（横×縦・7〜15）を選べる。既存編集では grid 固定。
   線種の切替・モード切替では作図中の選択点を解除（引きかけの線が別線種へ流れない）。
   ========================================================================= */
const SOLID_SIZES = [7, 8, 9, 10, 11, 12, 13, 14, 15];

function SolidEditOverlay({
  candidate, busy, onSave, onClose, createMode = false,
}: {
  candidate: Candidate;
  busy: boolean;
  onSave: (cols: number, rows: number, solidEdges: SolidEdge[], solidHiddenParked: SolidEdge[]) => void;
  onClose: () => void;
  createMode?: boolean;
}) {
  const g0 = candidate.grid.type === "solid" ? candidate.grid : { cols: 7, rows: 7 };
  const [cols, setCols] = useState(g0.cols);
  const [rows, setRows] = useState(g0.rows);
  /* 編集中は「隠れ線 OFF で退避中の点線」も含めた全線を 1 本のリストで持つ＝
     OFF のまま隠れ線を描き足す・消す・実線に変えるができる。保存時に hiddenOn で振り分ける。 */
  const [edges, setEdges] = useState<SolidEdge[]>(
    () => normalizeSolidEdges([...(candidate.solidEdges ?? []), ...(candidate.solidHiddenParked ?? [])]),
  );
  const [hiddenOn, setHiddenOn] = useState(solidHiddenIsOn(candidate));
  const [selected, setSelected] = useState<Point | null>(null);
  const [drawStyle, setDrawStyle] = useState<LineStyle>("solid");
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [oneStroke, setOneStroke] = useState(true);
  const [history, setHistory] = useState<SolidEdge[][]>([]);

  const pushHistory = () => setHistory((h) => [...h, edges]);
  const changeTool = (t: "draw" | "erase") => { setTool(t); setSelected(null); };
  const changeDrawStyle = (s: LineStyle) => { setDrawStyle(s); setSelected(null); };
  const samePoint = (a: Point | null, b: Point | null) => !!a && !!b && a.c === b.c && a.r === b.r;

  function handleDot(p: Point) {
    if (tool === "erase") return;
    if (!selected) { setSelected(p); return; }
    if (samePoint(selected, p)) { setSelected(null); return; }
    const next: SolidEdge = { a: selected, b: p, style: drawStyle };
    const k = solidEdgeKey(next);
    const after = oneStroke ? p : null;
    const existing = edges.findIndex((e) => solidEdgeKey(e) === k);
    if (existing >= 0) {
      if (edges[existing].style !== drawStyle) {
        pushHistory();
        setEdges(edges.map((e, i) => (i === existing ? { ...e, style: drawStyle } : e)));
      }
      setSelected(after);
      return;
    }
    pushHistory();
    setEdges([...edges, next]);
    setSelected(after);
  }

  function onEdgeClick(i: number) {
    if (tool === "erase") { pushHistory(); setEdges(edges.filter((_, idx) => idx !== i)); return; }
    pushHistory();
    setEdges(edges.map((e, idx) =>
      idx === i ? { ...e, style: e.style === "dashed" ? "solid" as const : "dashed" as const } : e));
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setEdges(h[h.length - 1]); setSelected(null);
      return h.slice(0, -1);
    });
  }
  function clearAll() { if (edges.length === 0) return; pushHistory(); setEdges([]); setSelected(null); }
  /* 隠れ線だけ捨てる（退避ではなく削除）。形が濁ってしまった問題を作り直すときの掃除ボタン。 */
  function clearHidden() {
    if (!edges.some((e) => e.style === "dashed")) return;
    pushHistory();
    setEdges(edges.filter((e) => e.style !== "dashed"));
    setSelected(null);
  }
  function changeDims(nc: number, nr: number) {
    if (!createMode) return;
    setCols(nc); setRows(nr); setEdges([]); setSelected(null); setHistory([]);
  }

  const grid: SolidGrid = { type: "solid", cols, rows };
  const { vw, vh } = editorVB(cols, rows);
  const boardW = 380;
  const boardH = Math.round((boardW * vh) / vw);
  /* 保存の振り分け＝紙面に出る線（printed）と退避する隠れ線（parked）。
     メトリクスは printed 側で出す＝カードの D と同じものを編集中に見る。 */
  const hiddenCount = edges.filter((e) => e.style === "dashed").length;
  const { printed, parked } = useMemo(
    () => hiddenOn
      ? { printed: edges, parked: [] as SolidEdge[] }
      : {
          printed: edges.filter((e) => e.style !== "dashed"),
          parked: edges.filter((e) => e.style === "dashed"),
        },
    [edges, hiddenOn],
  );
  const liveMetrics = useMemo(() => computeSolidMetrics(printed), [printed]);

  return (
    <div className="atl-overlay" role="dialog" aria-modal>
      <div className="atl-editor">
        <header className="atl-editor-head">
          <h2>{createMode ? "新規作成（立体・白紙）" : "立体の手直し"}</h2>
          <p className="atl-editor-hint">
            点を 2 つクリックして線を引く／描いた線をクリックで実線⇔点線／消すモードで 1 本削除。
            実線＝見える辺・点線＝かくれた辺。
            隠れ線 OFF のあいだ点線は<strong>薄く</strong>出ます（＝紙面に出ない・でも触れる）。
          </p>
        </header>

        {createMode && (
          <div className="atl-editor-onestroke" role="group" aria-label="盤面サイズ">
            <span className="atl-os-label">盤面（横×縦）</span>
            <select value={cols} onChange={(e) => changeDims(Number(e.target.value), rows)}>
              {SOLID_SIZES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <span aria-hidden> × </span>
            <select value={rows} onChange={(e) => changeDims(cols, Number(e.target.value))}>
              {SOLID_SIZES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <div className="atl-editor-onestroke" role="group" aria-label="モード・線種">
          <span className="atl-os-label">モード</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={tool === "draw"} onClick={() => changeTool("draw")}>描く</button>
            <button type="button" aria-pressed={tool === "erase"} onClick={() => changeTool("erase")}>消す</button>
          </div>
          <span className="atl-os-label">線</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={drawStyle === "solid"} disabled={tool === "erase"}
              onClick={() => changeDrawStyle("solid")}>実線</button>
            <button type="button" aria-pressed={drawStyle === "dashed"} disabled={tool === "erase"}
              onClick={() => changeDrawStyle("dashed")}>点線</button>
          </div>
        </div>

        <div className="atl-editor-onestroke" role="group" aria-label="一筆書きモード">
          <span className="atl-os-label">一筆書き</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={!oneStroke} onClick={() => setOneStroke(false)}>OFF</button>
            <button type="button" aria-pressed={oneStroke} onClick={() => setOneStroke(true)}>ON</button>
          </div>
        </div>

        {/* この問題の隠れ線スイッチ（可逆）。OFF＝点線は退避され紙面にも D にも出ない。 */}
        <div className="atl-editor-onestroke" role="group" aria-label="この問題の隠れ線">
          <span className="atl-os-label">隠れ線</span>
          <div className="atl-seg">
            <button type="button" aria-pressed={!hiddenOn} onClick={() => setHiddenOn(false)}>OFF</button>
            <button type="button" aria-pressed={hiddenOn} onClick={() => setHiddenOn(true)}>ON</button>
          </div>
          <span className="atl-editor-hint">
            {hiddenCount === 0
              ? "この問題に点線はありません"
              : hiddenOn
                ? `点線 ${hiddenCount} 本を出題に含めます`
                : `点線 ${hiddenCount} 本は退避（紙面・難易度から外れます）`}
          </span>
          <button type="button" onClick={clearHidden} disabled={hiddenCount === 0}>隠れ線を全部消す</button>
        </div>

        <div className="atl-editor-paneblock">
          <div style={{ width: boardW, height: boardH, background: "#FFFFFF", border: "1px solid #E2E2E2", borderRadius: 8 }}>
            <SolidPaperSVG
              cols={cols} rows={rows} edges={edges} selected={selected} tool={tool}
              onDotClick={handleDot} onEdgeClick={onEdgeClick} showLines interactive
              dimDashed={!hiddenOn}
            />
          </div>
        </div>

        <p className="atl-editor-metrics">{metricsLabel(liveMetrics, grid)}</p>

        <div className="atl-editor-actions">
          <button type="button" onClick={undo} disabled={history.length === 0}>ひとつ戻す</button>
          <button type="button" onClick={clearAll} disabled={edges.length === 0}>全消し</button>
          <span className="atl-editor-spacer" />
          <button type="button" onClick={onClose} disabled={busy}>キャンセル</button>
          <button type="button" className="atl-btn atl-btn--pub" disabled={busy || printed.length === 0}
            onClick={() => onSave(cols, rows, normalizeSolidEdges(printed), normalizeSolidEdges(parked))}>
            {printed.length === 0 ? "線が空です" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
