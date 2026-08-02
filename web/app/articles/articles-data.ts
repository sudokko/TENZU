/* =========================================================================
   記事データローダ（SSOT）
   - web/content/articles/*.mdx を列挙し、frontmatter を取り出す共通層。
   - [slug]/page.tsx（本文）・articles/page.tsx（一覧）・sitemap.ts・
     opengraph-image.tsx が共有する。fs はビルド時のみ（リクエスト時に使わない）。
   - 公開ステータス（frontmatter `status`）の判定もここが一次ソース。
     一覧・sitemap・SSG 対象・本文中リンクの生死が、すべてこの層から派生する。
   ========================================================================= */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType } from "react";

export const ARTICLES_DIR = join(process.cwd(), "content", "articles");

export type Crumb = { label: string; href: string };
export type Related = { meta: string; title: string; lead: string; href?: string };
export type FaqItem = { q: string; a: string };

/**
 * 記事の公開ステータス（frontmatter `status`・未指定は published）。
 * - published … 通常公開（一覧・sitemap・本文すべて）
 * - unlisted  … URL は生きているが一覧・sitemap から外し noindex。導線だけ絞りたいとき
 * - draft     … 本番ではビルドしない（＝404）。staging / localhost でのみ読める
 */
export type ArticleStatus = "published" | "unlisted" | "draft";

/**
 * 下書き（status: draft）を見せる環境かどうか。
 *
 * site.ts の IS_PREVIEW（SITE_URL 由来）には乗せない。SITE_URL の設定漏れは
 * noindex なら安全側（隠れる）に倒れるが、下書き公開は逆向きに倒れて事故るため。
 * SHOW_DRAFTS=1 は staging(deploy/amplify) と web/.env.local にだけ置き、
 * 本番(main) は「未設定がデフォルト＝隠れる」で固定する。
 */
export const SHOW_DRAFTS = process.env.SHOW_DRAFTS === "1";

export type ArticleFrontmatter = {
  slug: string;
  title: string;
  /** 公開ステータス。未指定は published 扱い。 */
  status?: ArticleStatus;
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

/* ---- ステータス判定 ------------------------------------------------------
   status だけは MDX を import せず同期で読む。本文中リンクの生死判定
   （mdx-components.tsx の <a>）が同期コンポーネントから呼ばれるため。
   ビルド時に一度だけ走らせてキャッシュする。 */

const STATUS_RE = /^status:[ \t]*["']?([a-z]+)["']?[ \t]*$/m;

function readStatus(slug: string): ArticleStatus {
  const raw = readFileSync(join(ARTICLES_DIR, `${slug}.mdx`), "utf8").replace(/^\uFEFF/, "");
  // 先頭の `---` 〜 次の `---` までが frontmatter。本文側の誤検出を防ぐ。
  const end = raw.indexOf("\n---", 3);
  const value = STATUS_RE.exec(end === -1 ? "" : raw.slice(0, end))?.[1];
  return value === "draft" || value === "unlisted" ? value : "published";
}

let statusCache: Map<string, ArticleStatus> | null = null;

function statuses(): Map<string, ArticleStatus> {
  if (!statusCache) {
    statusCache = new Map(
      readdirSync(ARTICLES_DIR)
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => f.replace(/\.mdx$/, ""))
        .map((slug) => [slug, readStatus(slug)] as const),
    );
  }
  return statusCache;
}

/** SSG する slug（＝その環境で URL が生きる記事）。unlisted は含む。 */
export function listSlugs(): string[] {
  return [...statuses()]
    .filter(([, s]) => s !== "draft" || SHOW_DRAFTS)
    .map(([slug]) => slug);
}

/** URL が生きているか。本文中の記事リンクを落とすかどうかの判定に使う。 */
export function isLiveSlug(slug: string): boolean {
  const s = statuses().get(slug);
  return s !== undefined && (s !== "draft" || SHOW_DRAFTS);
}

/** 一覧・sitemap・TOP に載せてよいか（unlisted はここで落ちる）。 */
export function isListedSlug(slug: string): boolean {
  const s = statuses().get(slug);
  return s === "published" || (s === "draft" && SHOW_DRAFTS);
}

export async function loadArticle(slug: string): Promise<ArticleModule> {
  return (await import(`@/content/articles/${slug}.mdx`)) as unknown as ArticleModule;
}

/** 一覧に載せる記事の frontmatter を updated_at 降順で返す（一覧・sitemap・TOP 用）。 */
export async function listArticles(): Promise<ArticleFrontmatter[]> {
  const mods = await Promise.all(listSlugs().filter(isListedSlug).map((slug) => loadArticle(slug)));
  return mods
    .map((m) => m.frontmatter)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}
