"use client";

/* 本のアンケートの入力フォーム（設問は ../survey.ts）。送ると /api/book/hajimete/bookenq が保存し、お礼のクーポンコードを返す。
   答え終わったら、同じ場所にコードと使い方を出す（回答済みのブラウザは最初からこの表示）。 */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { trackBookEvent } from "../../../analytics";
import { AGES, COMMENT_MAX, PROGRESS, REASONS, STUCK, STUCK_WHY, type Choice } from "../survey";

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function Checks({ name, choices, values, onChange }: { name: string; choices: Choice[]; values: string[]; onChange: (v: string[]) => void }) {
  return <div className="survey-choices">{choices.map((c) => <label key={c.value} className="survey-choice">
    <input type="checkbox" name={name} value={c.value} checked={values.includes(c.value)} onChange={() => onChange(toggle(values, c.value))} />
    <span>{c.label}</span>
  </label>)}</div>;
}

export default function SurveyForm({ from, answeredCoupon }: { from: string; answeredCoupon: string | null }) {
  const [ages, setAges] = useState<string[]>([]);
  const [progress, setProgress] = useState("");
  const [stuck, setStuck] = useState("");
  const [stuckNo, setStuckNo] = useState("");
  const [stuckWhy, setStuckWhy] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState<string | null>(answeredCoupon);
  const [copied, setCopied] = useState(false);
  const stuckSomewhere = stuck !== "" && stuck !== "none";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!progress) { setError("「2. どこまで進みましたか」を選んでください。"); return; }
    if (recommend == null) { setError("「7. すすめたいと思いますか」を0〜10から選んでください。"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/book/hajimete/bookenq", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ages, progress, stuck, stuckNo: stuckSomewhere && stuckNo ? Number(stuckNo) : undefined,
          stuckWhy: stuckSomewhere ? stuckWhy : [], comment, reasons, recommend, from: from || undefined, website }),
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
      <legend>1. 使ったお子さんの学年 <span className="survey-hint">きょうだいで使ったときは、すべて</span></legend>
      <Checks name="ages" choices={AGES} values={ages} onChange={setAges} />
    </fieldset>
    <fieldset>
      <legend>2. どこまで進みましたか <span className="survey-required">必須</span></legend>
      <select value={progress} onChange={(e) => setProgress(e.target.value)} aria-label="どこまで進んだか">
        <option value="">選んでください</option>
        {PROGRESS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <p className="book-small">いま取り組んでいる巻、または最後に取り組んだ巻を選んでください。</p>
    </fieldset>
    <fieldset>
      <legend>3. 手が止まった問題</legend>
      <p className="book-small">問題番号の横の「（5／12）」の、左の数字を選んでください。覚えていなければ、巻だけでかまいません。</p>
      <div className="survey-row">
        <select value={stuck} onChange={(e) => setStuck(e.target.value)} aria-label="手が止まった巻">
          <option value="">選んでください</option>
          {STUCK.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {stuckSomewhere && <label className="survey-no">（
          <select value={stuckNo} onChange={(e) => setStuckNo(e.target.value)} aria-label="巻の中の番号">
            <option value="">?</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>／12）</label>}
      </div>
    </fieldset>
    {stuckSomewhere && <fieldset>
      <legend>4. そのとき、どんな様子でしたか <span className="survey-hint">いくつでも</span></legend>
      <Checks name="stuckWhy" choices={STUCK_WHY} values={stuckWhy} onChange={setStuckWhy} />
    </fieldset>}
    <fieldset>
      <legend>5. 使ってみての感想・こうだったらいいのに</legend>
      <textarea value={comment} maxLength={COMMENT_MAX} rows={5} onChange={(e) => setComment(e.target.value)} aria-label="感想" placeholder="例：Lv.3 Vol.2 のななめで、点を数えるところから一緒にやりました。" />
    </fieldset>
    <fieldset>
      <legend>6. この本を選んだ決め手 <span className="survey-hint">いくつでも</span></legend>
      <Checks name="reasons" choices={REASONS} values={reasons} onChange={setReasons} />
    </fieldset>
    <fieldset>
      <legend>7. この本を、知り合いのご家庭にすすめたいと思いますか <span className="survey-required">必須</span></legend>
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
