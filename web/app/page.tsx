import SiteHeader from "./SiteHeader";

/* =========================================================================
   TOP — Pattern A v5（設問サンプルを 9 種類すべて図で見せる）
   方針（オーナー確定）: アイコンでなく、実際の設問サンプルを 9 種類すべて図で。
   各種類「みほん → うつす」で変換が分かる代表問題を描画。長くてよい。
   レベル名は pack-design.md §0.2 正本（はじめの一歩〜発展編）、巻数は §0 サマリ。
   ※レベルの歯抜け／Lv 別 Vol は §11-22 で一部残課題。リンクは scaffold。
   変遷: 旧 rev.5 LP → archive/retired-designs/2026-06-07-lp-rev5-storefront-superseded.tsx
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

type Task = { name: string; desc: string; vol: number; Fig: () => React.ReactElement };
type Group = { label: string; tasks: Task[] };

const GROUPS: Group[] = [
  {
    label: "見て写す",
    tasks: [
      { name: "模写", desc: "見本のとおりに、点をつないで写す。", vol: 8, Fig: FigCopy },
    ],
  },
  {
    label: "かたちを動かす",
    tasks: [
      { name: "線対称", desc: "軸で折り返した形を描く。", vol: 6, Fig: FigMirror },
      { name: "回転", desc: "回しても同じ形だととらえる。", vol: 5, Fig: FigRotate },
      { name: "平行移動", desc: "形を変えずに、ずらして写す。", vol: 4, Fig: FigTranslate },
      { name: "拡大・縮小", desc: "大きく・小さく、比をそろえて写す。", vol: 6, Fig: FigScale },
    ],
  },
  {
    label: "重ねる・分ける",
    tasks: [
      { name: "かさね", desc: "2 つの形を重ねたところを描く。", vol: 7, Fig: FigOverlay },
      { name: "分解", desc: "1 つの形を、パーツに分ける。", vol: 7, Fig: FigDecompose },
      { name: "欠け補完", desc: "足りない辺を補って、形を閉じる。", vol: 8, Fig: FigFill },
    ],
  },
  {
    label: "立体でとらえる",
    tasks: [
      { name: "立体模写", desc: "平面の点から、立体を起こして写す。", vol: 5, Fig: FigSolid },
    ],
  },
];

const LEVELS = ["はじめの一歩", "入門編", "基礎編", "応用編", "発展編"];

const ARTICLES = [
  { title: "点描写とは——はじめての方へ", note: "まず読むなら" },
  { title: "点描写の効果。何が育つのか", note: "効果・根拠" },
  { title: "公文の次に、何をやらせるか", note: "次の一手" },
  { title: "「図形が苦手」を、どう戻すか", note: "つまずき" },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ===================== HERO ===================== */}
        <section className="hero">
          <div className="wrap">
            <p className="hero-ident">点図形（点描写）プリントの専門店 TENZU</p>
            <h1>点描写プリントの、<br />専門店です。</h1>
            <p className="hero-lead">
              点描写は、図形を読み解く目を育てる練習。見て写すことから始めて、回す・重ねる・立体に起こすところまで。紙と鉛筆の数分が、これからの学びの土台になります。
            </p>
          </div>
        </section>

        {/* ===================== 9 種類カタログ（設問サンプル × レベル全リンク） ===================== */}
        <section className="s">
          <div className="wrap">
            <div className="catalog">
              {GROUPS.map((g) => (
                <div className="cat-group" key={g.label}>
                  <p className="cat-group-label">{g.label}</p>
                  {g.tasks.map((t) => (
                    <div className="cat-row" key={t.name}>
                      <div className="cat-name-row">
                        <span className="cat-name">{t.name}</span>
                        <span className="cat-count">全 {t.vol} 巻</span>
                      </div>
                      <p className="cat-desc">{t.desc}</p>
                      <div className="cat-fig">
                        <t.Fig />
                      </div>
                      <div className="cat-levels-block">
                        <p className="cat-levels-label">レベルを選ぶ</p>
                        <div className="cat-levels">
                          {LEVELS.map((lv) => (
                            <a className="cat-level" href="#" key={lv}>{lv}</a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="shelf-band">
              <div className="shelf-band-stat">
                9 種類 ・ 全 5 レベル <span className="sep">／</span> ¥200 一律・サブスクなし
              </div>
              <a className="btn-medium" href="#">商品一覧をすべて見る →</a>
            </div>
          </div>
        </section>

        {/* ===================== §2 もっと知る ===================== */}
        <section className="s">
          <div className="wrap">
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
      </main>

      {/* ===================== FOOTER ===================== */}
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
    </>
  );
}
