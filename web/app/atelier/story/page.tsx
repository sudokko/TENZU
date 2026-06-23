/* =========================================================================
   物語アーク模写プロトタイプ（dev 限定 / 本番 404）
   ideas/2026-06-15-story-arc-tenzu-line.md の構想を画面で確かめる叩き台。
   3 題材 × 7 フレーム（Lv.2 Vol.1 → Lv.5 Vol.1）を陳列する。
   採用・publish フローは持たない（本プロトは見るだけ）。
   ========================================================================= */
import { notFound } from "next/navigation";
import { STORY_ARCS, type StoryFrame } from "./data";
import type { EdgeT } from "../../products/problems/schema";
import "./story.css";

export const metadata = { title: "atelier — 物語アーク試作（dev）", robots: { index: false } };

const INK = "#3A424E";

function FrameSvg({ frame, size = 188 }: { frame: StoryFrame; size?: number }) {
  const { n, edges } = frame;
  const pos = (i: number) => 10 + (80 * i) / Math.max(1, n - 1);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="story-thumb" aria-hidden>
      <rect x={0} y={0} width={100} height={100} fill="#FFFFFF" />
      {Array.from({ length: n * n }, (_, i) => (
        <circle key={i} cx={pos(i % n)} cy={pos(Math.floor(i / n))} r={1.6} fill={INK} />
      ))}
      {edges.map((e: EdgeT, i: number) => (
        <line key={i}
          x1={pos(e[0][0])} y1={pos(e[0][1])} x2={pos(e[1][0])} y2={pos(e[1][1])}
          stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function StoryArcPrototype() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="story-wrap">
      <header className="story-head">
        <h1>物語アーク模写・試作（dev）</h1>
        <p>
          3 題材 × 7 フレーム（Lv.2 Vol.1 → Lv.5 Vol.1）。
          物語の文脈をかぶせながら、グリッドと斜めの解禁は pack-design §12.2 模写ラダーに沿わせている。
        </p>
        <p className="story-note">
          ※ 本プロトは画面で見るだけ。採用・publish・PDF化は持たない。
          フレームごとの「線数 / 構成」のメタは目視確認用。
        </p>
      </header>

      {STORY_ARCS.map((arc) => (
        <section key={arc.key} className="story-arc">
          <header className="story-arc-head">
            <h2>{arc.title}</h2>
            <p className="story-arc-log">{arc.arc}</p>
          </header>

          <ol className="story-rail">
            {arc.frames.map((f, i) => (
              <li key={i} className="story-cell">
                <div className="story-thumb-wrap">
                  <FrameSvg frame={f} />
                </div>
                <div className="story-meta">
                  <span className="story-step">{f.step}</span>
                  <span className="story-rung">{f.rung}</span>
                  <span className="story-caption">{f.caption}</span>
                  <span className="story-stats">線 {f.edges.length}本</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
