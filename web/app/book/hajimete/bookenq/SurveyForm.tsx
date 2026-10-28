"use client";

/* 本のアンケートの入力フォーム（設問は ../survey.ts）。送ると /api/book/hajimete/bookenq が保存し、お礼のクーポンコードを返す。
   答え終わったら、同じ場所にコードと使い方を出す（回答済みのブラウザは最初からこの表示）。 */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { trackBookEvent } from "../../../analytics";
import { AGES, COMMENT_MAX, REASONS, REASON_OTHER, REASON_OTHER_MAX, type Choice } from "../survey";

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function Radios({ name, choices, value, onChange }: { name: string; choices: Choice[]; value: string; onChange: (v: string) => void }) {
  return <div className="survey-choices" role="radiogroup">{choices.map((c) => <label key={c.value} className="survey-choice">
    <input type="radio" name={name} value={c.value} checked={value === c.value} onChange={() => onChange(c.value)} />
    <span>{c.label}</span>
  </label>)}</div>;
}

function Checks({ name, choices, values, onChange }: { name: string; choices: Choice[]; values: string[]; onChange: (v: string[]) => void }) {
  return <div className="survey-choices">{choices.map((c) => <label key={c.value} className="survey-choice">
    <input type="checkbox" name={name} value={c.value} checked={values.includes(c.value)} onChange={() => onChange(toggle(values, c.value))} />
    <span>{c.label}</span>
  </label>)}</div>;
}

export default function SurveyForm({ from, answeredCoupon }: { from: string; answeredCoupon: string | null }) {
  const [age, setAge] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOther, setReasonOther] = useState("");
  const [good, setGood] = useState("");
  const [improve, setImprove] = useState("");
  const [recommend, setRecommend] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState<string | null>(answeredCoupon);
  const [copied, setCopied] = useState(false);
  const otherChosen = reasons.includes(REASON_OTHER);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!age) { setError("「1. 使ったお子さんの年齢」を選んでください。"); return; }
    if (reasons.length === 0) { setError("「2. この本を選んだ決め手」を1つ以上選んでください。"); return; }
    if (!good.trim()) { setError("「3. 使ってみての感想（よかったところ）」を書いてください。"); return; }
    if (!improve.trim()) { setError("「4. 使ってみての感想（改善点）」を書いてください。"); return; }
    if (recommend == null) { setError("「5. すすめたいと思いますか」を0〜10から選んでください。"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/book/hajimete/bookenq", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age, reasons, reasonOther: otherChosen ? reasonOther : undefined, good, improve, recommend,
          from: from || undefined, website }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "送信できませんでした。"); return; }
      trackBookEvent("book_survey_submit", from || undefined);
      setCoupon(data.coupon ?? null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("通信できませんでした。接続を確認して、もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  if (coupon) return <section className="book-panel survey-thanks" aria-labelledby="survey-thanks-title">
    <h2 id="survey-thanks-title">ありがとうございました。</h2>
    <p>いただいた答えは、問題の並びや本の次の版づくりに使います。お礼のクーポンです。</p>
    <div className="survey-coupon">
      <p className="survey-coupon-label">アンケートのお礼　¥100 OFF</p>
      <p className="survey-coupon-code">{coupon}</p>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(coupon).then(() => setCopied(true), () => {}); }}>{copied ? "コピーしました" : "コードをコピー"}</button>
    </div>
    <ol className="survey-steps">
      <li>使いたい巻をカートに入れます（メーカーは購入確認のページで）。</li>
      <li>「クーポンコードをお持ちの方」にコードを入れ、「使う」を押します。</li>
      <li>メールアドレスを入れて、購入手続きへ。</li>
    </ol>
    <p className="book-small">何回目のお買い物でも使えます。1回のお買い物で使えるクーポンは1つなので、本の83ページの初回限定クーポン（HAJIMETE100）とは別のお買い物でお使いください。まとめ買い割引とは一緒に使えます。</p>
    <p className="survey-thanks-next"><Link href="/products">TENZUのプリントを見る →</Link></p>
  </section>;

  return <form className="book-panel survey-form" onSubmit={submit} noValidate>
    <fieldset>
      <legend>1. 使ったお子さんの年齢 <span className="survey-required">必須</span></legend>
      <Radios name="age" choices={AGES} value={age} onChange={setAge} />
    </fieldset>
    <fieldset>
      <legend>2. この本を選んだ決め手 <span className="survey-required">必須</span> <span className="survey-hint">いくつでも</span></legend>
      <Checks name="reasons" choices={REASONS} values={reasons} onChange={setReasons} />
      {otherChosen && <input type="text" className="survey-other" value={reasonOther} maxLength={REASON_OTHER_MAX} onChange={(e) => setReasonOther(e.target.value)} aria-label="決め手（そのほか）" placeholder="「そのほか」の内容を教えてください" />}
    </fieldset>
    <fieldset>
      <legend>3. 使ってみての感想（よかったところ） <span className="survey-required">必須</span></legend>
      <textarea value={good} maxLength={COMMENT_MAX} rows={4} onChange={(e) => setGood(e.target.value)} aria-label="感想（よかったところ）" placeholder="例：点を数えるところから、子どもと一緒にできました。" />
    </fieldset>
    <fieldset>
      <legend>4. 使ってみての感想（改善点） <span className="survey-required">必須</span></legend>
      <textarea value={improve} maxLength={COMMENT_MAX} rows={4} onChange={(e) => setImprove(e.target.value)} aria-label="感想（改善点）" placeholder="例：問題132番がとても難しかった。" />
    </fieldset>
    <fieldset>
      <legend>5. この本を、知り合いのご家庭にすすめたいと思いますか <span className="survey-required">必須</span></legend>
      <div className="survey-scale" role="radiogroup" aria-label="0＝思わない、10＝とても思う">
        {Array.from({ length: 11 }, (_, n) => <label key={n} className="survey-scale-item">
          <input type="radio" name="recommend" value={n} checked={recommend === n} onChange={() => setRecommend(n)} />
          <span>{n}</span>
        </label>)}
      </div>
      <p className="survey-scale-ends book-small"><span>0 思わない</span><span>10 とても思う</span></p>
    </fieldset>
    <label className="book-sr-only" aria-hidden="true">ウェブサイト<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
    {error && <p role="alert" className="book-error">{error}</p>}
    <button className="survey-submit" type="submit" disabled={busy}>{busy ? "送っています…" : "答えを送って、クーポンを受け取る"}</button>
  </form>;
}
