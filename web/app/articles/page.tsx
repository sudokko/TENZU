import type { Metadata } from "next";
import SiteHeader from "../SiteHeader";
import { listArticles } from "./articles-data";
import "./article.css";

export const metadata: Metadata = {
  title: "記事",
  description:
    "点描写が何を育てるのか、どこから始めるのか。空間認知の土台づくりを家庭で読むための記事一覧。",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesIndex() {
  const articles = await listArticles();

  return (
    <>
      <SiteHeader currentNav="記事" />

      <div className="wrap-article">
        <header className="article-meta">
          <div className="kicker">記事</div>
          <h1>選ぶ前に、読んでおく。</h1>
          <p className="lead">
            点描写が何を育てるのか、どこから始めるのか。家庭で読むための記事です。
          </p>
        </header>
      </div>

      <section className="s-article">
        <div className="wrap">
          <div className="related-articles">
            {articles.map((a) => (
              <a className="ra" href={`/articles/${a.slug}`} key={a.slug}>
                <div className="ra-meta">{a.kicker ?? a.series ?? "記事"}</div>
                <div className="ra-title">{a.title_main ?? a.title}</div>
                <div className="ra-lead">{a.lead ?? a.description}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="site footer-article">
        <div className="wrap">© 2026 TENZU · 点図形（点描写）プリントの専門店</div>
      </footer>
    </>
  );
}
