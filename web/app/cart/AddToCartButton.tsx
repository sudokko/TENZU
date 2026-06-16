"use client";

/* 商品詳細の「カートへ」ボタン（旧 btn-cart スタブの置き換え）。
   追加済みなら「カートを見る」へ表示替え。見た目は既存 .btn-cart を踏襲。 */

import { useCart } from "./CartContext";

export default function AddToCartButton({ sku }: { sku: string }) {
  const { add, has, ready } = useCart();
  const inCart = ready && has(sku);

  if (inCart) {
    return (
      <div className="cta-row">
        <a className="btn-cart is-incart" href="/cart">
          <span className="btn-cart-main">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            カートに入っています
          </span>
          <span className="btn-cart-sub">カートを見る →</span>
        </a>
      </div>
    );
  }

  return (
    <div className="cta-row">
      <button type="button" className="btn-cart" onClick={() => add(sku)}>
        <span className="btn-cart-main">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
            <path d="M17 9V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
            <rect x="7" y="13" width="10" height="8" rx="2" />
          </svg>
          カートへ
        </span>
        <span className="btn-cart-sub">印刷は、おうちのプリンタで</span>
      </button>
    </div>
  );
}
