"use client";

/* =========================================================================
   検品 UI 本体（dev 限定・/atelier/[sku]）
   候補サムネ一覧 → 採用トグル → 採用レーンで並び替え（＝巻内出題順）→
   12 問ちょうどで「公開する」。変更は都度 /api/atelier/candidates へ書き戻し。
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Candidate, CandidateFile, EdgeT, Pt, Problem } from "../products/problems/schema";
import {
  metricsLabel, difficultyScore, normalizeEdges, splitAtLattice, edgeKey, mirrorEdges,
} from "../products/problems/schema";
import { computeMetrics } from "../products/problems/gen/metrics";
import {
  copyDifficulty, COPY_LADDER,
  type CopyShapeParams, type CopySlope,
} from "../products/problems/gen/copy";
import { QUESTIONS_PER_VOL } from "../products/data";

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
   辺を振り分ける。
   - mirror(derived): 実線＝みほん edges／ゴースト＝軸で折り返した残り半分
   - fill(explicit) : edges＝完全図 F・answer.edges＝抜いた線 R。実線＝F∖R（欠け図 G）
     ／ゴースト＝R（子が描き足す線）
   - none           : 実線＝edges のみ */
function splitForDisplay(
  edges: EdgeT[], answer: Problem["answer"], n: number,
): { solid: EdgeT[]; ghost: EdgeT[]; axis: "v" | "h" | "d1" | "d2" | null } {
  const axis = mirrorAxisOf(answer);
  if (axis) return { solid: edges, ghost: mirrorEdges(edges, n, axis), axis };
  if (answer?.mode === "explicit") {
    const removed = new Set(answer.edges.map(edgeKey));
    return { solid: edges.filter((e) => !removed.has(edgeKey(e))), ghost: answer.edges, axis: null };
  }
  return { solid: edges, ghost: [], axis: null };
}

/* 対称軸の点線（viewBox 0..100・点は pos()=10..90 に並ぶ） */
function AxisLine({ axis }: { axis: "v" | "h" | "d1" | "d2" }) {
  const p = { stroke: ACCENT, strokeWidth: 0.7, strokeDasharray: "3 2", opacity: 0.75 } as const;
  if (axis === "v") return <line x1={50} y1={4} x2={50} y2={96} {...p} />;
  if (axis === "h") return <line x1={4} y1={50} x2={96} y2={50} {...p} />;
  if (axis === "d1") return <line x1={6} y1={6} x2={94} y2={94} {...p} />;
  return <line x1={94} y1={6} x2={6} y2={94} {...p} />; // d2
}

/* ---- 候補サムネ SVG（格子点＋辺）。mirror は軸＋折り返した解答をゴースト表示 ---- */
function ProblemSvg({
  n, edges, answer, size = 132,
}: { n: number; edges: EdgeT[]; answer?: Problem["answer"]; size?: number }) {
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  const { solid, ghost, axis } = splitForDisplay(edges, answer, n);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="atl-thumb" aria-hidden>
      <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
      {Array.from({ length: n * n }, (_, i) => (
        <circle key={i} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.6} fill={INK} />
      ))}
      {axis && <AxisLine axis={axis} />}
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

/* 線の向きゲートを日本語に。検品者が「ここまでの斜めはOK」を一目で分かるように。 */
function slopeLabel(s: CopySlope): string {
  if (s === "ortho") return "タテ・ヨコのみ（斜めなし）";
  if (s === "ortho45") return "45°斜めまで（非45°なし）";
  return "自由角（非45°あり）";
}

/* COPY_LADDER の巻パラメータ → タイトル下に出す「この巻の基準」チップ列。
   盤面・線の向き・必須条件・交差ゲート・盤面いっぱい・D 窓の順。 */
function ladderSpec(p: CopyShapeParams): { k: string; v: string }[] {
  const items: { k: string; v: string }[] = [];
  items.push({ k: "盤面", v: `${p.grid}×${p.grid}` });
  items.push({ k: "線の向き", v: slopeLabel(p.slopes) });
  if (p.requireDiag45) items.push({ k: "必須", v: "45°斜めを1本以上" });
  if (p.requireNon45) items.push({ k: "必須", v: "非45°の線をふくむ" });
  if (p.cross === "zero") items.push({ k: "交差", v: "なし" });
  else if (p.cross === "some") items.push({ k: "交差", v: "あり" });
  if (p.fullGrid) items.push({ k: "大きさ", v: "盤面いっぱい（4辺接触）" });
  items.push({ k: "難易度", v: `D ${p.D[0]}–${p.D[1]}` });
  return items;
}

type Update = { id: string; status?: Candidate["status"]; order?: number | null };

export default function AtelierApp({
  sku, title, hasGenerator, genKind, linesRange, gapRange,
}: {
  sku: string; title: string; hasGenerator: boolean;
  genKind?: "copy" | "motif" | "mirror" | "fill";
  linesRange?: [number, number]; gapRange?: [number, number];
}) {
  const [file, setFile] = useState<CandidateFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [genLines, setGenLines] = useState<number | "">(""); // "" = おまかせ（全帯域）
  const [genGap, setGenGap] = useState<number | "">("");     // fill のみ（欠けの本数）
  const [editing, setEditing] = useState<Candidate | null>(null); // 編集中の問題

  const load = useCallback(async () => {
    const res = await fetch(`/api/atelier/candidates?sku=${sku}`);
    setFile(await res.json());
  }, [sku]);

  useEffect(() => { load(); }, [load]);

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
      .filter((c) => c.status === "pending")
      .sort((a, b) => difficultyScore(a.metrics) - difficultyScore(b.metrics)),
    [file],
  );
  const rejected = useMemo(
    () => (file?.candidates ?? []).filter((c) => c.status === "rejected"),
    [file],
  );

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

  async function saveEdit(id: string, edges: EdgeT[], motif?: string) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          updates: [{ id, edges, ...(motif !== undefined && { motif }) }],
        }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "保存に失敗しました"); return; }
      await load();            // metrics はサーバ権威で取り直す
      setEditing(null);
      setMsg("保存しました");
    } finally { setBusy(false); }
  }

  /* 各設問の難易度 D（今回校正の copyDifficulty）をカードの外・上に、略式の内訳付きで出す。
     copy 専用（D は copy 校正値）。掃除後 JSON の metrics は hasNon45 を持たないので
     保存値でなく edges から都度再計算する（非45°巻で 12 ぶんズレるのを防ぐ）。
     内訳の各項の意味はページ上部の解説（atl-dhelp）で定義する。 */
  const showD = genKind === "copy";
  const ladder = COPY_LADDER[sku];
  const win = ladder?.D;
  const fmtD = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const dPartsOf = (c: Candidate) => {
    const m = computeMetrics(c.edges, c.grid.n);
    return { lines: m.lines, cross: 1.5 * m.crossings, non: m.hasNon45 ? 12 : 0, total: copyDifficulty(m) };
  };
  const withDScore = (c: Candidate, fig: ReactNode): ReactNode => {
    if (!showD) return fig;
    const p = dPartsOf(c);
    return (
      <div key={c.id} className="atl-cell">
        <div className="atl-dscore" title={win ? `線${p.lines}＋交${fmtD(p.cross)}＋非45 ${p.non}（窓 D ${win[0]}–${win[1]}）` : undefined}>
          <span className="atl-dval">D {fmtD(p.total)}</span>
          <span className="atl-dbreak">
            {p.lines}+{fmtD(p.cross)}+{p.non}
            <span className="atl-deng">{engineLabel(c.gen.variant)}</span>
          </span>
        </div>
        {fig}
      </div>
    );
  };

  const renderPendingCard = (c: Candidate) => withDScore(c,
    <figure key={c.id} className="atl-card" onClick={() => adopt(c)} title="クリックで採用">
      <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} />
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

  if (!file) return <main className="atl-wrap"><p>読み込み中…</p></main>;

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <p className="atl-crumb"><a href="/atelier">atelier</a> / {sku}</p>
        <h1>{title}</h1>
        {ladder && (
          <dl className="atl-spec" aria-label="この巻の基準">
            {ladderSpec(ladder).map((s, i) => (
              <div key={i} className="atl-spec-item">
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
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
          <button type="button" className="atl-btn atl-btn--pub"
            disabled={busy || adopted.length !== QUESTIONS_PER_VOL} onClick={publish}>
            公開する（{adopted.length} / {QUESTIONS_PER_VOL}）
          </button>
          {msg && <span className="atl-msg">{msg}</span>}
        </div>
      </header>

      {showD && (
        <section className="atl-dhelp">
          <p className="atl-dhelp-formula">
            難易度 <strong>D</strong> ＝ 線数 ＋ 交差 <code>×1.5</code> ＋ 非45° <code>あれば +12</code>
          </p>
          <p className="atl-dhelp-note">
            この 12 問の中で難易度を散らすための指標。巻のレベルは盤面サイズ＋交差などの種類で決まるので、盤面は式から外した。
            各カードの内訳は <code>線＋交差＋非45°</code> の順。
            {ladder && <>　この巻の窓は <strong>D {ladder.D[0]}–{ladder.D[1]}</strong>。</>}
            　非45°が最大ドライバー（あんたのティア判定・ρ=0.878）。
          </p>
        </section>
      )}

      {/* ---- 採用レーン（＝巻内出題順） ---- */}
      <section className="atl-lane">
        <h2>採用 — 出題順 <span className="atl-count">{adopted.length} / {QUESTIONS_PER_VOL}</span></h2>
        {adopted.length === 0 && <p className="atl-empty">下の候補をクリックして採用してください。</p>}
        <div className="atl-grid">
          {adopted.map((c, i) => withDScore(c,
            <figure key={c.id} className="atl-card atl-card--adopted">
              <span className="atl-order">問 {i + 1}</span>
              <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} />
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
        {/* カードは図柄のみ。copy は難易度 D 昇順の一枚壁にして「12 問の中の散らし」を一目で見る
            （線数バケツ・エンジン分けは廃止＝D 表示に集約）。 */}
        <div className="atl-grid">
          {(showD
            ? [...pending].sort((a, b) =>
                copyDifficulty(computeMetrics(a.edges, a.grid.n)) - copyDifficulty(computeMetrics(b.edges, b.grid.n)))
            : pending
          ).map((c) => renderPendingCard(c))}
        </div>
      </section>

      {/* ---- 不採用（復帰可能） ---- */}
      {rejected.length > 0 && (
        <section className="atl-lane atl-lane--rejected">
          <h2>不採用 <span className="atl-count">{rejected.length}</span></h2>
          <div className="atl-grid">
            {rejected.map((c) => withDScore(c,
              <figure key={c.id} className="atl-card atl-card--rejected">
                <ProblemSvg n={c.grid.n} edges={c.edges} answer={c.answer} size={92} />
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

      {editing && (
        <EditOverlay
          key={editing.id}
          candidate={editing}
          busy={busy}
          onSave={(edges, motif) => saveEdit(editing.id, edges, motif)}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

/* =========================================================================
   線の手直しモーダル（点を 2 つクリック → その間の線分をトグル）
   metrics はライブで computeMetrics 表示。保存はサーバ権威で再算出される。
   ========================================================================= */
function EditOverlay({
  candidate, busy, onSave, onClose,
}: {
  candidate: Candidate;
  busy: boolean;
  onSave: (edges: EdgeT[], motif?: string) => void;
  onClose: () => void;
}) {
  const n = candidate.grid.n;
  const [edges, setEdges] = useState<EdgeT[]>(candidate.edges);
  const [first, setFirst] = useState<Pt | null>(null);
  const [history, setHistory] = useState<EdgeT[][]>([]);
  const [title, setTitle] = useState(candidate.gen.motif ?? "");

  const SIZE = 360;
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  const samePt = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

  const liveMetrics = useMemo(() => computeMetrics(edges, n), [edges, n]);
  const axis = mirrorAxisOf(candidate.answer);
  const ghost = useMemo(() => (axis ? mirrorEdges(edges, n, axis) : []), [axis, edges, n]);

  function pushHistory(prev: EdgeT[]) {
    setHistory((h) => [...h, prev]);
  }

  function clickPoint(p: Pt) {
    if (!first) { setFirst(p); return; }
    if (samePt(first, p)) { setFirst(null); return; } // 同点 = 選択解除
    // first→p の線分を unit に割ってトグル
    const units = splitAtLattice([first, p]);
    const keys = new Set(edges.map(edgeKey));
    const allPresent = units.every((u) => keys.has(edgeKey(u)));
    pushHistory(edges);
    if (allPresent) {
      const drop = new Set(units.map(edgeKey));
      setEdges(edges.filter((e) => !drop.has(edgeKey(e))));
    } else {
      setEdges(normalizeEdges([...edges, ...units]));
    }
    setFirst(null);
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setEdges(h[h.length - 1]);
      setFirst(null);
      return h.slice(0, -1);
    });
  }

  function clearAll() {
    if (edges.length === 0) return;
    pushHistory(edges);
    setEdges([]);
    setFirst(null);
  }

  return (
    <div className="atl-overlay" role="dialog" aria-modal>
      <div className="atl-editor">
        <header className="atl-editor-head">
          <h2>問題の手直し</h2>
          <p className="atl-editor-hint">
            点を 2 つクリックして線を引く／同じ線をもう一度なぞると消える
          </p>
        </header>

        <label className="atl-editor-title">
          タイトル（名前・任意）
          <input type="text" value={title}
            placeholder="かいだん・いえ など"
            onChange={(e) => setTitle(e.target.value)} />
        </label>

        <svg viewBox="0 0 100 100" width={SIZE} height={SIZE} className="atl-editor-svg">
          <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
          {axis && <AxisLine axis={axis} />}
          {ghost.map((e, i) => (
            <line key={`g${i}`}
              x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
              stroke={GHOST} strokeWidth={1.5} strokeDasharray="3 2" strokeLinecap="round" />
          ))}
          {edges.map((e, i) => (
            <line key={i}
              x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
              stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
          ))}
          {Array.from({ length: n * n }, (_, i) => {
            const c = i % n, r = Math.floor(i / n);
            const selected = first && samePt(first, [c, r]);
            return (
              <g key={i}>
                <circle cx={pos(c)} cy={pos(r)} r={selected ? 3 : 1.8}
                  fill={selected ? ACCENT : INK} />
                {/* 当たり判定を広く（タップしやすく） */}
                <circle cx={pos(c)} cy={pos(r)} r={6} fill="transparent"
                  style={{ cursor: "pointer" }} onClick={() => clickPoint([c, r])} />
              </g>
            );
          })}
        </svg>

        <p className="atl-editor-metrics">
          {metricsLabel(liveMetrics, candidate.grid)}
        </p>

        <div className="atl-editor-actions">
          <button type="button" onClick={undo} disabled={history.length === 0}>ひとつ戻す</button>
          <button type="button" onClick={clearAll} disabled={edges.length === 0}>全消し</button>
          <span className="atl-editor-spacer" />
          <button type="button" onClick={onClose} disabled={busy}>キャンセル</button>
          <button type="button" className="atl-btn atl-btn--pub"
            disabled={busy || edges.length === 0}
            onClick={() => onSave(edges, title.trim())}>
            {edges.length === 0 ? "線が空です" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
