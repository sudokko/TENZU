/* =========================================================================
   TOP「選ぶ前に、読んでおく。」（Server Component 専用）
   記事タイトルは content/articles の frontmatter（title_main ?? title）に追従。
   catalog.tsx に置かない: あちらは client（CoverageStudio）からも import される
   共有モジュールのため、node:fs を使う articles-data を混ぜられない。
   ========================================================================= */

import { listArticles } from "./articles/articles-data";

/* TOP に載せる 4 本。slug のみ固定し、存在しない slug は自動スキップ。 */
const TOP_ARTICLE_PICKS = [
  { slug: "point-drawing-guide", note: "まず読むなら" },
  { slug: "point-drawing-effects", note: "効果・根拠" },
  { slug: "kumon-math-shape", note: "次の一手" },
  { slug: "weak-at-shapes", note: "つまずき" },
];

export default async function ArticlesSection() {
  const bySlug = new Map((await listArticles()).map((a) => [a.slug, a]));
  const picks = TOP_ARTICLE_PICKS.flatMap(({ slug, note }) => {
    const a = bySlug.get(slug);
    return a ? [{ slug, note, title: a.title_main ?? a.title }] : [];
  });
  return (
    <section className="s">
      <div className="wrap wrap-narrow">
        {/* kicker は置かない。旧「§2 · もっと知る」は設計書の節番号がそのまま画面に出ていた
            もの（訪問者に §1 は存在しない）。2026-08-08 に削除。 */}
        <div className="section-head">
          <h2>選ぶ前に、読んでおく。</h2>
        </div>

        <ul className="more-list">
          {picks.map((a) => (
            <li key={a.slug}>
              <a className="more-item" href={`/articles/${a.slug}`}>
                <span className="more-title">{a.title}</span>
                <span className="more-note">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>

        <a className="btn-weak more-all" href="/articles">記事をすべて見る →</a>
      </div>
    </section>
  );
}
