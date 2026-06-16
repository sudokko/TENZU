"use client";

/* ヘッダーのカートバッジ（旧ハードコード「カート (0)」の置き換え）。
   件数はクライアント状態。hydration 前（ready=false）は 0 表示で SSR と一致。 */

import { useCart } from "./CartContext";

export default function CartBadge() {
  const { count, ready } = useCart();
  const n = ready ? count : 0;
  return (
    <a className="cart-button" href="/cart" aria-label={`カート（${n} 点）`}>
      カート ({n})
    </a>
  );
}
