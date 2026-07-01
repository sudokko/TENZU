# アメブロ出力（貼付用 HTML）

このディレクトリには Ameba 向けの貼付用 HTML を `<slug>.html` で置く。

- 整形規約（SSOT）: [content/external-output.md §3](../../../../content/external-output.md)
- 生成: [/article-export](../../../../.claude/skills/article-export/SKILL.md)（target=ameba）
- 許容タグのみ（`<h2><h3><p><strong><em><blockquote><ul><ol><li><a><img><hr><br>`）。`<script><style><table>`・class/id・過剰 style は使わない
- 画像は本人が Ameba でアップ（本文にはコメント位置マーカー＋alt/キャプション案のみ）
- 生成物は投稿前の下書き。投稿（コピペ・画像アップ）は本人が手動で行う。
