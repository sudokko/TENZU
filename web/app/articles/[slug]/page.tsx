/* =========================================================================
   /articles/[slug] — 記事 MDX 公開パイプライン
   - web/content/articles/*.mdx を列挙して SSG（dynamicParams=false で未定義は404）
   - フロントマター(remark-mdx-frontmatter の `frontmatter` export)からヘッダを描画
   - 本文は MDX を描画。独自ブロックは web/mdx-components.tsx が供給
   - デザインは app/articles/article.css を再利用
   ========================================================================= */

import type { Metadata } from "next";
import SiteHeader from "../../SiteHeader";
import { SITE_NAME, absoluteUrl } from "../../site";
import { listSlugs, loadArticle, type ArticleFrontmatter } from "../articles-data";
import "../article.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const { frontmatter: fm } = await loadArticle(slug);
  const url = `/articles/${slug}`;
  // og:title は title.template の対象外なので明示的にサフィックスを付ける。
  const ogTitle = `${fm.title} · ${SITE_NAME}`;
  return {
    // layout の template により <title> は「<fm.title> · TENZU」になる。
    title: fm.title,
    description: fm.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: ogTitle,
      description: fm.description,
      publishedTime: fm.published_at ?? fm.updated_at,
      modifiedTime: fm.updated_at,
      authors: fm.author ? [fm.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: fm.description,
    },
    // og:image / twitter:image は opengraph-image.tsx（動的 OG / 手動 eyecatch）が供給する。
  };
}

/* 構造化データ（LLMO の核）: Article + BreadcrumbList（+ FAQ 記事は FAQPage）。
   AI クローラに「結論・出典・階層」を機械可読で渡す。絶対URLは SITE_URL 基点。 */
function buildJsonLd(slug: string, fm: ArticleFrontmatter) {
  const url = absoluteUrl(`/articles/${slug}`);
  const ogImage = absoluteUrl(`/articles/${slug}/opengraph-image`);

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    inLanguage: "ja",
    author: { "@type": "Person", name: fm.author ?? "店主" },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/assets/logo-horizontal.png") },
    },
    datePublished: fm.published_at ?? fm.updated_at,
    dateModified: fm.updated_at ?? fm.published_at,
    image: ogImage,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  // 実 href を持つパンくずのみ item に採用し、末尾に現在ページを追加。
  const crumbItems = [
    ...(fm.breadcrumb ?? []).filter((c) => c.href && c.href !== "#"),
    { label: fm.title_main ?? fm.title, href: `/articles/${slug}` },
  ];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbItems.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absoluteUrl(c.href),
    })),
  };

  const graphs: object[] = [article, breadcrumb];

  if (fm.faq_schema && fm.faq_schema.length > 0) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: fm.faq_schema.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return graphs;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { default: Body, frontmatter: fm } = await loadArticle(slug);
  const jsonLd = buildJsonLd(slug, fm);

  return (
    <>
      {jsonLd.map((g, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(g) }}
        />
      ))}
      <SiteHeader currentNav="読みもの" />

      <nav className="crumb-article" aria-label="パンくず">
        {(fm.breadcrumb ?? []).map((c) => (
          <span key={c.label}>
            <a href={c.href}>{c.label}</a>
            <span className="sep">/</span>
          </span>
        ))}
        <span className="cur">{fm.title_main ?? fm.title}</span>
      </nav>

      <div className="wrap-article">
        <header className="article-meta">
          {fm.kicker ? <div className="kicker">{fm.kicker}</div> : null}
          <div className="pillar-bar">
            {fm.series ? <span>{fm.series}</span> : null}
            {fm.updated_at ? <span className="pdate">· {fm.updated_at}</span> : null}
            {fm.reading_time ? <span className="pdate">· 読了 {fm.reading_time} 分</span> : null}
          </div>
          <h1>{(fm.title_main ?? fm.title) + (fm.title_sub ?? "")}</h1>
          {fm.lead ? <p className="lead">{fm.lead}</p> : null}
          <div className="author">
            <span className="by">執筆 · </span>
            {fm.author ?? "店主"}
            {fm.updated_at ? ` · ${fm.updated_at}` : ""}
          </div>
        </header>

        <article className="article-body">
          <Body />
        </article>
      </div>

      {fm.related && fm.related.length > 0 ? (
        <section className="s-article">
          <div className="wrap">
            <h2 className="outer">{fm.related_heading ?? "関連記事"}</h2>
            <div className="related-articles">
              {fm.related.map((r) => (
                <a className="ra" href={r.href ?? "#"} key={r.title}>
                  <div className="ra-meta">{r.meta}</div>
                  <div className="ra-title">{r.title}</div>
                  <div className="ra-lead">{r.lead}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="site footer-article">
        <div className="wrap">© 2026 TENZU · 点図形（点描写）プリントの専門店</div>
      </footer>
    </>
  );
}
