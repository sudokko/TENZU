import type { Metadata } from "next";
import MakerApp from "./MakerApp";
import { readOwned } from "../lib/auth";
import "./maker.css";

export const metadata: Metadata = {
  alternates: { canonical: "/maker" },
  title: "模写メーカー",
  description:
    "親向けの点描写プリント生成ツール。模写のお手本を作り、PDF にして印刷できます。作るのは画面、練習は紙。",
};

// cookie から tier を読むため動的レンダリング（楽観的初期値・クライアントで /api/me が再確定）。
export const dynamic = "force-dynamic";

export default async function MakerPage() {
  const owned = await readOwned();
  return <MakerApp initialOwned={owned} />;
}
