/* =========================================================================
   【撤回設計・証跡】rev.5 LP（旧 `/` ＝ web/app/page.tsx）
   退避日: 2026-06-07
   理由: TOP を A 型ストアフロント案（旧 /top-a）へ全面移行。`/` と /top-a の
         二重ルートが毎回紛らわしいため、旧LPを archive へ退避し /top-a を `/` に昇格。
   構成: Hero(icon strip+Tagline trio)／§1 Why／§2 4群 pillar-stack／
         §3 家庭での続け方／§4 おためし maker-promo。
   ※このファイルは当時のコードのスナップショット。landing.css は以後改変されるため
     単独では再現しない。現行の正本は web/app/page.tsx を参照。
   ========================================================================= */
import SiteHeader from "./SiteHeader";

const TASK_ICONS = [
  { src: "/assets/icons/task-copy.svg",       alt: "模写" },
  { src: "/assets/icons/task-mirror.svg",     alt: "線対称" },
  { src: "/assets/icons/task-rotate.svg",     alt: "回転" },
  { src: "/assets/icons/task-translate.svg",  alt: "平行移動" },
  { src: "/assets/icons/task-scale.svg",      alt: "拡大縮小" },
  { src: "/assets/icons/task-overlay.svg",    alt: "かさね" },
  { src: "/assets/icons/task-decompose.svg",  alt: "分解" },
  { src: "/assets/icons/task-fill.svg",       alt: "欠け補完" },
  { src: "/assets/icons/task-solid.svg",      alt: "立体" },
];

type Pillar = {
  code: "A" | "B" | "C" | "D";
  cat: string;
  name: string;
  promise: string;
  tasks: { icon: string; name: string }[];
  meta: { count: string; lv: string; vol: string; price: string };
};

const PILLARS: Pillar[] = [
  {
    code: "A",
    cat: "見て写す",
    name: "見て写す",
    promise: "目で測れるところまで来てから、写し始める。\n9 タスクの起点。",
    tasks: [{ icon: "/assets/icons/task-copy.svg", name: "模写" }],
    meta: { count: "1 タスク", lv: "Lv.1 — Lv.5", vol: "各 12-16 問 / Vol", price: "¥200 / SKU" },
  },
  {
    code: "B",
    cat: "かたちを動かす",
    name: "かたちを動かす",
    promise: "向き・位置・大きさを変えても、\n形がそのままだと気づく目を作る。",
    tasks: [
      { icon: "/assets/icons/task-mirror.svg",    name: "線対称" },
      { icon: "/assets/icons/task-rotate.svg",    name: "回転" },
      { icon: "/assets/icons/task-translate.svg", name: "平行移動" },
      { icon: "/assets/icons/task-scale.svg",     name: "拡大縮小" },
    ],
    meta: { count: "4 タスク", lv: "Lv.1 — Lv.5", vol: "各 12-16 問 / Vol", price: "¥200 / SKU" },
  },
  {
    code: "C",
    cat: "重ねる・分ける",
    name: "重ねる・分ける",
    promise: "かさねる、分ける、足りない辺を補う。\n図形は組み立てるものだと感じる。",
    tasks: [
      { icon: "/assets/icons/task-overlay.svg",    name: "かさね" },
      { icon: "/assets/icons/task-decompose.svg",  name: "分解" },
      { icon: "/assets/icons/task-fill.svg",       name: "欠け補完" },
    ],
    meta: { count: "3 タスク", lv: "Lv.1 — Lv.5", vol: "各 12-16 問 / Vol", price: "¥200 / SKU" },
  },
  {
    code: "D",
    cat: "立体でとらえる",
    name: "立体でとらえる",
    promise: "平面から、奥行きを起こす。\n受験図形の手前で、ここを足場にする。",
    tasks: [{ icon: "/assets/icons/task-solid.svg", name: "立体" }],
    meta: { count: "1 タスク", lv: "Lv.1 — Lv.5", vol: "各 12-16 問 / Vol", price: "¥200 / SKU" },
  },
];

function MultilineP({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <p className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ===================== HERO ===================== */}
        <section className="hero">
          <div className="wrap">
            <h1>点描写プリントの、<br />専門店です。</h1>

            <div className="menu">
              <p className="menu-line">模写・回転・重ね・立体</p>
              <p className="menu-line menu-price">1 セット 12 枚 200 円</p>
            </div>

            <div className="tagline">
              <p className="tagline-main">点と点がつなげるようになったら、点描写を。</p>
              <p className="tagline-sub">空間認知の土台をつくる。</p>
            </div>

            <div className="actions">
              <a className="btn-strong" href="#">サンプル PDF を見る →</a>
              <a className="btn-weak" href="#">点描写とは</a>
            </div>

            <div className="icon-strip">
              <span className="istrip-label">9 TASKS</span>
              {TASK_ICONS.map((t) => (
                <img key={t.alt} src={t.src} alt={t.alt} />
              ))}
            </div>
          </div>
        </section>

        {/* ===================== §1 WHY ===================== */}
        <section className="s">
          <div className="wrap">
            <div className="section-head">
              <p className="section-kicker">§1 · 点描写 とは</p>
              <h2>図形のもう一段下に、見る力。</h2>
              <p className="section-lead">
                点と点をつないで見本通りに図形を描く練習です。鉛筆を持つ前に「どこを見るか」を決める時間が、図形と漢字書字の土台になります。
              </p>
            </div>

            <div className="why-grid">
              <div className="why-body">
                <div className="why-promise">
                  「写す前に、どこを見るか」<br />が、図形の手前にある力です。
                </div>
                <p>
                  計算と読み書きはやっているけれど、図形は手薄。点つなぎは楽しんでいるけれど、次が見当たらない。そんな家庭に渡せる「次の 1 枚」を、9 タスク × 5 レベル × Vol 細刻みの体系で整えています。
                </p>
                <p>
                  TENZU は受験準備の教材ではありません。漢字ドリル・計算ドリルと並ぶ「家庭の当たり前の練習」として、紙と鉛筆で、机に向かう数分の中に置きます。
                </p>
              </div>

              <aside className="why-evidence">
                <div className="ev-label">TENZU の根拠</div>
                <p className="ev-body">
                  視覚空間処理は、漢字書字と算数達成の認知的予測因子であることが複数の研究で示されています。
                </p>
                <p className="ev-translation">
                  <b>TENZU 訳：</b>図形を見て写し取る力は、漢字を書く力や算数の力にもつながる、と複数の論文が言っています。
                </p>
                <div className="ev-cite">evidence.md §1-§3 参照</div>
              </aside>
            </div>
          </div>
        </section>

        {/* ===================== §2 — 4 GROUPS ===================== */}
        <section className="s">
          <div className="wrap">
            <div className="section-head">
              <p className="section-kicker">§2 · TENZU の 9 タスク</p>
              <h2>4 つの群で、図形の見方を組み立てる。</h2>
              <p className="section-lead">
                同じ「写す」でも、見て写す・かたちを動かす・重ねる・分ける・立体でとらえるの 4 つの段で異なる力が育ちます。各群は独立に始められ、Lv.1 から Lv.5 まで Vol 細刻みで進めます。
              </p>
            </div>

            <div className="pillar-stack">
              {PILLARS.map((p) => (
                <article className="pillar-row" key={p.code}>
                  <div className="pillar-leading">
                    <div className="pillar-code">{p.code}</div>
                    <div className="pillar-cat">{p.cat}</div>
                  </div>
                  <div className="pillar-main">
                    <h3 className="pillar-name">{p.name}</h3>
                    <MultilineP text={p.promise} className="pillar-promise" />
                    <div className="pillar-tasks">
                      {p.tasks.map((t) => (
                        <a className="pillar-task" href="#" key={t.name}>
                          <img src={t.icon} alt="" />
                          <span className="ptname">{t.name}</span>
                        </a>
                      ))}
                    </div>
                    <div className="pillar-meta-row">
                      <div className="pillar-meta">
                        <span>{p.meta.count}</span><span className="dot-sep">·</span>
                        <span>{p.meta.lv}</span><span className="dot-sep">·</span>
                        <span>{p.meta.vol}</span><span className="dot-sep">·</span>
                        <span>{p.meta.price}</span>
                      </div>
                      <a className="btn-weak" href="#">群 {p.code} の一覧へ</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="section-2-memo">
              <div className="ml">店主から</div>
              <p className="mb">
                「どの群から?」と迷ったときは、A から始めるのではなく、<br />
                お子さんが今日「見える」ところから始めてください。<br />
                同じ Lv.2 でも、群が変われば別の練習です。
              </p>
              <div className="md">2026-05-26</div>
            </aside>
          </div>
        </section>

        {/* ===================== §3 家庭での続け方 ===================== */}
        <section className="s">
          <div className="wrap">
            <div className="section-head">
              <p className="section-kicker">§3 · 家庭での続け方</p>
              <h2>1 日 1 枚。机に向かう数分の中に。</h2>
              <p className="section-lead">
                毎日続けることが目的ではありません。続けやすい設計に整えたうえで、その日できる 1 枚を渡しています。
              </p>
            </div>

            <div className="home-grid">
              <div className="home-card">
                <div className="hc-step">STEP 01</div>
                <h3>サンプル PDF を見る</h3>
                <p>各 SKU から代表 1 枚を無料で公開しています。難易度・出題数・親向け解説までそのまま確認できます。</p>
              </div>
              <div className="home-card">
                <div className="hc-step">STEP 02</div>
                <h3>今のレベルから 1 枚買う</h3>
                <p>¥200 一律。サブスクなし。レベル選びガイドで、お子さんの「今」に合う 1 枚を選べます。</p>
              </div>
              <div className="home-card">
                <div className="hc-step">STEP 03</div>
                <h3>印刷して、机の上で</h3>
                <p>A4 1 枚に収まる設計。書く学習は紙とペン。画面から離れて、点と点を線でつなぐ数分を作ります。</p>
              </div>
              <div className="home-card">
                <div className="hc-step">STEP 04</div>
                <h3>気が向いた日に、次の 1 枚</h3>
                <p>同じ SKU を繰り返してもよいし、次の Vol に進んでもよい。続け方は家庭ごとで違っていい設計です。</p>
              </div>
            </div>

            <aside className="home-memo">
              <h4>親へのひとこと</h4>
              <p>
                「毎日続いていますか」と聞かれることがあります。<br />
                続いていなくても大丈夫です。1 週間休んだ後の 1 枚も、最初の 1 枚と同じ価値です。
              </p>
            </aside>
          </div>
        </section>

        {/* ===================== §4 おためし ===================== */}
        <section className="s">
          <div className="wrap">
            <div className="section-head">
              <p className="section-kicker">§4 · おためし</p>
              <h2>おためし点描写メーカー</h2>
              <p className="section-lead">
                親の手元で、模写タスクを 5×5 まで作って印刷できる無料ツール。子に画面を見せる前の、親の確認用です。
              </p>
            </div>

            <div className="maker-promo">
              <div className="maker-text">
                <h3>作るのは画面、<br />練習は紙。</h3>
                <p>
                  画面上で問題を組み立て、PDF として書き出して印刷します。子どもに画面で解かせる機能はありません。点描写の練習はあくまで紙の上です。
                </p>
                <p className="pencil-aside">
                  5×5 を超える出題・線対称・回転・立体は商品 PDF に収録しています。メーカーは「親が今日 1 枚を作るための道具」として設計しています。
                </p>
                <a className="btn-medium" href="/maker">メーカーを開く →</a>
              </div>

              <div className="maker-art" aria-label="Maker preview">
                <div className="ma-corner">5 × 5 GRID</div>
                <svg className="ma-lines" viewBox="0 0 200 150" preserveAspectRatio="none">
                  <polyline points="50,30 100,30 150,80 100,120 50,80 50,30"
                    fill="none" stroke="#2C6E7F" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                </svg>
                <div className="ma-canvas-grid">
                  {Array.from({ length: 25 }, (_, i) => {
                    const active = [1, 3, 10, 14, 21].includes(i);
                    return <div key={i} className={`d${active ? " active" : ""}`} />;
                  })}
                </div>
                <div className="ma-label">TENZU MAKER · 模写 5×5</div>
              </div>
            </div>
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
                <li><a href="/maker">おためしメーカー</a></li>
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
