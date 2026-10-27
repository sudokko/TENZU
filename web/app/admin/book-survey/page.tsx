/* 本のアンケートの回答一覧（オーナー専用・読み取りのみ）。/admin/contact と同じ保護方式: tenzu_admin cookie＋noindex。
   上に設問ごとの数、下に回答そのもの。手が止まった巻は「巻（番号／12）」で数える。 */
import type { Metadata } from "next";
import { currentAdmin } from "../../lib/auth";
import { listSurveys } from "../../lib/survey-store";
import { AGES, PROGRESS, REASONS, STUCK, STUCK_WHY, labelOf, type Choice } from "../../book/hajimete/survey";
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
  const stuckAt = rows.filter((r) => r.stuck && r.stuck !== "none").map((r) => `${labelOf(STUCK, r.stuck)}${r.stuckNo ? `（${r.stuckNo}／12）` : ""}`);
  const stuckAtChoices = [...new Set(stuckAt)].sort().map((v) => ({ value: v, label: v }));

  return <div className="adm-wrap">
    <header className="adm-header"><h1 className="adm-title">本のアンケート（はじめての点図形）</h1></header>
    {!hasTable && <p className="adm-warn">ONSITE_TABLE が未設定のため、回答を読めません（web/.env.local）。</p>}
    {hasTable && rows.length === 0 && <p className="adm-msg">回答はまだありません。</p>}
    {rows.length > 0 && <>
      <p className="adm-msg">回答 {rows.length} 件・すすめたいか（NPS）{nps}</p>
      <Counts title="どこまで進んだか" choices={PROGRESS} values={rows.map((r) => r.progress)} />
      <Counts title="手が止まった巻（番号）" choices={[{ value: "none", label: "なかった" }, ...stuckAtChoices]}
        values={[...rows.filter((r) => r.stuck === "none").map(() => "none"), ...stuckAt]} />
      <Counts title="そのとき" choices={STUCK_WHY} values={rows.flatMap((r) => r.stuckWhy)} />
      <Counts title="子どもの学年" choices={AGES} values={rows.flatMap((r) => r.ages)} />
      <Counts title="買った決め手" choices={REASONS} values={rows.flatMap((r) => r.reasons)} />
      <div className="adm-table-scroll"><table className="adm-table">
        <thead><tr><th>日時（JST）</th><th>学年</th><th>進んだところ</th><th>止まった</th><th>そのとき</th><th>決め手</th><th>推奨</th><th>来た所</th><th>感想</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={`${r.createdAt}#${r.id}`}>
          <td className="adm-td-id">{jst(r.createdAt)}</td>
          <td>{many(AGES, r.ages)}</td>
          <td>{labelOf(PROGRESS, r.progress)}</td>
          <td>{r.stuck ? `${labelOf(STUCK, r.stuck)}${r.stuckNo ? `（${r.stuckNo}／12）` : ""}` : "—"}</td>
          <td>{many(STUCK_WHY, r.stuckWhy)}</td>
          <td>{many(REASONS, r.reasons)}</td>
          <td className="adm-td-id">{r.recommend}</td>
          <td>{r.from ?? "—"}</td>
          <td style={{ whiteSpace: "pre-wrap", maxWidth: 360 }}>{r.comment ?? "—"}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
