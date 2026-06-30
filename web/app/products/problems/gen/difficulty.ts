/* =========================================================================
   難易度 SSOT（全9タスク横断）＋ v1→v2 マイグレーション
   atelier の独自要素＝難易度。模写(copy)の校正済み式 baseDifficulty を土台に、
   タスク別のモディファイアを taskDifficulty で束ねる。

   依存は ../schema（型）と ./metrics（mergedSegments/computeMetrics・いずれも純粋）
   のみ。copy.ts 等の重い生成ライブラリを引かない＝published/index.ts 経由で
   クライアントにバンドルされても肥大化しない（io.ts コメント参照）。
   ========================================================================= */

import type {
  CandidateFile, Difficulty, DifficultyParts, Problem, ProblemMetrics,
  Provenance, SkuProblemSet,
} from "../schema";
import { computeMetrics, mergedSegments } from "./metrics";

/* ---- 土台スコア（= 旧 copyDifficulty・2026-06-30 再校正）----
   D = 1.0·lines + 1.5·diagonals + 8·non45。盤面サイズは入れない
   （巻のレベルは grid＋ゲートで決まり、D は巻内12問の散らし専用）。
   交差は実作で難易度への寄与が薄く除外。代わりに斜めの本数（特に非45°の本数）で効かせる。
   非45°が最大ドライバー（1本で線8本ぶん・本数で増える）。詳細は pack-design §12.12。 */
export function baseDifficulty(m: ProblemMetrics): number {
  return m.lines + 1.5 * m.diagonals + 8 * m.non45;
}

function basePartsOf(m: ProblemMetrics): DifficultyParts {
  return { lines: m.lines, diag: 1.5 * m.diagonals, non45: 8 * m.non45 };
}

/* ---- タスク横断の難易度 ----
   value＝そのタスクの実効難易度・parts＝内訳（UI/監査用）。
   変換系（mirror/rotate/translate）は操作負荷をゲート・盤面リセットで吸収する設計
   なので base そのまま。2図系（overlay/decompose）は同時保持で ≈2倍。
   fill は base＋欠け量ペナルティ。scale/solid は別式（下）。 */
export function taskDifficulty(task: string, p: Problem): { value: number; parts: DifficultyParts } {
  const m = p.metrics;
  const base = baseDifficulty(m);
  switch (task) {
    case "copy":
      return { value: base, parts: basePartsOf(m) };

    case "fill": {
      // 欠け量＝解答（補う線）の見た目の線分数。多いほど選別が難しい。係数2は暫定（後校正）。
      const gaps = p.answer?.mode === "explicit" ? mergedSegments(p.answer.edges).length : 0;
      return { value: base + 2 * gaps, parts: { base, gap: 2 * gaps } };
    }

    case "mirror":
    case "rotate":
    case "translate":
      return { value: base, parts: { base } };

    case "overlay":
    case "decompose":
    case "fold":
      return { value: 2 * base, parts: { base, pair: base } };

    case "scale":
    case "shrink":
      return scaleDifficulty(p);
    case "solid":
      return solidDifficulty(p);

    default:
      return { value: base, parts: { base } };
  }
}

/* 拡大縮小（D 式非適用・grid 変動／倍率）。今回は型と式の口だけ・生成器は後送り。
   倍率で角度誤差が増幅し、縮小は逆操作で難しい、という暫定モデル。 */
function scaleDifficulty(p: Problem): { value: number; parts: DifficultyParts } {
  const m = p.metrics;
  const factor =
    p.answer?.mode === "derived" && p.answer.transform.type === "scale"
      ? p.answer.transform.factor : 2;
  const lineLoad = m.lines;
  const angleLoad = 2 * m.diagonals + (m.hasNon45 ? 6 : 0);
  const shrinkLoad = factor < 1 ? 4 : 0;
  return { value: lineLoad + angleLoad + shrinkLoad, parts: { lineLoad, angleLoad, shrinkLoad } };
}

/* 立体模写（3D 等角投影・iso 盤面が未実装）。今回は型と式の口だけ。
   生成器実装時に blocks/hiddenFaces 主導へ差し替える。暫定は線分量を代理負荷にする。 */
function solidDifficulty(p: Problem): { value: number; parts: DifficultyParts } {
  const m = p.metrics;
  return { value: m.lines + 2 * m.diagonals, parts: { lines: m.lines, diag: 2 * m.diagonals } };
}

/* 実効値の解決：人手 override があればそれ・無ければ機械算出。読み手はこれ一本でよい。 */
export function resolveDifficulty(d: Difficulty): number {
  return d.manual ?? d.auto;
}

/* =========================================================================
   v1 → v2 マイグレーション
   旧 JSON（difficulty/provenance 無し・gen{kind,...}＋edited 持ち）を読み込み時に
   v2 形へ昇格する。published 本体は無改変のまま、readCandidates / publishedSet 等の
   読み出し口で噛ませる（io.ts・Phase 3/6/7）。冪等：既に v2 のものは触らない
   （manual override を保全するため auto も再計算しない）。
   ========================================================================= */

function provenanceFromGen(p: Problem): Provenance {
  const g = p.gen;
  if (g?.kind === "auto") {
    const ai = {
      generator: g.generator ?? "copy", version: g.version ?? "1",
      seed: g.seed ?? 0, variant: g.variant, label: g.motif,
    };
    return p.edited ? { source: "ai-edited", ...ai } : { source: "ai", ...ai };
  }
  // manual 入稿・出自不明 → 白紙扱い
  return { source: "blank", createdAt: "", label: g?.motif, edited: p.edited };
}

export function migrateProblem(task: string, p: Problem): Problem {
  // 旧 metrics は non45 を持たない（=式が NaN になる）ため、欠けていれば edges から引き直す。
  // computeMetrics は純粋・edges から決定的なので再計算しても値はぶれない。
  const metrics =
    p.metrics && typeof p.metrics.non45 === "number"
      ? p.metrics : computeMetrics(p.edges, p.grid.n);
  const out: Problem = { ...p, metrics };
  if (!out.difficulty) {
    const d = taskDifficulty(task, out);
    out.difficulty = { task, value: d.value, auto: d.value, parts: d.parts };
  }
  if (!out.provenance) out.provenance = provenanceFromGen(out);
  return out;
}

export function migrateSet(set: SkuProblemSet): SkuProblemSet {
  return { ...set, problems: set.problems.map((p) => migrateProblem(set.task, p)) };
}

/* 編集後のメタ更新（破壊的）：metrics から difficulty.auto を引き直し（人手 manual は保全）、
   provenance を edited 状態に合わせて再導出する。candidates 編集 API が edges/解答を変えた後に呼ぶ。
   ＝「edges を直したのに難易度が古いまま」を防ぐ。 */
export function refreshMeta(task: string, p: Problem): void {
  const d = taskDifficulty(task, p);
  const manual = p.difficulty?.manual;
  p.difficulty = {
    task, value: manual ?? d.value, auto: d.value, parts: d.parts,
    manual, manualNote: p.difficulty?.manualNote,
  };
  p.provenance = provenanceFromGen(p);
}

export function migrateCandidateFile(file: CandidateFile): CandidateFile {
  return {
    ...file,
    candidates: file.candidates.map((c) => ({
      ...migrateProblem(file.task, c), status: c.status, order: c.order,
    })),
  };
}
