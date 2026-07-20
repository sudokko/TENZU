"use client";

/* 問い合わせフォーム（全項目任意・POST /api/contact）。
   教員・塾講師の個別相談（faq-teacher-license / faq-commercial-use から誘導）を
   はじめ、サイト全般の問い合わせ窓口。website はハニーポット（CSS で非表示・
   人間は触らない。bot 対策の第一防壁 — api/contact/route.ts 参照）。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";

export default function ContactApp() {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("お返事のためメールアドレスをご入力ください。");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("メールアドレスの形式をご確認ください。");
      return;
    }
    if (!message.trim()) {
      setError("お問い合わせ内容をご入力ください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, name, email, phone, message, website }),
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
      <SiteHeader currentNav="お問い合わせ" />
      <main className="mem-wrap">
        <div className="mem-head">
          <h1>お問い合わせ</h1>
          <p>
            TENZU へのご質問・ご相談はこちらからどうぞ。
            教室・指導の場でのご利用のご相談は、用途と想定される人数を添えていただけると
            お返事がスムーズです。メールアドレスとお問い合わせ内容のみ必須です。
          </p>
        </div>

        <div className="mem-panel">
          {sent ? (
            <p className="mem-msg ok">
              お問い合わせを受け付けました。ありがとうございます。<br />
              内容を確認のうえ、ご記入のメールアドレスへお返事いたします。
            </p>
          ) : (
            <form onSubmit={submit}>
              <div className="mem-field">
                <label htmlFor="ct-company">会社名・団体名（任意）</label>
                <input id="ct-company" type="text" autoComplete="organization"
                  value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="mem-field">
                <label htmlFor="ct-name">お名前（任意）</label>
                <input id="ct-name" type="text" autoComplete="name"
                  value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="mem-field">
                <label htmlFor="ct-email">メールアドレス（必須・お返事に使います）</label>
                <input id="ct-email" type="email" autoComplete="email" inputMode="email"
                  required aria-required="true"
                  placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="mem-field">
                <label htmlFor="ct-phone">電話番号（任意）</label>
                <input id="ct-phone" type="tel" autoComplete="tel" inputMode="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="mem-field">
                <label htmlFor="ct-message">お問い合わせ内容（必須）</label>
                <textarea id="ct-message" rows={3}
                  required aria-required="true"
                  value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {/* honeypot: 画面外に置き、人間には見えない・触れない */}
              <div aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
                <label htmlFor="ct-website">Website</label>
                <input id="ct-website" type="text" tabIndex={-1} autoComplete="off"
                  value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <button className="mem-btn" type="submit" disabled={busy}>
                {busy ? "送信中…" : "送信する"}
              </button>
              {error && <p className="mem-msg err" role="alert">{error}</p>}
            </form>
          )}
        </div>

        <p className="mem-note">
          プリントの利用範囲については
          <a href="/articles/faq-commercial-use">商業利用の FAQ</a>・
          <a href="/articles/faq-teacher-license">教員・指導者向けの FAQ</a> もご覧ください。
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
