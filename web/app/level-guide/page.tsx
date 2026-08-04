import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { SiteFooter } from "../catalog";
import GuideApp from "./GuideApp";
import "./guide.css";

export const metadata: Metadata = {
  alternates: { canonical: "/level-guide" },
  title: "レベル選びガイド",
  description:
    "6 つの質問に答えると、点描写を「どのレベルから・どの種類から」始めればいいかの目安と、おすすめの一冊が出ます。診断ではなく、選びの目安です。",
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
