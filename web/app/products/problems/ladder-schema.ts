/* =========================================================================
   ラダー（巻のレベル定義＝生成パラメータ）の編集可能フィールド記述子。
   atelier の基準編集 UI（AtelierApp）と編集 API（api/atelier/ladder）が
   この単一定義を共有する＝「何が編集できるか」の SSOT。
   ladder.json の各タスクのエントリ構造に対応（gen/copy.ts CopyShapeParams・
   fill.ts FillParams・mirror.ts MirrorParams）。
   純データのみ（fs/React 非依存）＝client/server 両方から import 可。
   ========================================================================= */

export type LadderFieldKind = "grid" | "select" | "range" | "int" | "float" | "bool";

export type LadderField = {
  key: string;
  label: string;
  kind: LadderFieldKind;
  options?: { value: string; label: string }[]; // select 用
  optional?: boolean; // true: 値が空 / false のときキーごと省く（stale 防止）
  min?: number;       // int の下限 / range の下限クランプ（既定 0）
};

export const GRID_MIN = 3;
export const GRID_MAX = 7;

const SLOPES_COPY = [
  { value: "ortho", label: "タテヨコのみ" },
  { value: "ortho45", label: "45°まで" },
  { value: "any", label: "非45°許可" },
];
const AXIS = [
  { value: "v", label: "縦軸" },
  { value: "h", label: "横軸" },
  { value: "d1", label: "斜め軸" },
];
const CROSS = [
  { value: "", label: "不問" },
  { value: "zero", label: "なし" },
  { value: "some", label: "あり" },
];
/* 生成器の無いタスク（手設計）の固有パラメータ用 */
/* 回転角。mixed＝1 巻の中に 3 角度を混ぜる（1 問 1 角度・decisions §3.87）。
   紙面は弧の矢印＋目じるし□で問題ごとに角度を示すので、混在しても子が読み取れる。 */
const ANGLE = [
  { value: "90cw", label: "90°右回り" },
  { value: "90ccw", label: "90°左回り" },
  { value: "180", label: "180°" },
  { value: "mixed", label: "混在（右・左・180°）" },
];
const DIR = [
  { value: "h", label: "横" },
  { value: "v", label: "縦" },
  { value: "hv", label: "左右上下" },
  { value: "diag", label: "斜め" },
  { value: "compound", label: "複合" },
];
const RATIO_UP = [
  { value: "x2", label: "2倍" },
  { value: "x3", label: "3倍" },
];
const RATIO_DOWN = [
  { value: "half", label: "1/2" },
  { value: "third", label: "1/3" },
];
const DENSITY = [
  { value: "sparse", label: "線少なめ" },
  { value: "dense", label: "線多め" },
];
/* 立体（solid）専用: 隠れ辺（点線）の段階＝巻＝難易度レジーム。中身は形カタログの混合。 */
const SOLID_HIDDEN = [
  { value: "none", label: "なし（見える辺だけ）" },
  { value: "off", label: "なし・大型（大きい形／隠れ辺は出さない）" },
  { value: "some", label: "すこし" },
  { value: "full", label: "フル" },
];

const gridField: LadderField = { key: "grid", label: "盤面", kind: "grid" };
const linesField: LadderField = { key: "lines", label: "線の本数", kind: "range", min: 1 };

/* かさね・分解 共用（両者は edges=完成図・answer=図形B の同一データ形） */
const COMPOSE_FIELDS: LadderField[] = [
  gridField,
  { key: "slopes", label: "線の向き", kind: "select", options: SLOPES_COPY },
  { key: "requireDiag45", label: "45°斜めを必須", kind: "bool", optional: true },
  { key: "requireNon45", label: "非45°を必須", kind: "bool", optional: true },
  { key: "entangle", label: "絡み（A・B交差）", kind: "range", min: 0 },
  { key: "lines", label: "1図の線の本数", kind: "range", min: 1 },
];

/* タスク別の編集可能フィールド（並び順＝JSON のキー順・編集フォームの表示順）。
   生成器のあるタスクのみ。overlay/scale 等は ladder エントリ無し＝白紙作成で運用。 */
export const LADDER_FIELDS: Record<string, LadderField[]> = {
  copy: [
    gridField,
    { key: "slopes", label: "線の向き", kind: "select", options: SLOPES_COPY },
    { key: "D", label: "難易度窓 D", kind: "range", min: 0 },
    { key: "cross", label: "交差", kind: "select", options: CROSS, optional: true },
    { key: "requireDiag45", label: "45°斜めを必須", kind: "bool", optional: true },
    { key: "requireNon45", label: "非45°を必須", kind: "bool", optional: true },
    { key: "fullGrid", label: "盤面いっぱい", kind: "bool", optional: true },
  ],
  fill: [
    gridField,
    { key: "slopes", label: "線の向き", kind: "select", options: SLOPES_COPY },
    { key: "lines", label: "線分の本数", kind: "range", min: 1 },
    { key: "missing", label: "欠けの本数", kind: "range", min: 1 },
    { key: "diagonals", label: "ななめ線分", kind: "range", min: 0 },
    { key: "crossings", label: "交差数", kind: "range", min: 0 },
    { key: "components", label: "構成要素", kind: "range", min: 1 },
    { key: "bbox", label: "最小スパン", kind: "int", min: 1 },
    { key: "closedBias", label: "閉じ確率", kind: "float" },
  ],
  /* 鏡は軸レス（軸＝印刷時の並び選択・decisions §3.59）。レベルは図形の複雑さのみ */
  mirror: [
    gridField,
    { key: "slopes", label: "線の向き", kind: "select", options: SLOPES_COPY },
    { key: "lines", label: "線の本数", kind: "range", min: 1 },
    { key: "diagonals", label: "ななめ線分", kind: "range", min: 0 },
    { key: "crossings", label: "交差数", kind: "range", min: 0 },
    { key: "components", label: "構成要素", kind: "range", min: 1 },
    { key: "bbox", label: "最小スパン", kind: "int", min: 1 },
  ],
  /* ---- 立体（斜投影・キャビネット図）＝巻は隠れ辺レジーム＋D窓のみ ----
     ボクセル生成器（gen/solid.ts）がこのエントリを読み、レジーム別プロファイルで
     形族・盤面・ボクセル空間を補完する。「ブロック数」ドライバーは廃止済み（§3.57）。 */
  solid: [
    { key: "hidden", label: "隠れ辺", kind: "select", options: SOLID_HIDDEN },
    { key: "D", label: "難易度窓 D", kind: "range", min: 0 },
  ],
  rotate: [
    gridField,
    { key: "angle", label: "回転", kind: "select", options: ANGLE },
    linesField,
  ],
  translate: [
    gridField,
    { key: "dir", label: "方向", kind: "select", options: DIR },
    { key: "moves", label: "移動量（マス）", kind: "range", min: 1 },
    linesField,
  ],
  scale: [
    { key: "gridFrom", label: "元の盤面", kind: "grid" },
    { key: "gridTo", label: "先の盤面", kind: "grid" },
    { key: "ratio", label: "倍率", kind: "select", options: RATIO_UP },
    linesField,
  ],
  shrink: [
    { key: "gridFrom", label: "元の盤面", kind: "grid" },
    { key: "gridTo", label: "先の盤面", kind: "grid" },
    { key: "ratio", label: "倍率", kind: "select", options: RATIO_DOWN },
    linesField,
  ],
  /* かさね・分解は同じ模写軸ラダー（合成/分解＝同一データ形・decisions §3.71〜§3.73）:
     斜め/非45°＝模写Lv連動・絡み（A・B間の交差数）＝Lv とともに増え Lv.5 で最大化・
     線本数＝成立窓 */
  overlay: COMPOSE_FIELDS,
  decompose: COMPOSE_FIELDS,
  /* 折り重ねもかさね・分解と同構造（折り方＝印刷時の並び選択・データに焼かない） */
  fold: COMPOSE_FIELDS,
};

export function ladderFieldsFor(task: string): LadderField[] | null {
  return LADDER_FIELDS[task] ?? null;
}

export type LadderEntry = Record<string, unknown>;

/* patch + 現在エントリ → 検証済み新エントリ（最終状態で組み直す＝stale キーを残さない）。
   patch に無いキーは current から引き継ぐ。grid を含む全フィールドを検証する。 */
export function buildLadderEntry(
  task: string, current: LadderEntry, patch: LadderEntry,
): { entry: LadderEntry } | { error: string } {
  const fields = ladderFieldsFor(task);
  if (!fields) return { error: `${task} は編集対象外です` };
  const next: LadderEntry = {};
  for (const f of fields) {
    const has = Object.prototype.hasOwnProperty.call(patch, f.key);
    const raw = has ? patch[f.key] : current[f.key];
    switch (f.kind) {
      case "grid": {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < GRID_MIN || n > GRID_MAX)
          return { error: `${f.label} は ${GRID_MIN}〜${GRID_MAX} の整数で指定してください` };
        next[f.key] = n;
        break;
      }
      case "select": {
        const val = raw == null ? "" : String(raw);
        if (f.optional && val === "") break; // キーごと省略
        if (!f.options!.some((o) => o.value === val))
          return { error: `${f.label} の値が不正です` };
        next[f.key] = val;
        break;
      }
      case "bool": {
        if (raw === true) next[f.key] = true; // optional gate: false は省略
        break;
      }
      case "range": {
        const lo = f.min ?? 0;
        if (!Array.isArray(raw) || raw.length !== 2)
          return { error: `${f.label} は [min, max] で指定してください` };
        const a = Number(raw[0]), b = Number(raw[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || a > b || a < lo)
          return { error: `${f.label} は [min, max]（${lo} 以上・min ≤ max）で指定してください` };
        next[f.key] = [a, b];
        break;
      }
      case "int": {
        const n = Number(raw);
        const lo = f.min ?? 0;
        if (!Number.isInteger(n) || n < lo)
          return { error: `${f.label} は ${lo} 以上の整数で指定してください` };
        next[f.key] = n;
        break;
      }
      case "float": {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 1)
          return { error: `${f.label} は 0〜1 で指定してください` };
        next[f.key] = n;
        break;
      }
    }
  }
  return { entry: next };
}

/* エントリ → タイトル下に出す「この巻の基準」チップ列（読み取り表示）。 */
export function ladderChips(task: string, entry: LadderEntry): { k: string; v: string }[] {
  const fields = ladderFieldsFor(task);
  if (!fields) return [];
  const chips: { k: string; v: string }[] = [];
  for (const f of fields) {
    const val = entry[f.key];
    switch (f.kind) {
      case "grid":
        chips.push({ k: f.label, v: `${val}×${val}` });
        break;
      case "select": {
        if (val == null || val === "") break;
        const opt = f.options!.find((o) => o.value === String(val));
        chips.push({ k: f.label, v: opt?.label ?? String(val) });
        break;
      }
      case "bool":
        if (val === true) chips.push({ k: "条件", v: f.label });
        break;
      case "range":
        if (Array.isArray(val)) chips.push({ k: f.label, v: `${val[0]}–${val[1]}` });
        break;
      case "int":
      case "float":
        if (val != null) chips.push({ k: f.label, v: String(val) });
        break;
    }
  }
  return chips;
}

/* エントリ → カタログ表示用の grid 文字列（data.ts の "N×N" 等を ladder から再構成）。
   scale/shrink は "N×N → M×M"・他は "N×N"。solid は巻＝混合のため grid 文字列は data.ts 側が正
   （ladder から再構成しない＝null）。 */
export function displayGridFor(task: string, entry: LadderEntry): string | null {
  if (task === "scale" || task === "shrink") {
    const a = Number(entry.gridFrom), b = Number(entry.gridTo);
    return Number.isFinite(a) && Number.isFinite(b) ? `${a}×${a} → ${b}×${b}` : null;
  }
  if (task === "solid") return null;
  const n = Number(entry.grid);
  return Number.isFinite(n) ? `${n}×${n}` : null;
}

const sq = (g: string): number | null => {
  const m = g.match(/^(\d+)×(\d+)$/);
  return m && m[1] === m[2] ? Number(m[1]) : null;
};
const arrow = (g: string): [number, number] | null => {
  const m = g.match(/^(\d+)×\d+\s*→\s*(\d+)×\d+$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
/* 立体: variant（「見える辺だけ／すこし／フル」）→ 隠れ辺レジーム。 */
function solidHiddenOf(variant: string): string {
  if (/フル/.test(variant)) return "full";
  if (/すこし|少し/.test(variant)) return "some";
  return "none"; // 「見える辺だけ」ほか
}

/* ladder.json に未定義の手設計タスク向けに、data.ts の grid 文字列＋variant から
   既定のレベル定義を合成する（panel の初期値）。保存時に ladder.json へ実体が作られる。 */
export function defaultLadderEntry(task: string, grid: string, variant?: string): LadderEntry | null {
  const fields = ladderFieldsFor(task);
  if (!fields) return null;
  const g = grid ?? "";
  const square = sq(g), ar = arrow(g);
  const n = square ?? ar?.[1] ?? 4;
  const v = variant ?? "";
  const e: LadderEntry = {};
  for (const f of fields) {
    switch (f.key) {
      case "grid": e.grid = square ?? 3; break;
      case "gridFrom": e.gridFrom = ar?.[0] ?? 3; break;
      case "gridTo": e.gridTo = ar?.[1] ?? 5; break;
      case "hidden": e.hidden = solidHiddenOf(v); break;
      case "angle": e.angle = v.includes("左") ? "90ccw" : v.includes("180") ? "180" : "90cw"; break;
      case "dir": e.dir = v.includes("左右上下") ? "hv" : v.includes("縦") ? "v" : v.includes("斜") ? "diag" : v.includes("複合") ? "compound" : "h"; break;
      // 移動量の既定は方向から（横縦・左右上下=1マス・斜め=(1,1)・複合=(2,1)）。dir は同ループで先に確定済み
      case "moves": e.moves = e.dir === "diag" ? [2, 2] : e.dir === "compound" ? [3, 3] : [1, 1]; break;
      case "slopes": e.slopes = "ortho45"; break;
      case "entangle": e.entangle = [0, 2]; break;
      case "ratio": e.ratio = task === "shrink" ? (v.includes("1/3") ? "third" : "half") : (v.includes("3") ? "x3" : "x2"); break;
      case "density": e.density = v.includes("多") ? "dense" : "sparse"; break;
      case "axis": e.axis = "v"; break;
      case "lines": e.lines = [Math.max(2, n - 1), n * 2]; break;
      case "D": e.D = [9, 15]; break; // 立体 D窓の既定（atelier で実測較正）
      default: break;
    }
  }
  return e;
}
