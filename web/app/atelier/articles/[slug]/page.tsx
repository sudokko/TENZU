/* =========================================================================
   atelier — 記事の編集モード — dev 限定（本番は 404）
   記事ページ（/articles/[slug]）をそのまま表示し、クリックした文章のソースを開いて直す。
   画面の組み立ては ArticleEditor.tsx、読み書きは /api/atelier/article。
   ========================================================================= */
import { notFound } from "next/navigation";
import { articleExists, isValidSlug } from "../../../api/atelier/article-source";
import ArticleEditor from "./ArticleEditor";
import "../article-editor.css";

export const metadata = { title: "記事の編集モード（dev）", robots: { index: false } };

export default async function ArticleEditPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { slug } = await params;
  if (!isValidSlug(slug) || !(await articleExists(slug))) notFound();

  return <ArticleEditor slug={slug} />;
}
