---
ep: EP-087
title: カート＋Stripe決済＋SES配送をDBなしで通す（外部SaaSを会員台帳にする）
date: 2026-06-14
session: カート＋Stripe決済＋メール配送（SESマジックリンク）
themes: [engineering, payments, serverless, infrastructure, scope-control]
related_docs:
  - web/app/cart/CartContext.tsx
  - web/app/api/checkout/route.ts
  - web/app/api/stripe/webhook/route.ts
  - web/app/lib/email.ts
  - amplify.yml
  - decisions.md
status: draft
public_safe: true
---

# カート＋Stripe決済＋SES配送をDBなしで通す（外部SaaSを会員台帳にする）

## 何が起きたか（要約）

カートに複数巻を入れる → Stripe Checkout で支払う → 購入完了ページで PDF を解放 →（別端末向けに）Amazon SES でメール配送し再ダウンロードできる、までを一気通貫で実装した。最大の設計判断は「自前 DB を持たない」こと。会員台帳は Stripe が単一のソースになり、再ダウンロード用のマジックリンクは既存の購入完了 URL（`/checkout/success?session_id=...`）そのものを使う。サンクスページがサーバー側で Stripe に session を照合して支払い済みを確認するので、こちら側でトークンを保管する必要がない。Stripe が session を長期保持するため、別端末で同じ URL を開いても成立する。フェーズ1（カート＋決済）とフェーズ2（SES メール配送）を同日に実装し、その後 Amplify Hosting へデプロイ。Next.js 16 の SSR は一発で通った一方、Amplify 固有の環境変数の罠を3つ潰して、本番 URL で実カード決済（テスト 4242）が完走した。

## 状況・背景

decisions §3.48 で「SKU ＝問題データ・PDF は DL 時にその場生成」へ転換済みだったが、決済から先——カート・支払い・購入後の配布——を動かす実体がなかった。プリントは ¥200 一律で、複数巻をまとめて買う動線が要る。一方で TENZU はスマホがメインターゲットなので、最終的には「別の実機で買って、別の実機でメールのリンクを開く」という e2e（end to end）が通らないと安心できない。問題は、購入後の配布を「ちゃんと」作ろうとすると、購入履歴 DB・認証 API・トークン管理が芋づる式に必要になり、ローンチが遠のくことだった。

## やり取りの中身

スコープを三点に絞った。①決済〜DL の一気通貫、②複数巻まとめ買いカート、③ソフトゲート。③のソフトゲートとは、問題座標が既に公開ページのクライアントに乗っている前提で、購入の効果を「ダウンロードボタンの解放」だけに留めることだ。買った人だけが問題データを取得できる本格的な認証 API は、次フェーズに送った。

**フェーズ1（カート＋決済）**。カートは `CartContext`（React Context ＋ `localStorage "tenzu_cart"`）で持ち、`/api/checkout` が Stripe Checkout Session を発行する。価格は `price_data` でその場定義（JPY・unit_amount=200）、`metadata.skus` に巻の CSV を載せる。`/checkout/success` は URL の `session_id` を Stripe で照合し、`payment_status=paid` を確認できたら `SkuPrintPreview` を購入済みモードで描画する。

**フェーズ2（SES メール配送）**。実装深度は「SES のみ・DB なし」で確定した。マジックリンクは既存の `/checkout/success?session_id=...` URL そのもの。送信トリガーは Stripe Webhook（`checkout.session.completed`）、宛先は Stripe Checkout が収集した `customer_details.email`。Webhook は raw body を `req.text()` で取り、`constructEvent` で署名検証する（不正は 400）。冪等性は DB を持たないぶん重複送信があり得る、と割り切った。

**Amplify 固有の罠3つ**。Next.js の SSR 自体は通ったが、環境変数まわりで三段はまった。① `AWS_*` は Amplify の予約語で設定できない → `email.ts` を `SES_*` 別名で受け、SDK の既定チェーンにフォールバックする両対応へ。② コンソールで入れた環境変数が SSR ランタイム（Lambda）に自動で渡らない（ビルドシェルには入るが実行時 `process.env` が空）→ `amplify.yml` の build フェーズで `env | grep` して `.env.production` に書き出し、Next サーバーに読ませる。③ `req.nextUrl.origin` が Amplify SSR では内部ホスト `localhost:3000` に化ける → success/cancel URL を `process.env.SITE_URL ?? req.nextUrl.origin` 優先に変更。②③ を当てて初めて、実 4242 決済がサンクスへ正しくリダイレクトして完走した。

## なぜそう判断したか

ソフトゲートにしたのは、本格的な認証 API（認可ロジック・API 層・キャッシュ・エラー処理）の実装コストが、ローンチに対して重すぎたからだ。問題座標は既に公開ページに乗っているのだから、購入の意味を「ダウンロードボタンを点ける」に限れば、決済フローの確立を先に終えられる。データの本格的な保護は、決済が動いてから次フェーズで足せばよい。

DB を持たなかったのは、保持すべき状態の置き場所が、よく見ると全部「外」にあったからだ。会員台帳と支払い状態は Stripe にある。再ダウンロードのマジックリンクは、トークンを発行して DB に保管するのが定石だが、リンクの中身を「Stripe が長期保持する session_id を含む URL」にすれば、検証は毎回 Stripe へ問い合わせれば済む。つまり「メールに載せる中身を、外部 SaaS が保証してくれる恒久キーにする」と、自前 DB が丸ごと要らなくなる。これが実装を最も簡潔にした鍵だった。

Amplify を Hosting のみ（Gen2 のバックエンド自動化を使わない）にしたのも同じ理由だ。DB を持たない SES だけの設計なら、バックエンド生成の足場は要らない。Next.js のビルドが通って SSR が配信できれば足りる。最小構成で始め、足場は必要になってから足す。

## 学び（一般化できるノウハウ）

1. **外部 SaaS の恒久キーを使えば、メール配送に自前 DB が要らない** — 「メール送信 → トークンを DB 保管 → クリック時に DB 照合」という定石は、メールに載せる中身を「信用できる外部 SaaS（決済なら Stripe）が長期保持する ID を含む URL」にすると消える。検証はその都度 SaaS へ問い合わせればよく、状態の置き場所を外に寄せられる。一時的な権限付与（購入後の DL 解放・期限付きアクセス）に広く効く。

2. **ソフトゲートでスコープを絞る** — 「買った人だけが本当に取得できる」完全な DRM と、「買った人だけがボタンを押せる」ソフトゲートは別物だ。前者は DB・認証・API を芋づるで連れてくる。ローンチで先に確かめたいのは「決済が通るか」なので、保護の深さは後から足せる軸として切り離す。

3. **Amplify の Next.js SSR には環境変数の固有の罠がある** — (a) `AWS_*` は予約語で設定不可、別名で受けて SDK 既定チェーンにフォールバックする。(b) コンソールの環境変数は SSR ランタイムに自動では渡らない、`amplify.yml` の build で `env | grep` して `.env.production` に落とす。(c) `req.nextUrl.origin` は内部ホストに化けるので、絶対 URL は環境変数で明示する。マネージドな SSR ホスティングでは「ビルド時に見える環境」と「実行時に見える環境」が一致しない前提で組む。

## 関連エピソード

- [EP-014](EP-014-mypage-to-magic-link.md) — マイページを廃止して自前マジックリンクにした配布設計（本エピソードの「URL 自体を鍵にする」発想の源流）
- [EP-015](EP-015-pdf-pregenerated.md) — PDF 配信設計（購入後に渡す成果物の出力側）
- [EP-027](EP-027-aws-overspec-rejection.md) — DynamoDB/Cognito 等を「過剰」として全部不採用にした判断（DB なし設計の思想的な前提）
- [EP-028](EP-028-amplify-preview-over-storybook.md) — UI 確認手段に Amplify Preview を採った判断（デプロイ基盤として Amplify を選ぶ前提）
