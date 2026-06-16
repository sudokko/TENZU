import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getAllDrafts, getDraftBySlug } from '../../../lib/drafts';

export function generateStaticParams() {
  return getAllDrafts().map((d) => ({ slug: d.slug }));
}

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

export default function DraftPage({ params }: { params: { slug: string } }) {
  const draft = getDraftBySlug(params.slug);
  if (!draft) notFound();

  const fm = draft.frontmatter;
  const personas = arr(fm.target_persona);
  const levels = arr(fm.target_level);
  const refs = arr(fm.references);
  const related = arr(fm.related);
  const skus = arr(fm.target_skus);

  return (
    <div className="article-wrap">
      <Link href="/" className="back-link">← 一覧に戻る</Link>

      <details className="article-meta" open>
        <summary>frontmatter ({draft.filename})</summary>
        <dl>
          <dt>slug</dt><dd>{draft.slug}</dd>
          <dt>phase</dt><dd>{s(fm.phase ?? '—')}</dd>
          <dt>article_type</dt><dd>{s(fm.article_type ?? '—')}</dd>
          <dt>parent_pillar</dt><dd>{s(fm.parent_pillar ?? '—')}</dd>
          <dt>parent_category</dt><dd>{s(fm.parent_category ?? '—')}</dd>
          <dt>target_persona</dt><dd>{personas.join(', ') || '—'}</dd>
          <dt>target_level</dt><dd>{levels.join(', ') || '—'}</dd>
          <dt>cta_mode</dt><dd>{s(fm.cta_mode ?? '—')}</dd>
          <dt>cta_intensity</dt><dd>{s(fm.cta_intensity ?? '—')}</dd>
          <dt>reading_time</dt><dd>{s(fm.reading_time ?? '—')} min</dd>
          <dt>target_skus</dt><dd>{skus.join(', ') || '—'}</dd>
          <dt>updated_at</dt><dd>{s(fm.updated_at ?? '—')}</dd>
          <dt>author</dt><dd>{s(fm.author ?? '—')}</dd>
        </dl>
      </details>

      <article className="article-body">
        {fm.title && <h1>{s(fm.title)}</h1>}
        {fm.description && <p className="lead">{s(fm.description)}</p>}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        >
          {draft.content}
        </ReactMarkdown>
      </article>

      {(refs.length > 0 || related.length > 0) && (
        <footer className="article-footer">
          {refs.length > 0 && (
            <>
              <h3>references</h3>
              <ul>{refs.map((r) => <li key={r}>{r}</li>)}</ul>
            </>
          )}
          {related.length > 0 && (
            <>
              <h3>related</h3>
              <ul>
                {related.map((r) => (
                  <li key={r}><Link href={`/drafts/${r}`}>{r}</Link></li>
                ))}
              </ul>
            </>
          )}
        </footer>
      )}
    </div>
  );
}
