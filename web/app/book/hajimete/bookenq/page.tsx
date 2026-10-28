import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import SiteHeader from "../../../SiteHeader";
import { SiteFooter } from "../../../catalog";
import { SURVEY_COOKIE, SURVEY_COUPON } from "../../../lib/survey-store";
import { BOOK } from "../catalog";
import SurveyForm from "./SurveyForm";
import "../book.css";
import "./survey.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${BOOK.title} アンケート`,
  description: `TENZUの書籍『${BOOK.title}』を使ったご家庭へ。手が止まったところや感想を聞かせてください。`,
  alternates: { canonical: `${BOOK.href}/bookenq` },
  robots: { index: false, follow: false },
};

/** 本の97ページの QR（utm_content=p97）と受取ページの帯（from=band）から来る。来たところは答えと一緒に残す。 */
export default async function BookSurveyPage({ searchParams }: { searchParams: Promise<{ utm_content?: string; from?: string }> }) {
  const { utm_content, from } = await searchParams;
  const answered = (await cookies()).has(SURVEY_COOKIE);
  return <><SiteHeader /><main className="book-wrap survey-wrap">
    <section className="book-usage-intro" aria-labelledby="survey-title">
      <p className="book-eyebrow">『{BOOK.title}』アンケート</p>
      <h1 id="survey-title">この本を、<br className="book-mobile-break" />もっとよくするために。</h1>
      <p className="book-intro-lead">使ってみての感想を聞かせてください。5つの質問、1分ほどです。</p>
      <p className="book-small">お名前・メールアドレスは聞きません。答えてくださった方には、TENZUのプリントとメーカーで使える ¥100 OFF のクーポンコードをこの画面でお渡しします。</p>
    </section>
    <SurveyForm from={(utm_content ?? from ?? "").slice(0, 16)} answeredCoupon={answered ? SURVEY_COUPON : null} />
    <p className="book-small survey-back"><Link href={BOOK.href}>購入者特典のPDF受け取りへ戻る</Link></p>
  </main><SiteFooter /></>;
}
