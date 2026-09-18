/* SNS ダッシュボード — 表示部品（サーバーコンポーネント）
   形の選び方: 数字 1 つ＝ステータスタイル／流入元（10 行前後）＝棒つきの表／取得ごとの変化＝スパークライン。
   色は「5 SNS をティールで強調・それ以外はグレー」の 1 色＋グレーだけ（棒の横には必ず数字を置く）。 */
import SnsIcon from "../../components/SnsIcon";
import {
  BUCKET_LABELS, BUCKET_ORDER, PLATFORM_METRICS, SNS_KEYS, pinterestCtrBand, snsTotal,
  type Bucket, type Ga4Counts, type Ga4Range, type PlatformBlock, type SnsProfile,
} from "./defs";
import type { SnsKey } from "../../sns";

/* ---------- 書式 ---------- */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export const fmtNum = (n: number) => n.toLocaleString("ja-JP");
export const fmtYen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
export const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
export const mdw = (date: string) => `${md(date)}（${WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]}）`;
export const fmtJst = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

function Delta({ cur, prev }: { cur: number; prev: number }) {
  const d = cur - prev;
  const cls = d > 0 ? "is-up" : d < 0 ? "is-down" : "is-flat";
  const text = d > 0 ? `+${fmtNum(d)}` : d < 0 ? `−${fmtNum(-d)}` : "±0";
  return <span className={`snsd-delta ${cls}`}>{text}</span>;
}

/* ---------- KPI（サイトで起きたこと・5 SNS 経由） ---------- */

const FUNNEL: { key: keyof Ga4Counts; label: string; short: string; north?: boolean }[] = [
  { key: "sessions", label: "訪問", short: "訪問" },
  { key: "toolStart", label: "メーカー起動", short: "起動" },
  { key: "generatedPdf", label: "PDF 書き出し", short: "PDF", north: true },
  { key: "purchases", label: "購入", short: "購入", north: true },
];

export function KpiRow({ cur, prev }: { cur: Ga4Range; prev: Ga4Range }) {
  const sns = snsTotal(cur);
  const snsPrev = snsTotal(prev);
  return (
    <div className="snsd-kpis">
      {FUNNEL.map((f) => (
        <div key={f.key} className={`snsd-kpi${f.north ? " is-north" : ""}`}>
          <div className="snsd-kpi-label">
            {f.label}
            {f.north && <span className="snsd-badge">北極星</span>}
          </div>
          <div className="snsd-kpi-value">{fmtNum(sns[f.key])}</div>
          <div className="snsd-kpi-foot">
            <Delta cur={sns[f.key]} prev={snsPrev[f.key]} />
            <span>前の 7 日 {fmtNum(snsPrev[f.key])}</span>
          </div>
          <div className="snsd-kpi-sub">
            全体 {fmtNum(cur.total[f.key])}
            {f.key === "purchases" && cur.total.revenue > 0 ? `・${fmtYen(cur.total.revenue)}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 流入元別の表（GA4） ---------- */

const NOISE_NOTE = "決済からの戻り・取引先 CRM からの閲覧（客の流入ではない）";

export function SourceTable({ cur, prev }: { cur: Ga4Range; prev: Ga4Range }) {
  const isSns = (b: Bucket) => SNS_KEYS.includes(b as SnsKey);
  const rows = BUCKET_ORDER.filter((b) => {
    if (isSns(b)) return true;
    const c = cur.buckets[b];
    const p = prev.buckets[b];
    return c.sessions + c.toolStart + c.generatedPdf + c.purchases + p.sessions + p.generatedPdf > 0;
  });
  const max = Math.max(1, ...rows.map((b) => cur.buckets[b].sessions));
  const cell = (c: number, p: number) => (
    <td className="snsd-num">
      {fmtNum(c)}
      <span className="snsd-prev">（{fmtNum(p)}）</span>
    </td>
  );
  const snsCur = snsTotal(cur);
  const snsPrev = snsTotal(prev);
  return (
    <div className="snsd-scroll">
      <table className="snsd-table">
        <thead>
          <tr>
            <th>流入元</th>
            <th className="snsd-num">訪問</th>
            <th className="snsd-num">メーカー起動</th>
            <th className="snsd-num">PDF 書き出し</th>
            <th className="snsd-num">購入</th>
            <th className="snsd-num">売上</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const c = cur.buckets[b];
            const p = prev.buckets[b];
            return (
              <tr key={b} className={isSns(b) ? "is-sns" : b === "noise" ? "is-noise" : ""}>
                <th scope="row">
                  <span className="snsd-src">
                    {isSns(b) && <SnsIcon name={b as SnsKey} size={14} />}
                    {BUCKET_LABELS[b]}
                  </span>
                  {b === "noise" && <span className="snsd-rownote">{NOISE_NOTE}</span>}
                </th>
                <td className="snsd-num snsd-barcell">
                  <span className="snsd-barcell-inner">
                    <span className="snsd-bartrack" aria-hidden="true">
                      <span
                        className={`snsd-bar${isSns(b) ? " is-sns" : ""}`}
                        style={{ width: `${(c.sessions / max) * 100}%` }}
                      />
                    </span>
                    <span className="snsd-barnum">
                      {fmtNum(c.sessions)}
                      <span className="snsd-prev">（{fmtNum(p.sessions)}）</span>
                    </span>
                  </span>
                </td>
                {cell(c.toolStart, p.toolStart)}
                {cell(c.generatedPdf, p.generatedPdf)}
                {cell(c.purchases, p.purchases)}
                <td className="snsd-num">{fmtYen(c.revenue)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">5 SNS 計</th>
            {cell(snsCur.sessions, snsPrev.sessions)}
            {cell(snsCur.toolStart, snsPrev.toolStart)}
            {cell(snsCur.generatedPdf, snsPrev.generatedPdf)}
            {cell(snsCur.purchases, snsPrev.purchases)}
            <td className="snsd-num">{fmtYen(snsCur.revenue)}</td>
          </tr>
          <tr>
            <th scope="row">全体</th>
            {cell(cur.total.sessions, prev.total.sessions)}
            {cell(cur.total.toolStart, prev.total.toolStart)}
            {cell(cur.total.generatedPdf, prev.total.generatedPdf)}
            {cell(cur.total.purchases, prev.total.purchases)}
            <td className="snsd-num">{fmtYen(cur.total.revenue)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ---------- スパークライン（取得ごとの変化） ---------- */

export function Sparkline({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  const W = 132;
  const H = 36;
  const PAD = 6;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (points.length - 1));
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const last = points[points.length - 1];
  return (
    <svg
      className="snsd-spark"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}の推移: ${points.map((p) => `${md(p.date)} ${p.value}`).join("、")}`}
    >
      <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="snsd-spark-base" />
      {points.length > 1 && (
        <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} className="snsd-spark-line" />
      )}
      <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} className="snsd-spark-dot" />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.value)} r={12} className="snsd-spark-hit">
          <title>{`${mdw(p.date)} ${label} ${p.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ---------- SNS 別カード ---------- */

function MetricList({ sns, block, watch }: { sns: SnsKey; block: PlatformBlock; watch: boolean }) {
  const defs = PLATFORM_METRICS[sns].filter((m) => m.watch === watch);
  return (
    <dl className="snsd-metrics">
      {defs.map((m) => {
        const has = m.key in block.metrics;
        const v = has ? block.metrics[m.key] : undefined;
        return (
          <div key={m.key} className="snsd-metric">
            <dt>{m.label}</dt>
            <dd title={v === null ? "画面に出ていない（多くは 0 件）" : !has ? "読んでいない" : undefined}>
              {v === null || v === undefined ? "—" : fmtNum(v)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function PinterestCtr({ block }: { block: PlatformBlock }) {
  const imp = block.metrics.impressions;
  const clicks = block.metrics.outboundClicks;
  if (imp == null || clicks == null || imp === 0) {
    return <p className="snsd-ctr">アウトバウンド CTR —（インプレッションが 0 か未取得）</p>;
  }
  const pct = (clicks / imp) * 100;
  const band = pinterestCtrBand(pct);
  return (
    <p className="snsd-ctr">
      アウトバウンド CTR <strong>{pct.toFixed(2)}%</strong>
      <span className={`snsd-band is-${band === "低め" ? "low" : band === "良好" ? "good" : "great"}`}>
        <span aria-hidden="true">{band === "低め" ? "▼" : "▲"}</span>
        {band}
      </span>
      <span className="snsd-muted">（1% 未満＝低め／1〜3%＝良好／3% 以上＝優秀）</span>
    </p>
  );
}

export function SnsCard({
  profile, block, cur, prev, trend,
}: {
  profile: SnsProfile;
  block: PlatformBlock | undefined;
  cur: Ga4Range | undefined;
  prev: Ga4Range | undefined;
  trend: { date: string; value: number }[];
}) {
  const site = cur?.buckets[profile.key];
  const sitePrev = prev?.buckets[profile.key];
  return (
    <section className="snsd-card" aria-labelledby={`snsd-${profile.key}`}>
      <header className="snsd-card-head">
        <h3 id={`snsd-${profile.key}`}>
          <SnsIcon name={profile.key} size={18} />
          {profile.label}
        </h3>
        <span className="snsd-handle">{profile.handle}</span>
        <span className="snsd-role">
          {profile.owner}・{profile.role}
        </span>
      </header>

      {block ? (
        <p className="snsd-card-meta">
          画面の数字: {block.periodLabel}・{fmtJst(block.collectedAt)} 取得
        </p>
      ) : (
        <p className="snsd-card-meta is-missing">
          画面の数字は未取得（
          <a href={profile.analyticsUrl} target="_blank" rel="noreferrer">
            分析画面
          </a>
          ）
        </p>
      )}

      {block && (
        <>
          <h4 className="snsd-h4">見る数字</h4>
          <MetricList sns={profile.key} block={block} watch />
          {profile.key === "pinterest" && <PinterestCtr block={block} />}
        </>
      )}

      <h4 className="snsd-h4">サイトで起きたこと（GA4）</h4>
      {site && sitePrev ? (
        <ol className="snsd-steps">
          {FUNNEL.map((f) => (
            <li key={f.key} className={f.north ? "is-north" : ""}>
              <span className="snsd-step-label" title={f.label}>
                {f.short}
              </span>
              <span className="snsd-step-value">{fmtNum(site[f.key])}</span>
              <span className="snsd-prev">（{fmtNum(sitePrev[f.key])}）</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="snsd-muted">GA4 は未取得</p>
      )}

      <div className="snsd-trend">
        <span className="snsd-trend-label">訪問の推移</span>
        {trend.length >= 2 ? (
          <Sparkline points={trend} label={`${profile.label} 経由の訪問`} />
        ) : (
          <span className="snsd-muted">2 回目の取得から出ます</span>
        )}
      </div>

      {block && (
        <details className="snsd-vanity">
          <summary>見ない数字（参考・最適化しない）</summary>
          <MetricList sns={profile.key} block={block} watch={false} />
          {block.memo && <p className="snsd-muted">メモ: {block.memo}</p>}
        </details>
      )}
    </section>
  );
}

/* ---------- 名寄せの内訳 ---------- */

export function SourceDetail({ cur }: { cur: Ga4Range }) {
  return (
    <details className="snsd-detail">
      <summary>名寄せの内訳（GA4 の参照元 / メディア {cur.sources.length} 行）</summary>
      <div className="snsd-scroll">
        <table className="snsd-table is-compact">
          <thead>
            <tr>
              <th>参照元 / メディア</th>
              <th>振り分け先</th>
              <th className="snsd-num">訪問</th>
              <th className="snsd-num">メーカー起動</th>
              <th className="snsd-num">PDF 書き出し</th>
              <th className="snsd-num">購入</th>
            </tr>
          </thead>
          <tbody>
            {cur.sources.map((s) => (
              <tr key={`${s.source}/${s.medium}`}>
                <td className="snsd-mono">
                  {s.source} / {s.medium}
                </td>
                <td>{BUCKET_LABELS[s.bucket]}</td>
                <td className="snsd-num">{fmtNum(s.sessions)}</td>
                <td className="snsd-num">{fmtNum(s.toolStart)}</td>
                <td className="snsd-num">{fmtNum(s.generatedPdf)}</td>
                <td className="snsd-num">{fmtNum(s.purchases)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
