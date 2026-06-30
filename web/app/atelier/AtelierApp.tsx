"use client";

/* =========================================================================
   検品 UI 本体（dev 限定・/atelier/[sku]）
   候補サムネ一覧 → 採用トグル → 採用レーンで並び替え（＝巻内出題順）→
   12 問ちょうどで「公開する」。変更は都度 /api/atelier/candidates へ書き戻し。
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Candidate, CandidateFile, EdgeT, Pt, Problem } from "../products/problems/schema";
import {
  metricsLabel, normalizeEdges, splitAtLattice, edgeKey, mirrorEdges, TASK_ANSWER_MODE,
} from "../products/problems/schema";
import { computeMetrics } from "../products/problems/gen/metrics";
import {
  ladderChips, ladderFieldsFor, GRID_MIN, GRID_MAX, type LadderField,
} from "../products/problems/ladder-schema";
import { baseDifficulty } from "../products/problems/gen/difficulty";
import { QUESTIONS_PER_VOL } from "../products/data";
import { EdgeHitLayer } from "../maker/erase";
import { SCREEN_DOT } from "../products/print";

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
   ox/oy: viewBox 内の左上原点。across-pane レイアウトでこれを 2 つ並べる */
function PaneFig({
  n, edges, axis, ox = 0, oy = 0,
}: { n: number; edges: EdgeT[]; axis?: "v" | "h" | "d1" | "d2"; ox?: number; oy?: number }) {
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
          stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
      ))}
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
     解答は mirror(A)∪B で導出可＝サムネは2図の確認に集中する。 */
  if (inputB) {
    return (
      <svg viewBox="0 0 200 100" width={size * 2} height={size}
        className="atl-thumb" aria-label="折り重ね: 問題1／問題2">
        <PaneFig n={n} edges={edges} />
        <PaneFig n={n} edges={inputB} ox={100} />
      </svg>
    );
  }
  const axis = mirrorAxisOf(answer);
  /* mirror: across-pane（v/d1/d2=横並び 200×100, h=縦並び 100×200） */
  if (axis) {
    const R = mirrorEdges(edges, n, axis);
    const stack = axis === "h";
    const vbW = stack ? 100 : 200;
    const vbH = stack ? 200 : 100;
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width={stack ? size : size * 2} height={stack ? size * 2 : size}
        className="atl-thumb" aria-label="鏡: 左=みほん／右=解答">
        <PaneFig n={n} edges={edges} />
        <PaneFig n={n} edges={R}
          ox={stack ? 0 : 100} oy={stack ? 100 : 0} />
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


/* 候補がどの生成エンジンで作られたか（gen.variant 接頭辞から）。撤去した枠分割の代わりに
   各カードの D 内訳の隣に小さく出す。rand#=ランダム分割／blob#=自由形／hybrid#=合成／他=対称・幾何。 */
function engineLabel(variant?: string): string {
  if (variant?.startsWith("rand#")) return "ランダム";
  if (variant?.startsWith("blob#")) return "自由形";
  if (variant?.startsWith("hybrid#")) return "ハイブリッド";
  return "対称・幾何";
}

/* タスク別の難易度式を1行で（atl-dhelp 見出し用）。式の実体は gen/difficulty.ts。 */
function dFormulaLabel(kind?: string): string {
  switch (kind) {
    case "copy": return "線数 ＋ 斜め本数×1.5 ＋ 非45°本数×8";
    case "fill": return "図形の土台 ＋ 欠け線分×2";
    case "mirror": return "図形の土台難易度（反転の操作負荷は軸ゲートで吸収）";
    case "motif": return "線数 ＋ 斜め本数×1.5 ＋ 非45°本数×8";
    default: return "タスク別の難易度式（gen/difficulty.ts）";
  }
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

type Update = { id: string; status?: Candidate["status"]; order?: number | null };

export default function AtelierApp({
  sku, title, blurb, meate, hasGenerator, genKind, linesRange, gapRange, motifInspoEnabled = false,
  blankGridN, ladderEntry = null,
}: {
  sku: string; title: string;
  /* この巻のキャッチコピー（各巻1文）と めあて（この巻で鍛えたい力）。
     live 商品詳細と同じ Vol メタ。タイトル下に出して検品時に狙いを確認する。 */
  blurb?: string; meate?: string;
  hasGenerator: boolean;
  genKind?: "copy" | "motif" | "mirror" | "fill";
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
          return next;
        }),
      };
    });
    await fetch("/api/atelier/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, updates }),
    });
  }

  const adopted = useMemo(
    () => (file?.candidates ?? [])
      .filter((c) => c.status === "adopted")
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [file],
  );
  const pending = useMemo(
    () => (file?.candidates ?? [])
      .filter((c) => c.status === "pending" && c.gen?.generator !== "motif")
      .sort((a, b) => (a.difficulty?.value ?? 0) - (b.difficulty?.value ?? 0)),
    [file],
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
    if (blankGridN === undefined) return null;
    const n = blankGridN as 3 | 4 | 5 | 6 | 7;
    const mode = TASK_ANSWER_MODE[task] ?? "none";
    const axis = lentry?.axis as "v" | "h" | "d1" | undefined;
    const answer: Problem["answer"] =
      mode === "explicit" ? { mode: "explicit", edges: [] }
        : mode === "derived" && task === "mirror" && axis
          ? { mode: "derived", transform: { type: "mirror", axis } }
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
    save([{ id: c.id, status: "adopted", order: maxOrder + 1 }]);
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

  async function saveEdit(id: string, edges: EdgeT[], motif?: string, answerEdges?: EdgeT[]) {
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
  async function createNew(edges: EdgeT[], title?: string, answerEdges?: EdgeT[]) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku, edges,
          ...(answerEdges !== undefined && { answerEdges }),
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
  // copy のみ「窓」D をカード上に出すのに使う（他タスクは undefined）
  const win = task === "copy" && Array.isArray(lentry?.D)
    ? (lentry!.D as [number, number]) : undefined;
  const fmtD = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const dValueOf = (c: Candidate): number =>
    c.difficulty ? c.difficulty.value : baseDifficulty(computeMetrics(c.edges, c.grid.n));
  const partsTitle = (c: Candidate): string | undefined => {
    const parts = c.difficulty?.parts;
    if (!parts) return undefined;
    const body = Object.entries(parts).map(([k, v]) => `${k} ${fmtD(v)}`).join("・");
    return win ? `${body}（窓 D ${win[0]}–${win[1]}）` : body;
  };
  const withDScore = (c: Candidate, fig: ReactNode): ReactNode => {
    const manual = c.difficulty?.manual != null;
    const parts = c.difficulty?.parts;
    return (
      <div key={c.id} className="atl-cell">
        <div className={`atl-dscore${manual ? " is-manual" : ""}`} title={partsTitle(c)}>
          <span className="atl-dval">D {fmtD(dValueOf(c))}{manual && <em className="atl-dman">手動</em>}</span>
          <span className="atl-dbreak">
            {parts ? Object.values(parts).map((v) => fmtD(v)).join("+") : ""}
            {genKind === "copy" && <span className="atl-deng">{engineLabel(c.gen.variant)}</span>}
          </span>
          <button type="button" className="atl-dedit" title="難易度を手動指定／自動へ戻す"
            onClick={(e) => { e.stopPropagation(); promptManual(c); }}>✎</button>
        </div>
        {fig}
      </div>
    );
  };

  const renderPendingCard = (c: Candidate) => withDScore(c,
    <figure key={c.id} className="atl-card" onClick={() => adopt(c)} title="クリックで採用">
      <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} inputB={c.inputB} />
      {cardLabel(c) && <figcaption className="atl-card-name">{cardLabel(c)}</figcaption>}
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
        <p className="atl-crumb"><a href="/atelier">atelier</a> / {sku}</p>
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
                {genKind === "fill" ? "線分の本数" : "線の本数"}
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
          {blankGridN !== undefined && (
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
                  n: c.grid.n, edges: c.edges,
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
        <p className="atl-dhelp-formula">
          難易度 <strong>D</strong>：{dFormulaLabel(genKind)}
        </p>
        <p className="atl-dhelp-note">
          12 問の中で難易度を散らすための指標（全タスク共通でカード上に前面表示）。
          各カードの <strong>✎</strong> で難易度を手動上書き／自動へ戻せる（人手ティア付け・auto は保全）。
          {win && <>　この巻の窓は <strong>D {win[0]}–{win[1]}</strong>。非45°が最大ドライバー（ρ=0.878）。</>}
        </p>
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
              <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} inputB={c.inputB} />
              {cardLabel(c) && <figcaption className="atl-card-name">{cardLabel(c)}</figcaption>}
              <div className="atl-card-actions">
                <button type="button" onClick={() => move(c, -1)} disabled={i === 0}>↑</button>
                <button type="button" onClick={() => move(c, 1)} disabled={i === adopted.length - 1}>↓</button>
                <button type="button" onClick={() => setEditing(c)}>編集</button>
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
                <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} inputB={c.inputB} size={92} />
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
                <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} inputB={c.inputB} />
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

      {editing && (
        <EditOverlay
          key={editing.id}
          candidate={editing}
          busy={busy}
          onSave={(edges, motif, answerEdges) => saveEdit(editing.id, edges, motif, answerEdges)}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && blankCandidate && (
        <EditOverlay
          key="__new__"
          candidate={blankCandidate}
          busy={busy}
          createMode
          onSave={(edges, title, answerEdges) => createNew(edges, title, answerEdges)}
          onClose={() => setCreating(false)}
        />
      )}
    </main>
  );
}

/* =========================================================================
   線の手直しモーダル（点を 2 つクリック → その間の線分をトグル）
   metrics はライブで computeMetrics 表示。保存はサーバ権威で再算出される。
   fill 候補のときは F/R モード切替を出し、R モードでは F の部分集合として
   R をトグル（公平性=「R の両端点が G に残るか」をライブで注記）。
   ========================================================================= */
function EditOverlay({
  candidate, busy, onSave, onClose, createMode = false,
}: {
  candidate: Candidate;
  busy: boolean;
  onSave: (edges: EdgeT[], motif?: string, answerEdges?: EdgeT[]) => void;
  onClose: () => void;
  createMode?: boolean;
}) {
  const n = candidate.grid.n;
  const isFill = candidate.answer?.mode === "explicit";
  const [edges, setEdges] = useState<EdgeT[]>(candidate.edges);
  const [rEdges, setREdges] = useState<EdgeT[]>(
    isFill && candidate.answer?.mode === "explicit" ? candidate.answer.edges : [],
  );
  const [mode, setMode] = useState<"F" | "R">("F");
  const [first, setFirst] = useState<Pt | null>(null);
  const [oneStroke, setOneStroke] = useState(false);   // 一筆書き: 線を引いた後、終点を次の始点に残す
  const [eraseMode, setEraseMode] = useState(false);   // 消す（消しゴム）: 線をクリックで1本削除
  const [history, setHistory] = useState<{ edges: EdgeT[]; rEdges: EdgeT[] }[]>([]);
  const [title, setTitle] = useState(candidate.provenance?.label ?? candidate.gen?.motif ?? "");

  const SIZE = 360;
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  const samePt = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

  const liveMetrics = useMemo(() => computeMetrics(edges, n), [edges, n]);
  const axis = mirrorAxisOf(candidate.answer);
  const mirrorGhost = useMemo(() => (axis ? mirrorEdges(edges, n, axis) : []), [axis, edges, n]);

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
      setFirst(null);
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

  /* 「質問＋回答」の2要素があるタスクは、maker 同様に右へ回答ペイン（読取専用ライブプレビュー）を並べる。
     左＝編集中（完成図/抜く線）・右＝子が見る結果。重ね描きの読みにくさを解消する。 */
  const inputB = (candidate as { inputB?: EdgeT[] }).inputB;
  const previewKind: "fill" | "mirror" | "fold" | null =
    isFill ? "fill" : axis ? "mirror" : Array.isArray(inputB) ? "fold" : null;
  const previewSolid: EdgeT[] =
    previewKind === "fill" ? edges.filter((e) => !rSetView.has(edgeKey(e)))
      : previewKind === "mirror" ? mirrorGhost
        : previewKind === "fold" ? (inputB ?? [])
          : [];
  // fill のみ: 抜いた線（子が描き足す＝解答）をアクセント点線で重ねる
  const previewAccent: EdgeT[] =
    previewKind === "fill" ? rEdges.filter((e) => fSet.has(edgeKey(e))) : [];
  const previewLabel =
    previewKind === "fill" ? "回答ペイン（欠け図＋抜いた線）"
      : previewKind === "mirror" ? "回答ペイン（折り返した形）"
        : previewKind === "fold" ? "問題2（B）" : "";
  const editSize = previewKind ? 300 : SIZE;

  return (
    <div className="atl-overlay" role="dialog" aria-modal>
      <div className={`atl-editor${previewKind ? " has-pair" : ""}`}>
        <header className="atl-editor-head">
          <h2>{createMode ? "新規作成（白紙）" : "問題の手直し"}</h2>
          <p className="atl-editor-hint">
            {mode === "F"
              ? "点を 2 つクリックして線を引く／同じ線をもう一度なぞると消える"
              : "完成図の線をクリックすると「抜く線」へ／もう一度で戻る"}
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
                onClick={() => { setEraseMode(false); setMode("R"); setFirst(null); }}>抜く線を選ぶ</button>
            )}
            <button type="button" aria-pressed={eraseMode}
              onClick={() => { setEraseMode(true); setFirst(null); }}>消す</button>
          </div>
          {isFill && <span className={`atl-fair${fairness.ok ? "" : " is-bad"}`}>{fairness.msg}</span>}
          {eraseMode && <span className="atl-os-note">線をクリックすると、その線だけ消えます。</span>}
        </div>

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
                  return <circle key={i} cx={pos(c)} cy={pos(r)} r={1.8} fill={INK} />;
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
            disabled={busy || edges.length === 0 || (isFill && rEdges.length === 0)}
            onClick={() => onSave(edges, title.trim(), isFill ? rEdges : undefined)}>
            {edges.length === 0 ? "線が空です"
              : isFill && rEdges.length === 0 ? "抜く線が空です"
              : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
