/* =========================================================================
   共有カタログモジュール（SSOT・DRY 化）
   `/`（page.tsx）と `/top-rich`（リッチ版）が同一のカタログ／記事／フッターを
   描画するための単一ソース。データ重複を作らない（旧 top-b 二重管理の反省）。
   出典: pack-design §0.2/§11.6/§12-22/§13.7・pack-tasks §15-22。
   ※リンク先 URL は未配線（href="#" scaffold）。
   ========================================================================= */

const TEAL = "#2C6E7F";
const FAINT = "#B0B5BD";
const INK = "#1A1F2A";

/* ---- 図のジオメトリ（5×5 ドットの「みほん」「うつす」2 枚並び） ---- */
const STEP = 22;
const OY = 40;
const LX = 20;   // みほん グリッド原点 x
const RX = 212;  // うつす グリッド原点 x

function gx(ox: number, c: number) { return ox + c * STEP; }
function gy(r: number) { return OY + r * STEP; }
function ptStr(ox: number, arr: number[][]) {
  return arr.map(([c, r]) => `${gx(ox, c)},${gy(r)}`).join(" ");
}

function GridDots({ ox }: { ox: number }) {
  const a: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      a.push(<circle key={`${r}-${c}`} cx={gx(ox, c)} cy={gy(r)} r={1.6} fill={INK} />);
  return <>{a}</>;
}

function Shape({
  ox, p, faint, closed = true, dots = true,
}: { ox: number; p: number[][]; faint?: boolean; closed?: boolean; dots?: boolean }) {
  const s = ptStr(ox, p);
  const stroke = faint ? FAINT : TEAL;
  const sw = faint ? 1.5 : 2.2;
  const dash = faint ? "3 4" : undefined;
  return (
    <>
      {closed ? (
        <polygon points={s} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash}
          strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <polyline points={s} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash}
          strokeLinejoin="round" strokeLinecap="round" />
      )}
      {!faint && dots && p.map(([c, r], i) => (
        <circle key={i} cx={gx(ox, c)} cy={gy(r)} r={3} fill={TEAL} />
      ))}
    </>
  );
}

function SampleFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 168" role="img" aria-label="設問サンプル。みほんを、うつす。">
      <text x={LX} y={22} className="t-mono" fontSize="11" fill="#767D89" letterSpacing="0.06em">みほん</text>
      <text x={RX} y={22} className="t-mono" fontSize="11" fill="#767D89" letterSpacing="0.06em">うつす</text>
      <GridDots ox={LX} />
      <GridDots ox={RX} />
      {/* みほん → うつす 矢印 */}
      <path d="M150 84 L182 84 M174 78 L182 84 L174 90" fill="none" stroke="#767D89"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {children}
    </svg>
  );
}

/* 軸（線対称用） */
function Axis({ ox }: { ox: number }) {
  return <line x1={gx(ox, 2)} y1={gy(0) - 8} x2={gx(ox, 2)} y2={gy(4) + 8}
    stroke={FAINT} strokeWidth={1} strokeDasharray="2 4" />;
}

/* ---- 9 種類の設問サンプル ---- */
const PENT = [[1, 0], [3, 0], [4, 2], [2, 4], [0, 2]];

function FigCopy() {
  return <SampleFrame><Shape ox={LX} p={PENT} /><Shape ox={RX} p={PENT} faint /></SampleFrame>;
}
/* 絵柄（具象モチーフ）の模写：家のシルエットを点で写す */
const HOUSE = [[1, 4], [1, 2], [2, 1], [3, 2], [3, 4]];
function FigMotif() {
  return <SampleFrame><Shape ox={LX} p={HOUSE} /><Shape ox={RX} p={HOUSE} faint /></SampleFrame>;
}
function FigMirror() {
  const tri = [[0, 1], [2, 1], [0, 3]];
  const mir = [[4, 1], [2, 1], [4, 3]];
  return (
    <SampleFrame>
      <Axis ox={LX} /><Shape ox={LX} p={tri} />
      <Axis ox={RX} /><Shape ox={RX} p={tri} faint dots={false} /><Shape ox={RX} p={mir} faint />
    </SampleFrame>
  );
}
function FigRotate() {
  const a = [[1, 1], [3, 2], [1, 3]];   // 右向き三角
  const b = [[1, 1], [3, 1], [2, 3]];   // 下向き三角（90°）
  return <SampleFrame><Shape ox={LX} p={a} /><Shape ox={RX} p={b} faint /></SampleFrame>;
}
function FigTranslate() {
  const sq = (c: number, r: number) => [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]];
  return (
    <SampleFrame>
      <Shape ox={LX} p={sq(0, 0)} />
      <Shape ox={RX} p={sq(0, 0)} faint dots={false} /><Shape ox={RX} p={sq(3, 3)} faint />
    </SampleFrame>
  );
}
function FigScale() {
  const small = [[1, 1], [2, 1], [2, 2], [1, 2]];
  const big = [[1, 1], [3, 1], [3, 3], [1, 3]];
  return <SampleFrame><Shape ox={LX} p={small} /><Shape ox={RX} p={big} faint /></SampleFrame>;
}
function FigOverlay() {
  const aIn = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const bIn = [[2, 2], [4, 2], [4, 4], [2, 4]];
  const aOut = [[0, 1], [2, 1], [2, 3], [0, 3]];
  const bOut = [[1, 2], [3, 2], [3, 4], [1, 4]];
  return (
    <SampleFrame>
      <Shape ox={LX} p={aIn} /><Shape ox={LX} p={bIn} />
      <rect x={gx(RX, 1)} y={gy(2)} width={STEP} height={STEP} fill="rgba(44,110,127,0.16)" />
      <Shape ox={RX} p={aOut} faint /><Shape ox={RX} p={bOut} faint />
    </SampleFrame>
  );
}
function FigDecompose() {
  const sq = [[1, 2], [3, 2], [3, 4], [1, 4]];
  const roof = [[1, 2], [2, 1], [3, 2]];
  const roofUp = [[1, 1.6], [2, 0.6], [3, 1.6]];
  const sqDn = [[1, 2.4], [3, 2.4], [3, 4], [1, 4]];
  return (
    <SampleFrame>
      <Shape ox={LX} p={sq} dots={false} /><Shape ox={LX} p={roof} dots={false} />
      <Shape ox={RX} p={roofUp} faint dots={false} /><Shape ox={RX} p={sqDn} faint dots={false} />
    </SampleFrame>
  );
}
function FigFill() {
  // 欠け：[4,2]→[2,4] の一辺が抜けた五角形（開いた線）
  const open = [[2, 4], [0, 2], [1, 0], [3, 0], [4, 2]];
  return (
    <SampleFrame>
      <Shape ox={LX} p={open} closed={false} />
      {/* 欠け端点を小さく示す */}
      <circle cx={gx(LX, 4)} cy={gy(2)} r={3} fill="none" stroke={TEAL} strokeWidth={1.4} />
      <circle cx={gx(LX, 2)} cy={gy(4)} r={3} fill="none" stroke={TEAL} strokeWidth={1.4} />
      <Shape ox={RX} p={PENT} faint />
    </SampleFrame>
  );
}
function FigSolid() {
  const cube = (ox: number, faint?: boolean) => {
    const stroke = faint ? FAINT : TEAL;
    const sw = faint ? 1.5 : 2.2;
    const dash = faint ? "3 4" : undefined;
    const front = ptStr(ox, [[1, 2], [3, 2], [3, 4], [1, 4]]);
    const top = ptStr(ox, [[1, 2], [2, 1], [4, 1], [3, 2]]);
    const right = ptStr(ox, [[3, 2], [4, 1], [4, 3], [3, 4]]);
    return (
      <>
        <polygon points={front} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
        <polygon points={top} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
        <polygon points={right} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
      </>
    );
  };
  return <SampleFrame>{cube(LX)}{cube(RX, true)}</SampleFrame>;
}

/* lv = Lv.1〜5 の各 Vol 数（0＝歯抜け）。vol 合計は lv から算出。出典 pack-design §11.6 / §12-22
   notes = 同 index のレベル内容解説（歯抜けは ""）。詳細アコーディオンで表示。出典 pack-tasks §15-22 / §12.2 */
export type Task = { name: string; desc: string; lv: number[]; notes: string[]; Fig: () => React.ReactElement };
export type Group = { label: string; sub: string; tasks: Task[] };

export const GROUPS: Group[] = [
  {
    label: "見て写す",
    sub: "形をそのまま読み取る、いちばんの基礎。立体に起こすところまで。",
    tasks: [
      {
        name: "模写（図形）", desc: "見本のとおりに、点をつないで写す。", lv: [1, 2, 2, 2, 1], Fig: FigCopy,
        notes: [
          "3×3・まっすぐの線だけ",
          "ななめ（45°）が登場。3×3〜4×4",
          "線が増えて交差も。4×4〜5×5",
          "45°以外の角度へ。5×5〜6×6",
          "最大7×7で総仕上げ",
        ],
      },
      {
        name: "模写（絵柄）", desc: "いきもの・乗りもの…絵を、点で写す。", lv: [0, 2, 2, 2, 1], Fig: FigMotif,
        notes: [
          "",
          "絵柄でななめに挑戦。3×3〜4×4",
          "線が増えた絵柄。4×4〜5×5",
          "複雑な角度の絵柄。5×5〜6×6",
          "大きな絵柄を写しきる",
        ],
      },
      {
        name: "模写（立体）", desc: "平面の点から、立体を起こして写す。", lv: [0, 0, 1, 2, 2], Fig: FigSolid,
        notes: [
          "", "",
          "立方体を組んだ形・少数ブロック",
          "階段・テラス→三角柱・四角錐",
          "橋・中庭・トンネルの抜け構造",
        ],
      },
      {
        name: "欠け補完", desc: "足りない辺を補って、形を閉じる。", lv: [1, 1, 2, 2, 2], Fig: FigFill,
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
    sub: "向きを変える、動かす、大きさを変える。頭の中で形を操る力。",
    tasks: [
      {
        name: "線対称", desc: "軸で折り返した形を描く。", lv: [0, 1, 1, 2, 2], Fig: FigMirror,
        notes: [
          "",
          "縦軸（左右の鏡うつし）。3×3",
          "縦軸＋交差。4×4",
          "横軸（上下反転）が登場",
          "斜め軸（ななめの鏡）へ",
        ],
      },
      {
        name: "回転", desc: "回しても同じ形だととらえる。", lv: [0, 1, 2, 2, 0], Fig: FigRotate,
        notes: [
          "",
          "90°右回り。3×3",
          "90°右＋左回り。4×4",
          "180°（さかさま）が登場",
          "",
        ],
      },
      {
        name: "平行移動", desc: "形を変えずに、ずらして写す。", lv: [0, 2, 1, 1, 0], Fig: FigTranslate,
        notes: [
          "",
          "横→縦にずらす。3×3",
          "斜めにずらす。4×4",
          "複合移動（右2・下1など）",
          "",
        ],
      },
      {
        name: "拡大・縮小", desc: "大きく・小さく、比をそろえて写す。", lv: [0, 0, 0, 3, 3], Fig: FigScale,
        notes: [
          "", "", "",
          "2倍に拡大（3×3→5×5）",
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
        name: "かさね", desc: "2 つの形を重ねたところを描く。", lv: [0, 1, 2, 2, 2], Fig: FigOverlay,
        notes: [
          "",
          "2つの形を重ねる。3×3",
          "交差＋線の密度。4×4",
          "角度いろいろ。5×5",
          "大盤面で重ねる。6×6",
        ],
      },
      {
        name: "分解", desc: "1 つの形を、パーツに分ける。", lv: [0, 1, 2, 2, 2], Fig: FigDecompose,
        notes: [
          "",
          "重なりから1つ取り出す。3×3",
          "引き算思考を育てる。4×4",
          "密な重なりを抜き出す。5×5",
          "最大盤面の分解。6×6",
        ],
      },
    ],
  },
];

export const LEVELS = ["はじめの一歩", "入門編", "基礎編", "応用編", "発展編"];

/* レベル＝発達段階インデックス。年齢はめやす（§12.7 基準尺）。 */
const LEVEL_GRAPH = [
  { name: "発展編", from: 8, to: 10, label: "8才〜" },
  { name: "応用編", from: 6, to: 9, label: "6〜9才" },
  { name: "基礎編", from: 5, to: 8, label: "5〜8才" },
  { name: "入門編", from: 4, to: 7, label: "4〜7才" },
  { name: "はじめの一歩", from: 4, to: 6, label: "4〜6才" },
];
const AGE_MIN = 4, AGE_MAX = 10, GX0 = 130, GX1 = 504, NAMEX = 118;
const gxa = (a: number) => GX0 + ((a - AGE_MIN) / (AGE_MAX - AGE_MIN)) * (GX1 - GX0);

export function LevelGraph() {
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
        return (
          <g key={l.name}>
            <text x={NAMEX} y={cy + 6} textAnchor="end" className="lvg-name">{l.name}</text>
            <rect x={x} y={cy - 15} width={w} height={30} rx={7} fill={TEAL} fillOpacity={1 - i * 0.055} />
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
          <a className="level-guide-cta" href="#">
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
                              <a className="cat-level" href="#" key={lv}>
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
                                  {i === firstIdx && <span className="cat-firststar"> ★ 最初の1冊</span>}
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
          <a className="btn-medium" href="#">商品一覧をすべて見る →</a>
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
              <a className="more-item" href="#">
                <span className="more-title">{a.title}</span>
                <span className="more-note">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>

        <a className="btn-weak more-all" href="#">記事をすべて見る →</a>
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
              <li><a href="#">商品一覧</a></li>
              <li><a href="#">レベル選びガイド</a></li>
              <li><a href="#">サンプル PDF</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>READ</h5>
            <ul>
              <li><a href="#">記事ハブ</a></li>
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
