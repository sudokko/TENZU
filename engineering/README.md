# engineering/ — 実装・インフラ

## サマリ

- 技術スタック：**Next.js 16 (App Router + Turbopack) / AWS Amplify / Stripe / MailerLite**
- Next.js プロジェクトは `../web/` に配置（2026-05-24 初期化）
- **D-1 ロゴ・D-2 Design System・D-3 LP は実装着手済**（locked tokens 統合・LP 初版動作確認済）
- D-4 Web ジェネレータ（おためし点描写メーカー）・商品ページ・記事ページは Claude Design セッション後の Code 化待ち
- 実装 TODO は [phase-1-todo.md](phase-1-todo.md) を SSOT として参照（**※ファイル名は旧 4 フェーズ体系名残・中身は新 Phase 1 仕込み〜 Phase 2 M2a 着手前提の TODO。リネーム候補: `launch-readiness-todo.md`**）
- **🆕 Phase 1（仕込み）計測実装 TODO（2026-05-27）**: GA4 + GTM + Meta Pixel + Google 拡張コンバージョン + 10 GA4 イベント実装が Phase 1 着手の前提。詳細は §6
- **🆕 Stripe バンドル SKU 登録**（[../product/pack-design.md §24](../product/pack-design.md) 新規論点）: 既存単品とは別商品 ID で独立登録・Phase 1 着手前提

## ファイル一覧

| ファイル | 責務 | 状態 |
|---|---|---|
| [phase-1-todo.md](phase-1-todo.md) | **実装 TODO の SSOT**（カテゴリ別・P0/P1/P2 優先度・やらないこと明示）。ファイル名は旧 4 フェーズ体系名残・中身は新 Phase 1 仕込み〜 Phase 2 M2a 着手前提（リネーム候補: `launch-readiness-todo.md`） | ✅ 作成済（2026-05-23 後半） |
| `nextjs.md` | Next.js 実装方針（App Router・MDX・ISR） | ⬜ 未作成（本 README に暫定吸収） |
| `amplify.md` | AWS Amplify インフラ（Hosting・Auth・PR Preview） | ⬜ 未作成 |
| `stripe.md` | Stripe 決済（Promotion Code・Webhook・配布フロー） | ⬜ 未作成 |
| `mailerlite.md` | MailerLite メール運用（タグ・自動化） | ⬜ 未作成 |
| `measurement-infra.md` | 計測基盤実装（[../launch/measurement.md](../launch/measurement.md) の実装版） | ⬜ 未作成 |

## 詳細

### §1. web/ プロジェクト構造（2026-05-24 現在）

```
web/
├── app/
│   ├── layout.tsx          # lang="ja"・metadata・tokens.css + landing.css import
│   ├── tokens.css          # Design system tokens（handoff/project/assets/tokens.css のコピー）
│   ├── landing.css         # LP 専用スタイル
│   ├── page.tsx            # LP 本体（Server Component）
│   └── SiteHeader.tsx      # ハンバーガー含むヘッダ（Client Component・useState ＋ scroll 検知）
├── public/assets/          # logo-square.svg / logo-wordmark.png / watermark-grid.svg
├── package.json            # Next.js 16・lucide-react・TypeScript
└── ...                     # next.config.ts / tsconfig.json / eslint.config.mjs 等
```

**選定理由**:
- App Router: 公式推奨・Server Component で初期 JS 削減
- Turbopack: dev HMR 高速化（Next.js 16 デフォルト）
- TypeScript: 型安全
- **Tailwind 不採用**: design tokens を CSS variables で管理（tokens.css）。utility class より直接 `var(--accent)` を使うほうが SSOT 整合が高い
- src/ なし: 小規模プロジェクト前提
- lucide-react: アイコンはバンドル時に必要分だけ tree-shake

### §2. 起動方法

```bash
cd web
npm install            # 初回のみ
npm run dev            # localhost:3000（既に使われていれば 3001 等）
npm run build          # production build
npm run start          # production server
npm run lint           # ESLint
```

### §3. LP 実装範囲（2026-05-24 完了分）

✅ 全 7 セクション + Footer 実装済：

1. **Hero**: Brand Promise (F1 FV) / 英訳 / F3 公式訳カード（teal 左罫線）/ Tagline 3 段 / Primary + Secondary CTA
2. **Structure**: 9×5 マトリックス（プレースホルダーデータ T1〜T9・Vol 配置）
3. **Samples**: A4 サンプル 3 枚（SVG figure・Lv chip in teal）
4. **Maker**: `parents-warm` バンド・5×5 mockup・「作るのは画面、練習は紙。」reminder
5. **Articles**: Pillar 5 本柱リスト（プレースホルダーコピー）
6. **Continuity**: `parents-warm` バンド・3 つの設計（Lucide icons）
7. **FAQ**: ネイティブ `<details>` × 4 件

✅ インタラクション：
- ハンバーガーメニュー（React useState・モバイル < 760px のみ表示）
- sticky ヘッダー scroll 検知（`scrolled` class 付与で罫線フェードイン）
- FAQ アコーディオン（ネイティブ details・＋ ⇄ × トグル回転）

✅ レスポンシブ：
- モバイル先行（< 760px）／タブレット（≥ 640px）／デスクトップ（≥ 760px）／ワイド（≥ 900px）
- マトリックスは < 760px で横スクロール（min-width: 560px）

### §4. 残課題（次セッション送り）

| 優先度 | 項目 | 出所 SSOT |
|---|---|---|
| P0 | 9×5 マトリックスを実 SKU データに差し替え | [../product/pack-design.md](../product/pack-design.md) |
| P0 | 5 Pillar 説明文を pillars.md SSOT に同期 | [../content/pillars.md](../content/pillars.md) |
| P1 | favicon 設定（既存の Next default を差し替え） | — |
| P1 | フォントファイル正式版（Google Fonts → SIL OFL 商用ライセンス確認後の自己ホスト） | — |
| P1 | OG 画像（1200×630 PNG・LP ヒーローの構成を流用） | [../foundation/brand.md §12](../foundation/brand.md) |
| P1 | サンプル PDF 配信パイプライン（`/samples/T1-Lv1.pdf` 等） | — |
| P2 | Phase 2 M2a モニター公募バンド（§3 と §4 の間に挿入・オーバーレイ） | [../acquisition/monitor-recruit.md](../acquisition/monitor-recruit.md) |
| P2 | Phase 3 クーポンバンド（§1 と §2 の間に挿入・オーバーレイ） | [../launch/phases.md](../launch/phases.md) |
| P2 | AWS Amplify Gen 2 セットアップ（Hosting・PR Preview） | — |
| P2 | Stripe Checkout 統合（Promotion Code・Webhook） | — |
| P2 | **Stripe バンドル SKU 登録**（広告連動・別商品 ID 独立登録） | [../product/pack-design.md §24](../product/pack-design.md) |
| P2 | MailerLite Webhook 統合 | — |
| **🆕 P0** | **GA4 + GTM 初期セットアップ**（広告 Phase 1 着手前提） | [../acquisition/funnel.md §11](../acquisition/funnel.md) |
| **🆕 P0** | **Meta Pixel 配置＋ Meta コンバージョン API 連携** | [../acquisition/ads.md §1.2](../acquisition/ads.md) |
| **🆕 P0** | **Google 広告タグ＋拡張コンバージョン**（SHA256 ハッシュ化メール送信） | [../acquisition/funnel.md §11.2](../acquisition/funnel.md) |
| **🆕 P0** | **10 GA4 イベント実装**（`lp_view` / `tool_start` / `tool_config` / `generated_pdf` / `download_pdf` / `product_recommend_click` / `view_item` / `add_to_cart` / `purchase` / `repeat_purchase`） | [../acquisition/funnel.md §11.1](../acquisition/funnel.md) |
| **🆕 P0** | **Web ジェネレータのサンクスページ実装**（広告回収の最重要勝負所） | [../acquisition/funnel.md §14](../acquisition/funnel.md) |
| **🆕 P0** | **広告 LP（7 セクション）実装** | [../acquisition/funnel.md §13](../acquisition/funnel.md) |
| P3 | 記事 MDX パイプライン（[../content/clusters.md](../content/clusters.md) の確定 16 ページ対応） | — |
| **🆕 P2** | **商品タグ/ファセット＋カテゴリページ実装**（やさしい/むずかしい/無料お試し/立体/年齢別・取引意図クエリ受け皿・URL `/categories/...`・上部ガイド数百字・noindex/index 判定・ItemList/Product Schema） | [../product/pack-design.md §25](../product/pack-design.md)・[../content/clusters.md §1.5](../content/clusters.md) |
| P3 | 商品 140 SKU 自動生成（MDX or JSON ベース） | [../product/pack-design.md](../product/pack-design.md) |

### §5. Design / Code 使い分けルール（2026-05-24 確立）

| バグ・改修種別 | 担当 |
|---|---|
| モバイル responsive 崩れ・JS インタラクション・データ差し替え・SEO・a11y | **Code** |
| Design system token 変更・新コンポーネント定義・新サーフェス（商品ページ等）の初回設計 | **Design** |

判定基準：**「ビジュアル言語の定義」に原因があれば Design、それ以外は全部 Code**。Design セッションは 5 卒業計画（①design system ✅／②LP ✅／③商品ページ／④記事ページ／⑤Maker App UI）。詳細は [../decisions.md §3.34](../decisions.md)。

### §6. Phase 1（仕込み）計測実装（2026-05-27 新設・2026-05-28 統合反映）

Phase 1（仕込み・旧 Phase 0）から広告を打つ判定（[../launch/phases.md §8.4](../launch/phases.md)）に伴い、計測基盤の Phase 1 着手前実装が必須化。

#### 6.1 実装スタック

| ツール | 役割 | コスト |
|---|---|---|
| GA4（Google Analytics 4） | Web 完結計測の中心 | ¥0 |
| GTM（Google Tag Manager） | タグ統合管理（Pixel / Google Ads / 10 イベント） | ¥0 |
| Meta Pixel | Meta 広告のコンバージョン計測・リターゲティング | ¥0 |
| Meta Conversions API（CAPI） | iOS14+ Cookie 制限下の計測補強・サーバーサイド送信 | ¥0 |
| Google 広告タグ | Google 広告のコンバージョン計測 | ¥0 |
| Google 拡張コンバージョン | SHA256 ハッシュ化メールで Cookie 補強 | ¥0 |
| Google Search Console | SEO 計測 | ¥0 |

**注意**: アプリ計測 SDK（Firebase / AppsFlyer 等）は **不要**。Web ジェネレータは Web 完結のため。

#### 6.2 10 GA4 イベント実装

詳細は [../acquisition/funnel.md §11](../acquisition/funnel.md)。

| イベント名 | 発火タイミング | GTM トリガー例 |
|---|---|---|
| `lp_view` | 広告 LP / 任意 LP 閲覧 | ページビュー（URL マッチ） |
| `tool_start` | Web ジェネレータ起動ボタンクリック | クリックトリガー |
| `tool_config` | 点数／難易度の選択変更 | カスタムイベント |
| `generated_pdf` | 「PDF を作成」ボタンの成功レスポンス | カスタムイベント |
| `download_pdf` | PDF ファイル DL リンククリック | クリックトリガー |
| `product_recommend_click` | サンクスページからの商品ページリンククリック | クリックトリガー |
| `view_item` | 商品詳細ページ閲覧 | ページビュー（URL マッチ） |
| `add_to_cart` | カート投入 | Stripe Checkout 遷移 |
| `purchase` | Stripe Webhook 経由の購入完了 | サーバーサイドイベント |
| `repeat_purchase` | 2 回目以降購入（顧客 ID で判定） | サーバーサイドイベント |

#### 6.3 6 リターゲティングオーディエンス設定

Meta 広告マネージャ・Google Ads それぞれで以下を設定:

1. `lp_view` & not `tool_start`
2. `tool_start` & not `generated_pdf`
3. `generated_pdf` & not `purchase`
4. `view_item` & not `purchase`
5. `purchase` & not `repeat_purchase`
6. `repeat_purchase`

詳細は [../acquisition/funnel.md §12](../acquisition/funnel.md)。

#### 6.4 サンクスページ実装（広告回収の最重要勝負所）

[../acquisition/funnel.md §14](../acquisition/funnel.md) の設計に基づき、Web ジェネレータの PDF 出力後の完了画面を実装。

要件:
- 「この問題がちょうどよければ、次はこの 3 枚」レコメンド
- 難易度別／タスク別の関連商品提示
- バンドル SKU 提案（春 LP 連動）
- UGC レビュー埋め込み
- 任意メール登録（ゲート化 NG・追加価値として）
- `product_recommend_click` イベント発火

#### 6.5 広告 LP（7 セクション）実装

[../acquisition/funnel.md §13](../acquisition/funnel.md) の構成に基づく専用 LP。SEO 記事と URL を分離（広告 LP は SEO に乗せない・noindex 検討）。

#### 6.6 OAI-SearchBot 許可＋構造化データ（既存 TODO 再掲）

死の谷対策 4 戦術の 1 つ。

- robots.txt: `User-agent: OAI-SearchBot` `Allow: /`
- HowTo Schema: P1 ハブ
- FAQPage Schema: FAQ 3 本＋ LLMO 専用 L-1/L-2
- Product Schema: 全 140 SKU ＋バンドル SKU
- Merchant Center フィード: バンドル SKU 対応

#### 6.7 計測 KPI ダッシュボード

Google Sheets で月次 KPI を集約（BI ツール不要・副業前提）:

| 指標 | Phase 1 | Phase 2 M2a | Phase 2 M2b | Phase 3 |
|---|---|---|---|---|
| `tool_start` 数 | ◎ | ◎ | ○ | ○ |
| `generated_pdf` 数 | ◎ | ◎ | ○ | ○ |
| `generated_pdf` → 商品遷移率 | ○ | ◎ | ◎ | ○ |
| 初回購入 CPA | △ | ◎ | ◎ | ◎ |
| 購入者 LTV | △ | ○ | ◎ | ◎ |
| ROAS | 見ない | 参考 | ○ | ◎ |

詳細は [../acquisition/ads.md §8](../acquisition/ads.md)。

## 関連

- 設計時のサービスフロー → [../product/service-blueprint.md](../product/service-blueprint.md)
- KPI 定義 → [../launch/measurement.md](../launch/measurement.md)
- 広告運用 SSOT → [../acquisition/ads.md](../acquisition/ads.md)（2026-05-27 新設）
- CV 導線・10 イベント・6 オーディエンス → [../acquisition/funnel.md](../acquisition/funnel.md)
- バンドル SKU 論点 → [../product/pack-design.md §24](../product/pack-design.md)
- ビジュアル ID 確定値 → [../design/visual-identity.md](../design/visual-identity.md)
- Handoff bundle → [../design/handoff/](../design/handoff/)
