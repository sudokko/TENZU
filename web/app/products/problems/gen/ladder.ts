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

/* 対称構築に使える軸（copy.ts buildSymmetric が対応する範囲・schema mirrorEdges と同規約） */
export type SymAxis = "v" | "h" | "d1";

export type CopyParams = {
  grid: 3 | 4 | 5 | 6 | 7;
  lines: [number, number];
  slopes: SlopeRule;
  diagonals: [number, number];
  crossings: [number, number];
  components: [number, number];
  bbox: number;          // min span（両方向）
  closedBias: number;    // 0..1
  /* ---- 「整い」レバー（任意・未指定なら従来挙動） ---- */
  symRatio?: number;     // 対称構築で作る割合（0..1）。残りは自由ウォーク
  symAxes?: SymAxis[];   // 対称構築に使う軸の候補
  maxDangling?: number;  // 次数1端点（ヒゲ）の上限（Phase 2 で paramsOk 結線）
  centerTol?: number;    // bbox 中心の許容ずれ（マンハッタン・Phase 2）
  maxAngleKinds?: number;// 斜め角度の種類上限（Phase 2）
  minCompEdges?: number; // 各連結成分の最小辺数（1辺の孤立片を排除・Phase 2）
};

/* COPY_LADDER（模写の難易度帯）は copy.ts（ライブラリ方式）へ移設した（2026-06-14）。
   このファイルは fill/mirror が共有する CopyParams 型・SlopeRule のみを提供する。 */
