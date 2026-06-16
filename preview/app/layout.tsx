import type { Metadata } from 'next';
import Link from 'next/link';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'TENZU Drafts Preview',
  description: 'Throwaway local previewer for MDX article drafts.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <h1>
            <Link href="/">TENZU Drafts Preview</Link>{' '}
            <span className="nav">— ローカル限定・レビュー用</span>
          </h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
