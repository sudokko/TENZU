/* ピン素材書き出しツール — dev 限定（本番は 404） */
import { notFound } from "next/navigation";
import PinsApp from "./PinsApp";

export const metadata = { title: "ピン素材書き出し（dev）", robots: { index: false } };

export default function PinsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PinsApp />;
}
