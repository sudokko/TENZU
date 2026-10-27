"use client";

/* このブラウザに購入済みの印を立てる（mount 時 1 回・初回限定クーポンの補助）。
   サンクスページ側で payment_status=paid を確認済みのときだけマウントし、
   印はサーバー（/api/checkout/purchased）が Stripe で照合してから立てる。 */

import { useEffect } from "react";

export default function MarkPurchased({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    fetch("/api/checkout/purchased", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }, [sessionId]);
  return null;
}
