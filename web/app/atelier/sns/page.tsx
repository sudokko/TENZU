/* =========================================================================
   SNS ダッシュボード — dev 限定（本番は 404）
   設計 SSOT: engineering/analytics.md §7
   収集: scripts/sns-dashboard.ts（GA4）＋ .claude/skills/sns-dashboard（各 SNS の画面）
   このページは web/.local/sns-dashboard/ の保存データを読むだけで、外へは取りに行かない。
   ========================================================================= */
import Link from "next/link";
import { notFound } from "next/navigation";
import { SNS_PROFILES, snsTotal, type Snapshot } from "./defs";
import { listSnapshotDates, readSnapshot } from "./store";
import { KpiRow, SnsCard, SourceDetail, SourceTable, fmtNum, md, mdw } from "./parts";
import SnapshotPicker from "./SnapshotPicker";
import "../atelier.css";
import "./sns.css";

export const metadata = { title: "SNS ダッシュボード（dev）", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 推移に並べる取得回数 */
const TREND_POINTS = 8;

export default async function SnsDashboardPage({ searchParams }: { searchParams: Promise<{ at?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { at } = await searchParams;
  const dates = await listSnapshotDates();
  if (dates.length === 0) return <EmptyState />;

  const date = at && dates.includes(at) ? at : dates[0];
  const history = (await Promise.all(dates.filter((d) => d <= date).slice(0, TREND_POINTS).map(readSnapshot)))
    .filter((s): s is Snapshot => s !== null)
    .reverse();
  const snap = history[history.length - 1];
  const cur = snap.ga4?.current;
  const prev = snap.ga4?.previous;
  const withGa4 = history.filter((s) => s.ga4);

  return (
    <div className="atl-wrap snsd">
      <div className="atl-crumb">
        <Link href="/atelier">atelier</Link> / SNS ダッシュボード
      </div>

      <header className="snsd-head">
        <div>
          <h1>SNS ダッシュボード</h1>
          <p>
            5 つの SNS の画面の数字と、そこから tenzu.jp で起きたこと（GA4）を 1 枚で見る。北極星は流入元別の PDF
            書き出しと購入。
          </p>
        </div>
        <SnapshotPicker dates={dates} current={date} />
      </header>

      <ul className="snsd-chips" aria-label="取得状況">
        <li className={cur ? "is-ok" : ""}>
          {cur ? "✓" : "—"} GA4{cur ? `（${md(cur.start)}〜${md(cur.end)}）` : " 未取得"}
        </li>
        {SNS_PROFILES.map((p) => (
          <li key={p.key} className={snap.platforms[p.key] ? "is-ok" : ""}>
            {snap.platforms[p.key] ? "✓" : "—"} {p.label}
          </li>
        ))}
      </ul>

      {cur && prev ? (
        <>
          <section className="snsd-section">
            <h2>5 SNS 経由で、サイトで起きたこと</h2>
            <p className="snsd-note">
              GA4・{mdw(cur.start)}〜{mdw(cur.end)}。差分は前の 7 日（{md(prev.start)}〜{md(prev.end)}）との比較
            </p>
            <KpiRow cur={cur} prev={prev} />
          </section>

          <section className="snsd-section">
            <h2>流入元別</h2>
            <p className="snsd-note">かっこ内は前の 7 日。棒は訪問数（ティール＝運用中の 5 SNS）</p>
            <SourceTable cur={cur} prev={prev} />
            <SourceDetail cur={cur} />
          </section>
        </>
      ) : (
        <p className="snsd-empty-inline">
          GA4 は未取得。<code>npx tsx scripts/sns-dashboard.ts ga4</code>（web/ で実行）
        </p>
      )}

      <section className="snsd-section">
        <h2>SNS 別</h2>
        <div className="snsd-cards">
          {SNS_PROFILES.map((p) => (
            <SnsCard
              key={p.key}
              profile={p}
              block={snap.platforms[p.key]}
              cur={cur}
              prev={prev}
              trend={withGa4.map((s) => ({ date: s.date, value: s.ga4!.current.buckets[p.key].sessions }))}
            />
          ))}
        </div>
      </section>

      {withGa4.length > 0 && (
        <section className="snsd-section">
          <h2>取得ごとの推移</h2>
          <p className="snsd-note">各取得日の前日までの 7 日（GA4）。「訪問・PDF 書き出し」の順</p>
          <div className="snsd-scroll">
            <table className="snsd-table">
              <thead>
                <tr>
                  <th>流入元</th>
                  {withGa4.map((s) => (
                    <th key={s.date} className="snsd-num">
                      {mdw(s.date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SNS_PROFILES.map((p) => (
                  <tr key={p.key} className="is-sns">
                    <th scope="row">{p.label}</th>
                    {withGa4.map((s) => {
                      const c = s.ga4!.current.buckets[p.key];
                      return (
                        <td key={s.date} className="snsd-num">
                          {fmtNum(c.sessions)}・{fmtNum(c.generatedPdf)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">5 SNS 計</th>
                  {withGa4.map((s) => {
                    const c = snsTotal(s.ga4!.current);
                    return (
                      <td key={s.date} className="snsd-num">
                        {fmtNum(c.sessions)}・{fmtNum(c.generatedPdf)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">全体</th>
                  {withGa4.map((s) => (
                    <td key={s.date} className="snsd-num">
                      {fmtNum(s.ga4!.current.total.sessions)}・{fmtNum(s.ga4!.current.total.generatedPdf)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section className="snsd-section">
        <h2>読み方の注意</h2>
        <ul className="snsd-notes">
          <li>
            見る数字／見ない数字の区分は acquisition/sns-operations.md §7 と channels.md §7.4 に従う。note と Ameba
            は設計書に行が無いので暫定
          </li>
          <li>Direct には自分のアクセスも入る（GA4 の内部トラフィック除外を設定するまで）</li>
          <li>
            計測ノイズのうち Stripe からの戻りは、GA4 の「除外する参照」に checkout.stripe.com
            を入れると、購入が元の流入元に付くようになる
          </li>
          <li>画面の数字は SNS ごとに期間の区切りが少しずれる。各カードに画面の期間表記をそのまま出している</li>
          <li>数字は web/.local/sns-dashboard/ にだけ保存している（公開リポジトリには入れない）</li>
        </ul>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="atl-wrap snsd">
      <div className="atl-crumb">
        <Link href="/atelier">atelier</Link> / SNS ダッシュボード
      </div>
      <header className="snsd-head">
        <div>
          <h1>SNS ダッシュボード</h1>
          <p>まだ数字を取得していません。</p>
        </div>
      </header>
      <ol className="snsd-notes">
        <li>
          Claude Code で <code>/sns-dashboard</code> を実行する（GA4 と 5 つの SNS の画面を読んで保存する）
        </li>
        <li>
          GA4 だけなら web/ で <code>npx tsx scripts/sns-dashboard.ts ga4</code>
        </li>
      </ol>
    </div>
  );
}
