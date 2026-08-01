/* =========================================================================
   /products/design — 設計台帳
   「設計図ごと、全部公開する」（foundation/brand.md §0.5）の実装。
   公開中の全巻について、巻の設計仕様・難易度窓・実際に収録した問題を並べる。

   ★ 本文の数値・仕様は 1 つもここに書かない。すべて products/ledger.ts の導出。
     難易度の式の文言も problems/gen/difficulty.ts（式のコードと同居）から取る。
     難易度も収録問題も今後まるごと再設計される前提のため、ここは「並べるだけ」に保つ。
   導線はフッター 1 本のみ（グローバルナビには出さない）。検索には出したいので noindex にしない。
   ========================================================================= */

import type { Metadata } from "next";
import SiteHeader from "../../SiteHeader";
import { SiteFooter } from "../../catalog";
import { absoluteUrl } from "../../site";
import { buildLedger, type LedgerRow } from "../ledger";
import { D_BASE_FORMULA, D_TERM_NOTES } from "../problems/gen/difficulty";
import DWorkedExamples from "./DWorkedExample";
import { QUESTIONS_PER_VOL } from "../data";
import "../product.css";
import "./design.css";

export const metadata: Metadata = {
  title: "設計台帳 — 全巻の設計仕様と難易度",
  description:
    "TENZU が公開しているすべての点図形（点描写）プリントについて、巻ごとの設計仕様・難易度スコアの算出式・実際に収録した問題の実測値を公開しています。",
  alternates: { canonical: "/products/design" },
};

export default function DesignLedgerPage() {
  const ledger = buildLedger();

  /* JSON-LD: 台帳に載っている巻の ItemList。
     このページの主張（体系立った巻がこれだけある）を機械可読でも出す。 */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TENZU 設計台帳 — 公開中の全巻",
    numberOfItems: ledger.volCount,
    itemListElement: ledger.tasks.flatMap((t) => t.rows).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(r.href),
      name: `${r.taskName} ${r.lvName} Vol.${r.volNo}（${r.grid}）`,
    })),
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader currentNav="プリントを探す" />

      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <span className="cur">設計台帳</span>
        </nav>
      </div>

      <main>
        {/* ============ HEAD ============ */}
        <div className="wrap">
          <header className="dl-head">
            <h1 className="dl-title">設計台帳</h1>
            <p className="dl-sub">
              公開しているプリントを、どんな決まりで作っているか。
              巻ごとの設計仕様と、実際に入っている問題の実測値をそのまま並べています。
            </p>
            <dl className="dl-counts">
              <div>
                <dt>タスク</dt>
                <dd>{ledger.taskCount}<small>（公開中 {ledger.liveTaskCount}）</small></dd>
              </div>
              <div><dt>レベル</dt><dd>{ledger.lvCount}</dd></div>
              <div><dt>公開中の巻</dt><dd>{ledger.volCount}</dd></div>
              <div><dt>収録している問題</dt><dd>{ledger.problemCount}</dd></div>
            </dl>
          </header>
        </div>

        {/* ============ なぜ公開するか ============ */}
        <section className="s dl-prose">
          <div className="wrap">
            <h2 className="h2-product">なぜ中身まで公開するのか</h2>
            <p>
              プリント教材は、買ってみるまで中身がわからないことがほとんどです。
              「レベル3」と書いてあっても、その3が何を根拠にした3なのかは、たいてい書かれていません。
              買った側は、届いてから「思っていたのと違う」と気づくことになります。
            </p>
            <p>
              TENZU は、そこを開けておくことにしました。
              どの巻がどんな決まりで作られているか、その決まりを満たした問題が実際に何問入っているか、
              数えられるものは数えたまま出します。比べたうえで選べるほうが、家庭にとって確実だからです。
            </p>
          </div>
        </section>

        {/* ============ 二層設計 ============ */}
        <section className="s dl-prose">
          <div className="wrap">
            <h2 className="h2-product">巻の決め方 — 二層で刻む</h2>
            <p>
              巻の難しさは、性質のちがう二つの層で決めています。
            </p>
            <ol className="dl-layers">
              <li>
                <b>巻そのもの</b>は「盤面の大きさ」と「ゲート条件」で決まります。
                3×3 から 7×7 までの盤面と、たとえば「ななめの線を必ず入れる」「45°でない傾きを必ず入れる」といった条件です。
                同じ盤面でも、通すゲートが違えば別の巻になります。
              </li>
              <li>
                <b>巻の中の{QUESTIONS_PER_VOL}問</b>は、難易度スコア D の窓で散らします。
                巻の入口から出口までがなだらかにつながるよう、下限と上限を決めて、その幅の中に問題を並べています。
              </li>
            </ol>
            <p>
              役割分担としては、レベルを決めるのは盤面とゲート条件、
              D は「その中でのやさしい・難しい」を測る物差しです。
              D の式にも盤面の項は入っていますが（広いほど点を探す負荷が上がるため）、
              同じ巻の中では盤面が変わらないので、巻内の並び順は図形そのものの性質で決まります。
            </p>
          </div>
        </section>

        {/* ============ D の式 ============ */}
        <section className="s dl-prose">
          <div className="wrap">
            <h2 className="h2-product">難易度スコア D の出し方</h2>
            <p>
              まず、すべてのタスクに共通の<b>土台の式</b>があります。
              図形そのものの「写しにくさ」を測る式です。
            </p>
            <p className="dl-formula">{D_BASE_FORMULA}</p>

            {/* 用語の定義（文言 SSOT＝difficulty.ts の D_TERM_NOTES） */}
            <dl className="dl-terms">
              {D_TERM_NOTES.map((t) => (
                <div className="dl-terms-row" key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.note}</dd>
                </div>
              ))}
            </dl>

            {/* 実際の収録問題での計算例（published から自動選定・数値は全部実データ） */}
            <DWorkedExamples />

            <p>
              そのうえで、タスクごとに固有の負荷（欠けを見つける・見えない辺を推すなど）が
              あるものは、土台の式に項を足しています。公開中のタスクについて、
              省略せずに書き下すと次のとおりです。
            </p>
            {/* タスク別の完全な式（文言 SSOT＝difficulty.ts の D_TASK_FULL_FORMULA・
                部品から合成しているので係数を直すと全ページが追随する） */}
            <dl className="dl-formula-list">
              {ledger.tasks.map((t) => (
                <div className="dl-formula-row" key={t.slug}>
                  <dt>{t.name}</dt>
                  <dd>
                    {t.formula}
                    {t.excludes && <span className="dl-formula-note">{t.excludes}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="dl-caveat">
              D は運用しながら校正を続けている物差しです（現行は 2026 年 7 月改訂の第 3 版。
              係数は発達心理学・知覚心理学の古典的知見——斜線の知覚が縦横より不安定になる
              「斜線効果」、対称図形が知覚的にまとまりやすいというゲシュタルトの知見など——を
              参考に、実際の紙面での手応えと突き合わせて決めています）。
              D40 の問題が D20 の 2 倍難しい、という意味の数値ではありません。
              同じタスクの中で並べたときの相対的な目安として読んでください。
            </p>
          </div>
        </section>

        {/* ============ 台帳本体 ============ */}
        <section className="s">
          <div className="wrap">
            <h2 className="h2-product">巻ごとの設計仕様</h2>
            <p className="lead">
              公開中の {ledger.volCount} 巻。準備中の巻は載せていません。
            </p>

            {ledger.tasks.map((t) => (
              <div className="dl-task" key={t.slug}>
                <div className="dl-task-head">
                  <h3 className="dl-task-name">
                    {t.name}
                    <span className="dl-task-count">
                      {t.rows.length > 0 ? `${t.rows.length}巻` : "準備中"}
                    </span>
                  </h3>
                  <p className="dl-task-formula">
                    D の式：{t.formula}
                    {t.excludes && <>（{t.excludes}）</>}
                  </p>
                </div>

                {/* 公開巻がまだ無いタスクも、体系として用意していることは見せる。
                    巻の中身（仕様・D 窓・収録問題）は公開してから出す。 */}
                {t.rows.length === 0 ? (
                  <p className="dl-task-prep">
                    設計はできていますが、まだ公開している巻がありません。
                    公開したらこの欄に、巻ごとの設計仕様と収録した問題が並びます。
                  </p>
                ) : (
                  <div className="dl-rows">
                    {t.rows.map((r) => <LedgerVolRow row={r} key={r.sku} />)}
                  </div>
                )}

                {/* 問粒度。畳んでいても HTML には含まれる＝機械からは全問読める */}
                {t.rows.some((r) => r.cov) && (
                  <details className="dl-detail">
                    <summary>
                      {t.name}に収録している問題を1問ずつ見る
                      <span className="cov-chev" aria-hidden="true" />
                    </summary>
                    {t.rows.filter((r) => r.cov).map((r) => (
                      <div className="dl-detail-vol" key={r.sku}>
                        <h4 className="dl-detail-name">
                          {r.lvName} Vol.{r.volNo}・{r.grid}
                        </h4>
                        <ol className="cov-list">
                          {r.cov!.rows.map((p) => (
                            <li className="cov-row" key={p.no}>
                              <span className="cov-no">問{p.no}</span>
                              <span className="cov-body">
                                {p.metrics}
                                {r.cov!.showRowTransform && p.transform && (
                                  <span className="cov-tr">{p.transform}</span>
                                )}
                                {/* D の導出。各項が“どう出たか”まで1行ずつ＝この数値の根拠が
                                    行だけで完結する（設計台帳＝全部見せるページなので詳しく） */}
                                {p.dDetail && (
                                  <span className="cov-dcalc">
                                    {p.dDetail.map((line) => <span key={line}>{line}</span>)}
                                  </span>
                                )}
                              </span>
                              {p.d !== undefined && <span className="cov-d">D {p.d}</span>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ============ 作り方 ============ */}
        <section className="s dl-prose">
          <div className="wrap">
            <h2 className="h2-product">1冊ができるまで</h2>
            <ol className="dl-flow">
              <li>
                <b>巻の仕様を決める</b> — 盤面・ゲート条件・D の窓を先に決めます。上の表がその中身です。
              </li>
              <li>
                <b>候補を生成する</b> — 仕様を満たす図形を作り、同じ形が重ならないよう振り分けます。
              </li>
              <li>
                <b>1問ずつ見て採る</b> — 生成した候補を目で確かめ、線がつぶれていないか、
                子が読み取れる形かを確認して、{QUESTIONS_PER_VOL}問だけ採用します。
              </li>
              <li>
                <b>並べて出す</b> — 採った{QUESTIONS_PER_VOL}問を、やさしいほうから順に並べて1冊にします。
              </li>
            </ol>
            <p>
              手を入れた巻は、商品ページに改訂日を出しています。
              買ったあとに問題が差し替わっても、同じリンクから作り直したものを受け取れます。
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/* 1 巻ぶんの行。設計仕様チップ ＋ 設計 D窓 ＋ 実測。
   D 窓を持たないタスク・D 未算出の巻でも崩れないよう、各項は個別に出し分ける。 */
function LedgerVolRow({ row }: { row: LedgerRow }) {
  const cov = row.cov;
  return (
    <article className="dl-row">
      <div className="dl-row-head">
        <a className="dl-row-name" href={row.href}>
          <span className="dl-row-lv">LV.{row.lvNo}</span>
          {row.lvName} Vol.{row.volNo}
          <span className="dl-row-grid">{row.grid}</span>
        </a>
        <span className="dl-row-sku mono">{row.sku}</span>
      </div>

      {row.spec.length > 0 && (
        <ul className="dl-spec">
          {row.spec.map((s) => (
            <li className="dl-spec-item" key={s.key}>
              <span className="dl-spec-label">{s.label}</span>
              <span className="dl-spec-value">{s.value}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="dl-meas">
        {row.dWindow && (
          <div>
            <dt>設計時の D 窓</dt>
            <dd className="mono">{row.dWindow[0]}〜{row.dWindow[1]}</dd>
          </div>
        )}
        {cov && (
          <div>
            <dt>収録</dt>
            <dd className="mono">{cov.count} 問</dd>
          </div>
        )}
        {cov?.d && (
          <div>
            <dt>実測の D</dt>
            <dd className="mono">{cov.d[0]}〜{cov.d[1]}</dd>
          </div>
        )}
        {cov && !cov.d && (
          <div>
            <dt>実測の D</dt>
            <dd className="dl-meas-none">未算出（旧形式のまま）</dd>
          </div>
        )}
        {cov && (
          <div>
            <dt>線の本数</dt>
            <dd className="mono">{cov.lines[0]}〜{cov.lines[1]}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
