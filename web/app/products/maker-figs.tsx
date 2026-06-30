/* =========================================================================
   メーカー・サンプル図 SSOT（ハブのカード / MakerGate のロック画面で共用）
   各メーカーの「実際の出力（紙面/結果プレビュー）」に構造を合わせる:
     - copy/fill/mirror/rotate = 2 ペイン（みほん → かく）
     - overlay/fold/decompose  = 3 ペイン（A ＋/− B ＝ こたえ）
     - scale/shrink/translate  = 2 ペイン＋★起点（translate は●移動先も）
   線=INK(#3A424E)・答え=うすいグレー破線・マーカー/B 図=teal。実物の色運用に準拠。
   ========================================================================= */
import type { MakerKey } from "./capabilities";

const TEAL = "#2C6E7F";
const INK = "#3A424E";
const FAINT = "#AEB6BF";
const MUTED = "#767D89";
const AXIS = "#9AA0AA";

const N = 4; // サムネは 4×4 グリッドで統一（実物の既定 3〜5 の代表）

/* ---- プリミティブ ---- */
type V = "ink" | "faint" | "teal" | "tealdash";
const STK: Record<V, { c: string; w: number; d?: string }> = {
  ink: { c: INK, w: 2 },
  faint: { c: FAINT, w: 1.6, d: "4 3" },
  teal: { c: TEAL, w: 2 },
  tealdash: { c: TEAL, w: 1.8, d: "4 3" },
};

function Grid({ ox, oy, s }: { ox: number; oy: number; s: number }) {
  const a: React.ReactNode[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      a.push(<circle key={`${r}-${c}`} cx={ox + c * s} cy={oy + r * s} r={1.5} fill={INK} />);
  return <g>{a}</g>;
}
function Shape({
  ox, oy, s, pts, v, closed = true,
}: { ox: number; oy: number; s: number; pts: number[][]; v: V; closed?: boolean }) {
  const st = STK[v];
  const p = pts.map(([c, r]) => `${ox + c * s},${oy + r * s}`).join(" ");
  const cm = {
    fill: "none", stroke: st.c, strokeWidth: st.w, strokeDasharray: st.d,
    strokeLinejoin: "round" as const, strokeLinecap: "round" as const,
  };
  return closed ? <polygon points={p} {...cm} /> : <polyline points={p} {...cm} />;
}
function starPts(x: number, y: number, r: number) {
  const a: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    a.push(`${(x + rr * Math.cos(ang)).toFixed(1)},${(y + rr * Math.sin(ang)).toFixed(1)}`);
  }
  return a.join(" ");
}
function Star({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={9} fill={TEAL} opacity={0.12} />
      <polygon points={starPts(x, y, 6)} fill={TEAL} />
      {label && <text x={x} y={y + 16} textAnchor="middle" fontSize="9" fill={TEAL}>{label}</text>}
    </>
  );
}
function Target({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={8} fill={TEAL} opacity={0.1} />
      <circle cx={x} cy={y} r={5} fill="none" stroke={TEAL} strokeWidth={2} />
      <circle cx={x} cy={y} r={1.6} fill={TEAL} />
      {label && <text x={x} y={y + 17} textAnchor="middle" fontSize="9" fill={TEAL}>{label}</text>}
    </>
  );
}
function TL({ x, t }: { x: number; t: string }) {
  return <text x={x} y={30} textAnchor="middle" fontSize="11" fill={MUTED} letterSpacing="0.04em">{t}</text>;
}
function Arrow({ x, y, len = 40 }: { x: number; y: number; len?: number }) {
  const x0 = x - len / 2, x1 = x + len / 2;
  return (
    <path d={`M${x0} ${y} L${x1} ${y} M${x1 - 6} ${y - 4} L${x1} ${y} L${x1 - 6} ${y + 4}`}
      fill="none" stroke={MUTED} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  );
}
function Op({ x, y, kind }: { x: number; y: number; kind: "plus" | "minus" | "eq" }) {
  const s = 7;
  const d = kind === "plus" ? `M${x - s} ${y} L${x + s} ${y} M${x} ${y - s} L${x} ${y + s}`
    : kind === "minus" ? `M${x - s} ${y} L${x + s} ${y}`
      : `M${x - s} ${y - 3.5} L${x + s} ${y - 3.5} M${x - s} ${y + 3.5} L${x + s} ${y + 3.5}`;
  return <path d={d} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
}

/* ---- 2 ペイン座標 ---- */
const LOX = 28, ROX = 238, OY = 54, S = 26;
const LCX = LOX + 1.5 * S, RCX = ROX + 1.5 * S, MIDX = (LOX + 3 * S + ROX) / 2, MIDY = OY + 1.5 * S;
const VB2 = "0 0 344 188";
/* ---- 3 ペイン座標 ---- */
const P1 = 26, P2 = 204, P3 = 382, OY3 = 56, S3 = 22;
const S1X = (P1 + 3 * S3 + P2) / 2, S2X = (P2 + 3 * S3 + P3) / 2, MIDY3 = OY3 + 1.5 * S3;
const VB3 = "0 0 470 184";

/* 共有シェイプ（4×4・grid 0..3） */
const PENT = [[1, 0], [3, 1], [3, 3], [0, 3], [0, 1]];
const SQ = (c: number, r: number, w: number, h = w) => [[c, r], [c + w, r], [c + w, r + h], [c, r + h]];

/* =================== 2 ペイン: copy / mirror / rotate / fill =================== */
function FigCopy() {
  return (
    <svg viewBox={VB2} role="img" aria-label="模写の設問サンプル">
      <TL x={LCX} t="みほん" /><TL x={RCX} t="かいとう" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={PENT} v="ink" />
      <Shape ox={ROX} oy={OY} s={S} pts={PENT} v="faint" />
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}
function FigMirror() {
  const triL = [[0, 0], [2, 1], [0, 3]];
  const triR = [[3, 0], [1, 1], [3, 3]]; // v 反転 (c→3-c)
  return (
    <svg viewBox={VB2} role="img" aria-label="鏡の設問サンプル">
      <TL x={LCX} t="みほん" /><TL x={RCX} t="かいとう" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={triL} v="ink" />
      <Shape ox={ROX} oy={OY} s={S} pts={triR} v="faint" />
      {/* 鏡面＝ペイン間の点線一本（実物準拠・ペイン内に軸は描かない） */}
      <line x1={MIDX} y1={OY - 6} x2={MIDX} y2={OY + 3 * S + 6} stroke={AXIS} strokeWidth={1.2} strokeDasharray="3 3" />
    </svg>
  );
}
function FigRotate() {
  const triA = [[0, 0], [2, 0], [0, 2]];
  const triB = [[3, 0], [3, 2], [1, 0]]; // 90°CW (c,r)→(3-r,c)
  return (
    <svg viewBox={VB2} role="img" aria-label="回転の設問サンプル">
      <TL x={LCX} t="みほん" /><TL x={RCX} t="かいとう" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={triA} v="ink" />
      <Star x={LOX} y={OY} />
      <Shape ox={ROX} oy={OY} s={S} pts={triB} v="faint" />
      <Star x={ROX + 3 * S} y={OY} />
      <text x={MIDX} y={MIDY - 8} textAnchor="middle" fontSize="9.5" fill={MUTED}>90°</text>
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}
function FigFill() {
  // 左=完成図 F（実線）／右=欠け図（実線・右辺 (3,1)-(3,3) だけが欠ける＝そこを描く）
  const gap = [[3, 1], [1, 0], [0, 1], [0, 3], [3, 3]]; // 欠けを除いた実在の線（開・右辺が無い）
  return (
    <svg viewBox={VB2} role="img" aria-label="欠け補完の設問サンプル">
      <TL x={LCX} t="みほん" /><TL x={RCX} t="かいとう" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={PENT} v="ink" />
      <Shape ox={ROX} oy={OY} s={S} pts={gap} v="ink" closed={false} />
      {/* 欠けている部分（補う右辺 (3,1)-(3,3)）を点線で示す */}
      <Shape ox={ROX} oy={OY} s={S} pts={[[3, 1], [3, 3]]} v="faint" closed={false} />
      {/* 欠けの端点（ここをつなぐ） */}
      <circle cx={ROX + 3 * S} cy={OY + 1 * S} r={3} fill="none" stroke={TEAL} strokeWidth={1.5} />
      <circle cx={ROX + 3 * S} cy={OY + 3 * S} r={3} fill="none" stroke={TEAL} strokeWidth={1.5} />
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}

// 立体模写（solid）はメーカー非対応だが、商品カタログ（TOP/products）が共用するためここに置く。
export function FigSolid() {
  const front = [[0, 1], [2, 1], [2, 3], [0, 3]];
  const top = [[0, 1], [1, 0], [3, 0], [2, 1]];
  const side = [[2, 1], [3, 0], [3, 2], [2, 3]];
  const cube = (ox: number, v: V) => (
    <>
      <Shape ox={ox} oy={OY} s={S} pts={front} v={v} />
      <Shape ox={ox} oy={OY} s={S} pts={top} v={v} />
      <Shape ox={ox} oy={OY} s={S} pts={side} v={v} />
    </>
  );
  return (
    <svg viewBox={VB2} role="img" aria-label="立体模写の設問サンプル">
      <TL x={LCX} t="みほん" /><TL x={RCX} t="かいとう" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      {cube(LOX, "ink")}
      {cube(ROX, "faint")}
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}

/* =================== 3 ペイン: overlay / fold / decompose =================== */
function FigOverlay() {
  const A = SQ(0, 0, 2), B = SQ(1, 1, 2);
  return (
    <svg viewBox={VB3} role="img" aria-label="重ねの設問サンプル">
      <Grid ox={P1} oy={OY3} s={S3} /><Grid ox={P2} oy={OY3} s={S3} /><Grid ox={P3} oy={OY3} s={S3} />
      <Shape ox={P1} oy={OY3} s={S3} pts={A} v="ink" />
      <Shape ox={P2} oy={OY3} s={S3} pts={B} v="teal" />
      {/* こたえ＝A(墨)＋B(teal) を重ねる（重なり範囲の塗りつぶしは無し） */}
      <Shape ox={P3} oy={OY3} s={S3} pts={A} v="ink" />
      <Shape ox={P3} oy={OY3} s={S3} pts={B} v="teal" />
      <Op x={S1X} y={MIDY3} kind="plus" /><Op x={S2X} y={MIDY3} kind="eq" />
    </svg>
  );
}
function FigFold() {
  // 問題1=右に傾いた屋根／問題2=壁(四角)。折り返した屋根＋壁＝「家」になる分かりやすい例。
  const t1 = [[3, 1], [2, 0], [0, 1]];          // 問題1: 右に傾いた屋根（開）
  const t1m = [[0, 1], [1, 0], [3, 1]];         // 折り返し（v 反転）＝左に傾いた屋根
  const t2 = [[0, 1], [3, 1], [3, 3], [0, 3]];  // 問題2: 壁（四角・閉）
  return (
    <svg viewBox={VB3} role="img" aria-label="折り重ねの設問サンプル">
      <Grid ox={P1} oy={OY3} s={S3} /><Grid ox={P2} oy={OY3} s={S3} /><Grid ox={P3} oy={OY3} s={S3} />
      <Shape ox={P1} oy={OY3} s={S3} pts={t1} v="ink" closed={false} />
      <Shape ox={P2} oy={OY3} s={S3} pts={t2} v="ink" />
      {/* こたえ＝折り返した屋根(teal)＋壁(墨)＝家 */}
      <Shape ox={P3} oy={OY3} s={S3} pts={t1m} v="teal" closed={false} />
      <Shape ox={P3} oy={OY3} s={S3} pts={t2} v="ink" />
      {/* 折り目（綴じ目）＝問題1と問題2の境目に縦の点線。実物は「ペイン間の折り返し矢印」で折りを示す */}
      <line x1={S1X} y1={OY3 - 5} x2={S1X} y2={OY3 + 3 * S3 + 5} stroke={AXIS} strokeWidth={1.1} strokeDasharray="3 3" />
      {/* 折り記号（弧矢印）＋＝ */}
      <g fill="none" stroke={MUTED} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${S1X - 9} ${MIDY3 + 4} A 9 9 0 0 1 ${S1X + 9} ${MIDY3 + 4}`} />
        <path d={`M${S1X + 9} ${MIDY3 + 4} l -4 -3 m 4 3 l -1 5`} />
      </g>
      <Op x={S2X} y={MIDY3} kind="eq" />
    </svg>
  );
}
function FigDecompose() {
  const house = [[0, 3], [0, 1], [1, 0], [2, 1], [2, 3]]; // 正解の図 C（家・閉）
  const roof = [[0, 1], [1, 0], [2, 1]];                  // 引くもの B（屋根・開）
  const body = [[0, 1], [0, 3], [2, 3], [2, 1]];          // のこり C∖B（開）
  return (
    <svg viewBox={VB3} role="img" aria-label="分解の設問サンプル">
      <Grid ox={P1} oy={OY3} s={S3} /><Grid ox={P2} oy={OY3} s={S3} /><Grid ox={P3} oy={OY3} s={S3} />
      <Shape ox={P1} oy={OY3} s={S3} pts={house} v="ink" />
      {/* 引くもの: 屋根を実線（点線なし＝すっきり） */}
      <Shape ox={P2} oy={OY3} s={S3} pts={roof} v="ink" closed={false} />
      {/* のこり: 本体(墨)のみ */}
      <Shape ox={P3} oy={OY3} s={S3} pts={body} v="ink" closed={false} />
      <Op x={S1X} y={MIDY3} kind="minus" /><Op x={S2X} y={MIDY3} kind="eq" />
    </svg>
  );
}

/* =================== 2 ペイン＋★: scale / shrink / translate =================== */
function FigScale() {
  const small = SQ(1, 1, 1), big = SQ(1, 1, 2); // 起点(1,1) で ×2
  return (
    <svg viewBox={VB2} role="img" aria-label="拡大の設問サンプル">
      <TL x={LCX} t="もとの図" /><TL x={RCX} t="けっか" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={small} v="ink" />
      <Star x={LOX + 1 * S} y={OY + 1 * S} label="きてん" />
      <Shape ox={ROX} oy={OY} s={S} pts={big} v="faint" />
      <Star x={ROX + 1 * S} y={OY + 1 * S} />
      <text x={MIDX} y={MIDY - 8} textAnchor="middle" fontSize="12" fontWeight={700} fill={INK}>×2</text>
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}
function FigShrink() {
  const big = SQ(0, 0, 2), small = SQ(0, 0, 1); // 起点(0,0) で ×1/2
  return (
    <svg viewBox={VB2} role="img" aria-label="縮小の設問サンプル">
      <TL x={LCX} t="もとの図" /><TL x={RCX} t="けっか" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={big} v="ink" />
      <Star x={LOX} y={OY} label="きてん" />
      <Shape ox={ROX} oy={OY} s={S} pts={small} v="faint" />
      <Star x={ROX} y={OY} />
      {/* ×1/2（縦分数） */}
      <g fill={INK} textAnchor="middle">
        <text x={MIDX - 9} y={MIDY - 4} fontSize="12" fontWeight={700}>×</text>
        <text x={MIDX + 4} y={MIDY - 9} fontSize="9">1</text>
        <line x1={MIDX - 1} y1={MIDY - 6} x2={MIDX + 9} y2={MIDY - 6} stroke={INK} strokeWidth={1} />
        <text x={MIDX + 4} y={MIDY + 2} fontSize="9">2</text>
      </g>
      <Arrow x={MIDX} y={MIDY + 6} />
    </svg>
  );
}
function FigTranslate() {
  // 四角は移動が分かりにくいので、向きの読める非対称な L 字に。起点(0,0)→移動先(1,1)。
  const a = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 2]];
  const b = a.map(([c, r]) => [c + 1, r + 1]);
  return (
    <svg viewBox={VB2} role="img" aria-label="平行移動の設問サンプル">
      <TL x={LCX} t="もとの図" /><TL x={RCX} t="うつす先" />
      <Grid ox={LOX} oy={OY} s={S} /><Grid ox={ROX} oy={OY} s={S} />
      <Shape ox={LOX} oy={OY} s={S} pts={a} v="ink" />
      <Star x={LOX} y={OY} label="きてん" />
      <Shape ox={ROX} oy={OY} s={S} pts={b} v="faint" />
      <Target x={ROX + 1 * S} y={OY + 1 * S} label="ここへ" />
      <text x={MIDX} y={MIDY - 8} textAnchor="middle" fontSize="9.5" fill={MUTED}>ずらす</text>
      <Arrow x={MIDX} y={MIDY} />
    </svg>
  );
}

export const MAKER_FIG: Record<MakerKey, () => React.ReactElement> = {
  copy: FigCopy, mirror: FigMirror, rotate: FigRotate, fill: FigFill,
  overlay: FigOverlay, fold: FigFold, decompose: FigDecompose,
  scale: FigScale, shrink: FigShrink, translate: FigTranslate,
};
