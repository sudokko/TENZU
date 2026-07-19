/* 問い合わせ履歴の閲覧画面（本番稼働・オーナー専用・読み取りのみ）。
   /admin/onsite と同じ保護方式: tenzu_admin cookie（合言葉ログイン）＋ noindex。
   一覧は Server Component で直接 DynamoDB（contact-store）から読む —
   書き込み UI が無いので専用 API は持たない。 */
import type { Metadata } from "next";
import { currentAdmin } from "../../lib/auth";
import { listContacts } from "../../lib/contact-store";
import AdminLogin from "../onsite/AdminLogin";
import "../onsite/admin.css";

export const metadata: Metadata = {
  title: "問い合わせ履歴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* ISO 日時 → JST 表示（Lambda は UTC で動く） */
function jst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminContactPage() {
  const admin = await currentAdmin();
  if (!admin) return <AdminLogin title="問い合わせ履歴" />;

  const hasTable = Boolean(process.env.ONSITE_TABLE);
  const contacts = hasTable ? await listContacts() : [];

  return (
    <div className="adm-wrap">
      <header className="adm-header">
        <h1 className="adm-title">問い合わせ履歴</h1>
      </header>
      {!hasTable && (
        <p className="adm-warn">ONSITE_TABLE が未設定のため、履歴を読めません（web/.env.local）。</p>
      )}
      {hasTable && contacts.length === 0 && <p className="adm-msg">問い合わせはまだありません。</p>}
      {contacts.length > 0 && (
        <div className="adm-table-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>日時（JST）</th>
                <th>会社名</th>
                <th>お名前</th>
                <th>メール</th>
                <th>電話</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={`${c.createdAt}#${c.id}`}>
                  <td className="adm-td-id">{jst(c.createdAt)}</td>
                  <td>{c.company ?? "—"}</td>
                  <td>{c.name ?? "—"}</td>
                  <td>{c.email ? <a className="adm-link" href={`mailto:${c.email}`}>{c.email}</a> : "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{c.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
