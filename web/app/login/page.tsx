import type { Metadata } from "next";
import LoginApp from "./LoginApp";
import "../membership.css";

export const metadata: Metadata = {
  title: "ログイン · TENZU メーカー",
  description: "TENZU メーカー会員のログイン。登録メールにログインリンクをお送りします。",
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
