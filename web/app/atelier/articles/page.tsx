/* =========================================================================
   atelier — 記事一覧（編集モードの入口）— dev 限定（本番は 404）
   web/content/articles/*.mdx を更新日の新しい順に並べ、編集モードと記事ページへ導く。
   ========================================================================= */
import { notFound } from "next/navigation";
import { listArticleFiles, type ArticleListItem } from "../../api/atelier/article-source";
import "../atelier.css";
import "./article-editor.css";

export const metadata = { title: "atelier — 記事の編集モード（dev）", robots: { index: false } };

const STATUS_LABEL: Record<ArticleListItem["status"], string> = {
  published: "公開",
  unlisted: "限定公開",
  draft: "下書き",
};

export default async function AtelierArticles() {
  if (process.env.NODE_ENV === "production") notFound();

  const items = await listArticleFiles();

  return (
    <main className="atl-wrap">
      <header className="atl-head">
        <p className="atl-crumb"><a href="/atelier">atelier</a> / 記事</p>
        <h1>記事の編集モード</h1>
        <p>
          記事を実際の見た目のまま開き、直したい文章をクリックしてその場で書き換えます。
          保存先は web/content/articles/*.mdx（dev 限定・公開は別途 commit / push）。
        </p>
      </header>

      <table className="aed-list">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>状態</th>
            <th>更新日</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.slug}>
              <td>
                <a className="aed-list-title" href={`/atelier/articles/${a.slug}`}>{a.title}</a>
                <div className="aed-list-slug">{a.slug}</div>
              </td>
              <td>
                <span className={`aed-chip aed-chip--${a.status}`}>{STATUS_LABEL[a.status]}</span>
              </td>
              <td className="aed-list-date">{a.updatedAt ?? "—"}</td>
              <td className="aed-list-actions">
                <a href={`/atelier/articles/${a.slug}`}>編集モード</a>
                <a href={`/articles/${a.slug}`} target="_blank" rel="noreferrer">記事を開く ↗</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
