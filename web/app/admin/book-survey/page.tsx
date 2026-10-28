/* 本のアンケートの回答一覧（オーナー専用・読み取りのみ）。/admin/contact と同じ保護方式: tenzu_admin cookie＋noindex。
   上に設問ごとの数、下に回答そのもの。設問を変える前の答え（学年の複数選択・感想ひとつ）も読める。 */
import type { Metadata } from "next";
import { currentAdmin } from "../../lib/auth";
import { listSurveys } from "../../lib/survey-store";
import { AGES, REASONS, labelOf, type Choice } from "../../book/hajimete/survey";
import AdminLogin from "../onsite/AdminLogin";
import "../onsite/admin.css";

export const metadata: Metadata = { title: "本のアンケート", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function jst(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}
const many = (choices: Choice[], values: string[]) => values.map((v) => labelOf(choices, v)).join("、") || "—";

function Counts({ title, choices, values }: { title: string; choices: Choice[]; values: string[] }) {
  const n = (v: string) => values.filter((x) => x === v).length;
  const rows = choices.filter((c) => n(c.value) > 0);
  return <div style={{ marginBottom: 20 }}>
    <h2 className="adm-title" style={{ fontSize: 15 }}>{title}</h2>
    {rows.length === 0 ? <p className="adm-msg">—</p> : <table className="adm-table"><tbody>
      {rows.map((c) => <tr key={c.value}><td>{c.label}</td><td className="adm-td-id">{n(c.value)}</td></tr>)}
    </tbody></table>}
  </div>;
}

export default async function AdminBookSurveyPage() {
  const admin = await currentAdmin();
  if (!admin) return <AdminLogin title="本のアンケート" />;
  const hasTable = Boolean(process.env.ONSITE_TABLE);
  const rows = hasTable ? await listSurveys() : [];
  // NPS = すすめたい（9〜10）の割合 − すすめない（0〜6）の割合
  const nps = rows.length ? Math.round(((rows.filter((r) => r.recommend >= 9).length - rows.filter((r) => r.recommend <= 6).length) / rows.length) * 100) : null;
  const agesOf = (r: (typeof rows)[number]) => (r.age ? [r.age] : r.ages ?? []);

  return <div className="adm-wrap">
    <header className="adm-header"><h1 className="adm-title">本のアンケート（はじめての点図形）</h1></header>
    {!hasTable && <p className="adm-warn">ONSITE_TABLE が未設定のため、回答を読めません（web/.env.local）。</p>}
    {hasTable && rows.length === 0 && <p className="adm-msg">回答はまだありません。</p>}
    {rows.length > 0 && <>
      <p className="adm-msg">回答 {rows.length} 件・すすめたいか（NPS）{nps}</p>
      <Counts title="子どもの学年" choices={AGES} values={rows.flatMap(agesOf)} />
      <Counts title="買った決め手" choices={REASONS} values={rows.flatMap((r) => r.reasons ?? [])} />
      <div className="adm-table-scroll"><table className="adm-table">
        <thead><tr><th>日時（JST）</th><th>学年</th><th>決め手</th><th>推奨</th><th>来た所</th><th>よかったところ</th><th>改善点</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={`${r.createdAt}#${r.id}`}>
          <td className="adm-td-id">{jst(r.createdAt)}</td>
          <td>{many(AGES, agesOf(r))}</td>
          <td>{many(REASONS, r.reasons ?? [])}{r.reasonOther ? `（${r.reasonOther}）` : ""}</td>
          <td className="adm-td-id">{r.recommend}</td>
          <td>{r.from ?? "—"}</td>
          <td style={{ whiteSpace: "pre-wrap", maxWidth: 320 }}>{r.good ?? r.comment ?? "—"}</td>
          <td style={{ whiteSpace: "pre-wrap", maxWidth: 320 }}>{r.improve ?? "—"}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
