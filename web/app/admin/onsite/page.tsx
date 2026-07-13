/* オンサイトメッセージ管理画面（本番稼働・オーナー専用）。
   設計 SSOT: acquisition/onsite-messaging.md §9（decisions.md §5.15）。
   - アクセス保護は tenzu_admin cookie（合言葉ログイン）のみ。
     atelier と違い NODE_ENV ガードは付けない＝本番で使う画面。
   - noindex ＋ robots.ts の /admin Disallow でクローラからも隠す。 */
import type { Metadata } from "next";
import { currentAdmin } from "../../lib/auth";
import AdminLogin from "./AdminLogin";
import OnsiteAdminApp from "./OnsiteAdminApp";
import "./admin.css";

export const metadata: Metadata = {
  title: "オンサイトメッセージ管理",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOnsitePage() {
  const admin = await currentAdmin();
  return admin ? <OnsiteAdminApp /> : <AdminLogin />;
}
