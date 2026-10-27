"use client";

/* メーカー1種類の購入確認（買い切り・初回限定クーポン）。/api/maker-checkout で Stripe へ。 */

import { useState } from "react";
import CouponField, { type AppliedCoupon } from "../components/CouponField";
import { FREE_MAKER, MAKER_PRICE, type MakerKey } from "../products/capabilities";

export default function MakerBuy({ makerKey, name, href }: { makerKey: MakerKey; name: string; href: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [email, setEmail] = useState("");
  const pay = coupon ? Math.max(0, MAKER_PRICE - coupon.amountOff) : MAKER_PRICE;

  const checkout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/maker-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makers: [makerKey], ...(coupon ? { coupon: coupon.code, email } : {}) }),
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
      <ul className="cart-list">
        <li className="cart-item">
          <div className="cart-item-body">
            <a className="cart-item-name" href={href}>{name}（買い切り）</a>
            <span className="cart-item-meta">
              {makerKey === FREE_MAKER ? "5×5〜8×8 の問題作成と PDF 書き出し" : "PDF 書き出し"} · 期限なし · 購入後すぐにこの端末で使えます
            </span>
          </div>
          <span className="cart-item-price mono">¥{MAKER_PRICE}</span>
        </li>
      </ul>
      <div className="cart-foot">
        <CouponField onChange={(c) => { setCoupon(c.coupon); setEmail(c.email); }} />
        {coupon && (
          <>
            <div className="cart-sub">
              <span>小計</span>
              <span className="mono">¥{MAKER_PRICE.toLocaleString()}</span>
            </div>
            <div className="cart-sub off">
              <span>{coupon.label}</span>
              <span className="mono">−¥{(MAKER_PRICE - pay).toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="cart-total">
          <span>合計（税込）</span>
          <span className="cart-total-yen mono">¥{pay.toLocaleString()}</span>
        </div>
        <p className="cart-total-note">買い切り · 月額ではありません</p>
        {error && <p className="cart-error" role="alert">{error}</p>}
        <button type="button" className="cart-checkout" onClick={checkout} disabled={busy || (coupon != null && !email.includes("@"))}>
          {busy ? "決済画面へ移動中…" : "購入手続きへ"}
        </button>
        <p className="cart-secure">決済は Stripe の安全な画面で行われます</p>
      </div>
    </>
  );
}
