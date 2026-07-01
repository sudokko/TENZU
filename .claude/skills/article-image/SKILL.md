---
name: article-image
description: TENZU 記事のアイキャッチ/本文画像を配置・最適化・OG 連携・alt 付与する。画像の「生成」はしない（アイキャッチは本人が Gemini で手動生成）。Claude は所定フォルダの手動画像を web/public/assets/articles/ へ配置し、frontmatter eyecatch を更新、寸法/容量を検査（web/scripts/img-optimize.mjs）、本文画像の挿入位置と alt を決める。
---

# /article-image — 記事画像ツール

記事の画像まわりを整える。**画像生成はしない**——アイキャッチは本人が Gemini（ログイン方式）で手動生成する。Claude の担当は **配置 / 最適化検査 / OG 連携 / 挿入位置 / alt** のみ。

## 前提（重要）

- **生成は人間**: 1200×630 のアイキャッチは本人が Gemini で作る。クラウド（claude.ai/code）では本人がその画像を repo にアップ/コミットする一手が要る。Claude は生成を試みない。
- OG フォールバックは実装済み（Phase 2）: `web/app/articles/[slug]/opengraph-image.tsx` が、**eyecatch 未指定なら純白＋点格子＋ロゴ＋H1 を動的生成**する。だから eyecatch は「手動で用意できたら差し替える」任意の一次画像。
- SSOT: alt 規約 = [content/revision-craft.md §3.5](../../../content/revision-craft.md)／配色・格子・ロゴ = [design/visual-identity.md §1-5](../../../design/visual-identity.md)／OG 寸法 1200×630（Phase 2 と一致）

## 配置規約

| 種別 | 置き場所 | frontmatter |
|---|---|---|
| アイキャッチ（OG） | `web/public/assets/articles/<slug>.png`（1200×630） | `eyecatch: /assets/articles/<slug>.png` |
| 本文画像 | `web/public/assets/articles/<slug>/<name>.png` | 本文の `![alt](/assets/articles/<slug>/<name>.png)` で参照 |

`opengraph-image.tsx` は `eyecatch` 指定時にその実ファイルを OG として配信、無ければ動的生成にフォールバックする。よって **frontmatter の `eyecatch` を正しいパスにするだけ**で OG に反映される（メタの手書き不要）。

## 手順

1. **収集**: 本人が置いた手動画像（所定フォルダ or 添付）を確認する。無ければ「動的 OG で運用（eyecatch 不要）」と報告して終える。
2. **配置**: 上表の規約パスへ配置し、frontmatter `eyecatch` を更新（アイキャッチの場合）。
3. **検査（決定的）**:
   ```
   node web/scripts/img-optimize.mjs web/public/assets/articles/<slug>.png   # OG は 1200×630 厳密
   node web/scripts/img-optimize.mjs web/public/assets/articles/<slug>/      # 本文画像ディレクトリ
   ```
   - `OG-DIM`（1200×630 不一致）/ `OG-SIZE`（>8MB）は ERROR。寸法違反は**本人に再書き出しを依頼**（Claude はリサイズしない。実リサイズが必要なら sharp 導入を別途提案）。
   - `SIZE`（>1MB）は WARN。圧縮を促す。
4. **本文画像の挿入位置と alt**:
   - 挿入位置は装飾判断と同じく「文字が続く箇所の視覚的休憩」（[writing-craft.md §3](../../../content/writing-craft.md)）。過剰に貼らない。
   - **alt 生成規約**（revision-craft §3.5）: その画像の内容を一言で。**TENZU 標準＝Lv・タスク種類が分かる説明**（例: 「Lv.2 の点描写・斜め線を含む 4×4 の見本」）。キーワード詰め込み禁止・同一 alt 使い回し禁止。**装飾目的の SVG は alt 空で可**。
5. **再検査**して ERROR ゼロを確認し、変更点（配置したファイル・更新した eyecatch・付与した alt）を列挙する。

## OG 動的フォールバックのブランド仕様（参考・変更時のみ）

eyecatch が無い記事の OG は `opengraph-image.tsx` が生成する: 純白背景・teal トップ罫線・キッカー・Klee One の H1・点格子ロゴ。日本語グリフは Google Fonts(Klee One) を text サブセットで取得し、失敗時はブランドのみのラテン表示に退避する。この挙動は Phase 2 実装済みで、通常は触らない。

## やらないこと

- 画像の**生成**（人間が Gemini で行う）
- 画像の実リサイズ/圧縮（現状スクリプトは検査のみ。必要なら sharp 導入を提案）
- meta/OG タグの手書き（frontmatter `eyecatch` と opengraph-image が自動処理）
- 動的 OG テンプレの安易な改変（design/visual-identity に従うときのみ）
