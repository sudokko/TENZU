---
name: llmo
description: TENZU の記事 MDX を LLMO（AI に引用されやすい構造）最適化する。決定的検査（web/scripts/llmo-check.mjs）→ 判断による追記（meta description・結論先出し・定義/数値/出典の補強・faq_schema 生成）→ 再検査 を一続きで回す。記事本文が書き上がった後・公開昇格の前に使う。target=tenzu の記事のみ対象（note/ameba は LLMO 対象外）。
---

# /llmo — 記事 LLMO 最適化ツール

TENZU の記事 MDX を「AI（ChatGPT/Claude/Perplexity 等）に引用されやすい構造」へ整える専用ツール。**機械検査（決定的）→ 判断による追記 → 再検査** を一続きで回す。

## 対象と前提

- 対象: `web/content/articles/<slug>.mdx`（昇格済み）または `docs/drafts/articles/<slug>.mdx`（下書き）。**target=tenzu の記事のみ**。note/ameba は各プラットフォームが SEO を持つため対象外。
- SSOT（必ず参照。ここには複製しない）:
  - LLMO 8原則 = [content/templates.md §7.4](../../../content/templates.md)
  - frontmatter 仕様 = [content/templates.md §2](../../../content/templates.md)
  - meta/alt の点検 = [content/revision-craft.md §3.5](../../../content/revision-craft.md)
  - NG 語・表現 = [content/templates.md §7.1](../../../content/templates.md) ／ [foundation/voice-tone.md §1](../../../foundation/voice-tone.md)（**衝突時は voice-tone が最優先**）
- 「足さない」原則: 本文の**主張・事実・数値・引用は増やさない**（[writing-craft.md §2](../../../content/writing-craft.md)）。LLMO 追記は「既にある内容の構造化・出典明示・定義の1行化」に限る。新しい数値やエビデンスをでっち上げない。

## 手順

### 1. 検査（決定的）

```
node web/scripts/llmo-check.mjs <path-to.mdx>
```

ERROR / WARN を一覧で受け取る。チェック ID の意味:

| ID | 内容 | 対応 |
|---|---|---|
| `FM-REQ` / `FM-YAML` | 必須 frontmatter 欠落 / YAML 破損 | frontmatter を補修（§2） |
| `META-DESC` | description が長い/短い | 120字以内・80-120字目安に調整（§3.5） |
| `LLMO-H1` | 本文に H1 | `#` を `##` へ（タイトルは frontmatter） |
| `LLMO-H2` | H2 が 4-6 個から外れる | 統合/分割を提案（本文改変は最小限・オーナー確認） |
| `LLMO-TLDR` | 結論先出しが無い | 本文冒頭に「## 結論」or `<TLDR>` を**本文から要約して**追加 |
| `LLMO-LIST` | H2 に箇条書き/表が無い | 既存の散文から**3項目以上の並列**を抽出できる場合のみ箇条書き化（過剰リスト化はしない） |
| `LLMO-REF` | 引用 `<sup>[N]</sup>` に References 不整合 | References セクション or frontmatter `references` を整える |
| `IMG-ALT` | 画像 alt 欠落 | alt を付与（→ `/article-image` に委譲可） |
| `FAQ-*` | faq_schema 不整合 | 下記 3 で生成/修正 |
| `NG-WORD` | Anti-Brand 語検出 | voice-tone の代替語へ置換（**最優先**） |

### 2. 追記（判断）

検査結果と本文を読み、LLMO 8原則に沿って**追記・微修正**する。判断が要る主な作業:

- **meta description の最適化**: 本文の結論から 80-120 字で書き直す。ターゲット語を前半に。煽り・NG 語なし。全記事固有（使い回し禁止）。
- **結論先出し**: `LLMO-TLDR` があれば、本文の結論を 3-5 行（各40字以内）に要約し「## 結論」または `<TLDR>` として冒頭付近へ。末尾に「根拠: 本記事 §X / 引用[N]」を1行（§3.2）。
- **定義の1行化**（原則5）: 初出の専門用語に「〜とは、…です」の1行定義があるか。無ければ**本文の趣旨を変えずに**1行足す。
- **数値の具体化**（原則3）: 「多くの」等の曖昧語が、**本文/メモに既にある数値**に置換できるなら置換。無い数値は作らない。
- **出典明示**（原則7）: 引用箇所に `<sup>[N]</sup>`、末尾 References を整える。ID は [references-map.md](../../../content/references-map.md) 登録分のみ。
- **faq_schema 生成**: FAQ 記事、または本文に明確な Q&A がある記事は、frontmatter に `faq_schema: [{q, a}, …]` を追加（本文の Q&A を要約・新設問を作らない）。これが FAQPage JSON-LD になる（Phase 2 の [slug]/page.tsx が消費）。

追記は**本文の意味を変えない**範囲に留める。構成レベルの変更が要るときは直さず、オーナーに «構成差し戻し» として報告する。

### 3. 再検査

```
node web/scripts/llmo-check.mjs <path-to.mdx>
```

ERROR ゼロを確認する。残る WARN は「なぜ許容したか」を1行添えて報告（例: pillar のため H2=3 を許容）。

## 出力

- 追記適用後の `<slug>.mdx`（上書き）
- 変更点リスト（チャット上）: 「ID → 該当箇所 → 追記/修正内容 → 根拠（LLMO 原則 N / §）」
- 最終の検査サマリ（ERROR/WARN 件数）と、人間判断に委ねる残件

## やらないこと

- 本文の主張・事実・数値・引用の**新規追加**（足さない原則）
- キーワードの後付け詰め込み（[revision-craft §5](../../../content/revision-craft.md)）
- JSON-LD の手書き（Article/BreadcrumbList/FAQPage は Phase 2 パイプラインが frontmatter から自動生成する。ここでは frontmatter を整えるだけ）
- note/ameba 記事への適用
