import type { Metadata } from "next";
import RestoreApp from "./RestoreApp";
import "../membership.css";

export const metadata: Metadata = {
  title: "この端末で使えるようにする",
  description:
    "ご購入いただいた点描写メーカーを、いま開いている端末でも使えるようにします。追加のお支払いはありません。",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function RestorePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  return <RestoreApp token={t} />;
}
