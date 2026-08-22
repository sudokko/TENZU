import type { Metadata } from "next";
import { CartProvider } from "./cart/CartContext";
import { AuthProvider } from "./AuthContext";
import Gtm from "./Gtm";
import OnsiteMessenger from "./components/onsite/OnsiteMessenger";
import PreopenBanner from "./components/PreopenBanner";
import { SITE_URL, SITE_NAME, IS_PREVIEW } from "./site";
import "./tokens.css";
import "./landing.css";

const SITE_TITLE = "TENZU — 点図形（点描写）プリントの専門店";
const SITE_DESCRIPTION =
  "見て、考えて、書く力を、点描写から。模写から対称・回転・立体まで、学びの土台を家庭で無理なく育てる、点図形（点描写）プリントの専門店。";

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
  // プレビューは検索結果に出さない。robots.txt でクロールを止めないのは、noindex を
  // 読んでもらえないと既にインデックスされた URL が消えないため（robots.ts 参照）。
  robots: IS_PREVIEW
    ? {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      }
    : {
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
        <Gtm />
        <PreopenBanner />
        <AuthProvider>
          <CartProvider>
            {children}
            <OnsiteMessenger />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
