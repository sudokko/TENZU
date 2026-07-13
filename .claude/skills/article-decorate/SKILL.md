---
name: article-decorate
description: TENZU の記事本文から、内容に応じて装飾ブロック（図解・研究引用・キメ引用・開発ノート）を適切な位置に挿入する。散文優先・過装飾ガードを守る。target=tenzu は MDX 独自ブロック、target=note/ameba は各プラットフォームのネイティブ要素へ翻訳する。本文が書き上がった後・LLMO 前後に使う。
---

# /article-decorate — 記事装飾ツール

書き上がった本文の内容を読み、**どこに・どの装飾ブロックを置くか**を判断して挿入する。装飾は「読者の理解と休憩」のためであり、飾りではない。**散文で語れることは散文のまま**残す。

## 対象と前提

- 対象: `docs/drafts/articles/<slug>.mdx` または `web/content/articles/<slug>.mdx`
- SSOT（必ず参照・複製しない）:
  - 装飾タイミング・段落設計・箇条書き/表の使い所 = [content/writing-craft.md §3](../../../content/writing-craft.md)
  - 罫線 D1-D4・面・動き = [design/visual-identity.md §4](../../../design/visual-identity.md)／コンポーネント = §7
  - 11 セクション・スロット = [content/templates.md §3](../../../content/templates.md)
  - 衝突時は [voice-tone.md](../../../foundation/voice-tone.md) が最優先
- 「足さない」原則: 装飾は**本文の主張・事実・数値・引用を増やさない**。既にある文を**ブロックに移す/囲む**だけ。図解の SVG も本文にある構造の可視化に限る。

## 使える装飾ブロック（target=tenzu / 実装済み）

`web/mdx-components.tsx` が供給する 5 ブロックのみ。CSS は `web/app/articles/article.css`（罫線 D1-D4 に対応）。

| ブロック | 用途 | 置く判断 |
|---|---|---|
| `<LeadGraf>…</LeadGraf>` | 本文冒頭の一段（導入） | 記事先頭に1つ。リード段落を囲う |
| `<Diagram title caption>…<svg/>…</Diagram>` | 図解（点描写格子・段階の可視化） | 文字が続く箇所の**視覚的休憩**（writing-craft §3「文章が続く箇所は図版で休憩」）。抽象説明の直後 |
| `<TenzuTranslate src cite>…</TenzuTranslate>` | 研究引用＋TENZU 訳 | 論文・エビデンスを引くとき。原文を弱めず生活語彙へ（引用は references 登録分のみ） |
| `<Quote author>…</Quote>` | キメの引用（1-2行） | 記事の核を一度だけ。**多用しない**（キメは要所のみ・writing-craft §3） |
| `<SideNote label>…</SideNote>` | 開発ノート・脇道（DEV NOTE） | 本筋を止めずに補足したいとき。D4（到達感不要の左罫） |

> **未実装**: `<InlineCTA>` `<SkuCards>` は Phase B-4（CTA 連携・SKU 公開時）まで無い。装飾ではこれらを挿入しない。CTA が要る箇所は «CTA: 後日 B-4» とコメントで印だけ残す。

## 過装飾ガード（必ず適用）

[writing-craft.md §3](../../../content/writing-craft.md) の閾値:

- **散文優先**: 箇条書きは「3項目以上の並列」か「手順」だけ。2項目や説明文をリスト化しない
- **表は3行以上**かつ比較軸が明確なときだけ（research.md §1.8補足2）
- **`<Quote>` は記事に原則1つ**（キメの乱発はリズムを壊す）
- **`<Diagram>` は意味のある可視化のみ**。飾りSVG・アニメ・グラデ・影は不可（visual-identity §4.1/§4.3）
- 箇条書き比率が本文の 30% を超えたら散文へ戻す（templates §7.6）

## 手順

1. 本文を H2 セクションごとに読み、各所で「散文のままが最善か／ブロックが読者を助けるか」を判断する
2. 上記ガード内で `<LeadGraf>` `<Diagram>` `<TenzuTranslate>` `<Quote>` `<SideNote>` を挿入する。`<Diagram>` の SVG は本文にある構造（点格子・段階・図形）を素朴に描く（色は ink `#1A1F2A`・accent `#2C6E7F`・点格子 opacity 0.16／visual-identity §1-2）
3. 挿入後 `node web/scripts/llmo-check.mjs <file>` を回し、frontmatter を壊していないか確認する（このスクリプトが検査するのは frontmatter のみ。本文構造＝H2 配下の箇条書き/表の確認は article-reviewer §H の担当）
4. 変更点を「位置 → 使ったブロック → なぜそこか（writing-craft/visual-identity の根拠）」で列挙する

## target=note / ameba のとき（ネイティブ翻訳）

独自ブロックは使えない。意味を保ったままプラットフォーム要素へ落とす:

| MDX ブロック | note | ameba |
|---|---|---|
| `<Diagram>` | 画像プレースホルダ＋キャプション（位置と alt 案を明記） | 同左（`<img>`＋説明） |
| `<TenzuTranslate>` | 引用（`>`）＋太字の「TENZU 訳」見出し | `<blockquote>`＋太字 |
| `<Quote>` | 引用（`>`） | `<blockquote>` |
| `<SideNote>` | 区切り線＋小見出し「メモ」 | 罫線＋補足段落 |

LLMO/JSON-LD は付けない（プラットフォームが SEO を管理）。ただし結論先出し・見出し構造・箇条書きの読みやすさノウハウは適用する。

## やらないこと

- 本文の主張・事実・数値・引用の新規追加
- 飾り目的の装飾（意味の無い SVG・色強調・絵文字の増量）
- CTA/SKU ブロックの挿入（B-4 まで未実装）
- 構成レベルの変更（必要なら «構成差し戻し» として報告）
