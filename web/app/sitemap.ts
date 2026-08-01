import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { listArticles } from "./articles/articles-data";

/* サイトマップ（AI/検索クローラに構造を渡す）。公開ページ＋公開記事を列挙。
   絶対URLは SITE_URL 基点。ビルド時に静的生成される。 */

type StaticRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/products", changeFrequency: "weekly", priority: 0.9 },
  { path: "/makers", changeFrequency: "monthly", priority: 0.8 },
  { path: "/level-guide", changeFrequency: "monthly", priority: 0.7 },
  { path: "/articles", changeFrequency: "weekly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.5 },
  { path: "/sudo-craft", changeFrequency: "monthly", priority: 0.4 },
  { path: "/tokushoho", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listArticles();
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: absoluteUrl(r.path),
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
