"use client";

/* 決済成功時にカートを空にする（mount 時 1 回）。サンクスページ側で
   payment_status=paid を確認済みのときだけマウントする。 */

import { useEffect } from "react";
import { useCart } from "../../cart/CartContext";

export default function ClearCartOnSuccess() {
  const { clear } = useCart();
  useEffect(() => { clear(); }, [clear]);
  return null;
}
