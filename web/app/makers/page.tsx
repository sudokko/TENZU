import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import { MAKER_GROUPS, makersInGroup, VISIBLE_MAKERS } from "../products/makers";
import { MAKER_FIG } from "../products/maker-figs";
import { makerPriceLabel, MAKER_PRICE, FREE_MAKER } from "../products/capabilities";
import "./makers.css";

const MAKER_KINDS = VISIBLE_MAKERS.length;

/* メーカー商品群の公開まとめ（店先）。ここだけ indexed（各ツールは noindex）。 */
export const metadata: Metadata = {
  title: `点描写メーカー — ${MAKER_KINDS} 種類を自分で作る · TENZU`,
  description:
    `模写・鏡・移動・回転・欠け補完・重ね・分解・折り重ね。点描写プリントを ${MAKER_KINDS} 種類、家庭で作って PDF 印刷。模写は無料、ほかは各 ¥980 の買い切り。`,
};

export default function MakersPage() {
  return (
    <>
      <SiteHeader currentNav="メーカー" />
      <main className="makers-wrap">

        {/* ---- Hero ---- */}
        <section className="mk-hero">
          <p className="mk-kicker">点描写メーカー</p>
          <h1 className="mk-h1">点描写プリントを、自分で作る。</h1>
          <p className="mk-lead">
            写す・映す・ずらす・回す・補う、重ねる・分ける・折り返す。
            <b> {MAKER_KINDS} 種類</b>のメーカーで、家庭の練習プリントを思いどおりに作って、PDF で印刷できます。
            作るのは画面、練習は紙。
          </p>
          <div className="mk-hero-cta">
            <a className="mk-btn primary" href="/maker">まずは無料で試す（模写）</a>
          </div>
          <p className="mk-price-line">
            模写メーカーは<b>ずっと無料</b>。ほかのメーカーは <b>1 つ ¥{MAKER_PRICE} の買い切り</b>
            （月額なし・一度買えば無期限）。どのメーカーも、買う前に触って試せます。
          </p>
        </section>

        {/* ---- メーカー一覧（グループ別） ---- */}
        {MAKER_GROUPS.map((g) => (
          <section className="mk-group" key={g.key}>
            <div className="mk-group-head">
              <h2 className="mk-group-title">{g.title}</h2>
              <p className="mk-group-sub">{g.sub}</p>
            </div>
            <div className="mk-cards">
              {makersInGroup(g.key).map((m) => {
                const Fig = MAKER_FIG[m.key];
                const free = m.key === FREE_MAKER;
                return (
                  <a className="mk-card" href={m.href} key={m.key}>
                    <div className="mk-fig"><Fig /></div>
                    <div className="mk-card-body">
                      <div className="mk-card-head">
                        <span className="mk-name">{m.name}</span>
                        <span className={`mk-badge ${free ? "plan-guest" : "plan-paid"}`}>
                          {makerPriceLabel(m.key)}
                        </span>
                      </div>
                      <p className="mk-desc">{m.desc}</p>
                      <span className="mk-go">{free ? "無料で使う →" : "触って試す →"}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ))}

        {/* ---- クロージング ---- */}
        <section className="mk-close">
          <h2>まずは無料で、1 枚。</h2>
          <p>
            模写メーカーは、いつでも無料。ほかのメーカーも、買う前に触って試せます。
            気に入ったメーカーだけ <b>¥{MAKER_PRICE} の買い切り</b>で、PDF 書き出しが解放されます
            （月額なし・一度きり）。
          </p>
          <div className="mk-hero-cta">
            <a className="mk-btn primary" href="/maker">無料の模写メーカーへ</a>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
