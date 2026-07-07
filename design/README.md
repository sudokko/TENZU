# design/ — ビジュアル実装

## サマリ

- ビジュアル実装ルールの SSOT は [visual-identity.md](visual-identity.md)（Design System rev.5）。実装詳細の正は [handoff/maker-import/tenzu-design-system-rev-5/project/](handoff/maker-import/tenzu-design-system-rev-5/project/)（rev-5 bundle）
- **ブランド哲学・MISSION・Voice 原則は [../foundation/brand.md](../foundation/brand.md) を参照**（本領域の上流）
- **Design System rev.5**: 純白 `#FFFFFF` ＋ 点格子（24/28px・opacity 0.16）／ 3 階層フォント（Klee One 600 ① ・ Klee One 400 ② ・ Plex Sans JP & Mono ③・①②は同一書体でウェイト違い）／ 罫線 4 種のみ・shadow ほぼ無し・静的既定／ accent `#2C6E7F` は「到達・正解」限定
- **ロゴ**: 鉛筆筆致版 canonical（Symbol = 4-dot floating ／ Wordmark = Ξ-form E）。マスター原本は `logodesign/`、配信用は `../web/public/assets/`
- **実装済みサーフェス**: LP・商品ページ・記事ページ・おためし点描写メーカー・レベル選びガイド（[../web/](../web/)・Next.js）。token は [../web/app/tokens.css](../web/app/tokens.css)（= rev-5 bundle colors_and_type.css）
- ブランドキャラクター不採用。ただし **LP Hero に無記名の店主紹介文 1 枠は許容**（顔・実名・マスコットなし・淡い teal カード・[visual-identity.md §8.1](visual-identity.md)）
- キャビアット: フォントは Google Fonts CDN 経由（zip 受領後 `@font-face` 差し替え予定）

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [visual-identity.md](visual-identity.md) | ビジュアル実装ルール SSOT（配色・点格子・3 階層タイポ・罫線・ロゴ・コンポーネント・痕跡・AI 運用） |
| [handoff/maker-import/tenzu-design-system-rev-5/](handoff/maker-import/tenzu-design-system-rev-5/) | rev-5 bundle（colors_and_type.css・specs/ 全 10 ファイル・mockups/・preview/・ロゴ PNG 4 色トーン・タスク icon SVG） |
| [brand-assets/](brand-assets/) | 確定版グラフィックのパーツライブラリ格納先 |

## 詳細

### §1. ロゴ

| 項目 | 内容 |
|---|---|
| シンボル | **4-dot floating**（4 隅ドットと線分が触れない visible gap）・鉛筆筆致 |
| ワードマーク | **Ξ-form E**（縦軸なし 3 横線・N/Z 角に微丸み） |
| 意味論 | gap = 「点と線がまだつながっていない」＝子の手で完成させるもの、という物語 |
| Lockup | 5 バリアント（A Symbol ／ B Vertical ／ C Horizontal 既定 ／ D-1 Plex ／ D-2 Klee One 優先） |
| 最小サイズ | Horizontal 高さ 28px（未満は Symbol へ）・D-2 は 80px |
| 併記 | 業態識別句必須。タグライン本体は同梱しない |
| 実体 | マスター: `../logodesign/透過HORIZONTALLOOKUP.png`・`透過symbol.png` ／ 配信: `../web/public/assets/{logo-horizontal.png, symbol-floating.png}` |
| 仕様 SSOT | [visual-identity.md §5](visual-identity.md)・[rev-5 bundle specs/logo.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/logo.md) |

### §2. Design System（rev.5）

| 項目 | 値 |
|---|---|
| 基板 | `#FFFFFF` 純白 ＋ body 全面点格子（24px desktop / 28px mobile・opacity 0.16） |
| 主色 / アクセント | ink `#1A1F2A` ／ teal `#2C6E7F`（到達・正解のみ） |
| 補助 | fg `#424955` `#767D89` `#B0B5BD` ／ bg `#F4F2ED` `#FAF8F3` ／ line `#E5E3DC` `#BFBDB5` |
| タイポ | 3 階層: Klee One 600（見出し・プロミス）／ Klee One 400（温度コピー・メモ・①と同一書体でウェイト違い）／ Plex Sans JP & Mono（UI・数値・長文） |
| 罫線 | 4 種のみ（D1 H2 teal underline ／ D2 dashed 既定 ／ D3 accent 左 ／ D4 fg-2 左） |
| 面 | radius-soft 4px・shadow は商品サムネ `shadow-paper` のみ・動き静的 |
| CTA | 4 段階（弱・中・強・最強＝accent ベタは購入確定/達成のみ） |
| Dark mode | 持たない（`color-scheme: light` 固定） |

詳細は [visual-identity.md](visual-identity.md)。token 実体は [../web/app/tokens.css](../web/app/tokens.css)。

### §3. 実装サーフェス（Design → Code）

| 対象 | 状態 |
|---|---|
| Design System token | [../web/app/tokens.css](../web/app/tokens.css) 統合済み |
| LP（top-rich ストアフロント） | `../web/app/page.tsx` |
| 商品（一覧ハブ・タスク別一覧・SKU 詳細） | `../web/app/products/` |
| 記事 | `../web/app/articles/` |
| 模写メーカー | `../web/app/maker/`（仕様: [../product/pack-commerce.md §23](../product/pack-commerce.md)・[../foundation/brand.md §11.3.1](../foundation/brand.md)） |
| レベル選びガイド | `../web/app/level-guide/` |

新サーフェスは rev-5 bundle の specs/ ＋ mockups/ を参照して実装する。フローは [../decisions.md §3.34](../decisions.md) と [../engineering/README.md](../engineering/README.md)。

### §4. 保存規約

- ✅ 採用案・選定理由・HEX・タイポ名・spacing 数値（visual-identity.md）
- ✅ rev-5 bundle（specs / mockups / preview / assets）
- ✅ ロゴ原本（`../logodesign/`）と配信用 PNG — ロゴは商標扱いでリポジトリに残す
- ❌ スクショ PNG・画面ごとの詳細仕様の重複保存

## 附録

- 変遷:
  - rev.4 Design System（paper `#F4F2ED`・Plex × Noto・旧 4-dot square symbol）→ [../archive/retired-designs/2026-06-11-visual-identity-rev4.md](../archive/retired-designs/2026-06-11-visual-identity-rev4.md)
  - 旧 `brand-brief.md` 一枚運用 → [../foundation/brand.md](../foundation/brand.md) ＋ [visual-identity.md](visual-identity.md) へ分離（[../archive/retired-designs/2026-05-21-brand-brief-monolith.md](../archive/retired-designs/2026-05-21-brand-brief-monolith.md)）
  - 旧 D0 案 B' 破棄 → [../archive/retired-designs/2026-05-11-logo-b-prime.md](../archive/retired-designs/2026-05-11-logo-b-prime.md)
  - 案 W ビジュアル資産退避 → [../archive/retired-designs/2026-05-24-case-w-visual-assets.md](../archive/retired-designs/2026-05-24-case-w-visual-assets.md)
  - Claude Design ブリーフ（案H'' ビジュアル再構築・rev-5 bundle に反映済）→ [../archive/retired-designs/2026-05-24-claude-design-brief.md](../archive/retired-designs/2026-05-24-claude-design-brief.md)
