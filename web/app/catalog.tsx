/* =========================================================================
   共有カタログモジュール（表示コピー・Fig・帯グラフの単一ソース）
   `/`（page.tsx）・`/products`（商品一覧ハブ）・`/level-guide` が共用。
   巻数（lv 配列）は products/data.ts（Vol レベル SSOT）から lvCounts() で導出
   ＝数値の二重定義なし。出典: pack-design §0.2/§11.6/§12-22/§13.7。
   ========================================================================= */

import { lvCounts, firstVol, taskBySlug, volHref, LEVEL_NAMES, LEVEL_AGES } from "./products/data";
import { isLaunchHidden } from "./products/capabilities";
import { MAKER_FIG, FigSolid } from "./products/maker-figs";

/* 設問サンプル図は maker-figs.tsx を SSOT として共用（メーカー一覧と完全同一の凡例）。
   solid のみメーカー非対応のため maker-figs 側の FigSolid を流用する。 */
const TEAL = "#2C6E7F";

/* slug = products/data.ts のタスク slug（突合キー・/products/{slug} へ配線）
   lv = Lv.1〜5 の各 Vol 数（0＝歯抜け）。data.ts の lvCounts() から導出（手書き禁止）
   notes = 同 index のレベル内容解説（歯抜けは ""）。詳細アコーディオンで表示。出典 pack-tasks §15-22 / §12.2 */
export type Task = { slug: string; name: string; desc: string; lv: number[]; notes: string[]; Fig: () => React.ReactElement };
export type Group = { label: string; sub: string; tasks: Task[] };

/* 全タスク定義（translate/scale/shrink の定義も温存）。公開は LAUNCH_HIDDEN を除いた GROUPS。 */
const ALL_GROUPS: Group[] = [
  {
    label: "見て写す",
    sub: "形をそのまま読み取る、いちばんの基礎。立体に起こすところまで。",
    tasks: [
      {
        slug: "copy", name: "模写", desc: "見本のとおりに、点をつないで写す。", lv: lvCounts("copy"), Fig: MAKER_FIG.copy,
        notes: [
          "3×3・まっすぐの線だけ",
          "ななめ（45°）が登場。3×3〜4×4",
          "線が増えて交差も。4×4〜5×5",
          "45°以外の角度へ。5×5〜6×6",
          "最大7×7で総仕上げ",
        ],
      },
      {
        slug: "solid", name: "模写（立体）", desc: "平面の点から、立体を起こして写す。", lv: lvCounts("solid"), Fig: FigSolid,
        notes: [
          "", "",
          "立方体を組んだ形・少数ブロック",
          "階段・テラス→三角柱・四角錐",
          "橋・中庭・トンネルの抜け構造",
        ],
      },
      {
        slug: "fill", name: "欠け補完", desc: "足りない辺を補って、形を閉じる。", lv: lvCounts("fill"), Fig: MAKER_FIG.fill,
        notes: [
          "3×3・足りない線を描き足す",
          "ななめ線入りの欠け。3×3",
          "4×4・欠け少なめ→多めで推測",
          "5×5・広い盤面の欠け補完",
          "6×6・最大盤面の欠け補完",
        ],
      },
    ],
  },
  {
    label: "かたちを動かす",
    sub: "向きや位置を変えて、頭の中で形をとらえる力。鏡・平行移動・回転。",
    tasks: [
      {
        slug: "mirror", name: "鏡", desc: "鏡の反対側に映る形を描く。", lv: lvCounts("mirror"), Fig: MAKER_FIG.mirror,
        notes: [
          "",
          "縦軸（左右の鏡うつし）。3×3",
          "縦軸＋交差。4×4",
          "横軸（上下反転）が登場",
          "斜め軸（ななめの鏡）へ",
        ],
      },
      {
        slug: "translate", name: "平行移動", desc: "形を変えずに、ずらして写す。", lv: lvCounts("translate"), Fig: MAKER_FIG.translate,
        notes: [
          "",
          "横→縦にずらす。3×3",
          "斜めにずらす。4×4",
          "複合移動（右2・下1など）",
          "",
        ],
      },
      {
        slug: "rotate", name: "回転", desc: "回しても同じ形だととらえる。", lv: lvCounts("rotate"), Fig: MAKER_FIG.rotate,
        notes: [
          "",
          "90°右回り。3×3",
          "90°右＋左回り。4×4",
          "180°（さかさま）が登場",
          "",
        ],
      },
      {
        slug: "scale", name: "拡大", desc: "比をそろえて、大きく写す。", lv: lvCounts("scale"), Fig: MAKER_FIG.scale,
        notes: [
          "", "", "",
          "2倍に拡大（3×3→5×5）",
          "",
        ],
      },
      {
        slug: "shrink", name: "縮小", desc: "比をそろえて、小さく写す。", lv: lvCounts("shrink"), Fig: MAKER_FIG.shrink,
        notes: [
          "", "", "", "",
          "1/2に縮小（5×5→3×3）",
        ],
      },
    ],
  },
  {
    label: "重ねる・分ける",
    sub: "複数の形を組み立てたり、分けたりして読みとく力。",
    tasks: [
      {
        slug: "overlay", name: "かさね", desc: "2 つの形を重ねたところを描く。", lv: lvCounts("overlay"), Fig: MAKER_FIG.overlay,
        notes: [
          "",
          "2つの形を重ねる。3×3",
          "交差＋線の密度。4×4",
          "角度いろいろ。5×5",
          "大盤面で重ねる。6×6",
        ],
      },
      {
        slug: "decompose", name: "分解", desc: "1 つの形を、パーツに分ける。", lv: lvCounts("decompose"), Fig: MAKER_FIG.decompose,
        notes: [
          "",
          "重なりから1つ取り出す。3×3",
          "引き算思考を育てる。4×4",
          "密な重なりを抜き出す。5×5",
          "最大盤面の分解。6×6",
        ],
      },
      {
        slug: "fold", name: "折り重ね", desc: "形を折り返して、重ねたところを描く。", lv: lvCounts("fold"), Fig: MAKER_FIG.fold,
        notes: [
          "",
          "折り返して重ねる。3×3",
          "交差＋線の密度。4×4",
          "角度いろいろ。5×5",
          "大盤面で折り重ねる。6×6",
        ],
      },
    ],
  },
];

/* 公開カタログ＝LAUNCH_HIDDEN（scale/shrink）を除いた集合。
   TOTAL_KINDS/TOTAL_VOL・TOP/一覧の表示はすべてこの GROUPS から導出（件数の二重定義なし）。 */
export const GROUPS: Group[] = ALL_GROUPS.map((g) => ({
  ...g,
  tasks: g.tasks.filter((t) => !isLaunchHidden(t.slug)),
}));

export const LEVELS = LEVEL_NAMES;

/* レベル＝発達段階インデックス。年齢はめやす（§12.7 基準尺）。 */
const LEVEL_GRAPH = [
  { name: "発展編", from: 8, to: 10, label: LEVEL_AGES[4] },
  { name: "応用編", from: 6, to: 9, label: LEVEL_AGES[3] },
  { name: "基礎編", from: 5, to: 8, label: LEVEL_AGES[2] },
  { name: "入門編", from: 4, to: 7, label: LEVEL_AGES[1] },
  { name: "はじめの一歩", from: 4, to: 6, label: LEVEL_AGES[0] },
];
const AGE_MIN = 4, AGE_MAX = 10, GX0 = 130, GX1 = 504, NAMEX = 118;
const gxa = (a: number) => GX0 + ((a - AGE_MIN) / (AGE_MAX - AGE_MIN)) * (GX1 - GX0);

const ACCENT_INK = "#1F5260";

export function LevelGraph({ highlight }: { highlight?: string } = {}) {
  return (
    <svg className="lvgraph" viewBox="0 0 528 278" role="img"
      aria-label="レベル 5 段階と対象年齢のめやす（年齢の帯グラフ）">
      {[5, 6, 7, 8, 9].map((a) => (
        <line key={a} x1={gxa(a)} y1={14} x2={gxa(a)} y2={240}
          stroke="#E6E3DB" strokeWidth={1} strokeDasharray="2 4" />
      ))}
      <line x1={GX0} y1={240} x2={GX1} y2={240} stroke="#C9CDD3" strokeWidth={1} />
      {LEVEL_GRAPH.map((l, i) => {
        const cy = 30 + i * 46;
        const x = gxa(l.from);
        const w = gxa(l.to) - x;
        const isHi = highlight === l.name;
        const baseOp = 1 - i * 0.055;
        const fillOp = highlight ? (isHi ? 1 : baseOp * 0.32) : baseOp;
        return (
          <g key={l.name}>
            <text x={NAMEX} y={cy + 6} textAnchor="end" className="lvg-name"
              fontWeight={isHi ? 700 : undefined} fill={isHi ? ACCENT_INK : undefined}>{l.name}</text>
            <rect x={x} y={cy - 15} width={w} height={30} rx={7} fill={TEAL} fillOpacity={fillOp}
              stroke={isHi ? ACCENT_INK : "none"} strokeWidth={isHi ? 2 : 0} />
            {isHi && <text x={x - 6} y={cy + 6} textAnchor="end" className="lvg-age"
              fill={ACCENT_INK} fontSize={16}>▶</text>}
            <text x={x + 13} y={cy + 6} className="lvg-age">{l.label}</text>
          </g>
        );
      })}
      {[4, 5, 6, 7, 8, 9, 10].map((a) => (
        <text key={a} x={gxa(a)} y={259} textAnchor="middle" className="lvg-tick">{a}</text>
      ))}
      <text x={GX0} y={273} textAnchor="start" className="lvg-axis">← 対象年齢のめやす（才）</text>
    </svg>
  );
}

export const volOf = (lv: number[]) => lv.reduce((a, b) => a + b, 0);

/* slug → 表示コピー側 Task（Fig・notes・desc）と群ラベルのルックアップ */
export function catalogTaskBySlug(slug: string): { task: Task; group: Group; groupIdx: number } | undefined {
  for (let gi = 0; gi < GROUPS.length; gi++) {
    const task = GROUPS[gi].tasks.find((t) => t.slug === slug);
    if (task) return { task, group: GROUPS[gi], groupIdx: gi };
  }
  return undefined;
}
export const TOTAL_VOL = GROUPS.reduce((s, g) => s + g.tasks.reduce((t, k) => t + volOf(k.lv), 0), 0);
export const TOTAL_KINDS = GROUPS.reduce((s, g) => s + g.tasks.length, 0);

export const ARTICLES = [
  { title: "点描写とは——はじめての方へ", note: "まず読むなら" },
  { title: "点描写の効果。何が育つのか", note: "効果・根拠" },
  { title: "公文の次に、何をやらせるか", note: "次の一手" },
  { title: "「図形が苦手」を、どう戻すか", note: "つまずき" },
];

/* ===================== カタログ本体（帯グラフ＋3群×タスク＋shelf band） ===================== */
export function CatalogSection() {
  return (
    <section className="s">
      <div className="wrap">
        {/* レベル 5 段階 × 対象年齢のめやす（帯グラフ） */}
        <div className="level-guide">
          <p className="level-guide-label">レベルは、ぜんぶで 5 段階。年齢はめやすです。</p>
          <div className="lvgraph-wrap"><LevelGraph /></div>
          <p className="level-guide-note">
            どのレベルも年齢のはばを広めにとっています。学年ではなく「いまの手ごたえ」で選んでください。
          </p>
          <a className="level-guide-cta" href="/level-guide">
            <span className="level-guide-cta-main">どこから始めるか迷ったら、<b>レベル選びガイド</b>へ。</span>
            <span className="level-guide-cta-sub">5〜7 問の質問に答えると、はじめる位置の目安とおすすめの一冊が出ます →</span>
          </a>
        </div>

        <div className="catalog">
          {GROUPS.map((g, gi) => (
            <div className="cat-group" key={g.label}>
              <div className="cat-group-head">
                <p className="cat-group-no">分類 {String(gi + 1).padStart(2, "0")} / 03</p>
                <h3 className="cat-group-title">{g.label}</h3>
                <p className="cat-group-sub">{g.sub}</p>
              </div>
              <div className="cat-rows">
                {g.tasks.map((t) => {
                  const firstIdx = t.lv.findIndex((v) => v > 0);
                  return (
                  <div className="cat-row" key={t.name}>
                    <div className="cat-main">
                      <div className="cat-name-row">
                        <span className="cat-name">{t.name}</span>
                        <span className="cat-count">全 {volOf(t.lv)} 巻</span>
                      </div>
                      <p className="cat-desc">{t.desc}</p>

                      {/* 一覧で圧縮：チップは各レベルへの直接リンク（A 案・直接到達を維持） */}
                      <div className="cat-levels-block">
                        <p className="cat-levels-label">レベルを選ぶ</p>
                        <div className="cat-levels">
                          {LEVELS.map((lv, i) =>
                            t.lv[i] > 0 ? (
                              <a className="cat-level" href={`/products/${t.slug}#lv${i + 1}`} key={lv}>
                                {lv}<span className="cat-level-vol">{t.lv[i]}巻</span>
                              </a>
                            ) : (
                              <span className="cat-level is-off" key={lv} aria-disabled="true">{lv}</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* 詳細はあとで：トグルで各編の内容解説＋最初の1冊（チップとは独立・開閉だけを担う） */}
                      <details className="cat-detail">
                        <summary className="cat-detail-toggle">各編の内容を見る</summary>
                        <ul className="lvlist-b cat-detail-body">
                          {LEVELS.map((lv, i) =>
                            t.lv[i] > 0 ? (
                              <li className="lvrow-b" key={lv}>
                                <span className="lvchip-b lvchip-b-static">
                                  {lv}<span className="lvchip-b-vol">{t.lv[i]}巻</span>
                                </span>
                                <span className="lvnote-b">
                                  {t.notes[i]}
                                  {i === firstIdx && (() => {
                                    const task = taskBySlug(t.slug);
                                    const fv = task && firstVol(task);
                                    return task && fv ? (
                                      <a className="cat-firststar" href={volHref(task, fv)}> ★ 最初の1冊 →</a>
                                    ) : (
                                      <span className="cat-firststar"> ★ 最初の1冊</span>
                                    );
                                  })()}
                                </span>
                              </li>
                            ) : null
                          )}
                        </ul>
                      </details>
                    </div>
                    <div className="cat-fig">
                      <t.Fig />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="shelf-band">
          <div className="shelf-band-stat">
            {TOTAL_KINDS} 種類 ・ 計 {TOTAL_VOL} 巻 <span className="sep">／</span> ¥200 一律・サブスクなし
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================== §2 もっと知る（記事） ===================== */
export function ArticlesSection() {
  return (
    <section className="s">
      <div className="wrap wrap-narrow">
        <div className="section-head">
          <p className="section-kicker">§2 · もっと知る</p>
          <h2>選ぶ前に、読んでおく。</h2>
        </div>

        <ul className="more-list">
          {ARTICLES.map((a) => (
            <li key={a.title}>
              <a className="more-item" href="/articles">
                <span className="more-title">{a.title}</span>
                <span className="more-note">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>

        <a className="btn-weak more-all" href="/articles">記事をすべて見る →</a>
      </div>
    </section>
  );
}

/* ===================== 共通フッター ===================== */
export function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-inner">
          <div className="foot-brand">
            <img src="/assets/logo-horizontal.png" alt="TENZU" />
            <p>
              点図形（点描写）プリントの専門店 TENZU<br />
              家庭で続ける、図形と空間認知の基礎練習。
            </p>
          </div>
          <div className="foot-col">
            <h5>SHOP</h5>
            <ul>
              <li><a href="/products">商品一覧</a></li>
              <li><a href="/makers">メーカー（自分で作る）</a></li>
              <li><a href="/level-guide">レベル選びガイド</a></li>
              <li><a href="#">サンプル PDF</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>READ</h5>
            <ul>
              <li><a href="/articles">記事ハブ</a></li>
              <li><a href="#">About TENZU</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">改訂履歴</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
          <a className="revlink" href="#">改訂履歴を読む →</a>
        </div>
      </div>
    </footer>
  );
}
