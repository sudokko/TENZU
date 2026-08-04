import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { listArticles } from "./articles/articles-data";
import { LAUNCH_TASKS } from "./products/data";
import { PUBLISHED_SKUS } from "./products/problems/published/skus";

/* サイトマップ（AI/検索クローラに構造を渡す）。公開ページ＋公開記事＋商品ページを列挙。
   商品はタスク一覧 9 ページ＋入稿済み（live）SKU 詳細＝商業面の本丸。scaffold の
   SKU 詳細は「準備中」でも 200 を返すが、買えないページを sitemap で推さない。
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
  { path: "/products/design", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
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
    ...LAUNCH_TASKS.map((t) => ({
      url: absoluteUrl(`/products/${t.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...PUBLISHED_SKUS.map((sku) => ({
      url: absoluteUrl(`/products/${sku}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
