import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import { BOOK } from "./hajimete/catalog";
import BookBuyButton from "./BookBuyButton";
import BookFigure from "./BookFigure";
import "./book-lp.css";

export const metadata: Metadata = {
  title: `${BOOK.title}｜${BOOK.subtitle}`,
  description: `TENZUの本『${BOOK.title}』。たす（欠け補完）・うつす（模写）の${BOOK.total}問を、3×3から5×5まで6つの段階に。同じ${BOOK.total}問を何度でも印刷できる特典PDFつき。`,
  alternates: { canonical: BOOK.lpHref },
  // 発売前は検索に出さない（amazonUrl が入ったら index）
  robots: BOOK.amazonUrl ? undefined : { index: false, follow: true },
};

/** 横スワイプのカード。各段階から、本に入っている「うつす」の問題を1問ずつ。 */
const LEVELS = [
  { lv: "Lv.1", grid: "3×3", fresh: "たて・よこの線", sku: "copy-lv1-vol1", id: "copy-lv1-vol1-s1-24" },
  { lv: "Lv.2", grid: "3×3", fresh: "ななめの線", sku: "copy-lv2-vol1", id: "copy-lv2-vol1-s1-22" },
  { lv: "Lv.3 Vol.1", grid: "4×4", fresh: "盤面が広がり、線が交わる", sku: "copy-lv3-vol1", id: "copy-lv3-vol1-s1-02" },
  { lv: "Lv.3 Vol.2", grid: "4×4", fresh: "45°でないななめ", sku: "copy-lv3-vol2", id: "copy-lv3-vol2-s1-15" },
  { lv: "Lv.4 Vol.1", grid: "5×5", fresh: "5×5へ（線は45°まで）", sku: "copy-lv4-vol1", id: "copy-lv4-vol1-motif-s1-77" },
  { lv: "Lv.4 Vol.2", grid: "5×5", fresh: "5×5で45°でないななめ", sku: "copy-lv4-vol2", id: "copy-lv4-vol2-s1-16" },
];

const FACTS = [
  { big: String(BOOK.total), unit: "問", note: "たす72・うつす72" },
  { big: "6", unit: "段階", note: "3×3から5×5まで" },
  { big: "B5", unit: "", note: "1ページ2問、大きな図" },
  { big: "PDF", unit: "", note: "全問を何度でも印刷" },
];

const FITS = ["点つなぎの次を探している", "点図形にはじめて取り組む", "紙とえんぴつで練習させたい"];

const FAQ = [
  { q: "何才から使えますか？", a: "4〜6才ごろが目安です。点から点へ線が引けるようになったら始めどきです。" },
  { q: "特典PDFはどう受け取りますか？", a: `本の${BOOK.codePage}ページにある受取コードを、TENZUのサイトで入力します。期限なし・メール登録なしです。` },
  { q: "答えのページはありますか？", a: "見本がそのまま答えです。描き終えたら、見本と見比べます。" },
];

function Check() {
  return <svg className="booklp-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
}

export default function BookLandingPage() {
  return <><SiteHeader /><main className="booklp">
    <section className="booklp-hero" aria-labelledby="booklp-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="booklp-cover" src={BOOK.cover} width={741} height={1024} alt={`${BOOK.title}の表紙`} />
      <h1 id="booklp-title">{BOOK.title}</h1>
      <p className="booklp-sub">{BOOK.subtitle}</p>
      <p className="booklp-price">¥{BOOK.price.toLocaleString("ja-JP")}<span>税込</span></p>
      <BookBuyButton place="hero" />
    </section>

    <section className="booklp-facts" aria-label="この本の特徴">
      {FACTS.map((f) => <div key={f.big} className="booklp-fact">
        <span className="booklp-fact-big">{f.big}{f.unit && <small>{f.unit}</small>}</span>
        <span className="booklp-fact-note">{f.note}</span>
      </div>)}
    </section>

    <section className="booklp-levels" aria-labelledby="booklp-levels-title">
      <div className="booklp-levels-head">
        <h2 id="booklp-levels-title">こんな問題が入っています</h2>
        <span aria-hidden="true">横にスワイプ</span>
      </div>
      <ol className="booklp-swipe">
        {LEVELS.map((l) => <li key={l.sku} className="booklp-card">
          <div className="booklp-card-fig"><BookFigure sku={l.sku} id={l.id} /></div>
          <span className="booklp-card-lv">{l.lv}　{l.grid}</span>
          <span className="booklp-card-fresh">{l.fresh}</span>
        </li>)}
      </ol>
      <p className="booklp-note">各段階に、たす12問 → うつす12問。</p>
    </section>

    <section className="booklp-fits" aria-labelledby="booklp-fits-title">
      <h2 id="booklp-fits-title">こんなときに</h2>
      <ul>{FITS.map((t) => <li key={t}><Check />{t}</li>)}</ul>
    </section>

    <section className="booklp-faq" aria-labelledby="booklp-faq-title">
      <h2 id="booklp-faq-title">よくある質問</h2>
      {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
    </section>

    <section className="booklp-bottom" aria-label="購入">
      <BookBuyButton place="bottom" withPrice />
      <p className="booklp-note">本をお持ちの方は <a href={BOOK.href}>特典PDFの受け取り</a> へ。</p>
    </section>
  </main><SiteFooter /></>;
}
