import Script from "next/script";
import { GTM_ID } from "./analytics";

/* Google Tag Manager コンテナ（root layout の body 直下に置く）。
   GA4・広告ピクセル等のタグは GTM コンソール側で管理し、コードからは
   dataLayer にイベントを流すだけ（app/analytics.ts）。
   NEXT_PUBLIC_GTM_ID 未設定の環境では何も描画しない＝計測まるごと no-op。 */
export default function Gtm() {
  if (!GTM_ID) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
