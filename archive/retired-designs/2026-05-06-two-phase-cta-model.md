# 撤回設計: `phase: pre-launch | post-launch` 2値モデル

> **撤回日**: 2026-05-09
> **代替**: `phase: phase-0 | phase-1 | phase-2 | phase-3` 4値モデル（content-design-templates.md §2.3）

---

## 何だったか

2026-05-06 の B-2 Block 1 確定時に、MDXフロントマターに `phase: pre-launch | post-launch` の2値フィールドを必須化していた。

- `pre-launch` 期: アプリ＋限定SKU＋メール／LINE登録 を CTA に
- `post-launch` 期: フル商品 CTA に書き換え運用

content-design-pillars.md §3.2 / content-design-research.md §5.7（HO-B2-23）に記述。

## なぜ撤回したか

- 2026-05-08 の launch-plan 全面再構築で **4フェーズ構成（Phase 0/1/2/3）** が確定
  - Phase 0: アプリ＋最小LP・商品ページなし
  - Phase 1: サイト本体オープン・モニター制度開始・全140 SKU 販売
  - Phase 2: モニターFB反映の修正期間
  - Phase 3: 本リリース・クーポン誘導
- 2値モデルでは Phase 0（売る商品ゼロ）と Phase 1（販売開始だが集客主動線はモニター）の違いを表現できない
- 特に Phase 0 記事は SKU CTA 自体を出さない設計（経路分離原則）なので、`<SkuCards />` のレンダリングガードに新しい phase 値が必要だった

## 代替設計

| 旧2値 | 新4値（条件分岐） |
|---|---|
| `pre-launch` | `phase-0`（target_skus=[]）／`phase-1`（target_skus=関連SKU 1-3本） |
| `post-launch` | `phase-3` |

`cta_mode` も併設（`app-only` / `sku-full` の2値）。詳細は content-design-templates.md §2.3。

## 影響を受けたファイル

- content-design-pillars.md §3.2（2026-05-09 圧縮・templates.md への参照に変更）
- content-design-templates.md §2.1-§2.4（2026-05-09 新ファイルとして 4値モデル確定）
- content-design-research.md §5.7（2026-05-09 撤回明示）
