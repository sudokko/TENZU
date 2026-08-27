import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import AccountActions from "./AccountActions";
import { readOwned } from "../lib/auth";
import { makerByKey } from "../products/makers";
import "../membership.css";
import SiteFooterMini from "../components/SiteFooterMini";

export const metadata: Metadata = {
  title: "マイページ",
  description: "購入した点描写メーカーの確認と、別端末への復元。",
  robots: { index: false },
};

// cookie を読むため動的レンダリング。
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const owned = await readOwned();
  const items = owned.map((k) => makerByKey(k)).filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <div className="mem-head">
          <h1>マイページ</h1>
        </div>

        <div className="mem-panel">
          {items.length > 0 ? (
            <>
              <div className="account-status">
                <div className="as-label">購入済みのメーカー（買い切り・無期限）</div>
                <ul className="owned-list">
                  {items.map((m) => (
                    <li key={m.key}>
                      <a href={m.href}>{m.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <AccountActions />
            </>
          ) : (
            <>
              <p className="mem-msg">
                この端末には購入済みのメーカーがありません。<br />
                別の端末で購入された方は、メールに届いた復元リンク、または下の「購入を復元」からどうぞ。
              </p>
              <hr className="account-actions acc-sep" />
              <div className="account-actions">
                <a className="mem-btn" href="/login">購入を復元</a>
                <a className="mem-btn ghost" href="/makers">メーカーを見る</a>
              </div>
            </>
          )}
        </div>

        <p className="mem-note">
          メーカーに戻る → <a href="/makers">点描写メーカー一覧</a>
        </p>
      </main>

      <SiteFooterMini />
    </>
  );
}
