---
name: article-revise-publish
description: TENZU の既存 MDX 記事をタイトルから特定し、本文改訂、既存導線の維持、温かい手描き水彩調の挿絵を1パターンだけ生成・配置、ローカルプレビュー、オーナー承認後の LLMO 検査、現在ブランチへの commit/push、Amplify 表示確認まで進める。「タイトル○の記事を改訂して」「この記事を画像込みで直して、確認後に公開して」などの依頼に使う。
---

# TENZU 記事改訂・公開

詳細フローの SSOT である [`content/article-revision-publish.md`](../../../content/article-revision-publish.md) を完全に読み、その順序と停止条件を守る。

## 必須ゲート

1. `git status --short --branch` を確認し、タイトルから対象記事を一意に特定する。
2. 本文・必要な挿絵・表示デザインを改訂し、ビルドとローカル画面を検証する。
3. ローカルプレビューをオーナーへ見せて停止する。この時点では LLMO、commit、push を実行しない。
4. オーナーが内容を明示承認した後だけ [`.claude/skills/llmo/SKILL.md`](../llmo/SKILL.md) を完全に読み、対象記事だけを検査する。
5. LLMO の ERROR を解消し、WARN は理由を報告する。必要な再ビルド後、現在のブランチだけへ commit/push する。
6. 対応する Amplify URL で本文・画像・内部リンクを確認する。

## 境界

- 既存の内部リンク、商品導線、frontmatter は、改訂理由がない限り維持する。
- 挿絵は SSOT の固定テイストで、配置1か所につき候補1点だけ作る。A/B 案を作らない。
- ブランチを切り替えたり別ブランチへ merge/push したりしない。別ブランチへの反映はオーナーが明示した場合だけ行う。
- 本文レビュー全般や他の article 系スキルは、依頼範囲に含まれる場合だけ使う。
