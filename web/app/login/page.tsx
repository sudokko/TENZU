import type { Metadata } from "next";
import LoginApp from "./LoginApp";
import "../membership.css";

export const metadata: Metadata = {
  title: "購入を復元",
  description: "購入した点描写メーカーを別の端末に復元します。ご購入時のメールに復元リンクをお送りします。",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return <LoginApp errorCode={e} />;
}
