import type { Metadata } from "next";
import Stripe from "stripe";
import SiteHeader from "../SiteHeader";
import TrackPurchase from "../TrackPurchase";
import { makerByKey } from "../products/makers";
import { MAKER_PRICE, PURCHASABLE_MAKERS, type MakerKey } from "../products/capabilities";
import "../membership.css";
import "./maker-thanks.css";
import SiteFooterMini from "../components/SiteFooterMini";

/* メーカー買い切りの決済完了画面（/api/auth/verify が success 時にここへ送る）。
   - ?m=mirror,fold … 今回購入したメーカー（CTA を大きく出す対象）。
   - 所有 cookie は verify が発行済み＝この端末は以後ログイン不要。
   - 別端末は復元（/login）へ案内。 */
export const metadata: Metadata = {
  title: "ご購入ありがとうございます",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const PAID = new Set<string>(PURCHASABLE_MAKERS);

export default async function MakerThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; sid?: string }>;
}) {
  const { m, sid } = await searchParams;
  const keys = (m ?? "").split(",").map((s) => s.trim()).filter((k): k is MakerKey => PAID.has(k));
  const makers = keys.map((k) => makerByKey(k)).filter((x): x is NonNullable<typeof x> => Boolean(x));

  // 購入計測（purchase）。sid は verify が付ける Checkout セッション ID。
  // 金額は Stripe から取り直す（URL の値は信用しない）。失敗しても画面は普通に出す。
  let purchaseValue: number | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (sid && stripeKey && makers.length > 0) {
    try {
      const stripe = new Stripe(stripeKey);
      const s = await stripe.checkout.sessions.retrieve(sid);
      if (s.payment_status === "paid") purchaseValue = s.amount_total ?? makers.length * MAKER_PRICE;
    } catch {
      /* 計測は諦める（サンクス画面自体は成立させる） */
    }
  }

  return (
    <>
      {purchaseValue !== null && sid && (
        <TrackPurchase
          transactionId={sid}
          value={purchaseValue}
          kind="maker"
          items={makers.map((mk) => ({ id: `maker-${mk.key}`, name: mk.name, price: MAKER_PRICE }))}
        />
      )}
      <SiteHeader />
      <main className="mem-wrap thanks-wrap">
        <div className="thanks-hero">
          <span className="thanks-check" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M4.8 8.2 7 10.4 11.2 5.8" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1>ご購入ありがとうございます。</h1>
          <p className="thanks-lead">
            {makers.length > 0
              ? "さっそく、買ったメーカーで作ってみましょう。"
              : "ご購入のメーカーをご利用いただけます。"}
          </p>
        </div>

        {/* 買ったメーカーへの大ボタン */}
        <div className="thanks-makers">
          {makers.length > 0 ? (
            makers.map((mk) => (
              <a className="thanks-cta" key={mk.key} href={mk.href}>
                <span className="tc-name">{mk.name}を使う</span>
                <span className="tc-sub">{mk.desc}</span>
                <span className="tc-arrow" aria-hidden="true">→</span>
              </a>
            ))
          ) : (
            <a className="thanks-cta" href="/makers">
              <span className="tc-name">メーカー一覧へ</span>
              <span className="tc-sub">購入したメーカーから作りはじめましょう。</span>
              <span className="tc-arrow" aria-hidden="true">→</span>
            </a>
          )}
        </div>

        {/* 同じブラウザ / 別ブラウザの案内 */}
        <div className="thanks-notes">
          <div className="thanks-note ok">
            <b>このブラウザは、これでOK。</b>
            買い切りなので月額はありません。次に開くときも、そのまま使えます。
            ログインやパスワードは必要ありません。
          </div>
          <div className="thanks-note">
            <b>別のスマホ・パソコンでも使うときは。</b>
            お買い上げの権利はブラウザごとに記録されるので、ほかの端末では一度だけ追加の操作が要ります。
            ご購入時に届いたメールのボタン、または
            <a href="/login"> こちらから</a>
            （ご購入時のメールアドレスへリンクをお送りします）。何台でも・追加料金はありません。
            <br />
            メール内のリンクは安全のため 30 分で切れますが、切れていても同じページから何度でも送り直せます。
          </div>
        </div>

        <p className="mem-note">
          ほかのメーカーも見る → <a href="/makers">点描写メーカー一覧</a>
        </p>
      </main>

      <SiteFooterMini />
    </>
  );
}
