/* =========================================================================
   記事データローダ（SSOT）
   - web/content/articles/*.mdx を列挙し、frontmatter を取り出す共通層。
   - [slug]/page.tsx（本文）・articles/page.tsx（一覧）・sitemap.ts・
     opengraph-image.tsx が共有する。fs はビルド時のみ（リクエスト時に使わない）。
   ========================================================================= */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType } from "react";

export const ARTICLES_DIR = join(process.cwd(), "content", "articles");

export type Crumb = { label: string; href: string };
export type Related = { meta: string; title: string; lead: string; href?: string };
export type FaqItem = { q: string; a: string };

export type ArticleFrontmatter = {
  slug: string;
  title: string;
  title_main?: string;
  title_sub?: string;
  description?: string;
  article_type?: string;
  parent_pillar?: string;
  kicker?: string;
  series?: string;
  updated_at?: string;
  published_at?: string;
  reading_time?: number;
  author?: string;
  lead?: string;
  /** 手動アイキャッチ（Gemini 生成・public 配下パス）。未指定なら動的 OG を生成。 */
  eyecatch?: string;
  breadcrumb?: Crumb[];
  related_heading?: string;
  related?: Related[];
  /** FAQ 記事の JSON-LD (FAQPage) 用 Q&A。 */
  faq_schema?: FaqItem[];
};

export type ArticleModule = {
  default: ComponentType;
  frontmatter: ArticleFrontmatter;
};

export function listSlugs(): string[] {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export async function loadArticle(slug: string): Promise<ArticleModule> {
  return (await import(`@/content/articles/${slug}.mdx`)) as unknown as ArticleModule;
}

/** 全記事の frontmatter を updated_at 降順で返す（一覧・sitemap 用）。 */
export async function listArticles(): Promise<ArticleFrontmatter[]> {
  const mods = await Promise.all(listSlugs().map((slug) => loadArticle(slug)));
  return mods
    .map((m) => m.frontmatter)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}
