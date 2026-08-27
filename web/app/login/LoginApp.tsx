"use client";

/* 購入の復元入口（別端末・データ消失）。
   メール入力 → /api/auth/login-link → 復元リンク（マジックリンク）をメール送信。
   リンクを開くと /api/auth/verify が Stripe 履歴から所有を再 mint する。
   買い切りモデルではログイン/OTP は廃止（decisions §4.7）＝ここは「復元」専用。
   ?e= のエラーコード（/api/auth/verify の失敗）も日本語で表示。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import SiteFooterMini from "../components/SiteFooterMini";

const ERR: Record<string, string> = {
  expired: "復元リンクの有効期限が切れました。もう一度お送りします。",
  noowned: "購入が見つかりませんでした。ご購入時のメールアドレスでお試しください。",
  unpaid: "お支払いが確認できませんでした。時間をおいて再度お試しください。",
  missing: "入力が正しくありません。もう一度お試しください。",
  stripe: "確認に失敗しました。時間をおいて再度お試しください。",
  config: "サーバー設定が未完了です。",
};

export default function LoginApp({ errorCode }: { errorCode?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    errorCode ? ERR[errorCode] ?? "復元に失敗しました。" : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("メールアドレスを入力してください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "送信に失敗しました");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <div className="mem-head">
          <h1>購入を復元</h1>
          <p>
            別の端末で使うときや、ブラウザのデータを消したときは、
            ご購入時のメールアドレスに復元リンクをお送りします。
          </p>
        </div>

        <div className="mem-panel">
          {sent ? (
            <p className="mem-msg">
              復元リンクをお送りしました（届くまで少しかかることがあります）。<br />
              メール内のボタンを開くと、購入済みのメーカーが復元されます。
              届かない場合は、迷惑メールフォルダ、またはご購入時のメールアドレスをご確認ください。
            </p>
          ) : (
            <form onSubmit={submit}>
              <div className="mem-field">
                <label htmlFor="email">メールアドレス</label>
                <input id="email" type="email" autoComplete="email"
                  inputMode="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="mem-btn" type="submit" disabled={busy}>
                {busy ? "送信中…" : "復元リンクを送る"}
              </button>
              {error && <p className="mem-msg err" role="alert">{error}</p>}
            </form>
          )}
        </div>

        <p className="mem-note">
          まだ購入していない方は <a href="/makers">メーカー一覧</a> から（買う前に試せます）。
        </p>
      </main>

      <SiteFooterMini />
    </>
  );
}
