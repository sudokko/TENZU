"use client";

/* 通しプリセットの「まとめてカートへ」（種類の全巻を一括投入）。
   価格は持たない＝カート側のまとめ買い割引（data.ts tierRate）が唯一の値付け。
   variant: "bar"  … 種類ページのヘッド内（弱・白地に黒罫）
            "card" … 種類ページ末のカード内（強・既存 .btn-cart を流用）
   全巻が既にカートにある場合はカートへの導線へ表示替えする。 */

import { useCart } from "./CartContext";

const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
    <path d="M17 9V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
    <rect x="7" y="13" width="10" height="8" rx="2" />
  </svg>
);

export default function AddPresetButton({
  skus, variant,
}: { skus: string[]; variant: "bar" | "card" }) {
  const { addMany, items, ready } = useCart();
  const allIn = ready && skus.length > 0 && skus.every((s) => items.includes(s));
  const label = `${skus.length} 冊まとめてカートへ`;

  if (variant === "bar") {
    return allIn ? (
      <a className="preset-add is-incart" href="/cart">カートに入っています →</a>
    ) : (
      <button type="button" className="preset-add" onClick={() => addMany(skus)}>
        {label}
      </button>
    );
  }

  return allIn ? (
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
  ) : (
    <button type="button" className="btn-cart" onClick={() => addMany(skus)}>
      <span className="btn-cart-main"><CartIcon />{label}</span>
      <span className="btn-cart-sub">1 冊ずつでも買えます</span>
    </button>
  );
}
