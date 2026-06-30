/* =========================================================================
   問題データスキーマ（SSOT）
   SKU＝12問の座標 JSON（decisions §3.48）。このファイルが
   - 型定義（candidate / published 両方）
   - 辺の正規化規則（辞書順・中間格子点での分割）
   - バリデータ
   - 難易度メタデータの表示ラベル（§10.3 厳選公開・atelier バッジと共用）
   - タスク別の解答要否マトリクス（pack-design §8）
   を一手に持つ。生成エンジン（gen/）・検品ツール（/atelier）・商品ページ・
   PDF 生成のすべてがここを経由する。
   ========================================================================= */

/* ---- 盤面 ----
   discriminated union: 将来の立体（iso）・拡大縮小（square-pair）を
   既存 JSON を壊さず追加できる形にしておく。 */
export type GridSpec = { type: "square"; n: 3 | 4 | 5 | 6 | 7 };

export type Pt = [number, number];   // [c, r]（列・行）
export type EdgeT = [Pt, Pt];        // 正規化済み: a < b（辞書順）

export type AnswerMode = "none" | "derived" | "explicit";

export type TransformSpec =
  | { type: "mirror"; axis: "v" | "h" | "d1" | "d2" }
  | { type: "rotate"; deg: 90 | -90 | 180 }
  | { type: "translate"; dc: number; dr: number }
  | { type: "scale"; factor: 2 | 0.5 };

/* ---- 難易度メトリクス（生成/入稿時に自動算出・§10.3 公開メタデータの源泉） ---- */
export type SymmetryKind = "v" | "h" | "d1" | "d2" | "r90" | "r180";

export type ProblemMetrics = {
  lines: number;               // 線本数（正規化後の単位辺数ではなく「見た目の線分」数）
  diagonals: number;           // 斜め線本数（45°系＋非45°）。難易度Dのドライバー
  non45: number;               // 非45°斜め（ナイト傾き等）の本数。難易度Dの最大ドライバー（baseDifficulty）。数で効く
  diagonalAngleKinds: number;  // 斜め角度の種類数（45°系のみ=1・非45°が混ざると増える）
  hasNon45: boolean;           // 非45°を1本でも含むか（= non45 > 0）。生成フィルタ用の真偽値
  crossings: number;           // 端点以外での交差数。生成フィルタ・情報表示用（難易度Dには非算入）
  components: number;          // 連結成分数（構成要素数）
  pointsUsed: number;          // 使用格子点数
  symmetry: SymmetryKind[];    // 成立している対称性
};

/* ---- 難易度（全9タスク横断・一級市民）----
   atelier の独自要素。タスク非依存に value を読めるよう、機械算出 auto と人手 override
   manual を別持ちし、実効値 value = manual ?? auto。式は gen/difficulty.ts（SSOT）。 */
export type DifficultyParts = Record<string, number>;  // 内訳（UI 表示・監査用。例 {lines,diag,non45}）

export type Difficulty = {
  task: string;                // どのタスクの式で出した値か（copy/fill/…）
  value: number;               // 実効値（manual があれば manual・無ければ auto）
  auto: number;                // metrics から機械算出した値（taskDifficulty で常に復元可能）
  parts?: DifficultyParts;     // value の内訳
  manual?: number;             // 人手 override（手動ティア付け）
  manualNote?: string;         // なぜ手で動かしたか（検品メモ）
};

/* ---- 作問の出自（provenance）----
   旧 gen{kind,generator,version,seed,motif,variant} ＋ edited を統合。
   ai＝有限ライブラリ生成（variant 持ち・兄弟巻重複排除の対象）／blank＝白紙作問
   （variant 無し）／ai-edited＝AI 生成を手直し。 */
export type Provenance =
  | { source: "ai"; generator: string; version: string; seed: number; variant?: string; label?: string; edited?: boolean }
  | { source: "blank"; createdAt: string; label?: string; edited?: boolean }
  | { source: "ai-edited"; generator: string; version: string; seed: number; variant?: string; label?: string };

export type Problem = {
  id: string;                  // "copy-lv1-vol1-s1-03"（sku-seed-連番）/ 手設計 "…-m01"
  grid: GridSpec;
  edges: EdgeT[];              // みほん（出題図）。fold/2図タスクでは図形A
  inputB?: EdgeT[];            // 2図目（折り重ね fold の問題2 等）。単一図タスクは持たない
  answer?:
    | { mode: "explicit"; edges: EdgeT[] }
    | { mode: "derived"; transform: TransformSpec };
  metrics: ProblemMetrics;
  difficulty?: Difficulty;     // 全9タスク横断の難易度（Phase 3 で必須化。SSOT は gen/difficulty.ts）
  provenance?: Provenance;     // 作問の出自（Phase 3 で必須化。旧 gen + edited を置換）
  gen: {                       // 旧出自（provenance へ移行中。Phase 3 で optional 化→撤去）
    kind: "auto" | "manual"; generator?: string; version?: string; seed?: number;
    motif?: string;    // 絵柄: モチーフ表示名（「いえ」等・atelier の検品ラベル）
    variant?: string;  // 絵柄: 変種キー（motifKey~m+詳細数）。同一変種の再生成防止に使う
  };
  aim?: string;                // 「この問題の狙い」（山場の問題にだけ書く・任意）
  edited?: boolean;            // 旧・手直し印（provenance.edited へ移行中）
};

/* ---- published（採用済・ちょうど12問・配列順＝出題順） ---- */
export type SkuProblemSet = {
  schemaVersion: 1;
  sku: string;
  task: string;                // data.ts の task slug と突合
  answerMode: AnswerMode;
  problems: Problem[];
  publishedAt: string;         // "2026-06-11"
};

/* ---- candidate（検品前。dev API だけが読む＝本番バンドル非混入） ---- */
export type CandidateStatus = "pending" | "adopted" | "rejected";

export type Candidate = Problem & { status: CandidateStatus; order?: number };

export type CandidateFile = {
  schemaVersion: 1;
  sku: string;
  task: string;
  candidates: Candidate[];
  seedCursor: number;          // 追加生成ボタンのインクリメント先
};

/* =========================================================================
   解答要否マトリクス（pack-design §8）
   none     … 手本＝解答（模写系）。解答データを持たない
   explicit … 解答 edges を別持ち（欠け補完・かさね・分解）
   derived  … TransformSpec から算出（鏡＝旧 線対称・回転・平行移動・拡大縮小）
   ========================================================================= */
export const TASK_ANSWER_MODE: Record<string, AnswerMode> = {
  copy: "none", motif: "none", solid: "none",
  fill: "explicit", overlay: "explicit", decompose: "explicit", fold: "explicit",
  mirror: "derived", rotate: "derived", translate: "derived", scale: "derived", shrink: "derived",
};

/* =========================================================================
   辺の正規化
   - 端点を辞書順（c 優先・次に r）に並べる
   - 中間格子点を通る辺は単位区間に分割して同一視（手設計入稿も同じ規則を通す。
     metrics の数え方・重複検出の前提）
   ========================================================================= */
export function comparePt(a: Pt, b: Pt): number {
  return a[0] - b[0] || a[1] - b[1];
}

export function normalizeEdge(e: EdgeT): EdgeT {
  return comparePt(e[0], e[1]) <= 0 ? [e[0], e[1]] : [e[1], e[0]];
}

export function edgeKey(e: EdgeT): string {
  const [a, b] = normalizeEdge(e);
  return `${a[0]},${a[1]}-${b[0]},${b[1]}`;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

/* 1 本の辺を、通過する格子点で最小区間に分割する */
export function splitAtLattice(e: EdgeT): EdgeT[] {
  const [a, b] = e;
  const dc = b[0] - a[0];
  const dr = b[1] - a[1];
  const g = gcd(dc, dr);
  if (g <= 1) return [normalizeEdge(e)];
  const out: EdgeT[] = [];
  const sc = dc / g, sr = dr / g;
  for (let i = 0; i < g; i++) {
    out.push(normalizeEdge([
      [a[0] + sc * i, a[1] + sr * i],
      [a[0] + sc * (i + 1), a[1] + sr * (i + 1)],
    ]));
  }
  return out;
}

/* 鏡（旧 線対称）の折り返し（metrics.ts の対称検出 TRANSFORMS と同一規約）。
   みほん edges を軸で鏡映した「解答側」の辺集合を返す。検品プレビュー・
   将来の商品/PDF レンダラが derived(mirror) answer を可視化するのに使う。 */
export function mirrorEdges(edges: EdgeT[], n: number, axis: "v" | "h" | "d1" | "d2"): EdgeT[] {
  const f = (p: Pt): Pt =>
    axis === "v" ? [n - 1 - p[0], p[1]]
      : axis === "h" ? [p[0], n - 1 - p[1]]
        : axis === "d1" ? [p[1], p[0]]
          : [n - 1 - p[1], n - 1 - p[0]];
  return edges.map((e) => normalizeEdge([f(e[0]), f(e[1])]));
}

/* 辺集合の正規化: 格子点分割 → 正規化 → 重複除去（順序は安定） */
export function normalizeEdges(edges: EdgeT[]): EdgeT[] {
  const seen = new Set<string>();
  const out: EdgeT[] = [];
  for (const e of edges) {
    for (const u of splitAtLattice(e)) {
      const k = edgeKey(u);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
  }
  return out;
}

/* =========================================================================
   バリデータ
   ========================================================================= */
function inGrid(p: Pt, n: number): boolean {
  return Number.isInteger(p[0]) && Number.isInteger(p[1]) &&
    p[0] >= 0 && p[0] < n && p[1] >= 0 && p[1] < n;
}

export function validateProblem(p: Problem): string[] {
  const errs: string[] = [];
  const n = p.grid.n;
  if (p.edges.length === 0) errs.push(`${p.id}: 辺が空`);
  const seen = new Set<string>();
  for (const e of p.edges) {
    if (!inGrid(e[0], n) || !inGrid(e[1], n)) errs.push(`${p.id}: 盤面外の端点 ${edgeKey(e)}`);
    if (e[0][0] === e[1][0] && e[0][1] === e[1][1]) errs.push(`${p.id}: 長さ 0 の辺`);
    const k = edgeKey(e);
    if (seen.has(k)) errs.push(`${p.id}: 重複辺 ${k}`);
    seen.add(k);
  }
  return errs;
}

export function validateProblemSet(set: SkuProblemSet, expectQuestions = 12): string[] {
  const errs: string[] = [];
  if (set.schemaVersion !== 1) errs.push(`schemaVersion が 1 でない: ${set.schemaVersion}`);
  if (set.problems.length !== expectQuestions)
    errs.push(`問題数が ${expectQuestions} でない: ${set.problems.length}`);
  const mode = TASK_ANSWER_MODE[set.task];
  if (mode && set.answerMode !== mode)
    errs.push(`answerMode 不一致: ${set.answerMode}（task=${set.task} は ${mode}）`);
  for (const p of set.problems) {
    errs.push(...validateProblem(p));
    if (mode === "none" && p.answer) errs.push(`${p.id}: 模写系に answer がある`);
    if (mode === "explicit" && p.answer?.mode !== "explicit") errs.push(`${p.id}: explicit answer がない`);
    if (mode === "derived" && p.answer?.mode !== "derived") errs.push(`${p.id}: derived answer がない`);
  }
  return errs;
}

/* =========================================================================
   表示ヘルパ（§10.3 厳選公開メタデータ → 日本語ラベル）
   atelier の候補バッジと商品ページの figcaption が共用する。
   ========================================================================= */
export function metricsLabel(m: ProblemMetrics, grid: GridSpec): string {
  const parts = [`${grid.n}×${grid.n}`, `線${m.lines}本`];
  parts.push(m.diagonals > 0 ? `ななめ${m.diagonals}本` : "ななめなし");
  if (m.crossings > 0) parts.push(`交差${m.crossings}か所`);
  if (m.components > 1) parts.push(`かたち${m.components}つ`);
  return parts.join("・");
}

/* 巻内の難易度緩昇順ソートに使うスコア（生成・検品の初期並び共用） */
export function difficultyScore(m: ProblemMetrics): number {
  return m.lines + 2 * m.diagonals + 3 * m.non45 + 2 * (m.components - 1);
}

/* 「整い」スコアの対称性ぶん。成立している対称性ほど見た目が整う。
   縦横軸（v/h）と回転（r90）が最も「整って」見え、斜め軸（d1/d2）は中、
   点対称（r180）は弱い。tidyScore（filters.ts）と検品の整い序列で使う。 */
const SYM_WEIGHT: Record<SymmetryKind, number> = {
  v: 2, h: 2, r90: 2.5, d1: 1.5, d2: 1.5, r180: 1,
};
export function symmetryWeight(symmetry: SymmetryKind[]): number {
  return symmetry.reduce((s, k) => s + (SYM_WEIGHT[k] ?? 0), 0);
}
