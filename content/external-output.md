# 外部出力規約 — note / アメブロ（集客・貼付用テキスト生成）

## サマリ

- **用途**: 記事を集客チャネル（`note` / `ameba`）へ出すときの**最終整形規約の SSOT**。トピック選定・craft・ペルソナ・ガードレールは tenzu と共通、**分岐は最終整形と掲載先だけ**（[article-writing-kit.md](article-writing-kit.md)）
- **到達点**: 各プラットフォームに**貼付用テキストを1ファイル出力するところまで**。投稿（コピペ・画像アップ）は本人が手動
- **出力先**: `note` → `docs/drafts/external/note/<slug>.md`（貼付用 Markdown）／`ameba` → `docs/drafts/external/ameba/<slug>.html`（貼付用 HTML）
- **共通で残す**: 結論先出し・見出し構造・箇条書き（3項目以上）・出典の明示。voice-tone / NG 語 / 表記階層化 / 傷つきにくさ は tenzu と同一に守る
- **共通で外す**: LLMO メタ・JSON-LD・OG・MDX 独自コンポーネント・frontmatter・内部リンク（tenzu ドメイン URL）・SKU/CTA カード（プラットフォームが SEO と導線を持つため）
- **note**: プラットフォーム・ネイティブ要素のみ（見出し／引用／太字／区切り線／箇条書き／リンク／画像プレースホルダ）。**独自 HTML・表は使わない**（表は箇条書きか散文へ）
- **ameba**: 許容範囲のインライン HTML（`<h2><h3><p><strong><blockquote><ul><ol><li><a><img><hr>`）。過剰な style は使わない
- **装飾の翻訳**: MDX 独自ブロック（`<Diagram><TenzuTranslate><Quote><SideNote>`）→ 各プラットフォームのネイティブ要素へ（[/article-decorate](../.claude/skills/article-decorate/SKILL.md) の翻訳表）
- **画像**: eyecatch・本文画像は各プラットフォームで**本人がアップ**。出力には**挿入位置マーカー＋alt/キャプション案**を埋める（[revision-craft.md §3.5](revision-craft.md) の alt 規約）
- **実行**: [/article-export](../.claude/skills/article-export/SKILL.md) スキルが本規約に従って出力ファイルを生成する

## 詳細

### §1. 位置づけと共通ルール

出力先3分岐は書き始めに `target` で宣言する（[article-writing-kit.md §1](article-writing-kit.md)）。`note`/`ameba` は集客チャネルで、SEO と回遊はプラットフォーム側が持つ。よって tenzu 向けの技術層（メタ・構造化データ・内部リンク網）は載せない。一方、**中身の品質・スタンス・craft は tenzu と完全に同一**に扱う。

**必ず tenzu と同じに守るもの**（一次ソースは各 SSOT）:
- voice-tone / NG 語・表現置換（[foundation/voice-tone.md](../foundation/voice-tone.md)・[templates.md §7.1](templates.md)）
- 表記階層化「点図形（点描写）」（[templates.md §7.0](templates.md)）
- 傷つきにくさ・特性フレーム（[templates.md §7.3](templates.md)）
- 「足さない」原則（[writing-craft.md §2](writing-craft.md)）
- 読みやすさ（結論先出し・見出し階層・箇条書き3項目以上・出典明示）

**外すもの**:
- frontmatter（プラットフォームが持たない）
- LLMO メタ・JSON-LD・OG・canonical・sitemap（tenzu 専用）
- MDX 独自コンポーネント（そのままでは描画されない → §3 で翻訳）
- 内部リンク（`/articles/...` 等の tenzu 相対 URL）。プラットフォーム内で完結する導線か、外部公開 URL のみ使う
- SKU カード・CTA ブロック（B-4 未実装かつプラットフォーム外導線）

### §2. note 整形規約（貼付用 Markdown）

出力: `docs/drafts/external/note/<slug>.md`。note エディタに貼れる素の Markdown。

| 要素 | note での書き方 |
|---|---|
| タイトル | 本文先頭に `# ` で1つ（note のタイトル欄へ手動転記する前提） |
| 見出し | `## `（大見出し）／`### `（小見出し）の2階層まで。4階層目は作らない |
| 太字 | `**強調**` |
| 引用 | `> `（1行以上） |
| 区切り | `---`（区切り線） |
| 箇条書き | `- `（3項目以上の並列のみ）／手順は `1. ` |
| リンク | `[表示テキスト](URL)`。外部公開 URL のみ。「こちら」等の曖昧アンカー禁止 |
| 画像 | `![alt案](画像はnoteで本人がアップ)` の1行プレースホルダ＋直後にキャプション案 |

**禁止**: 独自 HTML タグ・`<div>`・インライン style・**表（`|...|`）**。表は「3項目以上の箇条書き」か散文に落とす。色・フォント変更は使わない。

### §3. ameba 整形規約（貼付用 HTML）

出力: `docs/drafts/external/ameba/<slug>.html`。Ameba エディタ（HTML 貼付）に収まる許容タグのみ。

**許容タグ**: `<h2> <h3> <p> <strong> <em> <blockquote> <ul> <ol> <li> <a> <img> <hr> <br>`。

| 要素 | ameba での書き方 |
|---|---|
| 見出し | `<h2>` / `<h3>`（H1 はタイトル欄なので本文には置かない） |
| 段落 | `<p>…</p>` |
| 強調 | `<strong>…</strong>` |
| 引用 | `<blockquote>…</blockquote>` |
| 区切り | `<hr>` |
| 箇条書き | `<ul><li>…</li></ul>` / 手順は `<ol>` |
| リンク | `<a href="URL">表示テキスト</a>`（外部公開 URL のみ） |
| 画像 | `<!-- 画像: alt案／キャプション案（本人が Ameba でアップ） -->` のコメント・プレースホルダ |

**禁止**: `<script> <style> <table> <iframe>`・class/id・過剰な inline style（色は原則付けない）。表が要る比較は `<ul>` か散文へ。

### §4. MDX 独自ブロックの翻訳

tenzu 本文の独自ブロックは、[/article-decorate](../.claude/skills/article-decorate/SKILL.md) の翻訳表に従いネイティブ要素へ落とす（意味を保つ）。

| MDX ブロック | note | ameba |
|---|---|---|
| `<LeadGraf>` | 冒頭段落（そのまま散文） | `<p>`（冒頭段落） |
| `<Diagram>` | 画像プレースホルダ＋キャプション | 画像コメント＋キャプション |
| `<TenzuTranslate>` | `> 原文`＋`**TENZU 訳**`＋訳文 | `<blockquote>`＋`<strong>TENZU 訳</strong>`＋訳文 |
| `<Quote>` | `> ` 引用 | `<blockquote>` |
| `<SideNote>` | `---`＋`**メモ**`＋補足 | `<hr>`＋`<strong>メモ</strong>`＋`<p>` |

図解 SVG は各プラットフォームで再現できないため、**画像として本人が用意する**前提のプレースホルダに置き換える（生成はしない・[/article-image](../.claude/skills/article-image/SKILL.md) の方針と同じ）。

### §5. 画像の扱い

- eyecatch・本文画像は各プラットフォームのエディタで**本人がアップロード**する（Claude はアップしない）
- 出力ファイルには **挿入位置マーカー**（note=`![alt](…)` プレースホルダ／ameba=画像コメント）と、**alt/キャプション案**を必ず添える
- alt 規約は tenzu と同じ（[revision-craft.md §3.5](revision-craft.md)）＝内容を一言で・TENZU 標準は Lv/タスク種別が分かる説明・キーワード詰め込み禁止

### §6. 命名・出力

- ファイル名: tenzu と同じ `<slug>`（[urls.md](urls.md) の確定スラッグ）。note=`.md`／ameba=`.html`
- 1記事1ファイル。複数プラットフォームに出すときはそれぞれ生成する
- 生成後、本人がプラットフォームへコピペ → 画像アップ → 投稿（手動）

## 附録

- 全体設計・実行フェーズ（Phase 4 = 本規約）: [article-writing-kit.md §6](article-writing-kit.md)
- 実行スキル: [/article-export](../.claude/skills/article-export/SKILL.md)
- 装飾翻訳: [/article-decorate](../.claude/skills/article-decorate/SKILL.md)
