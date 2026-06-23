import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import AccountActions from "./AccountActions";
import { currentSession } from "../lib/auth";
import { PLANS } from "../products/capabilities";
import "../membership.css";

export const metadata: Metadata = {
  title: "会員ページ · TENZU メーカー",
  description: "TENZU メーカー会員のご契約・お支払いの管理。",
  robots: { index: false },
};

// cookie を読むため動的レンダリング。
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sess = await currentSession();
  const tier = sess?.tier ?? "guest";
  const planName =
    tier === "full" ? PLANS.full.name : tier === "entry" ? PLANS.entry.name : null;

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <div className="mem-head">
          <h1>会員ページ</h1>
        </div>

        <div className="mem-panel">
          {planName ? (
            <>
              <div className="account-status">
                <div className="as-label">ご利用中のプラン</div>
                <div className="as-plan">{planName}</div>
              </div>
              <AccountActions />
            </>
          ) : (
            <>
              <p className="mem-msg">
                現在ログインしていません。会員ページのご利用にはログインが必要です。
              </p>
              <hr className="account-actions acc-sep" />
              <div className="account-actions">
                <a className="mem-btn" href="/login">ログイン</a>
                <a className="mem-btn ghost" href="/pricing">プランを見る</a>
              </div>
            </>
          )}
        </div>

        <p className="mem-note">
          メーカーに戻る → <a href="/maker">おためし点描写メーカー</a>
        </p>
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
