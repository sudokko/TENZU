/* =========================================================================
   web/app/articles/page.tsx（全置換）
   記事一覧 改定版（2026-07-14・案A「本棚グリッド」）
   1. よく読まれる記事（上位3・当面は genres.ts の手動選定）
   2. ジャンル箱グリッド（タイトルのみの一覧・常時展開）
   - tenzu-concept は一覧から除外（ヘッダー About から遷移）
   - ジャンル未所属の新記事は「新着・その他」箱に自動フォールバック
   ========================================================================= */
import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { listArticles, type ArticleFrontmatter } from "./articles-data";
import { GENRES, POPULAR_SLUGS, EXCLUDED_FROM_INDEX } from "./genres";
import "./article.css";

export const metadata: Metadata = {
  title: "記事",
  description:
    "点描写が何を育てるのか、どこから始めるのか。空間認知の土台づくりを家庭で読むための記事一覧。",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesIndex() {
  const articles = await listArticles();
  const bySlug = new Map<string, ArticleFrontmatter>(
    articles.map((a) => [a.slug, a]),
  );

  // よく読まれる（存在する slug のみ・最大3）
  const popular = POPULAR_SLUGS.map((s) => bySlug.get(s)).filter(
    (a): a is ArticleFrontmatter => Boolean(a),
  ).slice(0, 3);

  // ジャンルに割り当て済みの slug 集合
  const assigned = new Set<string>([
    ...GENRES.flatMap((g) => g.slugs),
    ...EXCLUDED_FROM_INDEX,
  ]);
  // どのジャンルにも属さない記事（将来の追加分の安全網）
  const unassigned = articles.filter((a) => !assigned.has(a.slug));

  return (
    <>
      <SiteHeader currentNav="記事" />

      <div className="wrap-article">
        <header className="article-meta">
          <div className="kicker">記事</div>
          <h1>選ぶ前に、読んでおく。</h1>
          <p className="lead">
            点描写が何を育てるのか、どこから始めるのか。お悩みの棚から、お選びください。
          </p>
        </header>
      </div>

      {/* ---- よく読まれる記事 ---- */}
      {popular.length > 0 && (
        <section className="s-article s-most-read">
          <div className="wrap">
            <h2 className="index-label">
              よく読まれる記事<span className="index-label-en">MOST READ</span>
            </h2>
            <div className="most-read">
              {popular.map((a, i) => (
                <a className="mr-card" href={`/articles/${a.slug}`} key={a.slug}>
                  <span className="mr-rank" aria-label={`第${i + 1}位`}>
                    <span className="rank-dots" aria-hidden="true">
                      {[0, 1, 2].map((d) => (
                        <i key={d} className={d <= i ? "on" : ""} />
                      ))}
                    </span>
                    第{["1", "2", "3"][i]}位
                  </span>
                  <span className="mr-title">{a.title_main ?? a.title}</span>
                  {a.lead && <span className="mr-lead">{a.lead}</span>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- ジャンル箱 ---- */}
      <section className="s-article">
        <div className="wrap">
          <h2 className="index-label">
            お悩み・テーマから探す
            <span className="index-label-en">BROWSE BY THEME</span>
          </h2>
          <div className="genre-grid">
            {GENRES.map((g) => {
              const items = g.slugs
                .map((s) => bySlug.get(s))
                .filter((a): a is ArticleFrontmatter => Boolean(a));
              if (items.length === 0) return null;
              return (
                <section className="genre-box" key={g.id}>
                  <h3 className="genre-name">
                    <span>
                      <span aria-hidden="true">{g.emoji} </span>
                      {g.name}
                    </span>
                    <span className="genre-count">{items.length}本</span>
                  </h3>
                  <p className="genre-lead">{g.lead}</p>
                  <ul className="title-list">
                    {items.map((a) => (
                      <li key={a.slug}>
                        <a href={`/articles/${a.slug}`}>
                          {a.title_main ?? a.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {unassigned.length > 0 && (
              <section className="genre-box">
                <h3 className="genre-name">
                  <span>
                    <span aria-hidden="true">🆕 </span>新着・その他
                  </span>
                  <span className="genre-count">{unassigned.length}本</span>
                </h3>
                <p className="genre-lead">
                  ジャンル整理前の新しい記事です。
                </p>
                <ul className="title-list">
                  {unassigned.map((a) => (
                    <li key={a.slug}>
                      <a href={`/articles/${a.slug}`}>
                        {a.title_main ?? a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </section>

      <footer className="site footer-article">
        <div className="wrap">© 2026 TENZU · 点図形（点描写）プリントの専門店</div>
      </footer>
    </>
  );
}
