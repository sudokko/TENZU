"use client";

/* マイページの操作ボタン（クライアント）。
   買い切りは解約概念がないため契約管理ポータルは廃止。
   - 購入を復元（別端末）→ /login（メールに復元リンクを送る）。
   - ログアウト → AuthContext.logout（cookie 失効）→ トップへ。 */

import { useState } from "react";
import { useAuth } from "../AuthContext";

export default function AccountActions() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const doLogout = async () => {
    setBusy(true);
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="account-actions">
      <a className="mem-btn ghost" href="/login">別の端末に復元リンクを送る</a>
      <hr className="acc-sep" />
      <button className="mem-btn ghost" type="button" onClick={doLogout} disabled={busy}>
        この端末からログアウト
      </button>
    </div>
  );
}
