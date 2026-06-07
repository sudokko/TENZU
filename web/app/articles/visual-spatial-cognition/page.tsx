import type { Metadata } from "next";
import SiteHeader from "../../SiteHeader";
import "../article.css";

export const metadata: Metadata = {
  title: "点描写の手前にあるもの — 視覚空間認知の足場 · TENZU",
  description:
    "「写す」前に何が起きているか。点描写を始めるその数秒の間に、目はもう動いている。Pillar 1 · 図形の手前 第 1 回。",
};

const RELATED = [
  {
    meta: "PILLAR 1 · 第 2 回",
    title: "点と点の距離を測る目",
    lead: "Lv.1 と Lv.2 の差を、実例で。「数えて写す」から「測って写す」への切り替え。",
  },
  {
    meta: "PILLAR 1 · 第 3 回",
    title: "「全体を先に見る」とは何か",
    lead: "手本に視線を 1 度走らせる数秒の中で、何が起きているか。",
  },
  {
    meta: "PILLAR 2 · 第 1 回",
    title: "変換タスクとは",
    lead: "線対称・回転・平行移動・拡大縮小。9 タスクの第二段。",
  },
];

export default function ArticleVisualSpatialCognition() {
  return (
    <>
      <SiteHeader currentNav="記事" />

      <nav className="crumb-article" aria-label="パンくず">
        <a href="#">記事</a><span className="sep">/</span>
        <a href="#">Pillar 1 · 図形の手前</a><span className="sep">/</span>
        <span className="cur">点描写の手前にあるもの</span>
      </nav>

      <div className="wrap-article">
        <header className="article-meta">
          <div className="kicker">PILLAR 1 · 図形の手前</div>
          <div className="pillar-bar">
            <span>第 1 回 / 全 6 回</span>
            <span className="pdate">· 2026-05-20</span>
            <span className="pdate">· 読了 8 分</span>
          </div>
          <h1>点描写の手前にあるもの<br />— 視覚空間認知の足場</h1>
          <p className="lead">
            「写す」前に何が起きているか。点描写を始めるその数秒の間に、目はもう動いている。
          </p>
          <div className="author">
            <span className="by">執筆 · </span>店主 · 2026-05-20
          </div>
        </header>

        <article className="article-body">
          <p className="lead-graf">
            図形が苦手なお子さんを、と聞かれて気付くのは、「図形が苦手」より先に「写す前に何を見ているか」が育っていないことが多い、ということです。点描写は、その手前の練習として置かれます。
          </p>

          <h2>視覚空間認知とは</h2>

          <p>
            視覚空間認知 (visual-spatial cognition) は、ものの向き・位置・大きさを目で捉えて、頭の中で再構成する力です。算数の図形問題で扱うのは、その力が育った後の話です。手前にあるのは、「点の位置を見る」「線の方向を見る」「全体を一度見てから細部に降りる」という、もっと地味な動作の集まりです。
          </p>

          <div className="diagram">
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="視覚空間認知の図解">
              <g fill="#1A1F2A" opacity="0.16">
                {Array.from({ length: 5 }, (_, r) =>
                  Array.from({ length: 5 }, (_, c) => (
                    <circle key={`${r}-${c}`} cx={20 + c * 20} cy={20 + r * 20} r={1.5} />
                  ))
                )}
              </g>
              <polyline
                points="40,40 80,40 80,80 40,80 40,40"
                fill="none" stroke="#1A1F2A" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx={60} cy={60} r={3} fill="#2C6E7F" />
            </svg>
            <div className="dcap">
              <b>「写す」の手前にある 3 段階</b>
              ① 全体を見る ／ ② 起点を決める ／ ③ 距離と方向を確認する。<br />
              点描写は、この 3 段階を毎回繰り返す練習として設計されています。
            </div>
          </div>

          <p>
            4–9 歳でこの段階を経験しておくと、その後の図形問題・漢字書字・地図読みで「どこから見るか」が安定する、という観察があります。TENZU は受験対策ではなく、この段階を「家庭で短時間、繰り返し置ける形」に整えています。
          </p>

          <h2>研究の引用と TENZU の訳</h2>

          <p>
            視覚空間処理が学業達成と関連する、という主張は複数の論文で言われています。TENZU はその根拠を、親が読める言葉に翻訳して提示します。
          </p>

          <div className="tenzu-translate">
            <p className="src">
              &ldquo;Visual-spatial processing skills uniquely predict mathematics achievement above and beyond verbal abilities, and contribute to handwriting fluency in early elementary years.&rdquo;
              <span className="cite">— Mix &amp; Cheng (2012), Cognitive Development · 1 例として</span>
            </p>
            <p className="label">TENZU 訳</p>
            <p className="trans">
              図形を見て写し取る力は、ことばの力とは別に、算数の力につながります。<br />
              同じ力は、早い時期の手書きの滑らかさにも関係しています。
            </p>
          </div>

          <p>
            この訳は、論文の主張を弱めずに、しかし親の生活語彙に寄せて書き直しています。元の主張に同意できない方は、原典のリンクから論文に当たってください。TENZU は「研究によると」という権威的な使い方を避け、根拠の所在を毎回明示します。
          </p>

          <h2>点描写は「写す」だけの練習ではない</h2>

          <div className="article-quote">
            <p className="q">
              「写す前に、どこを見るか」<br />が、図形の手前にある力です。
            </p>
            <p className="a">— TENZU · 9 タスク設計ノート</p>
          </div>

          <p>点描写は、見本の図を写すだけの作業に見えます。実際には次の動作が連続します:</p>

          <ul>
            <li>手本の全体形を一度見る（数秒）</li>
            <li>写し始める起点を決める（左上か中央か）</li>
            <li>起点から次の点までの距離を測る</li>
            <li>線を引く方向を決める</li>
            <li>1 つの辺を引き終えたら、次の起点を決め直す</li>
            <li>全体が閉じたか、最後に確認する</li>
          </ul>

          <p>
            このうちのどれかが抜けていると、写し終えても線が歪んだり、閉じなかったりします。「うまく写せない」のではなく、「写す前の段階で目が動いていない」ことが多い、というのが TENZU の観察です。
          </p>

          <aside className="article-sidenote" data-system="info">
            <div className="sn-label">DEV NOTE · 2026-05-20</div>
            <p className="sn-body">
              この記事は「視覚空間認知」という言葉を最初に出す Pillar 1 の入口として書かれました。次の記事「点と点の距離を測る目」で、Lv.1 と Lv.2 の差を実例で扱います。記事は順に読まなくても独立に意味が通る設計にしています。
            </p>
          </aside>

          <h3>次の 1 枚をどう選ぶか</h3>

          <p>
            もし「写す前に、どこを見るか」が育っていないと感じたら、Lv.1 から始めることをおすすめします。Lv.2 以降に飛ばすのは可能ですが、Lv.1 の数枚で「全体を見る」癖を作っておくと、Lv.2 の体験が変わります。
          </p>

          <p>
            逆に Lv.1 が物足りない様子なら、Lv.2 を試して、戻る判断は親の側で残しておけば大丈夫です。同じレベルを 2 度買う必要はありません（PDF は印刷自由）。レベルを行き来する設計です。
          </p>
        </article>
      </div>

      {/* related */}
      <section className="s-article">
        <div className="wrap">
          <h2 className="outer">Pillar 1 の続き</h2>
          <div className="related-articles">
            {RELATED.map((r) => (
              <a className="ra" href="#" key={r.title}>
                <div className="ra-meta">{r.meta}</div>
                <div className="ra-title">{r.title}</div>
                <div className="ra-lead">{r.lead}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="site footer-article">
        <div className="wrap">
          © 2026 TENZU · 点図形（点描写）プリントの専門店
        </div>
      </footer>
    </>
  );
}
