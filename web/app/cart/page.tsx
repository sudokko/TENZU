"use client";

/* カートページ（複数巻まとめ買い）。
   items を data.ts の volBySku で解決して一覧表示 → /api/checkout で Stripe へ。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import { useCart } from "./CartContext";
import {
  volBySku, volTitle, PRICE, QUESTIONS_PER_VOL,
  TIERS, cartTotal, currentTier,
} from "../products/data";
import "../products/product.css";
import "./cart.css";

export default function CartPage() {
  const { items, remove, ready } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = items
    .map((sku) => ({ sku, resolved: volBySku(sku) }))
    .filter((r) => r.resolved);
  /* まとめ買い割引は冊数だけで決まる（種類・レベルは見ない）。SSOT は products/data.ts */
  const gross = rows.length * PRICE;
  const total = cartTotal(rows.length);
  const tier = currentTier(rows.length);

  const checkout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: rows.map((r) => r.sku) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "決済の開始に失敗しました");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "決済の開始に失敗しました");
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/products">商品</a><span className="sep">/</span>
          <span className="cur">カート</span>
        </nav>
      </div>

      <main className="wrap cart-wrap">
        <h1 className="cart-title">カート</h1>

        {!ready ? (
          <p className="cart-empty">読み込み中…</p>
        ) : rows.length === 0 ? (
          <div className="cart-empty">
            <p>カートは空です。</p>
            <a className="btn-cart-link" href="/products">商品一覧を見る →</a>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {rows.map(({ sku, resolved }) => {
                const { task, vol } = resolved!;
                return (
                  <li className="cart-item" key={sku}>
                    <div className="cart-item-body">
                      <a className="cart-item-name" href={`/products/${sku}`}>
                        {volTitle(task, vol)}
                      </a>
                      <span className="cart-item-meta">
                        全 {QUESTIONS_PER_VOL} 問 · {vol.ageLabel} · PDF ダウンロード
                      </span>
                    </div>
                    <span className="cart-item-price mono">¥{PRICE}</span>
                    <button type="button" className="cart-item-remove"
                      onClick={() => remove(sku)} aria-label={`${volTitle(task, vol)} を削除`}>
                      削除
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="cart-foot">
              {/* 割引の正本。到達済みの段階を塗り、合計の冊数で決まることを明示する。
                  「あと◯冊で」型の煽り文言は置かない（総額はむしろ上がるため事実として誤り）。 */}
              <div className="cart-tier">
                <p className="cart-tier-h">まとめ買い割引</p>
                <ul className="cart-tier-steps">
                  {[...TIERS].reverse().map((t) => (
                    <li className={rows.length >= t.min ? "done" : undefined} key={t.min}>
                      <span className="q">{t.min} 冊から</span>
                      <span className="p mono">{Math.round(t.rate * 100)}% OFF</span>
                    </li>
                  ))}
                </ul>
                <p className="cart-tier-any">ちがう種類をまぜても、合計の冊数で決まります。</p>
              </div>

              {tier && (
                <>
                  <div className="cart-sub">
                    <span>小計（{rows.length} 冊）</span>
                    <span className="mono">¥{gross.toLocaleString()}</span>
                  </div>
                  <div className="cart-sub off">
                    <span>まとめ買い {tier.min} 冊から {Math.round(tier.rate * 100)}%</span>
                    <span className="mono">−¥{(gross - total).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="cart-total">
                <span>合計（税込）</span>
                <span className="cart-total-yen mono">¥{total.toLocaleString()}</span>
              </div>
              <p className="cart-total-note">{rows.length} 冊 · ダウンロード後、用紙・問題数・並びはいつでも変更できます</p>
              {error && <p className="cart-error" role="alert">{error}</p>}
              <button type="button" className="cart-checkout" onClick={checkout} disabled={busy}>
                {busy ? "決済画面へ移動中…" : "購入手続きへ"}
              </button>
              <p className="cart-secure">決済は Stripe の安全な画面で行われます</p>
            </div>
          </>
        )}
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
