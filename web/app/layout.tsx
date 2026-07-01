import type { Metadata } from "next";
import { CartProvider } from "./cart/CartContext";
import { AuthProvider } from "./AuthContext";
import { SITE_URL, SITE_NAME } from "./site";
import "./tokens.css";
import "./landing.css";

const SITE_TITLE = "TENZU — 点図形（点描写）プリントの専門店";
const SITE_DESCRIPTION =
  "子供の「空間認知の土台」を、家庭で無理なく育てる。9 タスク × 5 レベル × Vol 細刻みで設計された、点描写プリント。";

export const metadata: Metadata = {
  // 絶対URLの基点。子セグメントの相対パス（canonical/OG 等）がここから解決される。
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // 子ページが title を設定すると「<title> · TENZU」に整形される。
    template: "%s · TENZU",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
