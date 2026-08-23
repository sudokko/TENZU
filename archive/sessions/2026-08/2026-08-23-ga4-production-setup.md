# GA4 / GTM 本番導入・初期データ確認

## 対象

- サイト: `https://tenzu.jp`
- GA4: ストリーム名 `TENZU`／ストリーム ID `15255884396`／測定 ID `G-KH1BKQLSLH`
- GTM: コンテナ ID `GTM-K7KNR7CH`
- 実装コミット: `63d0074 feat: enable GA4 funnel tracking`／`2a27f1b fix: preserve recommendation item analytics`

## 導入前の状態

公開 HTML とブラウザの通信を確認した時点では、GTM スニペット、`gtag`、`dataLayer`、GA4 への収集リクエストが存在せず、設計済みの track 関数も `NEXT_PUBLIC_GTM_ID` がないため no-op だった。公開 GTM コンテナには測定 ID `G-KH1BKQLSLH` の Google タグだけがあり、カスタムイベント用の GA4 イベントタグはなかった。

## 実装とデプロイ

`web/app/analytics.ts` を中心に `tool_start`、`generated_pdf`、`product_recommend_click`、`view_item`、`add_to_cart`、`begin_checkout`、`purchase` を実装した。イベントは GTM 用オブジェクトと、測定 IDを宛先にした `gtag('event', ...)` コマンドの両方を dataLayer へ積む。GTM 側は Google タグだけを置き、同名の GA4 イベントタグは追加しない。追加すると二重計上になる。

`purchase` は transaction_id・value・currency・items・purchase_kind を送り、localStorage で同一 transaction_id の再送を防ぐ。`product_recommend_click` は GA4 で商品情報を参照できるよう `item_id`・`item_name`・`item_category` をフラットなイベントパラメータでも送る。Amplify の main ビルドでは、コンソール値が未設定のときだけ `NEXT_PUBLIC_GTM_ID=GTM-K7KNR7CH` を補う。コンソール値があればそちらを優先し、staging/dev には本番フォールバックを適用しない。Next.js production build、TypeScript、対象 ESLint を通過後、main へ push して Amplify 本番へ反映した。

## 本番受信とGA4設定

本番で GTM と Google タグの読み込みを確認し、GA4 への `page_view`、`tool_start`、`generated_pdf`、`view_item`、`add_to_cart`、`product_recommend_click` の送信を確認した。GA4 リアルタイムではメーカー開始からPDF生成までを再現し、`generated_pdf` がキーイベントとして1件計上されることを確認した。GA4 管理では `generated_pdf` と `purchase` をキーイベントとして有効化した。`begin_checkout` はStripe Checkoutへの遷移を行う確認、`purchase` は最初の実決済データを待つため未検証である。

## 初期データのスナップショット

2026年7月26日〜8月22日の標準レポートでは、総ユーザー40、新規ユーザー36、リピーター18、セッション101、表示回数779、イベント1,788、エンゲージメント率71.29%、セッションあたり平均エンゲージメント5分20秒だった。主要ページは `/` 105表示・35ユーザー、`/atelier` 90表示・8ユーザー、`/products/design` 22表示・7ユーザー、`/makers` 16表示・5ユーザー、`/products/copy` 14表示・5ユーザーだった。

独自イベントは `view_item` 7回・2ユーザー、`tool_start` 5回・2ユーザー、`generated_pdf` 4回・1ユーザー、`product_recommend_click` 4回・2ユーザー、`add_to_cart` 2回・2ユーザーだった。`purchase` は0件。イベント利用者が1〜2人のため、この時点の率は事業CVRとして扱わない。

ユーザー属性は日本39・米国1、市区町村は板橋区39・Ashburn 1、端末はdesktop 36・mobile 4、OSはWindows 36・Android 3・iOS 1だった。初回チャネルはDirectがほぼ全量で、Organic Search・Organic Social・Referralは確認できなかった。この偏りと開発時の多数の確認操作から、40ユーザーを40人の顧客とは扱わず、同一人物の別ブラウザ・Cookie・シークレットセッション等を含む内部トラフィック中心のデータと判断する。Ashburnの1件もクラウドまたは自動アクセスの可能性があり、実顧客とは断定しない。

## 残作業

1. GA4で自宅・開発環境を内部トラフィックとして定義し、テスト確認後に除外フィルタを有効化する。
2. SNS・メール・広告・DMの公開リンクへ [UTM命名規則](../../../engineering/analytics.md) を適用し、Direct以外の流入を識別できるようにする。
3. Stripe Checkoutへの遷移で `begin_checkout` を確認する。
4. 最初の実購入時に、GA4 `purchase` の transaction_id・value・items とStripeを突合する。
5. Search Consoleをtenzu.jpへ接続し、GA4とリンクする。
6. `maker`・`purchase_kind`・`pages`を通常レポートで常設分析する段階で、GA4のカスタム定義を追加する。

外部ユーザーが30〜50人程度蓄積するまでは、`tool_start → generated_pdf → product_recommend_click → add_to_cart → purchase` の数値を傾向判断に使わず、計測の健全性確認に用いる。
