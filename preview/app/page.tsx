import Link from 'next/link';
import { getAllDrafts } from '../lib/drafts';

function s(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(s);
  if (v == null || v === '') return [];
  return [s(v)];
}

export default function IndexPage() {
  const drafts = getAllDrafts();

  return (
    <div className="index-wrap">
      <h2>ドラフト一覧</h2>
      <p className="draft-count">{drafts.length} 本</p>

      {drafts.length === 0 ? (
        <p>
          ドラフトが見つからないわよ。<code>../docs/drafts/articles/*.mdx</code> を確認して。
        </p>
      ) : (
        <table className="draft-table">
          <thead>
            <tr>
              <th>slug</th>
              <th>title</th>
              <th>phase</th>
              <th>article_type</th>
              <th>pillar</th>
              <th>persona</th>
              <th>level</th>
              <th>min</th>
              <th>updated_at</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => {
              const fm = d.frontmatter;
              const phase = s(fm.phase);
              return (
                <tr key={d.slug}>
                  <td className="slug">
                    <Link href={`/drafts/${d.slug}`}>{d.slug}</Link>
                  </td>
                  <td>{s(fm.title) || '—'}</td>
                  <td>
                    {phase && <span className={`badge ${phase}`}>{phase}</span>}
                  </td>
                  <td>{s(fm.article_type) || '—'}</td>
                  <td>{s(fm.parent_pillar) || '—'}</td>
                  <td>
                    {arr(fm.target_persona).map((p) => (
                      <span key={p} className="badge">{p}</span>
                    ))}
                  </td>
                  <td>
                    {arr(fm.target_level).map((l) => (
                      <span key={l} className="badge">{l}</span>
                    ))}
                  </td>
                  <td>{s(fm.reading_time) || '—'}</td>
                  <td>{s(fm.updated_at) || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
