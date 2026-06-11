# 撤回設計: 「先行SKU」概念

> **撤回日**: 2026-05-09
> **代替**: 全140 SKU 通常販売（Phase 1 から）／主動線はモニター無償フルアクセス

---

## 何だったか

TENZU の段階的リリース設計の中で、「Phase 1（サイト本体オープン期）では限定的な SKU だけを販売する」という構想。本数は 3〜5本〜10本のあいだで何度か揺れ動き、最終的に **S01/S05/S06/S07 の4本**（模写幾何Lv.2／欠け補完幾何Lv.3／立体模写Lv.3／線対称幾何Lv.2）を「先行SKU」として販売する設計になっていた。

content-design-research.md §5.6 / content-design-templates.md §2.3-§5（初版）/ MEMORY.md などに記述が散在していた。

## なぜ撤回したか

- 2026-05-08 の launch-plan 全面再構築で「Phase 1 の主目的＝集客＋ブラッシュアップ／非目的＝売上」が確定
- 「販売SKU を絞る」ことに集客上の利点はなく、むしろ商品ファミリー記事 4本（タスク紹介）と SKU 販売数を分離した方が記事側の設計がシンプルになる
- 主動線が「TENZU 先行モニター応募」（10名前後・全SKU無償フルアクセス）に確定したため、有償SKU の本数を絞る理由がなくなった
- 2026-05-09 セッションで content-design-templates.md を作成中に「先行SKU 4本のみ販売」という古い前提を引きずってテンプレへハードコードしてしまったことが発覚 → 概念ごと廃止することで再発防止

## 代替設計

- **Phase 0**: 商品ページなし・SKU CTA 出さない（経路分離原則）
- **Phase 1〜3**: 全140 SKU 公開・通常販売
- **モニター無償提供**: Phase 1 から LP公募で 10名前後・全SKU無償フルアクセス（販売とは別経路）
- **記事側のCTA**: phase によって `cta_mode: app-only / sku-full` で切り替え（content-design-templates.md §2.3）

## 関連する廃止物

- `cta_mode: sku-preview` enum 値（templates.md §2.2 から削除）
- `<SkuCards />` の Phase 1/2 ハードコードSKUフィルタ（templates.md §3.3 から削除）
- 「先行SKU」用語そのもの（全設計書から grep で除去）

## 影響を受けたファイル（修正履歴）

- content-design-templates.md §2.1/§2.3/§3.3/§5.2/§6.2/§8（2026-05-09 修正）
- content-design-research.md §5.6（2026-05-09 注記追加）
- pack-design.md §14.9（2026-05-08 撤回処理・→ pack-design-notes.md へ移管）
- gtm-execution.md §7（2026-05-08 4フェーズへ書き換え）
- MEMORY.md（2026-05-09 圧縮）
