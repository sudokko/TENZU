/* =========================================================================
   /feed.xml — 記事の RSS 2.0 フィード
   - 新記事の更新検知チャネル。Google への直接効果は小さいが、Bing 系
     （ChatGPT search / Copilot が乗るインデックス）と AI クローラの
     発見性に効かせる LLMO 施策（decisions.md §3.95）。
   - listArticles() を使うため draft / unlisted は自動で載らない
     （staging は SHOW_DRAFTS=1 で draft も載るが、全ページ noindex なので無害）。
   - ビルド時に静的生成（記事の公開・改訂はデプロイを伴うため十分）。
   ========================================================================= */

import { SITE_NAME, absoluteUrl } from "../site";
import { listArticles } from "../articles/articles-data";

export const dynamic = "force-static";

const FEED_TITLE = `${SITE_NAME} — 点図形（点描写）プリントの専門店`;
const FEED_DESCRIPTION =
  "点描写が何を育てるのか、どこから始めるのか。空間認知の土台づくりを家庭で読むための記事。";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** YYYY-MM-DD を RFC 822 形式（JST 朝 9 時固定）へ。RSS の pubDate 仕様に合わせる。 */
function rfc822(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T09:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toUTCString();
}

export async function GET(): Promise<Response> {
  const articles = await listArticles();

  const items = articles
    .map((a) => {
      const url = absoluteUrl(`/articles/${a.slug}`);
      const pubDate = rfc822(a.published_at ?? a.updated_at);
      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        a.description ? `      <description>${escapeXml(a.description)}</description>` : null,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const lastBuildDate = rfc822(
    articles.map((a) => a.updated_at ?? a.published_at ?? "").sort().at(-1) || undefined,
  );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "  <channel>",
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${absoluteUrl("/articles")}</link>`,
    `    <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml"/>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    "    <language>ja</language>",
    lastBuildDate ? `    <lastBuildDate>${lastBuildDate}</lastBuildDate>` : null,
    items,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
