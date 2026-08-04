import type { Metadata } from "next";
import PricingApp from "./PricingApp";
import "../membership.css";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "メーカーの料金",
  description:
    "点描写メーカーの料金。模写は無料、ほかは各 ¥980 の買い切り（月額なし）。買う前にどのメーカーも触って試せます。",
};

export default function PricingPage() {
  return <PricingApp />;
}
