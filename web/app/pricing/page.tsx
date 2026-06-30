import type { Metadata } from "next";
import PricingApp from "./PricingApp";
import "../membership.css";

export const metadata: Metadata = {
  title: "メーカーの料金 · TENZU",
  description:
    "点描写メーカーの料金。模写は無料、ほかは各 ¥980 の買い切り（月額なし）。買う前にどのメーカーも触って試せます。",
};

export default function PricingPage() {
  return <PricingApp />;
}
