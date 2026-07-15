# Claude / Codex 共同作業ルール

## 共通の正本

- `C:\dev\TENZU` をプロジェクトの唯一の正本とする。
- Claude と Codex は同じリポジトリ、同じブランチ、同じファイルを使う。エージェント別の複製、受け渡し用コピー、別ワークツリーを作らない。
- 外部で作った素材は、採用時にこのリポジトリの適切な場所へ取り込み、以後はリポジトリ内のファイルを正本とする。

## 作業開始時

- 最初に `git status --short --branch` を確認する。
- 未コミット変更がある場合は内容を確認し、別作業または他方のエージェントの変更と判断したファイルには触れず、オーナーへ報告する。
- `README.md`、`foundation/brand.md`、対象領域の `README.md` を読んでから変更する。

## 変更時

- 既存変更を上書き、巻き戻し、退避しない。競合する変更が必要なら先にオーナーへ確認する。
- 同じルールや成果物を Claude 用・Codex 用に重複保存しない。このファイルを共同作業ルールの SSOT とする。
- 実装、記事、画像、設計書の参照関係を保ち、必要な内部リンク、メタデータ、導線を意図なく削除しない。
- コミット前に差分と `git status` を確認し、変更範囲に応じたビルドまたは検証を行う。

## Git と公開

- コミット、push、本番公開は、オーナーから依頼された範囲で行う。
- push 前に現在のブランチとリモートとの差分を確認する。公開後は対象URLと公開内容を確認する。
- 認証情報、環境変数、個人用設定ファイルをコミットしない。

## TENZU 記事の LLMO 公開前チェック

- TENZU 記事の公開昇格・push 前、または `/llmo` を依頼されたときは、Claude / Codex ともに [`.claude/skills/llmo/SKILL.md`](.claude/skills/llmo/SKILL.md) を完全に読み、その手順を使う。
- LLMO ルールの正本は上記ファイルとし、Codex 用の複製スキルは作らない。検査本体は `web/scripts/llmo-check.mjs` を対象記事だけに実行する。
- このチェックは構造化データ用 frontmatter に限定する。本文レビューや他の article 系スキルまで自動で広げない。

## TENZU 記事の改訂・プレビュー・公開

- 「タイトル○の記事を改訂して」など、既存記事の改訂から公開までを依頼されたときは、Claude / Codex ともに [`.claude/skills/article-revise-publish/SKILL.md`](.claude/skills/article-revise-publish/SKILL.md) を完全に読んで使う。
- ローカルプレビューをオーナーへ見せるまでは、LLMO 検査・コミット・push を行わない。オーナーの明示承認後に LLMO 検査を実行し、現在のブランチだけへ push する。
- 詳細フローの SSOT は [`content/article-revision-publish.md`](content/article-revision-publish.md)。スキル側へ同じ仕様を重複記載しない。
