"use client";

/* =========================================================================
   TOP「品ぞろえ」= Brilliant.org "From grade 5 to college and beyond" 型の
   インタラクティブ切替。上＝3つの力のピル／左＝その力のタスク一覧／
   右＝選んだタスクの SVG アニメ実演（墨＝印刷済みの線・teal＝子どもが
   描く線。点をつなぐ手つきどおり 1 本ずつ描き上げる・自動ループ）。
   実演の構図は products/maker-figs.tsx
   （実物紙面準拠の凡例）に合わせる:
     - copy/solid/fill/mirror/translate/rotate = 2 ペイン（みほん → かく）
     - overlay/decompose/fold                  = 3 ペイン（A ＋/− B ＝ かく）
   色は rev.5（墨＋単一 teal＋点格子）。タスク定義は catalog GROUPS を参照、
   実演の形は本ファイルの SPEC が単一ソース（装飾用の簡略図）。
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { GROUPS, catalogTaskBySlug, TOTAL_KINDS, TOTAL_VOL } from "./catalog";

const INK = "#1A1F2A";
const TEAL = "#2C6E7F";
const MUTED = "#767D89";
const AXIS = "#9AA0AA";

type Pt = [number, number];
type Poly = { pts: Pt[]; closed?: boolean };
type Sep = "arrow" | "mirror" | "rotate" | "shift" | "fold" | "plus" | "minus" | "eq";
type Pane = {
  statics?: Poly[]; // 墨＝印刷済みの線（お手本・欠け図・重ね相手）
  draws?: Poly[];   // teal＝描き上げアニメ（配列順に描く）
  star?: Pt;        // ★＝対応の起点マーカー（回転・移動）
  target?: Pt;      // ◎＝うつす先マーカー（移動）
  joins?: Pt[];     // ○＝つなぐ端点（欠け補完）
  label?: string;
};
type Spec = { g: number; s: number; panes: Pane[]; seps: Sep[] };

/* ---- 形の座標（c=列, r=行）と変換 ---- */
const flip = (g: number, p: Pt[]): Pt[] => p.map(([c, r]) => [g - 1 - c, r]);
const rotCW = (g: number, p: Pt[]): Pt[] => p.map(([c, r]) => [g - 1 - r, c]);
const shift = (p: Pt[], dc: number, dr: number): Pt[] => p.map(([c, r]) => [c + dc, r + dr]);

/* 5×5（2 ペイン系）: ヨット・はこ・リボン・旗・かいだん・三角 */
const MAST: Pt[] = [[2, 0], [2, 3]];
const SAIL: Pt[] = [[2, 0], [4, 2], [2, 2]];
const HULL: Pt[] = [[0, 3], [4, 3], [3, 4], [1, 4]];
const BOX_F: Pt[] = [[0, 1], [2, 1], [2, 4], [0, 4]];
const BOX_T: Pt[] = [[0, 1], [1, 0], [3, 0], [2, 1]];
const BOX_S: Pt[] = [[2, 1], [3, 0], [3, 3], [2, 4]];
const RIB_L: Pt[] = [[0, 0], [2, 2], [0, 4]];
const RIB_R: Pt[] = [[4, 0], [4, 4], [2, 2]];
const RIB_GAP: Pt[] = [[2, 2], [4, 4], [4, 0]]; // 右上の辺 (4,0)-(2,2) だけが欠けた状態
const POLE: Pt[] = [[1, 0], [1, 4]];
const FLAG: Pt[] = [[1, 0], [3, 2], [1, 2]];
const STAIR: Pt[] = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [0, 3]];
const TRI: Pt[] = [[0, 0], [3, 0], [0, 3]];
/* 4×4（3 ペイン系・maker-figs と同型）: 重ね・いえ−やね・おりたたむと家 */
const OV_A: Pt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
const OV_B: Pt[] = [[1, 1], [3, 1], [1, 3]];
const HOUSE: Pt[] = [[0, 1], [1, 0], [2, 0], [3, 1], [3, 3], [0, 3]];
const ROOF: Pt[] = [[0, 1], [1, 0], [2, 0], [3, 1]];
const WALL: Pt[] = [[3, 1], [3, 3], [0, 3], [0, 1]];
const SLANT: Pt[] = [[3, 1], [2, 0], [0, 1]]; // 右に傾いた屋根（折り返す前）
const F_WALL: Pt[] = [[0, 1], [3, 1], [3, 3], [0, 3]];

/* タスク slug → 実演スペック */
const SPEC: Record<string, Spec> = {
  copy: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: MAST, closed: false }, { pts: SAIL }, { pts: HULL }], label: "みほん" },
      { draws: [{ pts: MAST, closed: false }, { pts: SAIL }, { pts: HULL }], label: "かく" },
    ],
    seps: ["arrow"],
  },
  solid: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: BOX_F }, { pts: BOX_T }, { pts: BOX_S }], label: "みほん" },
      { draws: [{ pts: BOX_F }, { pts: BOX_T }, { pts: BOX_S }], label: "かく" },
    ],
    seps: ["arrow"],
  },
  fill: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: RIB_L }, { pts: RIB_R }], label: "みほん" },
      {
        statics: [{ pts: RIB_L }, { pts: RIB_GAP, closed: false }],
        draws: [{ pts: [[4, 0], [2, 2]], closed: false }],
        joins: [[4, 0], [2, 2]],
        label: "かく",
      },
    ],
    seps: ["arrow"],
  },
  mirror: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: POLE, closed: false }, { pts: FLAG }], label: "みほん" },
      { draws: [{ pts: flip(5, POLE), closed: false }, { pts: flip(5, FLAG) }], label: "かく" },
    ],
    seps: ["mirror"],
  },
  translate: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: STAIR }], star: [0, 0], label: "みほん" },
      { draws: [{ pts: shift(STAIR, 1, 1) }], target: [1, 1], label: "かく" },
    ],
    seps: ["shift"],
  },
  rotate: {
    g: 5, s: 32,
    panes: [
      { statics: [{ pts: TRI }], star: [0, 0], label: "みほん" },
      { draws: [{ pts: rotCW(5, TRI) }], star: [4, 0], label: "かく" },
    ],
    seps: ["rotate"],
  },
  overlay: {
    g: 4, s: 24,
    panes: [
      { statics: [{ pts: OV_A }] },
      { statics: [{ pts: OV_B }] },
      { draws: [{ pts: OV_A }, { pts: OV_B }], label: "かく" },
    ],
    seps: ["plus", "eq"],
  },
  decompose: {
    g: 4, s: 24,
    panes: [
      { statics: [{ pts: HOUSE }] },
      { statics: [{ pts: ROOF, closed: false }] },
      { draws: [{ pts: WALL, closed: false }], label: "かく" },
    ],
    seps: ["minus", "eq"],
  },
  fold: {
    g: 4, s: 24,
    panes: [
      { statics: [{ pts: SLANT, closed: false }] },
      { statics: [{ pts: F_WALL }] },
      { statics: [{ pts: F_WALL }], draws: [{ pts: flip(4, SLANT), closed: false }], label: "かく" },
    ],
    seps: ["fold", "eq"],
  },
};

/* ---- 描画（各ペインの原点ローカル座標。格子点 = (c*s, r*s)） ---- */
function DotGrid({ g, s }: { g: number; s: number }) {
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < g; r++)
    for (let c = 0; c < g; c++)
      dots.push(<circle key={`${r}-${c}`} cx={c * s} cy={r * s} r={1.6} fill={INK} opacity={0.16} />);
  return <>{dots}</>;
}

const polyD = (pts: Pt[], s: number, closed: boolean) =>
  "M" + pts.map(([c, r]) => `${c * s} ${r * s}`).join(" L") + (closed ? " Z" : "");

function StaticPoly({ poly, s }: { poly: Poly; s: number }) {
  return (
    <path d={polyD(poly.pts, s, poly.closed !== false)} fill="none" stroke={INK}
      strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
  );
}

/* かく側は Poly を線分（点から点への 1 本）に分解し、1 path = 1 本で描く。
   閉ポリゴンは末尾に閉じ辺を足す。順序＝ pts 順（＝子どもが描く順）。 */
const toSegs = (polys: Poly[]): [Pt, Pt][] => {
  const segs: [Pt, Pt][] = [];
  for (const { pts, closed } of polys) {
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
    if (closed !== false) segs.push([pts[pts.length - 1], pts[0]]);
  }
  return segs;
};

/* 1 本ずつのタイミング（秒）: 前の線を引き終えてから次の線へ（重ねない）。
   ループ周期 T は線分数から算出＝線が多い形ほどゆっくり全体を描く。 */
const SEG_LEAD = 0.35;  // 最初の線までの間
const SEG_DRAW = 0.55;  // 1 本を引く時間
const SEG_STEP = 0.7;   // 線の引き始めの間隔（DRAW + 小休止）
const SEG_HOLD = 2.4;   // 完成形を見せる時間
const SEG_FADE = 0.6;   // ふわっと消える時間

/* ★（起点）・◎（うつす先）マーカー。maker-figs と同意匠。 */
function starPts(x: number, y: number, r: number) {
  const a: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    a.push(`${(x + rr * Math.cos(ang)).toFixed(1)},${(y + rr * Math.sin(ang)).toFixed(1)}`);
  }
  return a.join(" ");
}
function Star({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={9} fill={TEAL} opacity={0.12} />
      <polygon points={starPts(x, y, 6)} fill={TEAL} />
    </>
  );
}
function Target({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={8} fill={TEAL} opacity={0.1} />
      <circle cx={x} cy={y} r={5} fill="none" stroke={TEAL} strokeWidth={2} />
      <circle cx={x} cy={y} r={1.6} fill={TEAL} />
    </>
  );
}

/* ペイン間の記号（→・鏡の線・90°回転・ずらす・折り返し・＋−＝） */
function SepMark({ sep, x, y, y0, W }: { sep: Sep; x: number; y: number; y0: number; W: number }) {
  if (sep === "arrow")
    return (
      <g stroke={MUTED} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.55}>
        <path d={`M${x - 11} ${y} H${x + 11}`} />
        <path d={`M${x + 5} ${y - 6} L${x + 11} ${y} L${x + 5} ${y + 6}`} />
      </g>
    );
  if (sep === "mirror")
    return (
      <line x1={x} y1={y0 - 8} x2={x} y2={y0 + W + 8} stroke={AXIS} strokeWidth={1.6}
        strokeDasharray="5 5" strokeLinecap="round" />
    );
  if (sep === "rotate")
    return (
      <g>
        <text x={x} y={y - 18} textAnchor="middle" fontSize={11} fill={MUTED}>90°</text>
        <g transform={`translate(${x},${y + 4})`} stroke={MUTED} fill="none" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M-10 -3 A 10 10 0 1 1 -3 10" />
          <path d="M-7 8 L-3 10 L-1 6" />
        </g>
      </g>
    );
  if (sep === "shift")
    return (
      <g>
        <text x={x} y={y - 16} textAnchor="middle" fontSize={11} fill={MUTED}>ずらす</text>
        <g transform={`translate(${x},${y + 6}) rotate(45)`} stroke={MUTED} strokeWidth={2} fill="none"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M-10 0 H10" />
          <path d="M4 -6 L10 0 L4 6" />
        </g>
      </g>
    );
  if (sep === "fold")
    return (
      <g>
        <line x1={x} y1={y0 - 6} x2={x} y2={y0 + W + 6} stroke={AXIS} strokeWidth={1.2}
          strokeDasharray="4 4" strokeLinecap="round" />
        <g fill="none" stroke={MUTED} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${x - 9} ${y + 4} A 9 9 0 0 1 ${x + 9} ${y + 4}`} />
          <path d={`M${x + 9} ${y + 4} l -4 -3 m 4 3 l -1 5`} />
        </g>
      </g>
    );
  const s7 = 7;
  const d = sep === "plus" ? `M${x - s7} ${y} H${x + s7} M${x} ${y - s7} V${y + s7}`
    : sep === "minus" ? `M${x - s7} ${y} H${x + s7}`
      : `M${x - s7} ${y - 3.5} H${x + s7} M${x - s7} ${y + 3.5} H${x + s7}`;
  return <path d={d} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
}

const VB_W = 340;
const VB_H = 172;
const MX = 16;

function TaskDemo({ slug }: { slug: string }) {
  const spec = SPEC[slug] ?? SPEC.copy;
  const svgRef = useRef<SVGSVGElement>(null);

  /* 線分ごとの描き上げ→保持→消去ループ。keyframe の % が線分ごとに違う
     （周期 T は共通・開始時刻だけずれる）ため CSS でなく WAAPI で駆動する。 */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const segs = svg.querySelectorAll<SVGPathElement>(".cs-seg");
    if (!segs.length) return;
    const T = SEG_LEAD + (segs.length - 1) * SEG_STEP + SEG_DRAW + SEG_HOLD + SEG_FADE;
    const anims = [...segs].map((p, i) => {
      const t0 = (SEG_LEAD + i * SEG_STEP) / T;
      const t1 = (SEG_LEAD + i * SEG_STEP + SEG_DRAW) / T;
      return p.animate(
        [
          { strokeDashoffset: "101", opacity: 1, offset: 0 },
          { strokeDashoffset: "101", opacity: 1, offset: t0 },
          { strokeDashoffset: "0", opacity: 1, offset: t1 },
          { strokeDashoffset: "0", opacity: 1, offset: (T - SEG_FADE) / T },
          { strokeDashoffset: "0", opacity: 0, offset: 1 },
        ],
        { duration: T * 1000, iterations: Infinity },
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [slug]);

  const W = (spec.g - 1) * spec.s;
  const n = spec.panes.length;
  const gap = (VB_W - 2 * MX - n * W) / (n - 1);
  const y0 = n === 2 ? 16 : 40;
  return (
    <svg key={slug} ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="cstudio-svg" role="img"
      aria-label="お手本の形を、点格子に 1 本ずつ描き上げる実演アニメーション">
      {spec.panes.map((pane, pi) => (
        <g key={pi} transform={`translate(${MX + pi * (W + gap)},${y0})`}>
          <DotGrid g={spec.g} s={spec.s} />
          {pane.statics?.map((p, i) => <StaticPoly key={`s${i}`} poly={p} s={spec.s} />)}
          {pane.draws && toSegs(pane.draws).map(([a, b], i) => (
            <path key={`d${i}`} className="cs-seg"
              d={`M${a[0] * spec.s} ${a[1] * spec.s} L${b[0] * spec.s} ${b[1] * spec.s}`}
              pathLength={100} fill="none" stroke={TEAL} strokeWidth={2.6}
              strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {pane.joins?.map(([c, r], i) => (
            <circle key={`j${i}`} cx={c * spec.s} cy={r * spec.s} r={3.2}
              fill="none" stroke={TEAL} strokeWidth={1.6} />
          ))}
          {pane.star && <Star x={pane.star[0] * spec.s} y={pane.star[1] * spec.s} />}
          {pane.target && <Target x={pane.target[0] * spec.s} y={pane.target[1] * spec.s} />}
          {pane.label && (
            <text x={W / 2} y={W + 22} textAnchor="middle" fontSize={11} fill={MUTED}>{pane.label}</text>
          )}
        </g>
      ))}
      {spec.seps.map((sep, si) => (
        <SepMark key={si} sep={sep} x={MX + (si + 1) * (W + gap) - gap / 2} y={y0 + W / 2} y0={y0} W={W} />
      ))}
    </svg>
  );
}

/* Lv チップ（歯抜け＝薄グレー・実在＝teal）。notes[i] を title に。 */
function LevelChips({ slug }: { slug: string }) {
  const found = catalogTaskBySlug(slug);
  if (!found) return null;
  const { task } = found;
  return (
    <div className="cstudio-lv" aria-label="収録レベル">
      {task.lv.map((n, i) => (
        <span key={i} className={`cstudio-lvchip${n > 0 ? " on" : ""}`}
          title={task.notes[i] || "（この巻はまだありません）"}>
          Lv.{i + 1}
        </span>
      ))}
    </div>
  );
}

export default function CoverageStudio() {
  const [gi, setGi] = useState(0);
  const group = GROUPS[gi];
  const [slug, setSlug] = useState(group.tasks[0].slug);
  const found = catalogTaskBySlug(slug);
  const task = found?.task ?? group.tasks[0];

  const pickForce = (i: number) => {
    setGi(i);
    setSlug(GROUPS[i].tasks[0].slug);
  };

  return (
    <section className="tr-sec">
      <div className="wrap">
        <div className="tr-sec-head cstudio-head">
          <p className="tr-sec-kicker">品ぞろえ</p>
          {/* 数字は SSOT 由来（page.tsx の方針どおりハードコード禁止）。表示は従来と同一。 */}
          <h2>{TOTAL_KINDS} 種類それぞれの中身を、ここで実演します。</h2>
          <p className="cstudio-lead">
            よくある点描写は、写すだけ。でも図形の土台は、回す・重ねる・立体に起こす……と、もっと広い。
            3 つの力を選んで、それぞれの形が「どう変わるか」を見てみて。
          </p>
        </div>

        {/* 3つの力＝ピル */}
        <div className="cstudio-pills" role="tablist" aria-label="3つの力">
          {GROUPS.map((g, i) => (
            <button key={g.label} type="button" role="tab" aria-selected={i === gi}
              className={`cstudio-pill${i === gi ? " on" : ""}`} onClick={() => pickForce(i)}>
              {g.label}
            </button>
          ))}
        </div>

        {/* 左＝タスク一覧／右＝実演 */}
        <div className="cstudio-card">
          <div className="cstudio-list">
            <p className="cstudio-list-cap">{group.sub}</p>
            {group.tasks.map((t) => (
              <button key={t.slug} type="button"
                className={`cstudio-taskbtn${t.slug === slug ? " on" : ""}`}
                aria-current={t.slug === slug} onClick={() => setSlug(t.slug)}>
                <span className="cstudio-taskname">{t.name}</span>
                <span className="cstudio-taskdesc">{t.desc}</span>
              </button>
            ))}
          </div>

          <div className="cstudio-stage">
            <TaskDemo slug={slug} />
            <div className="cstudio-meta">
              <h3>{task.name}</h3>
              <p>{task.desc}</p>
              <LevelChips slug={slug} />
              <a className="cstudio-golink" href={`/products/${slug}`}>この形の棚を見る →</a>
            </div>
          </div>
        </div>

        <div className="cstudio-foot">
          <a className="tr-btn-ghost" href="/products">
            商品一覧（{TOTAL_KINDS} 種類 ・ 計 {TOTAL_VOL} 巻）へ →
          </a>
        </div>
      </div>
    </section>
  );
}
