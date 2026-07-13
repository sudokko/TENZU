---
name: llmo
description: TENZU 記事の「構造化データ(JSON-LD/meta/OG)に食わせる入力」を整える。faq_schema 生成・frontmatter 完全性(JSON-LD/meta が正しく出る状態)の確認だけを行う。本文の 8原則・見出し・箇条書き・NG語などの品質は article-reviewer が担当するのでここでは扱わない。記事本文が書き上がった後・公開昇格の前に使う。target=tenzu のみ。
---

# /llmo — 構造化データ・フィーダー

記事の **構造層（JSON-LD / meta / OG）は Phase 2 でパイプラインが自動生成**する。その自動生成が正しく出るように、**入力＝frontmatter を整える**のが `/llmo` の唯一の仕事。

**本文の品質（結論先出し・見出し階層・箇条書き・定義・数値・NG語・alt 等）は `article-reviewer`（§H「LLMO 8原則」ほか）が担当する。`/llmo` では扱わない**（二重化を避ける）。

## スコープ（これだけやる）

1. **`faq_schema` 生成** — 本文に明確な Q&A（FAQ 記事・「よくある質問」等）があれば、`frontmatter.faq_schema: [{q, a}, …]` に要約して追加する。これが FAQPage JSON-LD になる（[slug]/page.tsx が消費）。**本文の Q&A を要約するだけ・新しい設問は作らない**。
2. **frontmatter 完全性** — JSON-LD(Article)/meta が正しく出るために必要なキーが揃っているか：`title` / `description` / `article_type` / `updated_at`（＋任意 `published_at` / `author` / `eyecatch`）。欠けていれば本文・確定情報から埋める。
3. **description の器チェック** — meta/OG スニペットと JSON-LD description に載る。60-120字に収まっているか確認し、外れていれば**本文の結論から**調整する（キーワード詰め込みはしない）。

## やらないこと（他ツールへ委譲）

- 本文の 8原則（結論先出し・箇条書き・数値・見出し階層・定義・比較表）→ **`article-reviewer`**
- 装飾ブロックの配置・箇条書き/表化 → **`/article-decorate`**
- 画像 alt・配置 → **`/article-image`**
- NG語・表記階層化・傷つきにくさ → **`article-reviewer` / voice-tone**
- JSON-LD/meta の手書き（frontmatter から自動生成される。ここは frontmatter を整えるだけ）

## 手順

1. **検査（決定的）**
   ```
   node web/scripts/llmo-check.mjs <path-to.mdx>
   ```
   構造層フィーダーの ERROR/WARN を受け取る:
   | ID | 内容 | 対応 |
   |---|---|---|
   | `FM-000` | frontmatter ブロック自体が無い | frontmatter を新設（templates §2/§2.5） |
   | `FM-REQ` / `FM-YAML` | 必須 frontmatter 欠落 / YAML 破損 | 補修（templates §2/§2.5） |
   | `META-DESC` | description が長い/短い | 60-120字に調整（本文の結論から） |
   | `FM-SLUG` | slug とファイル名が不一致 | どちらかに揃える（urls.md 準拠） |
   | `IMG-EYE` | eyecatch が実在しない | パス修正 or 未配置なら動的OGに任せる |
   | `FAQ-SHAPE` / `FAQ-MISSING` | faq_schema の形状/欠落 | 下記 2 で生成・修正 |

2. **追記（判断）** — 上記スコープ 1-3 を frontmatter に反映する。**本文の主張・事実・数値は増やさない（足さない原則）**。

3. **再検査** — `llmo-check` を再実行し ERROR ゼロを確認。残る WARN は理由を1行添えて報告。

## 出力

- frontmatter を整えた `<slug>.mdx`（上書き）
- 変更点（frontmatter のどのキーをどう埋めたか）＋最終検査サマリ
- 本文品質は「`article-reviewer` を回してね」と一言添える（役割分担の明示）
