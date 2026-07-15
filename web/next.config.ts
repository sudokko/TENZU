import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // dev サーバーへの LAN アクセス許可（スマホ実機確認用・本番には無関係）
  allowedDevOrigins: ["192.168.10.113", "192.168.10.107", "192.168.10.*", "192.168.137.1"],
  // 記事は web/content/articles/*.mdx を import して描画する（ファイルルーティングは使わない）。
  // そのため pageExtensions は変更しない（.mdx をルート化しない）。
};

// YAML フロントマターを `export const frontmatter` として取り出す。
// Turbopack 対応のためプラグインは文字列名で指定（関数を渡すと Rust 側へ渡せない）。
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      "remark-gfm",
      "remark-frontmatter",
      ["remark-mdx-frontmatter", { name: "frontmatter" }],
    ],
  },
});

export default withMDX(nextConfig);
