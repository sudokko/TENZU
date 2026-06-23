"use client";

/* 会員ログイン入口（別端末・再ログイン）。
   メールを入力 → /api/auth/login-link → 登録メールにマジックリンク送信。
   ?e= のエラーコード（/api/auth/verify の失敗）も日本語で表示。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";

const ERR: Record<string, string> = {
  expired: "ログインリンクの有効期限が切れています。もう一度お送りします。",
  nosub: "有効なご契約が見つかりませんでした。プランをご確認ください。",
  nocustomer: "ご登録が見つかりませんでした。お申し込みのメールでお試しください。",
  missing: "リンクが正しくありません。もう一度ログインしてください。",
  stripe: "確認に失敗しました。時間をおいて再度お試しください。",
  config: "サーバー設定が未完了です。",
};

export default function LoginApp({ errorCode }: { errorCode?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    errorCode ? ERR[errorCode] ?? "ログインに失敗しました。" : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("メールアドレスを入力してください。"); return; }
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
          <h1>ログイン</h1>
          <p>ご登録のメールアドレスに、ログインリンクをお送りします。</p>
        </div>

        <div className="mem-panel">
          {sent ? (
            <p className="mem-msg ok">
              メールをご確認ください。<br />
              ログインリンクをお送りしました（届かない場合は迷惑メールもご確認ください）。
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
                {busy ? "送信中…" : "ログインリンクを送る"}
              </button>
              {error && <p className="mem-msg err" role="alert">{error}</p>}
            </form>
          )}
        </div>

        <p className="mem-note">
          まだ会員でない方は <a href="/pricing">プラン</a> から。
        </p>
      </main>

      <footer className="site footer-mini">
        <div className="wrap">
          <span className="copyright">© 2026 TENZU · 点図形（点描写）プリントの専門店</span>
        </div>
      </footer>
    </>
  );
}
