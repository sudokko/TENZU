---
name: article-export
description: 完成した記事を集客チャネル（note / ameba）向けの貼付用テキストに整形出力する。note は貼付用 Markdown（独自HTML・表なし）、ameba は許容範囲のインライン HTML。MDX 独自ブロックはネイティブ要素へ翻訳し、LLMO/メタ/内部リンク/SKUカードは外す。画像は挿入位置と alt/キャプション案のみ（アップは本人が手動）。投稿はしない（生成まで）。
---

# /article-export — note / アメブロ 出力ツール

tenzu 向けに書いた（または同じ構成メモから起こした）記事を、集客チャネルの**貼付用テキスト1ファイル**に整形する。**投稿はしない**——生成まで（本人がコピペ・画像アップ）。

## 対象と前提

- 入力: 完成した tenzu 記事 `web/content/articles/<slug>.mdx`・`docs/drafts/articles/<slug>.mdx`、または同じ構成メモ `docs/drafts/memos/<slug>.md`＋本文
- 出力先: `note` → `docs/drafts/external/note/<slug>.md`／`ameba` → `docs/drafts/external/ameba/<slug>.html`
- **SSOT（必ず参照・複製しない）**: [content/external-output.md](../../../content/external-output.md)（整形規約の一次ソース）。装飾翻訳は [/article-decorate](../article-decorate/SKILL.md)。品質・スタンス・ガードレールは tenzu と同一（[voice-tone](../../../foundation/voice-tone.md) 最優先・[templates §7](../../../content/templates.md)）
- 「足さない」原則: 整形は**内容を変えない**。tenzu 版の主張・事実・数値・引用をそのまま移すだけ

## 手順

1. **target を確認**: `note` か `ameba` か（両方なら各々出力）。未指定ならオーナーに聞く
2. **共通で外す**（external-output §1）: frontmatter・LLMO メタ/JSON-LD/OG・MDX 独自インポート・tenzu 内部リンク（`/articles/...` 等）・SKU/CTA カード
3. **共通で残す**: 結論先出し・見出し階層・箇条書き（3項目以上）・出典明示・voice-tone/NG/表記階層化/傷つきにくさ
4. **独自ブロックを翻訳**（external-output §4・/article-decorate 翻訳表）: `<Diagram>`→画像プレースホルダ／`<TenzuTranslate>`→引用＋「TENZU 訳」／`<Quote>`→引用／`<SideNote>`→区切り＋「メモ」
5. **プラットフォーム整形**:
   - **note**（external-output §2）: 素の Markdown。`##`/`###` 2階層・`**`・`>`・`---`・`-`/`1.`・`[text](URL)`。**表は箇条書き/散文へ**。独自 HTML・inline style 禁止
   - **ameba**（external-output §3）: 許容タグ `<h2><h3><p><strong><em><blockquote><ul><ol><li><a><img><hr><br>` のみ。`<script><style><table>`・class/id・過剰 style 禁止。表は `<ul>` か散文へ
6. **画像**（external-output §5）: eyecatch/本文画像は本人がアップ。出力には挿入位置マーカー＋alt/キャプション案を埋める（alt 規約＝revision-craft §3.5）
7. **書き出し**: `docs/drafts/external/{note|ameba}/<slug>.{md|html}` に保存し、外した要素・翻訳した箇所・画像アップ待ちの位置を一覧で報告

## チェック（出力後）

- note: `|…|`（表）・`<div>`・inline style が残っていない／リンクが外部公開 URL のみ／曖昧アンカー（「こちら」）なし
- ameba: 許容外タグ（`<table><script><style>`・class/id）が無い／H1 を本文に置いていない（タイトル欄用）
- 両方: NG 語 grep クリア・表記階層化・特性フレーム（tenzu と同一基準）

## やらないこと

- 投稿・画像アップロード（本人が手動）
- 内容の追加・改変（tenzu 版からの整形のみ・足さない原則）
- LLMO/メタ/JSON-LD の付与（プラットフォームが SEO を持つ）
- tenzu 内部リンク・SKU カードの持ち込み
