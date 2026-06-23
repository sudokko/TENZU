"use client";

/* 会員ページの操作ボタン（クライアント）。
   - ご契約の管理 → /api/billing-portal で Stripe Billing Portal へ（解約・支払い変更）。
   - ログアウト → AuthContext.logout（cookie 失効）→ トップへ。 */

import { useState } from "react";
import { useAuth } from "../AuthContext";

export default function AccountActions() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "ポータルを開けませんでした");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "ポータルを開けませんでした");
      setBusy(false);
    }
  };

  const doLogout = async () => {
    setBusy(true);
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="account-actions">
      <button className="mem-btn" type="button" onClick={openPortal} disabled={busy}>
        {busy ? "移動中…" : "ご契約・お支払いの管理（解約もこちら）"}
      </button>
      {error && <p className="mem-msg err" role="alert">{error}</p>}
      <hr className="acc-sep" />
      <button className="mem-btn ghost" type="button" onClick={doLogout} disabled={busy}>
        ログアウト
      </button>
    </div>
  );
}
