import type { Metadata } from "next";
import SudoCraftApp from "./SudoCraftApp";
import "../legal.css";

/* 屋号ページ（phase-1-todo §2・decisions §5.16）。
   SUDO CRAFT 名義の SNS（X・note・Ameba）のプロフィールリンク先＝受託問い合わせの
   受け皿を兼ねる。要件: ①屋号の名乗り ②作っているもの ③店主の一言（顔出しなし）
   ④受託導線（/contact）⑤特商法・PP リンク。内部リンクは流入 UTM を保持して渡す
   （SudoCraftApp 側・SNS 流入が「参照元なし」に落ちるのを防ぐ）。 */

export const metadata: Metadata = {
  title: "SUDO CRAFT（運営者情報）",
  description:
    "点図形（点描写）プリントの専門店 TENZU を運営する個人事業 SUDO CRAFT のページです。作っているもの・お仕事のご相談窓口をご案内します。",
};

export default function SudoCraftPage() {
  return <SudoCraftApp />;
}
