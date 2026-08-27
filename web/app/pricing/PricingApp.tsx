"use client";

/* メーカー買い切りカタログ（decisions §4.6/§4.7）。
   模写は無料・ほかは各 ¥980 の買い切り（月額なし）。
   各メーカーの「買う」→ buyMaker → Stripe Checkout（payment mode）。
   所有済み（useAuth）には「購入済み」を表示。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import { useAuth } from "../AuthContext";
import {
  MAKER_PRICE, FREE_MAKER, ownsMaker, type MakerKey,
} from "../products/capabilities";
import { MAKER_GROUPS, makersInGroup } from "../products/makers";
import { buyMaker } from "../maker/buyMaker";
import SiteFooterMini from "../components/SiteFooterMini";

export default function PricingApp() {
  const { owned } = useAuth();
  const [busy, setBusy] = useState<MakerKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (key: MakerKey) => {
    setBusy(key);
    setError(null);
    try {
      await buyMaker(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "決済の開始に失敗しました");
      setBusy(null);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/makers">点描写メーカー</a><span className="sep">/</span>
          <span>料金</span>
        </nav>

        <div className="mem-head">
          <h1>メーカーの料金</h1>
          <p>
            模写メーカーは、ずっと無料。ほかのメーカーは <strong>1 つ ¥{MAKER_PRICE} の買い切り</strong>です。<br />
            月額はありません。一度買えば無期限。どのメーカーも、買う前に触って試せます。
          </p>
        </div>

        {MAKER_GROUPS.map((g) => (
          <section className="buy-group" key={g.key}>
            <div className="mem-head">
              <h2>{g.title}</h2>
              <p>{g.sub}</p>
            </div>
            <div className="buy-grid">
              {makersInGroup(g.key).map((m) => {
                const free = m.key === FREE_MAKER;
                const isOwned = ownsMaker(owned, m.key);
                return (
                  <div className="buy-card" key={m.key}>
                    <div className="buy-name">{m.name}</div>
                    <p className="buy-desc">{m.desc}</p>
                    <div className="buy-price">
                      {free ? "4×4まで無料" : <><strong>¥{MAKER_PRICE}</strong><span className="per"> 買い切り</span></>}
                    </div>
                    {free ? (
                      <a className="plan-cta" href={m.href}>いま使う</a>
                    ) : isOwned ? (
                      <a className="plan-cta current" href={m.href}>購入済み — 使う</a>
                    ) : (
                      <button
                        className="plan-cta primary"
                        type="button"
                        disabled={busy !== null}
                        onClick={() => buy(m.key)}
                      >
                        {busy === m.key ? "決済画面へ移動中…" : `¥${MAKER_PRICE} で購入`}
                      </button>
                    )}
                    <a className="buy-try" href={m.href}>先に試す →</a>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {error && <p className="plan-err" role="alert">{error}</p>}

        <p className="mem-note">
          決済は Stripe の安全な画面で行われます。購入後はそのまま書き出しが解放され、
          別の端末でもメールのリンクから復元できます。
          購入を復元したい方は <a href="/login">こちら</a> から。
        </p>
      </main>

      <SiteFooterMini />
    </>
  );
}
