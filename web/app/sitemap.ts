import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { listArticles } from "./articles/articles-data";
import { LAUNCH_TASKS, volBySku, type ProductTask } from "./products/data";
import { publishedSet } from "./products/problems/published";
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
  const skuModified = new Map(PUBLISHED_SKUS.map((sku) => [sku, productModifiedAt(sku)]));
  const catalogModified = latestDate([...skuModified.values()]);
  const articlesModified = latestDate(articles.map((a) => a.updated_at));
  const siteModified = latestDate([catalogModified, articlesModified]);

  return [
    ...STATIC_ROUTES.map((r) => {
      const modified = staticModifiedAt(r.path, { catalogModified, articlesModified, siteModified });
      return {
        url: absoluteUrl(r.path),
        ...(modified && { lastModified: new Date(modified) }),
        changeFrequency: r.changeFrequency,
        priority: r.priority,
      };
    }),
    ...LAUNCH_TASKS.map((t) => {
      const modified = taskModifiedAt(t, skuModified);
      return {
        url: absoluteUrl(`/products/${t.slug}`),
        ...(modified && { lastModified: new Date(modified) }),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    }),
    ...PUBLISHED_SKUS.map((sku) => ({
      url: absoluteUrl(`/products/${sku}`),
      ...(skuModified.get(sku) && { lastModified: new Date(skuModified.get(sku)!) }),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      ...(a.updated_at && { lastModified: new Date(a.updated_at) }),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

function productModifiedAt(sku: string): string | undefined {
  const hit = volBySku(sku);
  return hit?.vol.revisions?.[0]?.date ?? publishedSet(sku)?.publishedAt;
}

function taskModifiedAt(task: ProductTask, skuModified: Map<string, string | undefined>): string | undefined {
  return latestDate(task.vols.map((vol) => skuModified.get(vol.sku)));
}

function latestDate(values: Array<string | undefined>): string | undefined {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1);
}

function staticModifiedAt(
  path: string,
  dates: { catalogModified?: string; articlesModified?: string; siteModified?: string },
): string | undefined {
  if (path === "/") return dates.siteModified;
  if (path === "/products" || path === "/products/design") return dates.catalogModified;
  if (path === "/articles") return dates.articlesModified;
  return undefined;
}
