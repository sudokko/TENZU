# engineering/ — 実装・インフラ

## サマリ

- **実装本体は [`../web/`](../web/)**（Next.js App Router / TypeScript / Tailwind 不採用＝design tokens を `tokens.css` の CSS variables で管理）
- 技術スタック: **Next.js / AWS Amplify Hosting / Stripe / Amazon SES**（購入復元マジックリンク配送）**/ DynamoDB + S3**（オンサイトメッセージの定義・日次カウンタ・カード画像のみ。購入フローは引き続き DB レス・[../decisions.md §5.15](../decisions.md)）
- **環境は 2 面＋ローカル**: 本番＝`main`＋tenzu.jp／staging＝`deploy/amplify`（amplifyapp URL・noindex 自動）／dev＝ローカル（[../decisions.md §3.93](../decisions.md)・切替後の確認＝`web/scripts/check-env-gates.mjs`）
- オーナー専用の管理画面 **`/admin/onsite`**（合言葉＋署名 cookie・本番稼働）でオンサイトメッセージを即時編集・表示数/クリック数を閲覧
- engineering/ 領域は**ローンチ準備チェックリストとインフラ手順の置き場**。設計や経緯は持たない
- 残作業の SSOT は [phase-1-todo.md](phase-1-todo.md)（ローンチ準備 TODO・未了項目のみ）
- 計測実装の SSOT は [analytics.md](analytics.md)（GA4/GTM・主要 7 イベント・UTM 命名規則・本番コンソール状態と設定手順）
- リリース前テストの観点・優先順（P0〜P3）・AI 委任範囲は [release-testing.md](release-testing.md)
- 本番 env チェックリストは [../web/.env.production.example](../web/.env.production.example)（キー集合の SSOT・値はコミットしない）
- 認証はログインなしの**所有モデル**（署名 cookie ＋マジックリンク復元・[../decisions.md §4.7](../decisions.md)）。決済は Stripe Checkout（`price_data` 直書き・Price ID 不使用）
- Design / Code の使い分けルールは §3

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [phase-1-todo.md](phase-1-todo.md) | **ローンチ準備 TODO の SSOT**（本番 env・残実装・使わないものの明示） |
| [analytics.md](analytics.md) | **計測実装の SSOT**（GA4/GTM・イベント定義・UTM 命名規則・コンソール設定手順） |
| [release-testing.md](release-testing.md) | **リリース前テスト計画の SSOT**（P0〜P3 の観点・AI 委任範囲・2段階の進め方） |

## 詳細

### §1. web/ プロジェクト構造（概要）

```
web/
├── app/
│   ├── page.tsx / top-rich.css   # TOP（ストアフロント）
│   ├── products/                 # 商品（一覧まとめ・タスク別・SKU 詳細）
│   ├── articles/                 # 記事（MDX・JSON-LD・OG 画像）
│   ├── maker* / makers/          # 点描写メーカー各種＋公開まとめ
│   ├── atelier/                  # 問題パイプライン検品（オーナー用・dev 専用）
│   ├── admin/onsite/             # オンサイトメッセージ管理（オーナー用・本番稼働・合言葉認証）
│   ├── level-guide/              # レベル選びガイド
│   ├── cart/ · checkout/         # カート・購入
│   ├── api/                      # checkout / maker-checkout / stripe(webhook) / auth / me / atelier
│   │                             #   ＋ onsite(配信・track) / admin(login・campaigns CRUD・image・stats)
│   ├── tokens.css                # Design System rev.5 tokens（SSOT: design/visual-identity.md）
│   └── robots.ts · sitemap.ts    # クローラ制御・サイトマップ
├── public/assets/                # ロゴ・記事画像ほか静的資産
├── scripts/                      # recover.mjs（購入復元）・img-optimize.mjs 等
└── .env.production.example       # 本番 env チェックリスト（SSOT）
```

**選定理由**: App Router（Server Component で初期 JS 削減）／ TypeScript（型安全）／ Tailwind 不採用（`var(--accent)` 直書きのほうが design tokens との SSOT 整合が高い）／ src/ なし（小規模前提）。

### §2. 起動方法

```bash
cd web
npm install            # 初回のみ
npm run dev            # localhost:3000（使用中なら 3001 等）
npm run build          # production build
npm run start          # production server
npm run lint           # ESLint
```

### §3. Design / Code 使い分けルール

| バグ・改修種別 | 担当 |
|---|---|
| モバイル responsive 崩れ・JS インタラクション・データ差し替え・SEO・a11y | **Code** |
| Design system token 変更・新コンポーネント定義・新サーフェスの初回設計 | **Design** |

判定基準: **「ビジュアル言語の定義」に原因があれば Design、それ以外は全部 Code**。詳細は [../decisions.md §3.34](../decisions.md)。新サーフェスは rev-5 bundle（[../design/handoff/](../design/handoff/)）の specs/ ＋ mockups/ を参照して実装する。

## 附録

- 変遷: 旧 README（LP 初期実装の記録・旧 4 フェーズ計測計画を内包）の TODO 部は [../archive/retired-designs/2026-07-06-phase-1-todo-original.md](../archive/retired-designs/2026-07-06-phase-1-todo-original.md) と同時期に整理
- 関連: ビジュアル ID → [../design/visual-identity.md](../design/visual-identity.md)／KPI 定義 → [../launch/measurement.md](../launch/measurement.md)／CV 導線 → [../acquisition/funnel.md](../acquisition/funnel.md)／サービスフロー → [../product/service-blueprint.md](../product/service-blueprint.md)
