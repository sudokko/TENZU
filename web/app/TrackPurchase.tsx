"use client";

/* 購入完了の計測発火（mount 時 1 回）。payment_status=paid を確認済みの
   サンクスページ（/checkout/success・/maker-thanks）でのみマウントする。
   再訪・リロードの重複は analytics.ts 側の transaction_id ガードが吸収する。 */

import { useEffect } from "react";
import { trackPurchase, type PurchaseItem } from "./analytics";

export default function TrackPurchase({
  transactionId,
  value,
  kind,
  items,
}: {
  transactionId: string;
  value: number;
  kind: "paper" | "maker";
  items: PurchaseItem[];
}) {
  useEffect(() => {
    trackPurchase({ transactionId, value, kind, items });
  }, [transactionId, value, kind, items]);
  return null;
}
