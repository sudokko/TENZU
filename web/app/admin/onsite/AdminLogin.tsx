"use client";

/* 管理画面の合言葉ゲート。成功すると tenzu_admin cookie が発行されるので
   ページを読み直して Server Component（page.tsx）側の分岐に任せる。 */
import { useState } from "react";

export default function AdminLogin() {
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !secret) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      setMsg(j?.error ?? "ログインできませんでした");
      setBusy(false);
    } catch {
      setMsg("通信に失敗しました");
      setBusy(false);
    }
  }

  return (
    <main className="adm-login">
      <h1 className="adm-login-title">オンサイトメッセージ管理</h1>
      <form className="adm-login-form" onSubmit={submit}>
        <input
          className="adm-input"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="合言葉"
          aria-label="合言葉"
          autoFocus
        />
        <button className="adm-btn adm-btn-primary" type="submit" disabled={busy || !secret}>
          {busy ? "確認中…" : "入る"}
        </button>
      </form>
      {msg && <p className="adm-error" role="alert">{msg}</p>}
    </main>
  );
}
