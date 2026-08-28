"use client";

/* 別端末での「購入の復元」確認ページ。
   メールのリンク（/restore?t=…）から着地し、何が起きるかを読ませてから
   POST /api/auth/verify で所有 cookie を発行する。

   GET で自動発行していた旧設計（/api/auth/verify?token=…）を置き換えたもの。
   「説明のない API URL を開いた瞬間に権限が渡る」形をやめる＝ユーザーに何を買った
   のか伝わるようにする目的と、フィッシング誤判定を避ける目的の両方（decisions §3.114）。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import SiteFooterMini from "../components/SiteFooterMini";

const ERR: Record<string, string> = {
  expired: "この復元リンクは有効期限（30 分）が切れています。下のボタンから、新しいリンクをお送りします。",
  noowned: "ご購入が見つかりませんでした。ご購入時のメールアドレス宛のリンクかご確認ください。",
  stripe: "確認に失敗しました。時間をおいて、もう一度お試しください。",
  missing: "リンクが正しくありません。メール内のリンクをもう一度お開きください。",
  config: "サーバー設定が未完了です。お手数ですが、お問い合わせください。",
};

export default function RestoreApp({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : ERR.missing,
  );

  const restore = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = (await res.json().catch(() => ({}))) as { dest?: string; error?: string };
      if (!res.ok) {
        setError(ERR[d.error ?? ""] ?? "復元できませんでした。時間をおいてお試しください。");
        setBusy(false);
        return;
      }
      window.location.href = d.dest ?? "/account?restored=1";
    } catch {
      setError("通信に失敗しました。電波の良いところで、もう一度お試しください。");
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <div className="mem-head">
          <h1>この端末で使えるようにする</h1>
          <p>
            点描写メーカーは「作る道具を使う権利」をお買い上げいただく商品です。
            権利はご購入時のメールアドレスに紐づいていて、下のボタンで
            <b>いま開いているこの端末</b>でも使えるようになります。
          </p>
        </div>

        <div className="mem-panel">
          <ul className="rst-points">
            <li>
              <b>買い切りです。</b>
              月額はありません。復元しても追加のお支払いは発生しません。
            </li>
            <li>
              <b>この端末に記録されます。</b>
              次からはこのページを開かなくても、そのまま書き出せます。
              ログインもパスワードも必要ありません。
            </li>
            <li>
              <b>何台でも復元できます。</b>
              スマホとパソコンの両方で使えます。ブラウザのデータを消したときも、
              同じ手順で戻せます。
            </li>
          </ul>

          <button className="mem-btn" onClick={restore} disabled={busy || !token}>
            {busy ? "復元しています…" : "この端末で使えるようにする"}
          </button>

          {error && (
            <>
              <p className="mem-msg err" role="alert">{error}</p>
              <p className="mem-sub">
                <a href="/login">新しい復元リンクを送る</a>
              </p>
            </>
          )}
        </div>

        <p className="mem-note">
          このページで、お支払い情報の入力をお願いすることはありません。
          ご不明な点は <a href="/contact">お問い合わせ</a> からご連絡ください。
        </p>
      </main>

      <SiteFooterMini />
    </>
  );
}
