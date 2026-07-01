import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

/* =========================================================================
   TENZU 記事 MDX コンポーネント・マップ（App Router 必須の規約ファイル）
   - 見出し/段落/リスト等の基本要素は article.css のカスケードで自動整形するため
     ここでは上書きしない（.article-body 配下でスタイルが当たる）。
   - 記事本文の独自ブロックのみをコンポーネント化する。デザインは design/visual-identity.md、
     マークアップは app/articles/article.css の各クラスに対応。
   ========================================================================= */

// リード段落（本文冒頭の一段）。.article-body p.lead-graf
function LeadGraf({ children }: { children?: ReactNode }) {
  return <p className="lead-graf">{children}</p>;
}

// 研究引用＋TENZU 訳ブロック。.tenzu-translate
function TenzuTranslate({
  src,
  cite,
  children,
}: {
  src: ReactNode;
  cite?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="tenzu-translate">
      <p className="src">
        {src}
        {cite ? <span className="cite">{cite}</span> : null}
      </p>
      <p className="label">TENZU 訳</p>
      <p className="trans">{children}</p>
    </div>
  );
}

// 図解ブロック（左に SVG・右にキャプション）。.diagram
// children に <svg> を、title/caption にキャプションを渡す。
function Diagram({
  title,
  caption,
  children,
}: {
  title?: ReactNode;
  caption?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="diagram">
      {children}
      <div className="dcap">
        {title ? <b>{title}</b> : null}
        {caption}
      </div>
    </div>
  );
}

// キメの引用ブロック。.article-quote
function Quote({ author, children }: { author?: ReactNode; children?: ReactNode }) {
  return (
    <div className="article-quote">
      <p className="q">{children}</p>
      {author ? <p className="a">{author}</p> : null}
    </div>
  );
}

// 開発ノート等のサイドノート。.article-sidenote
function SideNote({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return (
    <aside className="article-sidenote">
      {label ? <div className="sn-label">{label}</div> : null}
      <p className="sn-body">{children}</p>
    </aside>
  );
}

const components: MDXComponents = {
  LeadGraf,
  TenzuTranslate,
  Diagram,
  Quote,
  SideNote,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
