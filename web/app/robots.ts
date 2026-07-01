import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "./site";

/* robots.txt。AI クローラ（OAI-SearchBot / GPTBot 等）を明示的に許可し、
   ツール系・アカウント系・API を除外。sitemap を提示する。 */

const DISALLOW = ["/api/", "/atelier", "/account", "/login", "/cart", "/checkout"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // 死の谷対策: AI 検索/学習クローラを明示許可（本文が引用されやすくする）。
      { userAgent: "OAI-SearchBot", allow: "/", disallow: DISALLOW },
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
