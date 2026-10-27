import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import SiteFooterMini from "../components/SiteFooterMini";
import { makerByKey } from "../products/makers";
import { PURCHASABLE_MAKERS, type MakerKey } from "../products/capabilities";
import MakerBuy from "./MakerBuy";
import "../products/product.css";
import "../cart/cart.css";

/* メーカー買い切りの購入確認（buyMaker がここへ送る）。初回限定クーポンを入れる場所が要るため、
   Stripe へ直接は飛ばさず1枚はさむ。?m=<メーカー> の1種類だけ。 */
export const metadata: Metadata = {
  title: "購入の確認",
  robots: { index: false },
};

const PAID = new Set<string>(PURCHASABLE_MAKERS);

export default async function MakerBuyPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const meta = m && PAID.has(m) ? makerByKey(m as MakerKey) : undefined;
  return (
    <>
      <SiteHeader currentNav="つくる" />
      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/makers">メーカー</a><span className="sep">/</span>
          <span className="cur">購入の確認</span>
        </nav>
      </div>
      <main className="wrap cart-wrap">
        <h1 className="cart-title">購入の確認</h1>
        {meta ? <MakerBuy makerKey={meta.key} name={meta.name} href={meta.href} /> : (
          <div className="cart-empty">
            <p>購入するメーカーが見つかりませんでした。</p>
            <a className="btn-cart-link" href="/makers">メーカー一覧を見る →</a>
          </div>
        )}
      </main>
      <SiteFooterMini />
    </>
  );
}
