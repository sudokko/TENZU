import type { Metadata } from "next";
import { CartProvider } from "./cart/CartContext";
import { AuthProvider } from "./AuthContext";
import "./tokens.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "TENZU — 点図形（点描写）プリントの専門店",
  description:
    "子供の「空間認知の土台」を、家庭で無理なく育てる。9 タスク × 5 レベル × Vol 細刻みで設計された、点描写プリント 140 SKU。",
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
