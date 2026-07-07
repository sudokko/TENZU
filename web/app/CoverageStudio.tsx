"use client";

/* =========================================================================
   TOP「品ぞろえ」= Brilliant.org "From grade 5 to college and beyond" 型の
   インタラクティブ切替。上＝3つの力のピル／左＝その力のタスク一覧／
   右＝選んだタスクの SVG アニメ実演（お手本 → こたえ を描き上げる・自動ループ）。
   色は rev.5（墨＋単一 teal＋点格子）。タスク定義は catalog GROUPS を参照、
   実演の形は本ファイルの SPEC が単一ソース（装飾用の簡略図）。
   ========================================================================= */

import { useState } from "react";
import { GROUPS, catalogTaskBySlug, TOTAL_KINDS, TOTAL_VOL } from "./catalog";

const INK = "#1A1F2A";
const TEAL = "#2C6E7F";
const MUTED = "#767D89";
const AXIS = "#9AA0AA";

/* 5×5 点格子。sc(n) で座標化（左パネル原点／右パネルは translate で複製）。 */
const G = 5;
const S = 32;
const X0 = 16;
const sc = (n: number) => X0 + n * S; // 16,48,80,112,144
const RDX = 180; // 右（こたえ）パネルの横オフセット

type Pt = [number, number];
type Poly = { pts: Pt[]; closed?: boolean };
type Guide = "mirror" | "rotate" | "translate" | "fold";
type Spec = { model: Poly[]; answer: Poly[]; guide?: Guide };

const BASE: Pt[] = [[1, 0], [2, 0], [2, 3], [4, 3], [4, 4], [1, 4]];
const mir = (p: Pt[]): Pt[] => p.map(([c, r]) => [4 - c, r]);
const rot = (p: Pt[]): Pt[] => p.map(([c, r]) => [4 - r, c]);
const shift = (p: Pt[], dc: number, dr: number): Pt[] => p.map(([c, r]) => [c + dc, r + dr]);

const SQ: Pt[] = [[0, 1], [2, 1], [2, 3], [0, 3]];
const TRI: Pt[] = [[1, 0], [3, 2], [1, 2]];
const FP: Pt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
const CUBE_F: Pt[] = [[0, 1], [2, 1], [2, 3], [0, 3]];
const CUBE_T: Pt[] = [[0, 1], [1, 0], [3, 0], [2, 1]];
const CUBE_S: Pt[] = [[2, 1], [3, 0], [3, 2], [2, 3]];

/* タスク slug → 実演スペック（お手本 model／こたえ answer）。 */
const SPEC: Record<string, Spec> = {
  copy: { model: [{ pts: BASE }], answer: [{ pts: BASE }] },
  solid: { model: [{ pts: CUBE_F }], answer: [{ pts: CUBE_F }, { pts: CUBE_T }, { pts: CUBE_S }] },
  fill: {
    model: [{ pts: BASE, closed: false }],
    answer: [{ pts: [[1, 4], [1, 0]], closed: false }],
  },
  mirror: { model: [{ pts: BASE }], answer: [{ pts: mir(BASE) }], guide: "mirror" },
  translate: { model: [{ pts: SQ }], answer: [{ pts: shift(SQ, 1, -1) }], guide: "translate" },
  rotate: { model: [{ pts: BASE }], answer: [{ pts: rot(BASE) }], guide: "rotate" },
  overlay: { model: [{ pts: SQ }, { pts: TRI }], answer: [{ pts: SQ }, { pts: TRI }] },
  decompose: { model: [{ pts: SQ }, { pts: TRI }], answer: [{ pts: TRI }] },
  fold: { model: [{ pts: FP }], answer: [{ pts: FP }, { pts: mir(FP) }], guide: "fold" },
};

function DotGrid() {
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < G; r++)
    for (let c = 0; c < G; c++)
      dots.push(<circle key={`${r}-${c}`} cx={sc(c)} cy={sc(r)} r={1.6} fill={INK} opacity={0.16} />);
  return <>{dots}</>;
}

const polyD = (pts: Pt[], closed = true) =>
  "M" + pts.map(([c, r]) => `${sc(c)} ${sc(r)}`).join(" L") + (closed ? " Z" : "");

/* こたえ側の 1 図形＝描き上げ→保持→消去を無限ループ（i でずらして順に描く）。 */
function DrawPoly({ pts, closed = true, i }: { pts: Pt[]; closed?: boolean; i: number }) {
  const begin = `${(i * 0.5).toFixed(2)}s`;
  return (
    <path d={polyD(pts, closed)} pathLength={100} fill="none" stroke={TEAL}
      strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round"
      strokeDasharray={100} strokeDashoffset={100}>
      <animate attributeName="stroke-dashoffset" values="100;100;0;0;100"
        keyTimes="0;0.06;0.42;0.86;1" dur="4.6s" begin={begin} repeatCount="indefinite" calcMode="linear" />
    </path>
  );
}

function Guides({ guide }: { guide?: Guide }) {
  if (guide === "mirror")
    return <line x1={168} y1={8} x2={168} y2={152} stroke={AXIS} strokeWidth={1.6}
      strokeDasharray="5 5" strokeLinecap="round" />;
  if (guide === "fold")
    return <line x1={sc(2)} y1={8} x2={sc(2)} y2={152} stroke={AXIS} strokeWidth={1.6}
      strokeDasharray="5 5" strokeLinecap="round" />;
  if (guide === "rotate")
    return (
      <g transform={`translate(${RDX + sc(2)},${sc(2)})`} stroke={TEAL} fill="none" strokeWidth={2} strokeLinecap="round">
        <path d="M-14 -4 A 14 14 0 1 1 -4 14" opacity={0.6} />
        <path d="M-8 12 L-4 14 L-2 10" opacity={0.6} />
      </g>
    );
  return null;
}

function TaskDemo({ slug }: { slug: string }) {
  const spec = SPEC[slug] ?? SPEC.copy;
  return (
    <svg key={slug} viewBox="0 0 340 172" className="cstudio-svg" role="img"
      aria-label="お手本の形を、となりの点格子に描き上げる実演アニメーション">
      <DotGrid />
      <g transform={`translate(${RDX},0)`}><DotGrid /></g>
      <Guides guide={spec.guide} />
      {/* お手本（墨・静的） */}
      {spec.model.map((p, i) => (
        <path key={`m${i}`} d={polyD(p.pts, p.closed)} fill="none" stroke={INK}
          strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      ))}
      {/* 誘導矢印 */}
      <g stroke={MUTED} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.55}>
        <path d="M150 80 H172" />
        <path d="M166 74 L172 80 L166 86" />
      </g>
      {/* こたえ（teal・描き上げアニメ） */}
      <g transform={`translate(${RDX},0)`}>
        {spec.answer.map((p, i) => (
          <DrawPoly key={`a${i}`} pts={p.pts} closed={p.closed} i={i} />
        ))}
      </g>
      <text x={sc(2)} y={166} textAnchor="middle" fontSize={11} fill={MUTED}>みほん</text>
      <text x={RDX + sc(2)} y={166} textAnchor="middle" fontSize={11} fill={MUTED}>かく</text>
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
          <h2>点描写を、3 つの力 × 5 レベルで。</h2>
          <p className="cstudio-lead">
            よくある点描写は、写すだけ。でも図形の土台は、回す・重ねる・立体に起こす……と、もっと広い。
            力を選んで、それぞれの形が「どう変わるか」を見てみて。
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
