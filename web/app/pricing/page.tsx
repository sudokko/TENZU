import type { Metadata } from "next";
import PricingApp from "./PricingApp";
import "../membership.css";

export const metadata: Metadata = {
  title: "メーカーのプラン · TENZU",
  description:
    "おためし点描写メーカーのプラン。無料ゲスト／スタンダード（¥480/月）／フル（¥980/月）。コア体験は無料のまま、量産・仕上げ・他タスクを解放します。",
};

export default function PricingPage() {
  return <PricingApp />;
}
