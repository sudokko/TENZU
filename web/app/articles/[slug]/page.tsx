/* =========================================================================
   /articles/[slug] — 記事 MDX 公開パイプライン
   - web/content/articles/*.mdx を列挙して SSG（dynamicParams=false で未定義は404）
   - フロントマター(remark-mdx-frontmatter の `frontmatter` export)からヘッダを描画
   - 本文は MDX を描画。独自ブロックは web/mdx-components.tsx が供給
   - デザインは app/articles/article.css を再利用
   ========================================================================= */

import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType } from "react";
import SiteHeader from "../../SiteHeader";
import "../article.css";

export const dynamicParams = false;

const ARTICLES_DIR = join(process.cwd(), "content", "articles");

type Crumb = { label: string; href: string };
type Related = { meta: string; title: string; lead: string; href?: string };
type ArticleFrontmatter = {
  slug: string;
  title: string;
  title_main?: string;
  title_sub?: string;
  description?: string;
  kicker?: string;
  series?: string;
  updated_at?: string;
  reading_time?: number;
  author?: string;
  lead?: string;
  breadcrumb?: Crumb[];
  related_heading?: string;
  related?: Related[];
};

type ArticleModule = {
  default: ComponentType;
  frontmatter: ArticleFrontmatter;
};

function listSlugs(): string[] {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

async function loadArticle(slug: string): Promise<ArticleModule> {
  return (await import(`@/content/articles/${slug}.mdx`)) as unknown as ArticleModule;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const { frontmatter: fm } = await loadArticle(slug);
  const title = `${fm.title} · TENZU`;
  return {
    title,
    description: fm.description,
    openGraph: { title, description: fm.description, type: "article" },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { default: Body, frontmatter: fm } = await loadArticle(slug);

  return (
    <>
      <SiteHeader currentNav="記事" />

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
          <h1>
            {fm.title_main ?? fm.title}
            {fm.title_sub ? (
              <>
                <br />
                {fm.title_sub}
              </>
            ) : null}
          </h1>
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
