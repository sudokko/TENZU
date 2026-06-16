---
ep: EP-009
title: 設計書ファイル分割ポリシー（content-design.md → 5 分割）
date: 2026-05-08
session: docs/ ディレクトリ整理＋README スリム化セッション
themes: [ai-collaboration, docs-management, scaling]
related_docs:
  - docs/content-design.md
  - docs/content-design-pillars.md
  - docs/content-design-clusters.md
  - docs/content-design-urls.md
  - docs/content-design-faq-ops.md
status: draft
public_safe: true
---

# 設計書ファイル分割ポリシー（content-design.md → 5 分割）

## 何が起きたか（要約）

B-2 コンテンツ設計の進行に伴い、`content-design.md` 1 ファイルが Pillar 設計・Cluster 振り分け・URL 命名・FAQ 運用・先行リリースブループリントと多論点で肥大化した。セッション開始時に「今回はどの論点を扱うか」を判断するために毎回全文を読む必要があり、読み込み負荷と検索精度の低下が問題化した。2026-05-08 のドキュメント整理セッションで 5 ファイルへ責任分離し、先行リリース設計は top-level に昇格した。

## 状況・背景

B-2 Block 1 完了時点で `content-design.md` は以下の論点を並走で含んでいた。

- §1 IA 骨格設計
- §2〜§5 リサーチ系（KW・競合分析）
- §6 Pillar 3 本の詳細
- §7 Cluster 振り分け・GTM 配分
- §8 URL 命名規則・スラッグ
- §9 先行リリースブループリント

1 ファイルにこれだけの論点が並走していると、特定の論点に着手しようとした際に「他の論点を読み飛ばす」認知負荷が毎回発生する。Claude Code がセッション開始時にファイルを読み込む際にも、不要な論点まで含む全文を消費してしまう。

同様の肥大化は `pack-design.md`（問題パック設計）や `service-blueprint.md`（サービスブループリント）でも進行していたが、これらは単一の設計ドメインを扱っているため分割の必要性が低かった。`content-design.md` は複数の独立した設計ドメインが1ファイルに混在していた点で特殊だった。

## やり取りの中身

### 分割の中身

| 旧ファイル（単一） | 新ファイル | 役割 |
|---|---|---|
| content-design.md | content-design.md（索引） | 索引・進捗マップ・直近セッションログ |
| — | content-design-pillars.md | Pillar 3 本・H2 構成・引用論文マッピング |
| — | content-design-clusters.md | 全 Cluster 本数振り分け・GTM 4 段階配分 |
| — | content-design-urls.md | URL 命名規則・全スラッグ・タグ・内部リンク |
| — | content-design-faq-ops.md | FAQ 運用設計（C+案：長短ハイブリッド型） |

### 命名規則の設計思想

`content-design-{topic}.md` というパターンを採用した。`{topic}` の部分に `pillars` / `clusters` / `urls` / `faq-ops` という語彙を置くことで、ファイル名だけで「どのドメインを扱うファイルか」が視覚的に把握できる。

索引ファイル（content-design.md）を残すことで、全体の俯瞰入口が保たれる。「何がどこにあるか」は索引で確認し、「特定論点の詳細」は各分割ファイルに直接アクセスする。フォルダだけにすると俯瞰する入口がなくなるため、索引ファイルの維持は必須だった。

### launch-plan.md の top-level 昇格

元々 `content-design-prelaunch.md` として content-design 配下に置いていたファイルは、実態が「B-2 コンテンツ設計の一部」ではなく「アプリリリース〜本リリース全体の計画」だったため、docs/ 直下の top-level ファイルに昇格した。

昇格と同時に 3 ファイルへ分割した。

| ファイル | 内容 |
|---|---|
| launch-plan.md | 索引・目的・成功定義・4 フェーズ概要 |
| launch-plan-monitor.md | TENZU 先行モニター制度の詳細設計 |
| launch-plan-phases.md | Phase 0/1/2/3 各詳細・KPI・DM 構造 |

### docs/ ディレクトリ整理と README スリム化

同セッションで docs/gtm/ ディレクトリも整理した。`gtm/execution.md` と `gtm/measurement.md` を `docs/gtm-execution.md` / `docs/gtm-measurement.md` として docs/ 直下に移動し、`gtm/` ディレクトリを削除した。`gtm/README.md` は `docs/README.md` と重複していたため削除。

`docs/README.md` は「主要な設計判断」セクションが 30 項目近くまで肥大化していたため、横断的に重要な Tier1（6 項目）のみ README に残し、Tier2 は `design-decisions.md` に集約した。

## なぜそう判断したか

1 ファイル肥大化は二種類のコストを生む。一つは「全体読み込み負荷」で、特定論点の確認のために全文を読む必要が生じる。もう一つは「検索精度低下」で、特定のキーワードで検索したときに無関係な論点のテキストがヒットし、目的の情報にたどり着くのが遅くなる。

責任分離（1 ファイル 1 トピック）が成立すると、Claude は「今このファイルだけ読めば判断できる」状態になる。これはトークン消費の節約でもあり、設計の精度向上でもある。

過剰分割のリスクも認識していた。細かく分割しすぎると「どのファイルに何が書いてあるか」が追いにくくなる。索引ファイルを残すことで、この問題を回避した。分割の粒度として「論点の独立性が見えたタイミング」を基準にした。今回の場合、Pillar・Cluster・URL・FAQ がそれぞれ独立した設計ドメインを持っていたことが分割の根拠だった。

## 学び（一般化できるノウハウ）

1. **設計書は「論点の独立性」が見えたタイミングで分割する** — 「論点 A を変更しても論点 B に影響しない」という独立性が確認できたら分割のサイン。並走論点が 3 つ以上になったら検討を始める。

2. **索引ファイル＋分割ファイルの 2 階層が安定** — フォルダだけにすると俯瞰の入口がなくなる。索引ファイルを残すことで「全体地図」と「詳細図」の 2 レイヤーが維持される。

3. **トップレベル昇格の判断基準** — ファイルの実態が親ディレクトリの守備範囲を超えたときが昇格のタイミング。content-design-prelaunch.md がコンテンツ設計の一部として収まらず、リリース全体計画になっていたことが昇格の根拠だった。

## 関連エピソード

- [EP-006](EP-006-memory-archive-split.md) — memory 側の同型分割パターン
- [EP-010](EP-010-design-decisions-tier-split.md) — README から Tier2 を分離した別事例
- [EP-013](EP-013-prelaunch-pivot.md) — launch-plan.md 昇格の文脈
