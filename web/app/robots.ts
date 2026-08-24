import type { MetadataRoute } from "next";
import { absoluteUrl, IS_PREVIEW } from "./site";

/* robots.txt。AI クローラ（OAI-SearchBot / GPTBot 等）を明示的に許可し、
   ツール系・アカウント系・API を除外。sitemap を提示する。

   プレビューでも `Disallow: /` にはしない。クロールを止めると layout.tsx の
   noindex を読んでもらえず、すでにインデックスされた URL が居座り続けるため。
   検索結果からの排除は noindex に任せ、ここでは sitemap を出さないことで
   クロールを積極的に誘わない、という役割分担にしている。 */

const DISALLOW = ["/api/", "/admin", "/atelier", "/account", "/login", "/cart", "/checkout"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // 死の谷対策: AI 検索/学習クローラを明示許可（本文が引用されやすくする）。
      { userAgent: "OAI-SearchBot", allow: "/", disallow: DISALLOW },
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
    ],
    ...(IS_PREVIEW ? {} : { sitemap: absoluteUrl("/sitemap.xml") }),
  };
}
