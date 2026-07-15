# TENZU プロジェクト指示

## Claude / Codex 共通ルール

- 共同作業、Git、公開に関する共通ルールは [`AGENTS.md`](AGENTS.md) を必ず読むこと
- 共通ルールは `AGENTS.md` を SSOT とし、このファイルへ重複記載しない

## 設計書の読み方

- 会話開始時に必ず `README.md`（プロジェクト全体索引）と `foundation/brand.md`（ブランド土台）を読むこと
- テーマに関係する領域の `<領域>/README.md` のみ追加で読む（全部読まない）
- 各設計書は「## サマリ」セクション（20行以内）→「## 詳細」の2層構造。まずサマリだけ読む
- 設計変更時は該当設計書 ＋ 各領域 `README.md` のサマリを両方更新すること

## 領域構造（F/M/A/P/C/D/E/L 8段階 + Foundation Tier 0）

| 頭文字 | 名称 | ディレクトリ |
|---|---|---|
| **F** | Foundation（土台・常時参照） | `foundation/` |
| **M** | Market（市場分析・ターゲット・ポジショニング） | `market/` |
| **A** | Acquisition（認知獲得・CV 導線・モニター公募） | `acquisition/` |
| **P** | Product（商品・サービス BP） | `product/` |
| **C** | Content（記事・FAQ・ペルソナ） | `content/` |
| **D** | Design（ビジュアル・UI） | `design/` |
| **E** | Engineering（実装・インフラ） | `engineering/` |
| **L** | Launch（フェーズ・モニター・計測） | `launch/` |

Foundation は「ステップ」ではなく**全ステップが参照する基盤**。M と A は「外を読む／立ち位置を決める」と「認知を取って CV へ渡す」で責務を分離。

## 設計書の5原則（厳守）

### 原則①：領域別ディレクトリで関心を分離

ルート直下の `foundation/` `market/` `acquisition/` `product/` `content/` `design/` `engineering/` `launch/` の8領域に主要設計書を配置。横断的なものだけがルート直下（`README.md` `decisions.md`）。新しい設計書は必ずいずれかの領域に属させる。

### 原則②：サマリ20行ルールを厳守

各設計書は冒頭に「## サマリ」セクションを置く。**20行以内・絶対**。読者が「これを読めば今の確定事項がわかる」と感じる粒度。詳細は §以下を参照、と書いてOK。

### 原則③：本文は時制レス・経緯混入禁止

ステータス絵文字（🆕 ✅ 🚧）・日付タグ・「〇〇案」「〇〇廃止」を**本文から排除**。本文は「今が正」のみを書く。経緯は末尾「## 附録」セクションで `archive/` への1行リンクのみ。

### 原則④：単一ソース（SSOT）

同じ概念定義は1ファイルにしか書かない。他ファイルは参照リンクのみ。

| 概念 | 一次ソース |
|---|---|
| MISSION・ブランド定義・表記階層化・Voice NG/OK | `foundation/brand.md` |
| ビジュアル実装ルール（配色・タイポ・ロゴ・UI） | `design/visual-identity.md` |
| Phase 定義（1/2/3 + ポスト・ローンチ） | `launch/plan.md` |
| 9タスク仕様（全体設計・成立性・3群グルーピング） | `product/pack-design.md` |
| タスク別難易度ラダー・難易度スコア D | `product/pack-tasks.md` |
| 価格・課金・メーカー有償化・広告バンドル・検索意図ファセット | `product/pack-commerce.md` |
| ペルソナ P0-P7 | `content/personas.md` |
| 記事構成 craft（dump→構成・目次案の組み立て方） | `content/structure-craft.md` |
| 記事本文化 craft（構成メモ→本文の膨らませ方・執筆役割分担） | `content/writing-craft.md` |
| 記事推敲 craft（書いた後の点検・直し方） | `content/revision-craft.md` |
| 個人 note 開発実録連載の執筆ルール（実録スタンス・回テンプレ・検証・小モデル運用） | `content/note-devlog-craft.md` |
| 競合分析 | `market/competitive.md` |
| ターゲット中核3／受動拾い4 | `market/targeting.md` |
| ポジショニング市場展開 | `market/positioning.md` |
| 認知獲得チャネル（DM・インフル・広告） | `acquisition/channels.md` |
| SNS アカウント設計（表示名・ハンドル・プロフィール実文言・固定要素） | `acquisition/sns-accounts.md` |
| CV 導線（レベル選びガイド・LP・クーポン） | `acquisition/funnel.md` |
| 先行モニター公募導線 | `acquisition/monitor-recruit.md` |
| KPI ・計測 | `launch/measurement.md` |
| 横断判断ログ | `decisions.md` |

### 原則⑤：経緯は archive と journal に完全退避

- **`archive/retired-designs/`** … 撤回設計（変遷の証跡）
- **`archive/retired-structures/`** … 撤回構造（ディレクトリ再編等の証跡）
- **`archive/sessions/`** … 月別セッション記録
- **`journal/`** … Claude とのやり取り履歴（別用途・触らない）
- **`ideas/`** … 検討中アイデアの待機場所（SSOT 反映前の思考地層・status: alive/parked/promoted/rejected で管理）
- **本体設計書** … 経緯一切なし。末尾に「変遷: → archive/xxx」リンク1行のみ

## 設計書の標準構造

```markdown
# <タイトル>

## サマリ
（20行以内・確定事項のみ・箇条書き5-8項目目安）

## 詳細
### §1. ...
### §2. ...

## 附録（任意）
- 変遷: [archive/retired-designs/xxx](archive/...)
- 関連セッション: [archive/sessions/xxx](archive/...)
```

テンプレファイルは作らない。書き方に迷ったら **参考例: `content/pillars.md`** を見ること。
