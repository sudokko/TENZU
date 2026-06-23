"use client";

/* プラン比較（無料ゲスト / スタンダード ¥480 / フル ¥980）。
   申込ボタン → POST /api/subscribe → Stripe Checkout（subscription）へ。
   現在のプラン（useAuth）には「ご利用中」を表示。 */

import { useState } from "react";
import SiteHeader from "../SiteHeader";
import { useAuth } from "../AuthContext";
import { PLANS, type PlanKey } from "../products/capabilities";

type Col = {
  rank: string;
  name: string;
  price: string;
  per?: string;
  tagline: string;
  feats: { t: React.ReactNode; muted?: boolean }[];
  plan?: PlanKey;      // 申込対象（無料列は無し）
  featured?: boolean;
};

const COLS: Col[] = [
  {
    rank: "無料",
    name: "おためし",
    price: "¥0",
    tagline: "まずは 1 枚、作って印刷。コア体験はずっと無料。",
    feats: [
      { t: "模写タスク" },
      { t: "グリッド 〜5×5" },
      { t: "1 枚 3 問まで" },
      { t: "用紙 A4（縦・横）" },
      { t: "点の大きさ 小 / 中 / 大" },
      { t: "記名欄なし", muted: true },
      { t: "保存 5 問", muted: true },
      { t: "1 日 5 枚まで", muted: true },
    ],
  },
  {
    rank: "STEP 1",
    name: PLANS.entry.name,
    price: `¥${PLANS.entry.yen}`,
    per: "/月",
    tagline: PLANS.entry.tagline,
    plan: "entry",
    featured: true,
    feats: [
      { t: "模写タスク" },
      { t: "グリッド 〜8×8" },
      { t: <>1 枚 <b>4 / 6 / 12 問</b></> },
      { t: "用紙 A4・B4・A3（縦横自由）" },
      { t: "点の大きさ 小 / 中 / 大" },
      { t: "記名・日付欄あり" },
      { t: "保存 無制限" },
      { t: "DL 無制限" },
    ],
  },
  {
    rank: "STEP 2",
    name: PLANS.full.name,
    price: `¥${PLANS.full.yen}`,
    per: "/月",
    tagline: PLANS.full.tagline,
    plan: "full",
    feats: [
      { t: "全タスク（鏡・回転・欠け補完・立体）" },
      { t: "グリッド 〜8×8" },
      { t: "1 枚 4 / 6 / 12 問" },
      { t: "用紙 A4・B4・A3（縦横自由）" },
      { t: "点の大きさ 小 / 中 / 大" },
      { t: "記名・日付欄あり" },
      { t: "保存 無制限" },
      { t: "DL 無制限" },
    ],
  },
];

export default function PricingApp() {
  const { tier } = useAuth();
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (plan: PlanKey) => {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "申込の開始に失敗しました");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "申込の開始に失敗しました");
      setBusy(null);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mem-wrap">
        <nav className="crumb" aria-label="パンくず">
          <a href="/maker">おためし点描写メーカー</a><span className="sep">/</span>
          <span>プラン</span>
        </nav>

        <div className="mem-head">
          <h1>メーカーのプラン</h1>
          <p>
            コア体験（模写を 1 枚作って印刷）は、ずっと無料。<br />
            プランで広がるのは「量・仕上げ・他タスク」です。いつでも変更・解約できます。
          </p>
        </div>

        <div className="plan-grid">
          {COLS.map((col) => {
            const isCurrent =
              (col.plan === undefined && tier === "guest") || col.plan === tier;
            return (
              <div className={`plan-card${col.featured ? " featured" : ""}`} key={col.name}>
                <div className="plan-rank">{col.rank}</div>
                <div className="plan-name">{col.name}</div>
                <div className="plan-price">
                  <strong>{col.price}</strong>{col.per && <span className="per">{col.per}</span>}
                </div>
                <p className="plan-tagline">{col.tagline}</p>
                <ul className="plan-feats">
                  {col.feats.map((f, i) => (
                    <li key={i} className={f.muted ? "muted" : undefined}>{f.t}</li>
                  ))}
                </ul>

                {col.plan === undefined ? (
                  isCurrent ? (
                    <span className="plan-cta current">ご利用中</span>
                  ) : (
                    <a className="plan-cta" href="/maker">いま使う</a>
                  )
                ) : isCurrent ? (
                  <a className="plan-cta current" href="/account">ご利用中 — 会員ページ</a>
                ) : (
                  <button
                    className={`plan-cta${col.featured ? " primary" : ""}`}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => subscribe(col.plan!)}
                  >
                    {busy === col.plan ? "決済画面へ移動中…" : "このプランで申し込む"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="plan-err" role="alert">{error}</p>}

        <p className="mem-note">
          決済は Stripe の安全な画面で行われます。申込後はメールのリンク、または同じブラウザでそのままログインできます。
          すでに会員の方は <a href="/login">ログイン</a> から。
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
