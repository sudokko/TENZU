# ideas/

検討中アイデアの待機場所。SSOT 反映前の思考地層を残す。

## 役割

- 「まだ生きているが確定はしていない」アイデアを保管
- `archive/` とは性質が逆（過去の死んだもの vs 現在の生きている候補）
- SSOT 本体に書くと CLAUDE.md 原則③（時制レス・経緯混入禁止）違反になる思考メモを退避

## ファイル命名規則

`YYYY-MM-DD-{kebab-slug}.md`

時系列でソートされる。

## status 4 値

| status | 意味 |
|---|---|
| **alive** | 検討中・まだ生きている |
| **parked** | 一旦寝かせる（条件待ち） |
| **promoted** | SSOT に昇格（実装決定）→ ファイルは履歴として残し、本体設計書へリンク |
| **rejected** | 採用しない（理由明記） |

## アイデアファイルのテンプレ

```markdown
---
status: alive | parked | promoted | rejected
created: YYYY-MM-DD
related: [path/to/file.md, ...]
---

# {タイトル}

## 着想
（なぜ思いついたか・どの課題への対応か）

## 案の中身
（具体的な内容）

## 効くポイント
（なぜ筋いいか）

## 課題・落とし穴
（コスト・複雑度・リスク）

## 判断保留の理由
（なぜ今は採用しないか・何が解ければ採用か）

## 次の判定タイミング
（いつ再評価するか・トリガー条件）
```

## 現在のアイデア一覧

| 日付 | タイトル | status | 関連 |
|---|---|---|---|
| 2026-05-28 | [App 装飾・再印刷機能の購入者解放](2026-05-28-app-decoration-for-buyers.md) | alive | pack-design.md / funnel.md / engineering/README.md / launch/phases.md |
| 2026-05-28 | [印刷メンバーシップ（App サブスク）モデル](2026-05-28-app-subscription-model.md) | alive | brand.md / voice-tone.md / pack-design.md / funnel.md / engineering/README.md / launch/plan.md / launch/phases.md |
| 2026-06-11 | [点つなぎ（番号順点結び）の商品ライン／メーカー機能化](2026-06-11-dot-to-dot-product-line.md) | alive | pack-design.md / targeting.md / competitive.md / launch/phases.md |
