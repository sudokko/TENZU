import "./top-rich.css";
import { Fragment } from "react";
import SiteHeader from "./SiteHeader";
import { GROUPS, volOf, LevelGraph, ArticlesSection, SiteFooter } from "./catalog";

/* =========================================================================
   TOP（正本 `/`）— Brilliant 寄せ「1.5」。2026-06-09 に /top-rich から昇格。
   方針（オーナー確定）: rev.5 の静けさを保ったまま、物語・証明・体験・締めの
   セクションを足して平坦さを解消。署名となる動き（点→形の線描）を一つだけ置く。
   - TOP では「おためし点描写メーカー」に触れない（funnel §17）。主導線は
     「サンプルを見る」「レベル選びガイド」。
   - 10 種類は coverage 方式で圧縮: 3 群タブ＋種類リスト＋代表デモ＋レベル帯グラフ。
   - 「大切にした 3 つ」＝図解カード（①適レベル ②模写だけにしない ③印刷の自由）。
   - 「家庭での続け方」＝縦タイムライン（案B）。
   動き・タブとも自前 CSS（client JS なし・Server Component 維持）。
   ※リンク先 URL は未配線（href="#"）。SSOT 反映は別途。
   変遷: 旧 A 案 → archive/retired-designs/2026-06-09-top-a-storefront-superseded.tsx
   ========================================================================= */

const TEAL = "#2C6E7F";
const INK = "#1A1F2A";
const FAINT = "#C5C9CF";

/* ---- 署名アニメ: 5×5 ドットの上を、五角形の線が引かれていく ---- */
const SX0 = 24, SSTEP = 44;
const sc = (n: number) => SX0 + n * SSTEP; // 24,68,112,156,200
const VERTS: [number, number, string][] = [
  [sc(1), sc(0), "sig-dot"],
  [sc(3), sc(0), "sig-dot sig-dot-2"],
  [sc(4), sc(2), "sig-dot sig-dot-3"],
  [sc(2), sc(4), "sig-dot sig-dot-4"],
  [sc(0), sc(2), "sig-dot sig-dot-5"],
];

function SignatureDraw() {
  const grid: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      grid.push(<circle key={`${r}-${c}`} cx={sc(c)} cy={sc(r)} r={1.7} fill={INK} opacity={0.32} />);
  const poly = VERTS.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <div className="sig-wrap">
      <svg className="sig-draw" viewBox="0 0 224 224" role="img"
        aria-label="点と点を線でつないで、形ができていくアニメーション">
        {grid}
        <polygon className="sig-path" points={poly} pathLength={360} />
        {VERTS.map(([x, y, cls], i) => (
          <circle key={i} className={cls} cx={x} cy={y} r={3.4} fill={TEAL} />
        ))}
      </svg>
      <p className="sig-caption">点と点を、線でつなぐ。</p>
    </div>
  );
}

const PILLARS = [
  { no: "01", t: "体系", d: "10 種類 × 5 段階で整理。今なにを練習しているか、言葉にできる。" },
  { no: "02", t: "解像度", d: "買う前に、サンプル・難易度・根拠が読める。中身を見せる専門店。" },
  { no: "03", t: "発見", d: "知っている人だけが得をしない。全種類のサンプルを公開し、手で触れて確かめられる。" },
  { no: "04", t: "言語化", d: "この問題は何の力に効くか。タスクと能力の対応を、言葉にする。" },
  { no: "05", t: "継続", d: "親が「次の一手」と「声かけ」に迷わない。続けられる設計。" },
];

/* ---- ⑤ 続け方フロー用アイコン（40×40・採用: 案B 縦タイムライン） ---- */
function IcSample() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <rect x="8" y="6" width="20" height="26" rx="2" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <line x1="12" y1="13" x2="24" y2="13" stroke={FAINT} strokeWidth="1.4" />
      <line x1="12" y1="18" x2="24" y2="18" stroke={FAINT} strokeWidth="1.4" />
      <line x1="12" y1="23" x2="20" y2="23" stroke={FAINT} strokeWidth="1.4" />
      <circle cx="26" cy="27" r="6.5" fill="#fff" stroke={TEAL} strokeWidth="2" />
      <line x1="30.5" y1="31.5" x2="36" y2="37" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IcPick() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <rect x="13" y="14" width="18" height="22" rx="2" fill="#fff" stroke={INK} strokeWidth="1.6" />
      <rect x="8" y="7" width="18" height="22" rx="2" fill="#fff" stroke={TEAL} strokeWidth="2" />
      <path d="M12 18 L16 22 L23 13" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IcPrint() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      {[0, 1, 2].map((c) => [0, 1, 2].map((r) => (
        <circle key={`${c}-${r}`} cx={10 + c * 7} cy={24 + r * 6} r="1.4" fill={INK} opacity="0.32" />
      )))}
      <line x1="11" y1="31" x2="31" y2="9" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
      <path d="M31 9 L34 6 L36 12 Z" fill={TEAL} />
    </svg>
  );
}
function IcLoop() {
  return (
    <svg viewBox="0 0 40 40" className="flow-icon" aria-hidden="true">
      <path d="M31 13 A13 13 0 1 0 33 25" fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M31 6 L33 15 L24 13 Z" fill={TEAL} />
    </svg>
  );
}

const STEPS = [
  { n: "01", Ic: IcSample, t: "サンプルを見る", d: "代表 1 枚を無料公開。中身を見てから。" },
  { n: "02", Ic: IcPick, t: "今のレベルを選ぶ", d: "¥200 一律。レベル選びガイドで「今」に合う一枚を。" },
  { n: "03", Ic: IcPrint, t: "印刷して、机で", d: "A4 1 枚。鉛筆で点と点をつなぐ数分。" },
  { n: "04", Ic: IcLoop, t: "気が向いた日に、次の一枚", d: "繰り返しても、次へ進んでも。家庭ごとで。" },
];

/* ---- 大切にしている 3 つ・図解（採用: ①案C ②現行 ③案C） ---- */
// ① 階段＋低めの段に旗（合う段から・段差はゆるやか）＝適レベル始動＋つまずきにくさ
function ValFigLevel() {
  return (
    <svg viewBox="0 0 132 84" className="val-svg" aria-hidden="true">
      <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d="M16 68 L44 68 L44 54 L72 54 L72 40 L100 40 L100 26 L116 26" />
      </g>
      <line x1={58} y1={54} x2={58} y2={30} stroke={TEAL} strokeWidth={2} strokeLinecap="round" />
      <path d="M58 31 L78 36 L58 41 Z" fill={TEAL} />
      <circle cx={58} cy={54} r={2.6} fill={TEAL} />
    </svg>
  );
}
// ② 模写 → いろいろ（多様な図形へ広がる・現行ライン）
function ValFigVariety() {
  return (
    <svg viewBox="0 0 132 84" className="val-svg" aria-hidden="true">
      <polygon points="20,18 36,18 41,34 28,44 15,34" fill="none" stroke={TEAL} strokeWidth={2.2} strokeLinejoin="round" />
      <text x={28} y={58} textAnchor="middle" fontSize={11} className="val-svg-tag">模写</text>
      <path d="M48 31 L64 31 M58 26 L64 31 L58 36" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="76,16 90,16 83,28" fill="none" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <g stroke={INK} strokeWidth={1.6} fill="none" strokeLinejoin="round">
        <rect x="102" y="16" width="12" height="12" />
        <path d="M102 16 L106 12 L118 12 L114 16" />
        <path d="M114 16 L118 12 L118 24 L114 28" />
      </g>
      <polygon points="76,40 84,40 76,50" fill="none" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <polygon points="92,40 84,40 92,50" fill="none" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <rect x="100" y="40" width="12" height="12" fill="none" stroke={INK} strokeWidth={1.6} />
      <rect x="107" y="44" width="12" height="12" fill="none" stroke={TEAL} strokeWidth={1.6} />
    </svg>
  );
}
// ③ プリンターから紙が出る（用紙サイズ・向き・問題数の自由・案C）
function ValFigPaper() {
  return (
    <svg viewBox="0 0 132 84" className="val-svg" aria-hidden="true">
      <rect x={36} y={20} width={42} height={28} rx={2} fill="#fff" stroke={TEAL} strokeWidth={2} />
      <text x={57} y={38} textAnchor="middle" fontSize={9} className="val-svg-tag">A4/A3</text>
      <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d="M28 48 L86 48 L86 66 L28 66 Z" />
      </g>
      <circle cx={78} cy={57} r={2.2} fill={TEAL} />
      <rect x={44} y={56} width={26} height={18} rx={1.5} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <line x1={48} y1={62} x2={66} y2={62} stroke={FAINT} strokeWidth={1.4} />
      <line x1={48} y1={67} x2={66} y2={67} stroke={FAINT} strokeWidth={1.4} />
    </svg>
  );
}

const VALUES = [
  { Fig: ValFigLevel, t: "ちょうどいいレベルから、つまずかずに", d: "レベルをできるだけ細かく刻みました。お子さんの発達に合った「いま、ちょうどいい」一冊から始められて、急な段差でつまずくこともありません。" },
  { Fig: ValFigVariety, t: "模写だけで、終わらせない", d: "よくある点描写は、写すだけ。でも図形の土台は、回す・重ねる・立体に起こす…と広い。だから何種類もの点描写を用意しました。" },
  { Fig: ValFigPaper, t: "家庭の印刷機に、合わせられる", d: "用紙は A4〜A3、たて・よこも自由。1 枚に入れる問題数も選べます。¥200 一律で、ご家庭のプリンター事情に合わせて印刷できます。" },
];

/* ---- 10 種類を coverage 方式で圧縮（3 群タブ＋種類リスト＋代表デモ・純CSSタブ） ---- */
function CoverageSection() {
  return (
    <section className="tr-sec">
      <div className="wrap">
        <div className="tr-sec-head">
          <p className="tr-sec-kicker">品ぞろえ</p>
          <h2>点描写を、3 つの力 × 5 段階で。</h2>
        </div>

        {/* パート①: 3 つの力（何を練習するか）＝ 3 群タブ */}
        <div className="cov-part">
          <h3 className="cov-part-title"><b>3 つの力</b><span>― 何を練習するか</span></h3>
        <div className="cov-tabs">
          {/* 純CSS タブ: radio の :checked でタブ着色＝隣接 + ／ パネル切替＝ ~（JS なし） */}
          {GROUPS.map((g, i) => (
            <Fragment key={g.label}>
              <input type="radio" name="cov" id={`cov-${i}`} className="cov-radio" defaultChecked={i === 0} />
              <label className="cov-tab" htmlFor={`cov-${i}`}>{g.label}</label>
            </Fragment>
          ))}

          <div className="cov-panels">
            {GROUPS.map((g, gi) => (
              <div className="cov-panel" key={g.label}>
                {/* タスク選択用 radio（パネル先頭・各群で独立 name）。
                    :checked で同 index のラベル active ＋ 右デモ図を表示（純CSS・JSなし）。 */}
                {g.tasks.map((t, ti) => (
                  <input
                    key={`r-${t.name}`}
                    type="radio"
                    name={`demo-${gi}`}
                    id={`demo-${gi}-${ti}`}
                    className="cov-taskradio"
                    defaultChecked={ti === 0}
                  />
                ))}

                <div className="cov-list">
                  <p className="cov-list-label">ふくまれる種類（選ぶと右が変わります）</p>
                  <div className="cov-tasklist">
                    {g.tasks.map((t, ti) => (
                      <label className="cov-task" htmlFor={`demo-${gi}-${ti}`} key={t.name}>
                        <span className="cov-name">{t.name}</span>
                        <span className="cov-vol">全 {volOf(t.lv)} 巻</span>
                      </label>
                    ))}
                  </div>
                  <p className="cov-sub">{g.sub}</p>
                  <a className="cov-more" href="#">10 種類 × 5 段階を、すべて見る →</a>
                </div>

                <div className="cov-demo">
                  {g.tasks.map((t) => {
                    const Fig = t.Fig;
                    return (
                      <div className="cov-demo-fig" key={t.name}>
                        <div className="cov-demo-card"><Fig /></div>
                        <p className="cov-demo-cap">{t.name}・みほん → うつす</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* パート②: 5 段階（どこから始めるか）＝ レベル帯グラフ */}
        <div className="cov-part">
          <h3 className="cov-part-title"><b>5 段階</b><span>― どこから始めるか</span></h3>
          <div className="tr-levelband">
            <div className="lvgraph-wrap"><LevelGraph /></div>
            <p className="tr-levelband-note">
              年齢はめやすです。どのレベルも幅を広めにとっています。学年ではなく「いまの手ごたえ」で選んでください。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ===================== ① Hero（ベネフィット先行＋署名アニメ） ===================== */}
        <section className="tr-hero">
          <div className="wrap">
            <div className="tr-hero-grid">
              <div>
                <p className="tr-kicker">点描写プリントの専門店</p>
                <h1>図形の基礎は、点描写から。</h1>
                <p className="tr-hero-sub">
                  模写から、対称・回転・立体まで。空間認知の土台を、家庭で着実に育てます。
                </p>
                <div className="tr-cta-row">
                  <a className="tr-btn-primary" href="#">サンプルを見る</a>
                  <a className="tr-btn-ghost" href="#">レベル選びガイドへ</a>
                </div>
              </div>
              <div>
                <SignatureDraw />
              </div>
            </div>
          </div>
        </section>

        {/* ===================== ③ Why＋方法カード（5 Pillar） ===================== */}
        <section className="tr-sec tr-sec-alt">
          <div className="wrap">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">なぜ、点描写なのか</p>
              <h2>写す前に「どこを見るか」。それが、図形の手前にある力です。</h2>
            </div>
            <p className="tr-lead">
              計算と読み書きはやっているけれど、図形は手薄。点つなぎは楽しんでいるけれど、次が見当たらない。
              そんな家庭に渡せる「次の一枚」を、10 種類 × 5 段階で整えています。TENZU は受験対策の教材ではありません。
              漢字ドリル・計算ドリルと並ぶ「家庭の当たり前の練習」として、机に向かう数分の中に置きます。
            </p>
            <div className="method-cards">
              {PILLARS.map((p) => (
                <div className="method-card" key={p.no}>
                  <p className="method-no">{p.no}</p>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== ④ 扱う10種類（coverage 圧縮） ===================== */}
        <CoverageSection />

        {/* ===================== ②/⑥ 大切にしている 3 つ（図解カード） ===================== */}
        <section className="tr-sec tr-sec-alt">
          <div className="wrap">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">TENZU が大切にしていること</p>
              <h2>点描写プリントで、いちばん大事にした 3 つ。</h2>
            </div>
            <div className="val-grid val-grid-3">
              {VALUES.map((v) => {
                const Fig = v.Fig;
                return (
                  <div className="val-card" key={v.t}>
                    <div className="val-fig"><Fig /></div>
                    <div className="val-body">
                      <h3>{v.t}</h3>
                      <p>{v.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== ⑤ 家庭での続け方（縦タイムライン・案B） ===================== */}
        <section className="tr-sec">
          <div className="wrap">
            <div className="tr-sec-head">
              <p className="tr-sec-kicker">家庭での続け方</p>
              <h2>いつからでも、休んでも。続け方は、家庭ごとでいい。</h2>
            </div>
            <div className="flowB">
              {STEPS.map((s) => {
                const Ic = s.Ic;
                return (
                  <div className="flowB-step" key={s.n}>
                    <span className="flowB-dot">{s.n}</span>
                    <div className="flowB-head">
                      <Ic />
                      <p className="flow-title">{s.t}</p>
                    </div>
                    <p className="flow-desc">{s.d}</p>
                  </div>
                );
              })}
            </div>
            <p className="steps-memo">
              <b>「毎日続いていますか」と聞かれることがあります。</b>続いていなくても大丈夫です。
              1 週間休んだ後の一枚も、最初の一枚と同じ価値です。
            </p>
          </div>
        </section>

        {/* ===================== ⑧ 感情的クロージング ===================== */}
        <section className="tr-close">
          <div className="wrap wrap-narrow">
            <h2>点と点が、つながるように。</h2>
            <p>
              まずは、気になる一枚のサンプルから。印刷して、机の上で。
              鉛筆で点と点をつなぐ数分が、図形を読む目を育てます。
            </p>
            <div className="tr-cta-row">
              <a className="tr-btn-primary" href="#">サンプル PDF を見る</a>
              <a className="tr-btn-ghost" href="#">レベル選びガイドへ</a>
            </div>
          </div>
        </section>

        {/* ===================== 記事 ===================== */}
        <ArticlesSection />
      </main>

      <SiteFooter />
    </>
  );
}
