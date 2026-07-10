/* =========================================================================
   タスク別ミニ図版（/products 一覧の行頭アイコン）
   旧 task-*.svg（1 グリッド詰め込み）を置き換える「実問題準拠」版＝
   maker-figs.tsx（TOP/一覧のサンプル図 SSOT）の 2〜3 ペイン構図を
   行頭サイズに縮約したもの。ペイン＝3×3 点格子・頂点は必ず格子点に乗せる。
   色は visual-identity §6 準拠: ink=みほん／teal=こたえ（到達後のみ）。
   ========================================================================= */

const INK = "#1A1F2A";
const TEAL = "#2C6E7F";

/* ペイン格子: 原点 x0 から pitch 10・3×3（x0+0/10/20 × y 4/14/24）。
   図形の頂点はこの 9 点のいずれかに一致させること。 */
const P = 10;
const YS = [4, 14, 24];

const stroke = { fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Dots({ x0 }: { x0: number }) {
  return (
    <g fill={INK} opacity={0.16}>
      {YS.map((y) =>
        [0, 1, 2].map((c) => <circle key={`${y}${c}`} cx={x0 + c * P} cy={y} r={1.2} />)
      )}
    </g>
  );
}

/* ペイン間の変換矢印（→） */
function Arrow({ x }: { x: number }) {
  return (
    <g stroke={INK} opacity={0.45} {...stroke} strokeWidth={1.2}>
      <path d={`M${x} 14 H${x + 9}`} />
      <path d={`M${x + 6} 11 L${x + 9} 14 L${x + 6} 17`} />
    </g>
  );
}

/* ペイン間の演算記号（かさね=＋／分解=−／こたえ=＝）。maker の紙面表記に合わせる */
function Plus({ x }: { x: number }) {
  return (
    <g stroke={INK} opacity={0.45} {...stroke} strokeWidth={1.2}>
      <path d={`M${x} 14 H${x + 8}`} />
      <path d={`M${x + 4} 10 V18`} />
    </g>
  );
}
function Minus({ x }: { x: number }) {
  return (
    <g stroke={INK} opacity={0.45} {...stroke} strokeWidth={1.2}>
      <path d={`M${x} 14 H${x + 8}`} />
    </g>
  );
}
function Eq({ x }: { x: number }) {
  return (
    <g stroke={INK} opacity={0.45} {...stroke} strokeWidth={1.2}>
      <path d={`M${x} 12 H${x + 8}`} />
      <path d={`M${x} 17 H${x + 8}`} />
    </g>
  );
}

/* 頂点列 → path d（x0 オフセット・格子座標 [0..20]） */
const d = (x0: number, pts: [number, number][], close = true) =>
  pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x0 + x} ${y}`).join(" ") + (close ? " Z" : "");

/* ---- 2 ペイン標準（幅 76）: pane1 x0=4 / pane2 x0=48・矢印 x=35 ---- */
const VB2 = "0 0 76 32";
const P1 = 4, P2 = 48, AR = 35;

/* ---- 3 ペイン（幅 112）: x0 = 4 / 42 / 84・接続 x=31, 71 ---- */
const VB3 = "0 0 112 32";
const Q1 = 4, Q2 = 42, Q3 = 84;

/* 模写: 家のかたちを、そのまま隣へ写す */
function FigCopy() {
  return (
    <svg viewBox={VB2} role="img" aria-label="模写: 見本を隣の格子へ写す">
      <Dots x0={P1} /><Dots x0={P2} />
      <path d={d(P1, [[0, 24], [0, 14], [10, 4], [20, 14], [20, 24]])} stroke={INK} {...stroke} />
      <Arrow x={AR} />
      <path d={d(P2, [[0, 24], [0, 14], [10, 4], [20, 14], [20, 24]])} stroke={TEAL} {...stroke} />
    </svg>
  );
}

/* 模写（立体）: 斜投影の箱を写す（立体は点線＝隠れ辺を持つ） */
function FigSolid() {
  const box = (x0: number, c: string, hidden: string) => (
    <g>
      <path d={`M${x0} 12 H${x0 + 12} V26 H${x0} Z`} stroke={c} {...stroke} />
      <path d={`M${x0} 12 L${x0 + 6} 6 H${x0 + 18} L${x0 + 12} 12`} stroke={c} {...stroke} />
      <path d={`M${x0 + 18} 6 V20 L${x0 + 12} 26`} stroke={c} {...stroke} />
      <path d={`M${x0} 26 L${x0 + 6} 20 H${x0 + 18}`} stroke={hidden} strokeWidth={1}
        strokeDasharray="2.5 2.5" opacity={0.4} fill="none" strokeLinecap="round" />
      <path d={`M${x0 + 6} 20 V6`} stroke={hidden} strokeWidth={1}
        strokeDasharray="2.5 2.5" opacity={0.4} fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox={VB2} role="img" aria-label="立体模写: 立体の箱を写す">
      {box(P1 + 1, INK, INK)}
      <Arrow x={AR} />
      {box(P2 + 1, TEAL, INK)}
    </svg>
  );
}

/* 欠け補完: 上の辺が欠けた四角 → 閉じた四角 */
function FigFill() {
  return (
    <svg viewBox={VB2} role="img" aria-label="欠け補完: 足りない辺を補って閉じる">
      <Dots x0={P1} /><Dots x0={P2} />
      <path d={d(P1, [[0, 4], [0, 24], [20, 24], [20, 4]], false)} stroke={INK} {...stroke} />
      <path d={`M${P1} 4 H${P1 + 20}`} stroke={INK} strokeWidth={1.2} strokeDasharray="3 3"
        opacity={0.35} fill="none" strokeLinecap="round" />
      <Arrow x={AR} />
      <path d={d(P2, [[0, 4], [20, 4], [20, 24], [0, 24]])} stroke={TEAL} {...stroke} />
    </svg>
  );
}

/* 鏡: ペイン間の鏡線ごしに裏返す */
function FigMirror() {
  return (
    <svg viewBox={VB2} role="img" aria-label="鏡: 鏡の線の反対側へうつす">
      <Dots x0={P1} /><Dots x0={P2} />
      <path d="M38 2 V30" stroke={INK} strokeWidth={1.2} strokeDasharray="3 3"
        opacity={0.4} fill="none" strokeLinecap="round" />
      <path d={d(P1, [[10, 4], [20, 14], [10, 24]])} stroke={INK} {...stroke} />
      <path d={d(P2, [[10, 4], [0, 14], [10, 24]])} stroke={TEAL} {...stroke} />
    </svg>
  );
}

/* 移動: 左上の四角を、右下へずらして写す */
function FigTranslate() {
  return (
    <svg viewBox={VB2} role="img" aria-label="移動: 形はそのまま位置をずらす">
      <Dots x0={P1} /><Dots x0={P2} />
      <path d={d(P1, [[0, 4], [10, 4], [10, 14], [0, 14]])} stroke={INK} {...stroke} />
      <path d={`M${P1 + 12} 16 L${P1 + 18} 22`} stroke={INK} strokeWidth={1}
        strokeDasharray="2.5 2.5" opacity={0.5} fill="none" strokeLinecap="round" />
      <Arrow x={AR} />
      <path d={d(P2, [[10, 14], [20, 14], [20, 24], [10, 24]])} stroke={TEAL} {...stroke} />
      <path d={`M${P2} 4 L${P2 + 8} 12`} stroke={INK} strokeWidth={1}
        strokeDasharray="2.5 2.5" opacity={0.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* 回転: 上向きの旗を 90° 回す（回転矢印つき） */
function FigRotate() {
  return (
    <svg viewBox={VB2} role="img" aria-label="回転: 形を回してとらえる">
      <Dots x0={P1} /><Dots x0={P2} />
      <path d={d(P1, [[0, 4], [20, 4], [0, 24]])} stroke={INK} {...stroke} />
      <g stroke={INK} opacity={0.45} fill="none" strokeWidth={1.2} strokeLinecap="round">
        <path d="M34 10 A 7 7 0 0 1 42 16" />
        <path d="M42 12 L42 16 L38 16" strokeLinejoin="round" />
      </g>
      <path d={d(P2, [[0, 4], [20, 4], [20, 24]])} stroke={TEAL} {...stroke} />
    </svg>
  );
}

/* かさね（3 ペイン・maker 準拠）: A ＋ B ＝ 重ねたこたえ */
function FigOverlay() {
  return (
    <svg viewBox={VB3} role="img" aria-label="かさね: 2つの形を重ねた姿を描く">
      <Dots x0={Q1} /><Dots x0={Q2} /><Dots x0={Q3} />
      <path d={d(Q1, [[0, 4], [20, 4], [20, 24], [0, 24]])} stroke={INK} {...stroke} />
      <Plus x={29} />
      <path d={d(Q2, [[10, 4], [20, 14], [10, 24], [0, 14]])} stroke={INK} {...stroke} />
      <Eq x={71} />
      <g stroke={TEAL} {...stroke}>
        <path d={d(Q3, [[0, 4], [20, 4], [20, 24], [0, 24]])} />
        <path d={d(Q3, [[10, 4], [20, 14], [10, 24], [0, 14]])} />
      </g>
    </svg>
  );
}

/* 分解（3 ペイン・maker 準拠）: 家 − 屋根 ＝ のこり（引き算で分ける） */
function FigDecompose() {
  return (
    <svg viewBox={VB3} role="img" aria-label="分解: 全体から一部を引いた、のこりを描く">
      <Dots x0={Q1} /><Dots x0={Q2} /><Dots x0={Q3} />
      <path d={d(Q1, [[0, 24], [0, 14], [10, 4], [20, 14], [20, 24]])} stroke={INK} {...stroke} />
      <Minus x={29} />
      <path d={d(Q2, [[0, 14], [10, 4], [20, 14]], false)} stroke={INK} {...stroke} />
      <Eq x={71} />
      <path d={d(Q3, [[0, 14], [0, 24], [20, 24], [20, 14]], false)} stroke={TEAL} {...stroke} />
    </svg>
  );
}

/* 折り重ね（3 ペイン・maker 準拠）: 屋根 ⤵折り返し 壁 ＝ 折った屋根（teal）＋壁で家 */
function FigFold() {
  const foldX = 33; // ペイン1｜2 の境目＝折り目
  return (
    <svg viewBox={VB3} role="img" aria-label="折り重ね: 折り返して重ねた姿を描く">
      <Dots x0={Q1} /><Dots x0={Q2} /><Dots x0={Q3} />
      {/* 問題1: 右に傾いた屋根（開） */}
      <path d={d(Q1, [[0, 14], [20, 4], [20, 14]], false)} stroke={INK} {...stroke} />
      {/* 折り目（境界の点線）＋折り返しの弧矢印 */}
      <path d={`M${foldX} 2 V30`} stroke={INK} strokeWidth={1}
        strokeDasharray="3 3" opacity={0.4} fill="none" strokeLinecap="round" />
      <g stroke={INK} opacity={0.45} fill="none" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${foldX - 5} 9 A 5 5 0 0 1 ${foldX + 5} 9`} />
        <path d={`M${foldX + 5} 9 l -3 -2 m 3 2 l -1 3`} />
      </g>
      {/* 問題2: 壁（四角・閉） */}
      <path d={d(Q2, [[0, 14], [20, 14], [20, 24], [0, 24]])} stroke={INK} {...stroke} />
      <Eq x={71} />
      {/* こたえ: 折り返した屋根（teal）＋壁（ink）＝家 */}
      <path d={d(Q3, [[20, 14], [0, 4], [0, 14]], false)} stroke={TEAL} {...stroke} />
      <path d={d(Q3, [[0, 14], [20, 14], [20, 24], [0, 24]])} stroke={INK} {...stroke} />
    </svg>
  );
}

export const TASK_MINIFIG: Record<string, () => React.ReactElement> = {
  copy: FigCopy,
  solid: FigSolid,
  fill: FigFill,
  mirror: FigMirror,
  translate: FigTranslate,
  rotate: FigRotate,
  overlay: FigOverlay,
  decompose: FigDecompose,
  fold: FigFold,
};
