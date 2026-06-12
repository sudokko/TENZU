/* =========================================================================
   模写タスクの難易度ラダー（pack-design §12 の 8 段をコード化）
   生成パラメータ＝そのまま難易度仕様。範囲は [min, max]。
   - slopes: ortho＝縦横のみ / ortho45＝45°まで / any＝非45°（ナイト傾き）許可
   - diagonals: 併合後の「ななめ線分」本数の範囲
   - crossings: 交差数の範囲（§12 の なし/少/あり/多/極多 を数値化）
   - components: 構成要素数の範囲
   - bbox: 形が小さくまとまりすぎないための最小スパン（c/r 両方向）
   - closedBias: 既存頂点へ戻って閉じる確率（幼児向けほど高＝閉じた形が分かりやすい）
   ========================================================================= */

export type SlopeRule = "ortho" | "ortho45" | "any";

export type CopyParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  lines: [number, number];
  slopes: SlopeRule;
  diagonals: [number, number];
  crossings: [number, number];
  components: [number, number];
  bbox: number;          // min span（両方向）
  closedBias: number;    // 0..1
};

export const COPY_LADDER: Record<string, CopyParams> = {
  /* #1 Lv.1 Vol.1 — 3×3・斜めなし・線2-6本・かたち1-2（つながっていなくてもよい）
     オーナー指示 2026-06-11: 線2本のやさしい段を追加・全部つながっている必要なし */
  "copy-lv1-vol1": {
    grid: 3, lines: [2, 6], slopes: "ortho", diagonals: [0, 0],
    crossings: [0, 0], components: [1, 2], bbox: 2, closedBias: 0.75,
  },
  /* #2 Lv.2 Vol.1 — 3×3・45°導入・交差なし〜少 */
  "copy-lv2-vol1": {
    grid: 3, lines: [3, 6], slopes: "ortho45", diagonals: [1, 3],
    crossings: [0, 1], components: [1, 1], bbox: 2, closedBias: 0.7,
  },
  /* #3 Lv.2 Vol.2 — 4×4・45°あり・交差少・線5-10本 */
  "copy-lv2-vol2": {
    grid: 4, lines: [5, 10], slopes: "ortho45", diagonals: [1, 4],
    crossings: [0, 1], components: [1, 1], bbox: 3, closedBias: 0.65,
  },
  /* #4 Lv.3 Vol.1 — 4×4・45°定着＋交差増・構成1-2 */
  "copy-lv3-vol1": {
    grid: 4, lines: [6, 11], slopes: "ortho45", diagonals: [2, 6],
    crossings: [1, 3], components: [1, 2], bbox: 3, closedBias: 0.6,
  },
  /* #5 Lv.3 Vol.2 — 5×5・45°定着・構成2 */
  "copy-lv3-vol2": {
    grid: 5, lines: [7, 13], slopes: "ortho45", diagonals: [2, 7],
    crossings: [1, 3], components: [2, 2], bbox: 4, closedBias: 0.6,
  },
  /* #6 Lv.4 Vol.1 — 5×5・非45°導入・交差多・構成2-3 */
  "copy-lv4-vol1": {
    grid: 5, lines: [8, 14], slopes: "any", diagonals: [3, 8],
    crossings: [2, 5], components: [2, 3], bbox: 4, closedBias: 0.55,
  },
  /* #7 Lv.4 Vol.2 — 6×6・非45°あり・構成3 */
  "copy-lv4-vol2": {
    grid: 6, lines: [9, 16], slopes: "any", diagonals: [3, 9],
    crossings: [2, 6], components: [2, 3], bbox: 5, closedBias: 0.55,
  },
  /* #8 Lv.5 Vol.1 — 7×7・非45°主構成・交差極多・構成4+ */
  "copy-lv5-vol1": {
    grid: 7, lines: [12, 20], slopes: "any", diagonals: [4, 12],
    crossings: [3, 8], components: [3, 4], bbox: 6, closedBias: 0.5,
  },
};
