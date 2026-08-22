import type { Metadata } from "next";
import ContactApp from "./ContactApp";
import "../membership.css";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "お問い合わせ",
  description:
    "点図形（点描写）プリントの専門店 TENZU へのお問い合わせフォームです。教室・指導の場でのご利用のご相談などはこちらから。",
  robots: { index: false },
};

export default function ContactPage() {
  return <ContactApp />;
}
