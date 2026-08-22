import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import GuideApp from "./GuideApp";
import { QUESTION_COUNT } from "./questions";
import "./guide.css";

/* description の設問数も SSOT から導出（2026-08-08）。6 問時代の数字が残ったまま
   4 問化されており、検索結果に出る説明文だけが実装と食い違っていた。 */
export const metadata: Metadata = {
  alternates: { canonical: "/level-guide" },
  title: "レベル選びガイド",
  description:
    `${QUESTION_COUNT} つの質問に答えると、点描写を「どのレベルから・どの種類から」始めればいいかの目安と、おすすめの一冊が出ます。診断ではなく、選びの目安です。`,
};

export default function LevelGuidePage() {
  return (
    <>
      <SiteHeader currentNav="プリントを探す" />
      <GuideApp />
      <SiteFooter />
    </>
  );
}
