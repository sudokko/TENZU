/* =========================================================================
   難易度 SSOT（全9タスク横断）＋ v1→v2 マイグレーション
   atelier の独自要素＝難易度。模写(copy)の校正済み式 baseDifficulty を土台に、
   タスク別のモディファイアを taskDifficulty で束ねる。

   依存は ../schema（型）と ./metrics（mergedSegments/computeMetrics・いずれも純粋）
   のみ。copy.ts 等の重い生成ライブラリを引かない＝published/index.ts 経由で
   クライアントにバンドルされても肥大化しない（io.ts コメント参照）。
   ========================================================================= */

import type {
  CandidateFile, Difficulty, DifficultyParts, EdgeT, Problem, ProblemMetrics,
  Provenance, SkuProblemSet,
} from "../schema";
import { edgeKey } from "../schema";
import {
  componentGaps, computeMetrics, computeSolidMetrics, interCrossings, mergedSegments,
  sharedPoints,
} from "./metrics";

/* ---- 土台スコア（D式 v3・2026-07-29 再設計）----
   総重量形式（旧式は lines に斜めも数えたうえで diagonals を足す二重計上だった）:

     線の重み E ＝ たてよこ ＋ 1.5×45°のななめ ＋ 4×非45°(2:1系) ＋ 5×非45°(急)
     盤面の項 G ＝ 0.5×盤面 ＋ 0.25×(図形の横幅＋縦幅)   ※点列数
     D ＝ 対称係数 k × E ＋ G ＋ 0.7×(画数−1) ＋ 3×対称くずしの線(≤2)
     k：左右0.70／上下0.75／ななめ0.85／なし1.0（図形自身の bbox 軸で判定）
     対称くずし（ほぼ対称）の上限：D ≤ 1.10 ×（k=1 で計算した値）
     丸め：小数第1位（最後に一度だけ・途中の項は丸めない＝内訳の足し算が必ず合う）

   設計判断（2026-07-29・3AI レビュー＋オーナー確定）:
   - 交差は実作で寄与が薄く不採用のまま。かわりに画数（筆離し）を採用
   - 非45°の隔離は主にゲート（requireNon45）が担い、D 側は 4〜5 の総重量
   - 対称は「構造を把握する負荷」を減らすだけなので E にのみ掛ける
   - ほぼ対称は割引でなく罠（子どもは対称に補完して間違える）＝破れに加点
   - アンカー項（盤面端からの距離）は不採用（現カタログ 300 問中 1 問しか発動しない）
   旧データ（新フィールド無し）へのフォールバック: 画数=1・対称なし・bbox=盤面。 */
export function baseDifficulty(m: ProblemMetrics): number {
  return roundD(baseRaw(basePartsOf(m)));
}

/* D の丸め（小数第1位）。式のどこで丸めるかを 1 箇所に集約する。
   ★ 丸めは「最後に一度だけ」が鉄則。途中で丸めた値を足してまた丸めると、
   公開している内訳（＝線＋盤面＋画数…）の足し算が D と合わなくなる。 */
export const roundD = (x: number): number => Math.round(x * 10) / 10;

const SYM_K = { v: 0.70, h: 0.75, d: 0.85, none: 1.0 } as const;

/* E（線の重み）だけを取り出す。かさね系（A+B+絡み）が部品として使う */
export function edgeLoad(m: ProblemMetrics): number {
  const tate = m.lines - m.diagonals;
  const a45 = m.diagonals - m.non45;
  const gentle = m.non45Gentle ?? 0;            // 旧データは分割不明→全部「急」側で安全に倒す
  const steep = m.non45 - gentle;
  return tate + 1.5 * a45 + 4 * gentle + 5 * steep;
}

/* ---- ばらけの項（かさね系固有・2026-08-02 追加）----
   E は線ごとの加算なので、同じ完成図をどう A/B に配分しても E(A)+E(B) が不変
   ＝「分け方の難しさ」を見られない（絡み 0 の分割で同点になる）。
   図の中に離れたかたまりがあると、位置を覚えて運ぶ「錨」が 1 つ増える＝
   かたまり 1 つ追加ごとに +2（180°回転と同格）、さらに離れているほど
   +0.5/マス（いちばん近いかたまりまでのチェビシェフ距離・隣接は加算なし）。
   生成器は両パート連結をゲートで守るため、発動は主に手設計モチーフ
   （例: でんしゃのパンタグラフ＋足回り）。atelier の検品表示も使う。 */
export function separationLoad(edges: EdgeT[]): number {
  return componentGaps(edges).reduce((s, d) => s + 2 + 0.5 * (d - 1), 0);
}

function boardTerm(m: ProblemMetrics): number {
  const n = m.boardN ?? Math.max(m.bboxW ?? 0, m.bboxH ?? 0); // solid は図形の広がりを盤面とみなす
  const w = m.bboxW ?? n;
  const h = m.bboxH ?? n;
  return 0.5 * n + 0.25 * (w + h);
}

/* ---- 変換そのものの負荷（2026-08-01 追加）----
   移動・回転は「どの図形か」だけでなく「どう動かすか」でも難しさが変わる。
   ゲート（ladder の dir/moves/angle）は巻を決めるためのものだが、実データでは
   1 巻の中に複数の移動量・角度が混ざっている（例: 移動 Lv.3 は (2,0) と (1,1)、
   回転 Lv.5 は 90°/-90°/180° が同居）。D は「巻内を散らす物差し」なので、
   ここを見ないと『まっすぐ2マス』と『斜め』が同点になってしまう。

   移動: 1 ×（|dc| ＋ |dr| − 1）＋ 3 ×（たてよこ両方に動くなら）
     「横に2、縦に1」を同時に数える負荷は、非45°のななめと同じ質の壁。
     だから 2 軸になった瞬間に段差（＋3）を置き、距離は 1 マスごとに緩く効かせる。
   回転: 90°（右まわり・左まわり）＝0／180°（さかさま）＝＋2
     ラダーが 180° を 90° の後（Lv.4）に置いている＝より難しいという設計判断に合わせる。 */
export function transformLoad(p: Problem): { value: number; label: string } | undefined {
  const a = p.answer;
  if (a?.mode !== "derived") return undefined;
  const t = a.transform;
  if (t.type === "translate") {
    const dist = Math.abs(t.dc) + Math.abs(t.dr);
    const twoAxis = t.dc !== 0 && t.dr !== 0;
    return {
      value: Math.max(0, dist - 1) + (twoAxis ? 3 : 0),
      label: `移動 ＝ 1×（${dist} − 1）${twoAxis ? " ＋ 3（たてよこ両方に動く）" : ""}`,
    };
  }
  if (t.type === "rotate") {
    return t.deg === 180
      ? { value: 2, label: "回転 ＝ 2（180°＝さかさま）" }
      : { value: 0, label: "回転 ＝ 0（90°）" };
  }
  return undefined;
}

function basePartsOf(m: ProblemMetrics): DifficultyParts {
  const E = edgeLoad(m);
  const G = boardTerm(m);
  const strokes = 0.7 * Math.max(0, (m.strokes ?? 1) - 1);
  const miss = m.symMiss ?? 0;
  const axis = m.symAxis ?? "none";
  const k = axis !== "none" && miss <= 2 ? SYM_K[axis] : 1.0;
  const brk = axis !== "none" && miss >= 1 && miss <= 2 ? 3 * miss : 0;
  return { E, G, k, strokes, brk };
}

/* parts → 実効値（丸める前）。ほぼ対称の上限（k=1 計算値の 1.10 倍）はここで効かせる。
   タスク固有の項（欠け・隠れ辺など）を足す側が、この生値に足してから 1 度だけ丸める。 */
function baseRaw(p: DifficultyParts): number {
  const d = p.k * p.E + p.G + p.strokes + p.brk;
  return p.brk > 0 ? Math.min(d, 1.10 * (p.E + p.G + p.strokes)) : d;
}

/* =========================================================================
   ★ 式の人間向け表記（公開ページの文言 SSOT）

   ⚠️ このファイルの式（baseDifficulty / taskDifficulty / scaleDifficulty /
      solidDifficulty）を変えたら、必ず下の定数も直すこと。
      設計台帳ページ（/products/design）はここだけを読む。式のコードと公開文言を
      同じファイルに置いているのは、片方だけ変わって嘘になるのを防ぐため。
   D_TASK_FORMULA に無いタスクは台帳側で「土台の式のまま」と表示される
      （新タスク追加時に文言が無くても壊れない）。
   ========================================================================= */
/* 式の部品。完全な式（D_TASK_FULL_FORMULA）はここから合成する＝
   係数を直したとき、複数の文言に書き写し忘れて食い違う事故を起こさない。 */
const E_TERM =
  "たてよこの線 ＋ 1.5 × 45°のななめ ＋ 4 × 45°でないななめ(ゆるい2:1) ＋ 5 × 45°でないななめ(急)";
const G_TERM = "盤面の項";
const ST_TERM = "0.7 ×（画数 − 1）";
const BRK_TERM = "3 × 対称くずしの線";
const SEP_TERM =
  "ばらけの項（図ごとに、離れたかたまり 1 つにつき 2 ＋ 0.5 ×（いちばん近いかたまりまでのマス数 − 1））";
const SHARED_TERM = "共有点（A と B が同じ格子点にふれている数 × 1）";

export const D_BASE_FORMULA =
  `D ＝ 対称係数 ×（${E_TERM}）＋ ${G_TERM} ＋ ${ST_TERM} ＋ ${BRK_TERM}`;

/* 盤面の項を、巻の盤面サイズを入れた具体形にする（atelier の検品画面が使う）。
   n を渡さなければ一般形のまま。 */
export function boardTermText(n?: number): string {
  return n === undefined
    ? "盤面の項 ＝ 0.5 × 盤面の大きさ ＋ 0.25 ×（図形の横幅 ＋ 縦幅）"
    : `盤面の項 ＝ 0.5 × ${n} ＋ 0.25 ×（図形の横幅 ＋ 縦幅）＝ ${0.5 * n} ＋ 0.25 ×（横幅 ＋ 縦幅）`;
}

/* タスクごとの「単体で読める」完全な式。
   D_TASK_FORMULA（土台からの差分表記）は設計台帳が使う——あちらは土台の式を
   すぐ上に併記しているため差分で足りる。atelier の検品画面はこちらを使う。 */
export const D_TASK_FULL_FORMULA: Record<string, string> = {
  copy: D_BASE_FORMULA,
  motif: D_BASE_FORMULA,
  mirror: D_BASE_FORMULA,
  rotate: `${D_BASE_FORMULA} ＋ 回転の項（90°＝0／180°＝2）`,
  translate: `${D_BASE_FORMULA} ＋ 移動の項（1 ×（動くマス数の合計 − 1）＋ 3（たてよこ両方に動くとき））`,
  fill: `D ＝ 対称係数 ×（${E_TERM}）＋ ${G_TERM} ＋ ${ST_TERM} ＋ ${BRK_TERM} ＋ 2 × 欠けている線分の本数`,
  overlay: `D ＝ 図A（${E_TERM}）＋ 図B（同じ式）＋ 2 × 絡み（A と B の線どうしの交差数）＋ ${SEP_TERM} ＋ ${G_TERM}`,
  decompose: `D ＝ 図A（${E_TERM}）＋ 図B（同じ式）＋ 2 × 絡み（A と B の線どうしの交差数）＋ ${SHARED_TERM} ＋ ${SEP_TERM} ＋ ${G_TERM}`,
  fold: `D ＝ 問題1（${E_TERM}）＋ 問題2（同じ式）＋ 2 × 絡み（折り重ねた後の線どうしの交差数）＋ ${SEP_TERM} ＋ ${G_TERM}`,
  solid: `D ＝ ${E_TERM} ＋ ${G_TERM} ＋ 3 × 隠れ辺（点線で描く、見えない辺）の本数`,
  scale: "D ＝ 線の本数 ＋ 2 × ななめ ＋（45°でないななめがあれば ＋6）",
  shrink: "D ＝ 線の本数 ＋ 2 × ななめ ＋（45°でないななめがあれば ＋6）＋ 4（縮小は逆操作のぶん重い）",
};

/* そのタスクで「使っていない項」の注意書き（atelier の検品画面用）。
   単図モデル（対称の圧縮・運筆）が成り立たないタスクでは項ごと落としている。 */
export const D_TASK_EXCLUDES: Record<string, string> = {
  overlay: "2 図を見比べる課題なので、対称係数と画数は使わない（離れ小島の負荷は画数でなく、ばらけの項で見る）",
  decompose: "2 図を見比べる課題なので、対称係数と画数は使わない（離れ小島の負荷は画数でなく、ばらけの項で見る）",
  fold: "2 図を見比べる課題なので、対称係数と画数は使わない（離れ小島の負荷は画数でなく、ばらけの項で見る）",
  solid: "立体は盤面を図形に合わせて切り出すため、対称係数と画数は使わない",
  mirror: "図形は見本 F で測る。裏返す軸（左右／上下）は印刷時の並びで決まるため、問題ごとの負荷差にならず項を持たない",
  rotate: "図形は見本 F で測る。1 巻に複数の角度が混ざるので、回転そのものの負荷を項として足す",
  translate: "図形は見本 F で測る。1 巻に複数の移動量が混ざるので、移動そのものの負荷を項として足す",
};

/* 用語ごとの短い説明（設計台帳が定義リストで表示する）。1項目=2〜3文まで */
export const D_TERM_NOTES: { term: string; note: string }[] = [
  {
    term: "線の重み",
    note: "線1本あたりの点数。たてよこ＝1点、45°のななめ＝1.5点、45°でないななめ（横2マス縦1マスのような傾き）＝ゆるいものは4点・急なものは5点。見なれない傾きほど、どの点からどの点へ向かうかを数えて確かめる手間が増える。",
  },
  {
    term: "対称係数",
    note: "図形自身が左右対称なら×0.70、上下対称なら×0.75、ななめ対称なら×0.85。半分を見れば残り半分の構造がわかるぶん楽になる。掛かるのは線の重みだけ——盤面の広さや筆を動かす量は、対称でも減らないから。",
  },
  {
    term: "盤面の項",
    note: "0.5×盤面の大きさ ＋ 0.25×（図形の横幅＋縦幅）。盤面が広く、図形が大きく広がるほど、対応する点を探す範囲が広くなる。",
  },
  {
    term: "画数",
    note: "全部の線をなぞるのに、筆を何回置くかの最小回数。離れたかたまりや枝分かれが多い図形ほど増える。2画目からは1画につき0.7点。",
  },
  {
    term: "対称くずし",
    note: "ほとんど対称なのに、1〜2本だけずれている図形。子どもは無意識に「対称のはず」とそろえて描いてしまうため、ずれた線はまちがいが集中する罠になる。割引ではなく、ずれ1本につき＋3点（上限は、対称なしとして計算した値の1.10倍）。",
  },
  {
    term: "移動・回転の項",
    note: "移動と回転は、図形そのものだけでなく「どう動かすか」でも難しさが変わる。移動は動くマス数の合計から1を引いた数（1マスの移動を基準にする）に、たてよこ両方へ動くときは＋3。「横に2、縦に1」を同時に数える負荷は、45°でないななめと同じ質の壁だから。回転は 90° が0、180°（さかさま）が＋2。鏡は、裏返す軸が印刷時の並びで決まるため項を持たない。",
  },
  {
    term: "ばらけの項",
    note: "かさね・分解・折り重ねで、図A・図Bそれぞれの中に離れたかたまりがあるときの追加点。かたまり1つにつき2点、さらに離れているほど1マスごとに0.5点（ななめも1マスと数える）。同じ完成図でも、離れた位置のパーツに分けるほど、位置を覚えて運ぶ「錨」が増えて難しくなる。",
  },
  {
    term: "共有点",
    note: "分解だけの追加点。図Aと引くもの（図B）が同じ点にふれている場所では、「この線はどちらの図のものか」を判断してから写す必要がある。ふれあう点1つにつき1点。X字に突き抜ける場所は、さらに絡みとして2点かかる。かさね・折り重ねは描き足す方向の課題で、この判断が起きないため項を持たない。",
  },
  {
    term: "式に入れていないもの",
    note: "1 つの図の中の、線どうしの交差の数は入れていない。実際に紙で解いてみると、交差は見た目ほど難易度に効かなかったため（かさね・分解・折り重ねの「絡み」は A・B 間の交差で、これとは別）。D の値は、すべての項を足したあと最後に一度だけ小数第1位に丸める。",
  },
];

export const D_TASK_FORMULA: Record<string, string> = {
  copy: "土台の式のまま",
  fill: "土台の式 ＋ 2 × 欠けている線分の本数",
  mirror: "土台の式のまま（見本の図形で測る。裏返す軸は印刷時の並びで決まるので、問題ごとの差にはならない）",
  rotate: "土台の式 ＋ 回転の項（90°＝0／180°＝2）",
  translate: "土台の式 ＋ 移動の項（1 ×（動くマス数の合計 − 1）＋ 3（たてよこ両方に動くとき））",
  overlay: "図A の線の重み ＋ 図B の線の重み ＋ 2 × 絡み（A と B の線どうしの交差数）＋ ばらけの項 ＋ 盤面の項",
  decompose: "図A の線の重み ＋ 図B の線の重み ＋ 2 × 絡み（A と B の線どうしの交差数）＋ 共有点 ＋ ばらけの項 ＋ 盤面の項",
  fold: "図A の線の重み ＋ 図B の線の重み ＋ 2 × 絡み（折り重ねた後の A・B 間の交差数）＋ ばらけの項 ＋ 盤面の項",
  solid: "線の重み ＋ 盤面の項 ＋ 3 × 隠れ辺（点線で描く、見えない辺）の本数。対称係数と画数は使わない",
  scale: "別式（線の本数 ＋ 2 × ななめ ＋ 非45°があれば ＋6）",
  shrink: "別式（拡大の式 ＋ 4。縮小は逆操作のぶん重い）",
};

/* ---- タスク横断の難易度 ----
   value＝そのタスクの実効難易度・parts＝内訳（UI/監査用）。
   変換系（mirror/rotate/translate）は操作負荷をゲート・盤面リセットで吸収する設計
   なので base そのまま。2図系（overlay/decompose）は同時保持で ≈2倍。
   fill は base＋欠け量ペナルティ。scale/solid は別式（下）。 */
export function taskDifficulty(task: string, p: Problem): { value: number; parts: DifficultyParts } {
  const m = p.metrics;
  const parts = basePartsOf(m);
  const raw = baseRaw(parts);        // 丸める前の土台。固有項を足してから 1 度だけ丸める
  switch (task) {
    case "copy":
      return { value: roundD(raw), parts };

    case "fill": {
      // 欠け量＝解答（補う線）の見た目の線分数。多いほど選別が難しい。係数2は暫定（後校正）。
      const gaps = p.answer?.mode === "explicit" ? mergedSegments(p.answer.edges).length : 0;
      return { value: roundD(raw + 2 * gaps), parts: { ...parts, gap: 2 * gaps } };
    }

    case "mirror":
      /* 鏡は見本 F の base そのまま。軸（左右／上下）は印刷時の並びで決まる
         ＝問題ごとの負荷差にならないので、変換の項を持たない（decisions §3.59） */
      return { value: roundD(raw), parts };

    case "rotate":
    case "translate": {
      /* 移動・回転は見本 F の base ＋ 変換そのものの負荷（移動量・角度）。
         1 巻に複数の移動量・角度が混在するため、ここを見ないと巻内で同点になる */
      const tf = transformLoad(p);
      return tf && tf.value > 0
        ? { value: roundD(raw + tf.value), parts: { ...parts, 変換: tf.value } }
        : { value: roundD(raw), parts };
    }

    case "overlay":
    case "decompose": {
      // かさね・分解 固有式（decisions §3.70/§3.73/§3.97/§3.98・v3改）:
      //   D = E(A) + E(B) + 2×絡み + 共有点(分解のみ) + ばらけ + 盤面項
      // 2図の同時保持が本質なので、線の重み E を図ごとに足す。対称係数・画数は
      // 使わない（2図を見比べる課題では単図の圧縮・運筆モデルが成り立たない）。
      // 絡み＝A・B の線分同士の X 交差を直接数える（引き算導出は F の線分併合で
      // 幻交差が湧くため廃止・decisions §3.98）。
      // 共有点＝分解だけの項。「どの線がどちらの図か」の所属切替（pack-tasks §20）は
      // X 交差だけでなく、共有する格子点・T字接触でも起きる。合成方向（かさね）は
      // 描き足すだけで所属切替が無い＝項を持たない。
      // ばらけ＝図ごとの離れ小島の負荷（E が分配不変なため、分け方の難しさはここで見る）。
      // A＝F∖R・B＝R（answer explicit・両タスク同一データ形＝pack-tasks §19.8/§20）。
      // answer 不在/空（白紙作成直後・旧データ）は 2×E(F) + 盤面項 にフォールバック。
      const G = boardTerm(m);
      if (p.answer?.mode !== "explicit" || p.grid.type !== "square" || p.answer.edges.length === 0) {
        const E = edgeLoad(m);
        return { value: roundD(2 * E + G), parts: { E, pair: E, G } };
      }
      const rk = new Set(p.answer.edges.map(edgeKey));
      const A = p.edges.filter((e) => !rk.has(edgeKey(e)));
      const mA = computeMetrics(A, p.grid.n);
      const mB = computeMetrics(p.answer.edges, p.grid.n);
      const eA = edgeLoad(mA);
      const eB = edgeLoad(mB);
      const inter = interCrossings(A, p.answer.edges);
      const touch = task === "decompose" ? sharedPoints(A, p.answer.edges) : 0;
      const sep = separationLoad(A) + separationLoad(p.answer.edges);
      return {
        value: roundD(eA + eB + 2 * inter + touch + sep + G),
        parts: {
          A: eA, B: eB, 絡み: 2 * inter,
          ...(touch > 0 && { 共有点: touch }),
          ...(sep > 0 && { ばらけ: sep }),
          G,
        },
      };
    }

    case "fold": {
      // 折り重ね固有式（decisions §3.74/§3.97/§3.98・v3改）: かさね系と同じ E(A)+E(B)+絡み+ばらけ+盤面項。
      // A＝問題1（折り返す前の姿・鏡映しても数量メトリクスは不変）・B＝問題2・
      // 絡み＝折り重ね後の A'・B 間の直接交差。A'＝完成図∖B（完成図＝answer.edges
      // ＝mirror(問題1,v)∪問題2・代表軸 v で焼付済み。折り重ねで辺が重なった分は
      // B に帰属＝同一線なので交差にならず、直接計測の結果は変わらない）。
      const G = boardTerm(m);
      if (p.answer?.mode !== "explicit" || p.grid.type !== "square"
        || !p.inputB || p.inputB.length === 0 || p.answer.edges.length === 0) {
        const E = edgeLoad(m);
        return { value: roundD(2 * E + G), parts: { E, pair: E, G } };
      }
      const mA = computeMetrics(p.edges, p.grid.n);
      const mB = computeMetrics(p.inputB, p.grid.n);
      const eA = edgeLoad(mA);
      const eB = edgeLoad(mB);
      const bk = new Set(p.inputB.map(edgeKey));
      const inter = interCrossings(p.answer.edges.filter((e) => !bk.has(edgeKey(e))), p.inputB);
      // ばらけ＝紙ごとの離れ小島の負荷（折っても紙の中の小島は錨のまま・かさねと同じ）
      const sep = separationLoad(p.edges) + separationLoad(p.inputB);
      return {
        value: roundD(eA + eB + 2 * inter + sep + G),
        parts: sep > 0
          ? { A: eA, B: eB, 絡み: 2 * inter, ばらけ: sep, G }
          : { A: eA, B: eB, 絡み: 2 * inter, G },
      };
    }

    case "scale":
    case "shrink":
      return scaleDifficulty(p);
    case "solid":
      return solidDifficulty(p);

    default:
      return { value: roundD(raw), parts };
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
  return {
    value: roundD(lineLoad + angleLoad + shrinkLoad),
    parts: { lineLoad, angleLoad, shrinkLoad },
  };
}

/* 立体模写（斜投影＝キャビネット図・矩形点格子）。線の重み＋盤面項を土台に、
   隠れ辺（点線）本数を最大ドライバーとして加算＝「見えない構造を推して写す」負荷。
   対称係数・画数は使わない（立体の盤面は図形に合わせて切り出されるため、
   盤面項の材料も図形の広がり＝bbox で持つ。decisions §3.90）。
   D = E + G + 3·hiddenLines（= baseDifficulty + 3·隠れ辺。solid metrics は
   symAxis/strokes を持たないので baseDifficulty が自然に E+G に落ちる）。 */
function solidDifficulty(p: Problem): { value: number; parts: DifficultyParts } {
  const m = p.metrics;
  const hidden = m.hiddenLines ?? 0;
  const E = edgeLoad(m);
  const G = boardTerm(m);
  return {
    value: roundD(E + G + 3 * hidden),   // 丸めは最後に一度だけ（内訳の足し算と一致させる）
    parts: { E, G, hidden: 3 * hidden },
  };
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
  // 旧 metrics は non45（v1）や strokes/symAxis 等（D式v3 の追加計測）を持たない。
  // 欠けていれば edges から引き直す。computeMetrics/computeSolidMetrics は純粋・
  // 辺から決定的なので再計算しても値はぶれない。
  const v3ok = p.grid.type === "solid"
    ? p.metrics && typeof p.metrics.bboxW === "number"
    : p.metrics && typeof p.metrics.strokes === "number";
  const metrics =
    p.metrics && typeof p.metrics.non45 === "number" && v3ok
      ? p.metrics
      : p.grid.type === "solid"
        ? computeSolidMetrics(p.solidEdges ?? [])
        : computeMetrics(p.edges, p.grid.n);
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
  // solid は辺（solidEdges）から metrics を引き直してから難易度を出す（edges 経路は呼び出し側が更新）。
  if (p.grid.type === "solid") p.metrics = computeSolidMetrics(p.solidEdges ?? []);
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
