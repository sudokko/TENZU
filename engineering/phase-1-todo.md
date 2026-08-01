# ローンチ準備 TODO

## サマリ

- ローンチ（本番公開）までに必要な残作業の SSOT。**未了項目のみを載せ、完了した項目は行ごと削除する**（済欄は作らない）
- **最優先＝SES サンドボックス脱出**（Production access 申請・人間作業）。購入復元マジックリンクが検証済みアドレス以外に届かない状態の解消
- 本番に必要な env は **STRIPE_SECRET_KEY（live）・STRIPE_WEBHOOK_SECRET・AUTH_SECRET（強ランダム）・SES_\*・SITE_URL・NEXT_PUBLIC_GTM_ID・ADMIN_SECRET・ONSITE_TABLE・ONSITE_IMAGE_BUCKET・APP_AWS_\***。チェックリスト＝[web/.env.production.example](../web/.env.production.example)
- **残実装（コード）はゼロ**＝特商法/PP（`/tokushoho`・`/privacy`・外部送信記載含む）と屋号ページ `/sudo-craft` は実装済み（2026-08-01）。残＝特商法の氏名差し替え・法務決済の名義統一（§2・人間作業）。送客導線(A) 商品→工房は実装済み・開店ゲート G6 はコード側完了。計測（GA4+GTM・`tool_start`/`generated_pdf`/`purchase`・アタッチ率）も**コード実装済み**＝残りは Google コンソール設定（人間作業・[analytics.md §5](analytics.md)）
- Upstash・Stripe Price ID・サブスク・OTP・ログイン・billing-portal は**使わない**（§4）。認証＝所有モデル（署名 cookie）・購入復元＝マジックリンクのみ
- 優先度: ★＝ローンチブロッカー／P1＝ローンチ直後まで／P2＝運用開始後でよい

## 詳細

### §1. 本番 env・インフラ（人間作業）

env のキー集合と各値の注意書きは [web/.env.production.example](../web/.env.production.example) が SSOT。Amplify コンソールの Environment variables に登録する（amplify.yml の whitelist と一致させること）。

| 優先 | 項目 | 詳細 |
|---|---|---|
| ★ | **SES サンドボックス脱出** | Production access 申請。送信元（`no-reply@tenzu.jp` 等）のドメイン検証も併せて実施 |
| ★ | **Stripe 本番モード化** | live キー取得・本番 Webhook エンドポイント（`/api/stripe/webhook`）作成・`checkout.session.completed` 購読・`STRIPE_WEBHOOK_SECRET` 取得 |
| ★ | **AUTH_SECRET 生成** | 強ランダム値（例: `openssl rand -base64 48`）。ローテーション＝全所有 cookie 無効化のため安定運用 |
| ★ | **SITE_URL 設定** | `https://tenzu.jp`。Checkout の success/cancel・メールリンク生成に必須。**検索インデックスの可否もこの値で決まる**（`*.amplifyapp.com` のままだと全ページ noindex＝[site.ts](../web/app/site.ts) の `IS_PREVIEW`）。**env はブランチ別＝main にだけ設定する**（deploy/amplify は未設定のまま＝staging の noindex 維持・[decisions §3.93](../decisions.md)）。接続後の確認は `node web/scripts/check-env-gates.mjs`（本番 index / staging noindex を両方向自動判定） |
| ★ | **tenzu.jp を Amplify Hosting へ接続** | **`main` ブランチへ接続**（本番=main・[decisions §3.93](../decisions.md)）。カスタムドメイン・SSL は Amplify が自動発行。ドメイン取得は 8 月上旬（オーナー・国内レジストラ推奨＝Route 53 の .jp は割高） |
| ★ | **Amplify ブランチ接続の切替** | 現在の実ビルド対象は `content/article-drafts`。**main を接続 → article-drafts の接続を解除**する（コンソール作業）。解除までは 3 ブランチ lockstep push 運用・**解除前のブランチ削除は禁止**。deploy/amplify（staging）の接続は維持 |
| ★ | **GTM / GA4 コンソール設定** | 手順書＝[analytics.md §5](analytics.md)（約1時間）。GA4 プロパティ・GTM コンテナ・タグ3本・Search Console 連携・Amplify に `NEXT_PUBLIC_GTM_ID` 登録。**開店前の必須ゲート G5**（無計測の運用は無駄撃ち・[../launch/operations.md §3](../launch/operations.md)） |
| ★ | **オンサイトメッセージ用 AWS リソース** | DynamoDB `tenzu-onsite`（＋dev 用）・S3 `tenzu-onsite-assets`・IAM 権限追加・Amplify env 5 件（手順＝§1.1・約 30 分）。未設定でもサイト自体は動く（カード非表示へ degrade）が、開店あいさつ `welcome-2026` を出すには必須＝W5 の文言確認までに |

#### §1.1 オンサイトメッセージ用 AWS リソース作成手順（人間作業・約 30 分）

判断ログ＝[decisions.md §5.15](../decisions.md)／設計＝[acquisition/onsite-messaging.md §4/§9](../acquisition/onsite-messaging.md)。リージョンはすべて `ap-northeast-1`。

1. **DynamoDB**: テーブル `tenzu-onsite` を作成 — パーティションキー `PK`（文字列）・ソートキー `SK`（文字列）・キャパシティ「オンデマンド」。dev 用に `tenzu-onsite-dev` も同構成で作成
2. **S3**: バケット `tenzu-onsite-assets` を作成（名前が取られていたらサフィックスを足し env も合わせる）→「ブロックパブリックアクセス」のうち**ポリシー系 2 項**（新しいパブリックバケットポリシー／パブリックポリシー経由のアクセス）だけ解除 → バケットポリシー:

   ```json
   { "Version": "2012-10-17", "Statement": [{
     "Sid": "PublicReadOnsite", "Effect": "Allow", "Principal": "*",
     "Action": "s3:GetObject",
     "Resource": "arn:aws:s3:::tenzu-onsite-assets/onsite/*" }] }
   ```

3. **IAM**: SES 用 IAM ユーザーにインラインポリシーを追加:

   ```json
   { "Version": "2012-10-17", "Statement": [
     { "Effect": "Allow",
       "Action": ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:PutItem",
                  "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
       "Resource": ["arn:aws:dynamodb:ap-northeast-1:*:table/tenzu-onsite",
                    "arn:aws:dynamodb:ap-northeast-1:*:table/tenzu-onsite-dev"] },
     { "Effect": "Allow", "Action": "s3:PutObject",
       "Resource": "arn:aws:s3:::tenzu-onsite-assets/onsite/*" } ] }
   ```

4. **Amplify env 5 件**: `ADMIN_SECRET`（`openssl rand -base64 32` 級）・`ONSITE_TABLE=tenzu-onsite`・`ONSITE_IMAGE_BUCKET=tenzu-onsite-assets`・`APP_AWS_ACCESS_KEY_ID` / `APP_AWS_SECRET_ACCESS_KEY`（SES と同一 IAM ユーザーのキーを別名で再掲）→ 再デプロイ
5. **初期投入**: デプロイ後 `/admin/onsite` に合言葉でログイン →「既存 5 本を取り込む（シード）」→ 一覧のプレビューリンクで表示確認
6. **ローカル開発**: `web/.env.local` に `ADMIN_SECRET`（dev 用の適当な値で可）・`ONSITE_TABLE=tenzu-onsite-dev`・`ONSITE_IMAGE_BUCKET=tenzu-onsite-assets`・`APP_AWS_*` を設定（未設定でも他機能の開発は阻害しない）

### §2. 残実装（コード）

| 優先 | 項目 | 詳細 |
|---|---|---|
| ★ | **特商法表記の氏名差し替え** | ページ自体は実装済み（`/tokushoho`・`/privacy`・`/sudo-craft`・2026-08-01・外部送信記載含む）。販売責任者が「〔開店前に氏名を記載〕」のプレースホルダのまま＝**開店前に実名へ差し替える**（[web/app/tokushoho/page.tsx](../web/app/tokushoho/page.tsx)）。住所・電話は請求開示方式で確定済み |
| ★ | **法務・決済の名義統一** | 屋号 SUDO CRAFT 取得に伴う（[decisions.md §5.16](../decisions.md)）。①特商法表記の「販売業者」②銀行口座名義（8/9 開設）③請求書・領収書の発行名義 を揃える。**ただし Stripe の明細表示名（statement descriptor）は購入者が「TENZU で買った」と分かる形を維持する**——カード明細に見慣れない屋号だけが出ると不審請求の問い合わせとチャージバックの要因になる。Stripe 側の設定可否（アカウント名ベース・支払いごとの suffix）は実装時に確認 |

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
