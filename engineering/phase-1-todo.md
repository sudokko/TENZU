# ローンチ準備 TODO

## サマリ

- ローンチ（本番公開）までに必要な残作業の SSOT。**未了項目のみを載せ、完了した項目は行ごと削除する**（済欄は作らない）
- **最優先＝Stripe 本番決済の開通**（審査通過済み・残＝決済手段の有効化と `sk_live_` の main オーバーライド投入→再デプロイ）。GTM/GA4 は公開コンテナ・主要イベントの本番受信・キーイベント指定まで完了。残る計測作業は Search Console 連携・内部トラフィック除外・`begin_checkout` と最初の実購入確認。**メール配送は SES 却下（2026-08-26）を受けて Resend へ移行済み**（[decisions.md §3.111](../decisions.md)）＝残は Amplify main への env 投入と再デプロイ
- 本番に必要な env は **STRIPE_SECRET_KEY（live）・STRIPE_WEBHOOK_SECRET・AUTH_SECRET（強ランダム）・MAIL_PROVIDER／RESEND_API_KEY／MAIL_FROM_EMAIL・SITE_URL・NEXT_PUBLIC_GTM_ID・ADMIN_SECRET・ONSITE_TABLE・ONSITE_IMAGE_BUCKET・APP_AWS_\***（`SES_\*` は予備経路として残置）。チェックリスト＝[web/.env.production.example](../web/.env.production.example)
- **残実装（コード）はゼロ**＝特商法/PP（`/tokushoho`・`/privacy`・外部送信記載含む）と屋号ページ `/sudo-craft` は実装済み・販売責任者も実名化済み。残＝領収書/請求書の発行名義の統一（§2・人間作業）。送客導線(A) 商品→工房は実装済み・開店ゲート G6 はコード側完了。計測（GA4+GTM・`page_view`＋主要 7 イベント・アタッチ率）も**コード実装・本番受信確認済み**（[analytics.md §5](analytics.md)）
- Upstash・Stripe Price ID・サブスク・OTP・ログイン・billing-portal は**使わない**（§4）。認証＝所有モデル（署名 cookie）・購入復元＝マジックリンクのみ
- 優先度: ★＝ローンチブロッカー／P1＝ローンチ直後まで／P2＝運用開始後でよい

## 詳細

### §1. 本番 env・インフラ（人間作業）

env のキー集合と各値の注意書きは [web/.env.production.example](../web/.env.production.example) が SSOT。Amplify コンソールの Environment variables に登録する（amplify.yml の whitelist と一致させること）。

| 優先 | 項目 | 詳細 |
|---|---|---|
| ★ | **Resend の env を main へ投入** | SES 本番アクセスは**却下**（2026-08-26・理由非開示）→ Resend へ移行（[decisions.md §3.111](../decisions.md)）。DNS（DKIM／SPF／MX／DMARC）は Verified 済み・ローカル疎通も Gmail 受信トレイ直行を確認済み。残＝Amplify の **main オーバーライド**へ `MAIL_PROVIDER=resend`・`RESEND_API_KEY`・`MAIL_FROM_EMAIL=TENZU <no-reply@send.tenzu.jp>` を追加 → **main を再デプロイ**（env はビルド時に焼き出すため保存だけでは届かない）→ P0 の「メール到達」項目を再走 |
| ★ | **Stripe 本番モード化** | 本番アカウント `acct_1Si2zlEtIrDOgxDR`（SUDO CRAFT）審査通過。残＝①ダッシュボードで**決済手段を有効化**（**カードのみ**。コンビニ払いは固定電話番号が要るため不採用＝[decisions.md §3.110](../decisions.md)）②`sk_live_` を Amplify の **main オーバーライド**へ追加 → **main を再デプロイ**（env はビルド時に焼き出すため保存だけでは届かない）③本番 Webhook `tenzu-prod-checkout` の配信履歴が成功になることを確認 |
| ★ | **AUTH_SECRET 生成** | 強ランダム値（例: `openssl rand -base64 48`）。ローテーション＝全所有 cookie 無効化のため安定運用 |
| ★ | **開店当日に `PREOPEN=0`** | 開店まで全ページ最上部に出しているプレオープン告知帯（[decisions.md §3.109](../decisions.md)）を消す。Amplify の **main オーバーライド**へ `PREOPEN=0` を追加 → **main を再デプロイ**（env はビルド時に `.env.production` へ焼き出すため保存だけでは消えない）。**未設定＝帯が出る**が既定なので、開店前は何もしなくてよい |
| ★ | **Safe Browsing の審査リクエスト** | メーカー復元リンクが Chrome の「危険なサイト」（ソーシャルエンジニアリング判定）でブロックされた（[decisions.md §3.114](../decisions.md)）。URL の形はコード側で是正済み＝残＝**Search Console →「セキュリティと手動による対策」→ セキュリティの問題**で対象範囲（ホスト全体か当該 URL か）を確認 →「**審査をリクエスト**」を送る。⚠️**是正を本番へデプロイしてから出す**（旧 URL のまま出すと再度落ちる）。審査は通常 数日 |
| P1 | **GA4 運用仕上げ** | 本番受信と `generated_pdf`／`purchase` のキーイベント指定まで完了。残＝①自宅・開発環境の内部トラフィック定義と除外フィルタ ②Stripe Checkout への遷移で `begin_checkout` を確認 ③最初の実購入時に `purchase` の transaction_id・金額・items を Stripe と突合 ④Search Console 連携（[analytics.md §5](analytics.md)） |

### §2. 残実装（コード）

| 優先 | 項目 | 詳細 |
|---|---|---|
| ★ | **法務・決済の名義統一** | 特商法の販売業者＝SUDO CRAFT＋実名・Stripe 明細表記＝`TENZU`／カナ`テンズ`・**Stripe アカウント名（設定→ビジネス→アカウントの詳細）＝`TENZU`**（Checkout の「〇〇に支払う」・領収書・請求書に出る顧客向けの名前。API 側に上書きフィールドは無くダッシュボード設定のみ／**ビジネスの詳細＝法的名義は `SUDO CRAFT`＋実名のまま触らない**）・銀行口座（8/9 開設）まで反映済み。いずれも購入者が「TENZU で買った」と分かる形を維持＝不審請求の問い合わせとチャージバックを避けるため。残＝**領収書・請求書の発行名義**を同じ形に揃える（[decisions.md §5.16](../decisions.md)） |

### §3. 運用開始後（P2）

| 項目 | 詳細 | 上流設計 |
|---|---|---|
| フォント自己ホスト化 | Google Fonts CDN（tokens.css の `@import`）→ セルフホスト `@font-face` へ（SIL OFL 商用ライセンス確認のうえ） | [design/visual-identity.md](../design/visual-identity.md) |
| MailerLite 連携 | 購入者メアドのリスト化→リピート配信 | [acquisition/funnel.md §8](../acquisition/funnel.md) |
| 計測基盤の拡張 | GA4・Search Console 等。KPI 定義は launch 領域が SSOT | [launch/measurement.md](../launch/measurement.md) |
| Merchant Center フィード | Google Shopping への商品データフィード | [acquisition/channels.md](../acquisition/channels.md) |
| atelier API を本番ビルドから外す | ビルド警告 `Encountered unexpected file in NFT list`（経路＝`next.config.ts` ← `app/api/atelier/io.ts` ← `api/atelier/vol/route.ts`）。`process.cwd()` 経由の fs 操作でトレーサが過剰判定する。**実害は計測済みで軽微**（トレース 3429 ファイル中に設計書・`.git` の混入ゼロ／`.next/server` 49MB は MDX サイトとして妥当）ため開店前には触らない。`turbopackIgnore` は無効・`outputFileTracingExcludes` は症状に蓋をするだけで、**根治は「dev 専用の atelier を本番ビルドに含めない」**こと（`devGuard()` で本番 404 なので実行はされていない） | [engineering/README.md](README.md) |

### §4. 使わないもの（明示）

| 項目 | 理由 |
|---|---|
| ❌ Upstash Redis（`UPSTASH_REDIS_REST_*`） | 旧 OTP ストア。所有モデルで廃止・コード参照ゼロ・依存も無し |
| ❌ Stripe Price ID（`STRIPE_PRICE_ENTRY/FULL`） | 旧サブスク。checkout は `price_data` 直書きで完結 |
| ❌ サブスク・OTP・ログイン・billing-portal | 認証＝署名 cookie の所有モデル・購入復元＝マジックリンクのみ（[decisions.md §4.7](../decisions.md)） |
| ❌ `MAKER_DEBUG_OWN_ALL`（本番） | 全メーカー所有扱いの dev フラグ。本番では未設定（NODE_ENV ガードあり） |

## 附録

- 変遷: 旧「実装 TODO（launch readiness）」（サブスク/OTP/Upstash 前提・完了済み混在）→ [archive/retired-designs/2026-07-06-phase-1-todo-original.md](../archive/retired-designs/2026-07-06-phase-1-todo-original.md)
- 関連: [decisions.md §4.6（per-maker 買い切り）](../decisions.md)・[§4.7（所有モデル認証）](../decisions.md)／[launch/plan.md](../launch/plan.md)（Phase 定義）
