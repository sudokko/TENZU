"use client";

/* クーポンの入力欄（初回限定・メールごとに1回のどちらも。プリントのカート・メーカーの購入確認ページで共通・lib/coupon.ts）。
   コードを /api/coupon で確かめ、使えるならメール欄を出す。確定した値は onChange で親へ渡し、
   親は決済の作成（/api/checkout・/api/maker-checkout）に coupon と email を添える。 */

import { useState } from "react";
import "./coupon-field.css";

export type AppliedCoupon = { code: string; amountOff: number; label: string; rule: "first" | "once" };

export default function CouponField({ onChange }: {
  onChange: (state: { coupon: AppliedCoupon | null; email: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const update = (next: AppliedCoupon | null, nextEmail = email) => {
    setCoupon(next);
    onChange({ coupon: next, email: nextEmail });
  };

  const apply = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "このクーポンコードは使えません。");
      update(data);
    } catch (e) {
      update(null);
      setError(e instanceof Error ? e.message : "このクーポンコードは使えません。");
    } finally {
      setChecking(false);
    }
  };

  return (
    <details className="coupon-field" open={coupon != null || undefined}>
      <summary>クーポンコードをお持ちの方</summary>
      <div className="coupon-field-row">
        <input type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
          aria-label="クーポンコード" placeholder="クーポンコード" value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); if (coupon) update(null); }} />
        <button type="button" onClick={apply} disabled={checking || code.trim() === ""}>
          {checking ? "確認中…" : "使う"}
        </button>
      </div>
      {error && <p className="coupon-field-error" role="alert">{error}</p>}
      {coupon && (
        <>
          <label className="coupon-field-email">
            <span>メールアドレス（{coupon.rule === "first" ? "はじめてのお買い物かを確かめます" : "このクーポンを使ったことがあるかを確かめます"}）</span>
            <input type="email" autoComplete="email" value={email}
              onChange={(e) => { setEmail(e.target.value); onChange({ coupon, email: e.target.value }); }} />
          </label>
          <p className="coupon-field-note">決済画面でも、このメールアドレスを使います。</p>
        </>
      )}
    </details>
  );
}
