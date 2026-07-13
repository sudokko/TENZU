# 実装 TODO（launch readiness）【退避】

> **退避日 2026-07-06・理由＝サブスク廃止（[decisions.md §4.6/§4.7](../../decisions.md)）後の残骸混在のため再構築**。旧サブスク/OTP/Upstash 前提の TODO と完了済み項目が混在していたため、[engineering/phase-1-todo.md](../../engineering/phase-1-todo.md) をローンチ準備 TODO としてゼロから再構築した。本ファイルは再構築前の原本（リンクは当時の相対パスのまま・リンク切れあり）。

> **ファイル名注記（2026-05-28）**: ファイル名 `phase-1-todo.md` は旧 4 フェーズ体系（Phase 0/1/2/3）の名残。新 3 フェーズ体系（Phase 1/2/3・[decisions.md §3.41](../../decisions.md)）では、本ファイルは **Phase 1（仕込み）開始前〜 Phase 2 M2a 開始前の launch readiness TODO** を扱う。将来 `launch-readiness-todo.md` へのリネーム検討。

## サマリ

- Phase 1（仕込み）開始前の **実装すべきものリスト SSOT**
- 案H'' 確定・§3.32 死の谷対策 4 戦術・§3.33 DR レビュー反映・§3.41 Phase 4→3 統合後の確定 TODO
- カテゴリ別: SEO/LLMO 基盤・コマース基盤・コンテンツ配信・App 実装・計測基盤・パフォーマンス
- **優先度 P0/P1/P2** 三段階。P0 = Phase 1 着手必須／P1 = Phase 2 M2a 内に揃える／P2 = Phase 2 M2b 以降可
- 実装着手は **D-1 ロゴ・D-2 Design System 確定後**（FV 実装に依存）
- 各項目は別ファイル（`nextjs.md` `amplify.md` `stripe.md` `mailerlite.md` `measurement-infra.md` 等）に詳細を肉付け予定

## 詳細

### §1. SEO / LLMO 基盤（P0）

死の谷対策 2「AI 検索の入口を塞がない」の実装層。

| # | 項目 | 詳細 | 上流設計 |
|---|---|---|---|
| 1-1 | **robots.txt で OAI-SearchBot 許可** | ChatGPT Search 対象に含める。Bing Bot / Googlebot / OAI-SearchBot 明示許可 | [decisions.md §3.32 死の谷対策 2](../../decisions.md) |
| 1-2 | **HowTo Schema 実装**（全 Pillar） | P1-P4 全 Pillar に厳密実装。手順型コンテンツは Cluster にも適用 | [content/pillars.md](../../content/pillars.md) |
| 1-3 | **FAQPage Schema 実装**（全 FAQ・厳密） | FAQ 3 本＋ Cluster 内 FAQ ブロック | [content/faq.md](../../content/faq.md)・[content/clusters.md §6](../../content/clusters.md) |
| 1-4 | **Article Schema 実装**（全記事） | author / datePublished / dateModified / image 必須 | [content/templates.md](../../content/templates.md) |
| 1-5 | **Image Schema + alt text 最適化** | 記事サムネ・サンプル PDF プレビュー画像・商品画像。**Pinterest 撤回の代替**として Google 画像検索 SEO で受ける | [decisions.md §3.33](../../decisions.md) |
| 1-6 | **OG / Twitter Card 整備** | 業態識別句必須併記・サブコピー併記 | [foundation/brand.md §12](../../foundation/brand.md) |
| 1-7 | **canonical / hreflang** | 重複ページ・スラッグ変更時の 301 リダイレクト | [content/urls.md §9](../../content/urls.md) |

### §2. コマース基盤（P0）

| # | 項目 | 詳細 | 上流設計 |
|---|---|---|---|
| 2-1 | **Product Schema 実装**（全 140 SKU） | offers / price ¥200 / availability / image / sku / brand。DR 推奨採用 | [decisions.md §3.33](../../decisions.md) |
| 2-2 | **Merchant Center フィード**（P1） | Google Shopping への商品データフィード提供。検索面・画像検索面・ショッピング面の可視性 | [decisions.md §3.33](../../decisions.md) |
| 2-3 | **Stripe 決済実装** | Stripe Link 採用（リピート購入の体験最適化） | [product/service-blueprint.md](../../product/service-blueprint.md) |
| 2-4 | **Promotion Code 配布フロー**（Phase 3 用） | 100% OFF・1 SKU 限定・30 回上限・60 日有効・命名規則 `[インフル識別子]-FREE` | [acquisition/channels.md §3.3](../../acquisition/channels.md) |
| 2-5 | **Stripe Webhook → MailerLite 連携** | 購入時メアド自動取得→ MailerLite 自動登録→リピート配信 | [acquisition/funnel.md §8](../../acquisition/funnel.md) |
| 2-6 | **クーポン使用回数 / 期限管理** | Stripe Promotion Code 標準機能で完結。アカウント機能不要 | [acquisition/funnel.md §8.1](../../acquisition/funnel.md) |

### §3. コンテンツ配信（P0）

| # | 項目 | 詳細 | 上流設計 |
|---|---|---|---|
| 3-1 | **MDX 記事配信**（Next.js App Router） | Pillar / Cluster / FAQ の階層構造を URL に反映 | [content/urls.md](../../content/urls.md) |
| 3-2 | **PDF 生成基盤** | A4・グリッドサイズ可変・QR コード透かし（[product/pack-design.md](../../product/pack-design.md)） | 未着手 |
| 3-3 | **サンプル PDF プレビュー**（F2 メイン CTA） | クリック 1 発でブラウザ内表示。ダウンロード不要 | [acquisition/funnel.md §1](../../acquisition/funnel.md) |
| 3-4 | **商品ページ WEB プレビュー画像** | 全 140 SKU に紙面プレビュー画像配置 | [acquisition/funnel.md §5](../../acquisition/funnel.md) |
| 3-5 | **MDX → HTML サイトマップ自動生成** | Next.js sitemap.xml 自動更新 | [content/urls.md](../../content/urls.md) |
| 3-6 | **Phase 1（仕込み）で先置きすべきコンテンツ** | P1 正規ハブ＋おためし点描写メーカー App。C3-1「見取り図 描き方」は Phase 2 M2a 最優先 | [launch/phases.md §3](../../launch/phases.md) |

### §4. App 実装（P0）

「おためし点描写メーカー」（[brand.md §11.3.1](../../foundation/brand.md) SSOT）

| # | 項目 | 詳細 |
|---|---|---|
| 4-1 | **親向け UI**（子供 UI 排除） | フォーム選択肢ベース・絵で誘導しない |
| 4-2 | **模写タスクのみ実装**（9 タスク中 1 つ） | 移動・対称・回転は商品 PDF 限定 |
| 4-3 | **5×5 グリッド上限** | 6×6 以上は商品 PDF 誘導 |
| 4-4 | **画面で解かせない設計**（生成→PDF 一直線） | 「作るのは画面、練習は紙」（F5） |
| 4-5 | **出力 PDF フッターに自己カニバリ回避 CTA** | 「6×6 以上は商品 PDF で」透かし |
| 4-6 | **メアド・Stripe 連携なし** | 純粋な入口体験ツール |

### §5. レベル選びガイド実装（P0）

[acquisition/funnel.md §3](../../acquisition/funnel.md) F2 サブ② CTA

| # | 項目 | 詳細 |
|---|---|---|
| 5-1 | **5-7 問の選択肢フォーム** | 1 日実装規模・MailerLite サーベイ or Next.js フォーム |
| 5-2 | **完了後におすすめ SKU 提示** | 9 タスク × 5 Lv × Vol 細刻みからのマッピング |
| 5-3 | **サンプル PDF 1 本リンク付与** | メアド取得しない |
| 5-4 | **NG 表現禁止チェック** | 「弱点診断」「自己診断」「スタート診断」「健康診断」（[foundation/voice-tone.md §1](../../foundation/voice-tone.md)） |

### §6. 計測基盤（P1）

[launch/measurement.md](../../launch/measurement.md) の実装版。詳細は `measurement-infra.md`（未作成）で別途定義。

| # | 項目 | 詳細 |
|---|---|---|
| 6-1 | GA4 設定 | 基本イベント・コンバージョン・拡張計測 |
| 6-2 | Search Console 連携 | 表示回数・クリック・順位の定点観測 |
| 6-3 | リマーケティングオーディエンス | GA4 + Google Ads 連携（[channels.md §5.2](../../acquisition/channels.md)） |
| 6-4 | LLMO 掲載率モニタリング | 固定 20 プロンプトで ChatGPT / Gemini 掲載率定点観測 |

### §7. パフォーマンス / アクセシビリティ（P1）

| # | 項目 | 詳細 |
|---|---|---|
| 7-1 | Core Web Vitals 適合 | LCP / INP / CLS の目標値クリア |
| 7-2 | A11y 基本対応 | コントラスト比・キーボード操作・スクリーンリーダー |
| 7-3 | モバイル最適化 | スマホ縦持ち優先（親はスマホで検索→子と紙へ） |
| 7-4 | 画像最適化 | Next.js Image / WebP / 遅延読み込み |

### §8. インフラ（P0-P1）

| # | 項目 | 詳細 |
|---|---|---|
| 8-1 | **AWS Amplify Hosting** | Next.js デプロイ・PR Preview・カスタムドメイン |
| 8-2 | **PR Preview 環境** | 記事執筆の校了確認に必須 |
| 8-3 | **CDN / 画像配信** | Cloudflare or Amplify 標準 |
| 8-4 | **バックアップ / ロールバック** | デプロイ履歴・コンテンツ Git 管理 |
| 8-5 | **ドメイン / SSL** | TENZU 公式ドメイン取得・Let's Encrypt 自動更新 |

### §9. Phase 1（仕込み）着手分（最優先）

死の谷対策 2「AI 検索の入口」を Phase 1 で先に開ける。

```
T-3M（Phase 1 開始）の必須実装:
  1. AWS Amplify Hosting + ドメイン + SSL
  2. Next.js + MDX 配信基盤
  3. robots.txt（OAI-SearchBot 許可）
  4. P1 正規ハブ「点図形（点描写）とは」公開（HowTo Schema 含む）
  5. おためし点描写メーカー App 公開（メアド不要・PDF 出力）
  6. サンプル PDF プレビュー基盤（F2 メイン CTA）
```

→ Phase 1 で AI クローラに「TENZU 存在＋カテゴリ定義」をクロール開始させる。Phase 2 M2a でサイト本体オープン＋全 140 SKU 公開へ。

### §10. やらないこと（明示）

- ❌ **Pinterest 連携・ピン運用**（§3.33 撤回・[channels.md §6](../../acquisition/channels.md)）
- ❌ **YouTube 動画配信**（[channels.md §6](../../acquisition/channels.md)）
- ❌ **ユーザーログイン / アカウント機能**（Stripe Link で代替・[funnel.md §8.1](../../acquisition/funnel.md)）
- ❌ **アプリでのメアド取得**（[funnel.md §8](../../acquisition/funnel.md)）
- ❌ **アフィリエイト ASP 連携**（[channels.md §6](../../acquisition/channels.md)）
- ❌ **FAQ Rich Result 主施策化**（2026-05 時点で一般サイト廃止方向・[decisions.md §3.33](../../decisions.md)）

## 附録

- 上流: [decisions.md §3.32（F1-F5・死の谷対策）](../../decisions.md)・[§3.33（DR 反映）](../../decisions.md)
- 関連: [product/service-blueprint.md](../../product/service-blueprint.md)（サービスフロー）／[launch/measurement.md](../../launch/measurement.md)（KPI 定義）／[launch/phases.md](../../launch/phases.md)（Phase 別マイルストーン）
- 次着手: D-1 ロゴ・D-2 Design System 確定後に各サブファイル（nextjs.md / amplify.md / stripe.md / mailerlite.md / measurement-infra.md）の骨組み作成
