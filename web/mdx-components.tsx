import type { MDXComponents } from "mdx/types";
import Image from "next/image";
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
  return <div className="lead-graf">{children}</div>;
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
      <div className="src">
        {src}
        {cite ? <span className="cite">{cite}</span> : null}
      </div>
      <p className="label">TENZU 訳</p>
      <div className="trans">{children}</div>
    </div>
  );
}

// 図解ブロック（左に SVG・右にキャプション）。.diagram
// children に <svg> を、title/caption にキャプションを渡す。
// wide を立てると .diagram--wide（SVG をフル幅で大きく・キャプションは下）になる。
// 手順図など、図そのものを読ませたいときに使う。
function Diagram({
  title,
  caption,
  wide,
  children,
}: {
  title?: ReactNode;
  caption?: ReactNode;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={wide ? "diagram diagram--wide" : "diagram"}>
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
      <div className="q">{children}</div>
      {author ? <p className="a">{author}</p> : null}
    </div>
  );
}

// 開発ノート等のサイドノート。.article-sidenote
function SideNote({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return (
    <aside className="article-sidenote">
      {label ? <div className="sn-label">{label}</div> : null}
      <div className="sn-body">{children}</div>
    </aside>
  );
}

// 記事挿絵。3:2 の公開画像と短い補足を、記事共通の figure 表現で描画する。
function Illustration({
  src,
  alt,
  number,
  caption,
  ratio = "landscape",
}: {
  src: string;
  alt: string;
  number: string;
  caption: ReactNode;
  ratio?: "landscape" | "square";
}) {
  const isSquare = ratio === "square";

  return (
    <figure className={`article-illustration${isSquare ? " article-illustration--square" : ""}`}>
      <Image
        src={src}
        alt={alt}
        width={isSquare ? 1254 : 1536}
        height={isSquare ? 1254 : 1024}
        sizes="(max-width: 600px) 100vw, 632px"
        loading="lazy"
      />
      <figcaption>
        <span className="figure-no">FIG. {number}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

const components: MDXComponents = {
  LeadGraf,
  TenzuTranslate,
  Diagram,
  Quote,
  SideNote,
  Illustration,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
