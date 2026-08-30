# launch/ — フェーズ・モニター・計測

## このディレクトリの責務

TENZU のローンチ運用全般。**単一ローンチ＋宣伝2段化（T=0=2026-08-30 開店 → 静かな開店期 → 本格化 → 春スパイク期・[decisions.md §3.76](../decisions.md)）** の管理、公開後モニター制度、KPI 計測、ローンチ運用手順。

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [plan.md](plan.md) | リリース戦略全体・**期定義の SSOT**・開店ゲート・本格化 Go トリガー・宣伝2段化の原則 |
| [phases.md](phases.md) | 期別詳細（準備期／静かな開店期／本格化／春スパイク期・公開物・施策・DM 運用・KPI） |
| [monitor.md](monitor.md) | TENZU モニター制度（公開後モニター・声かけ・提供・謝礼） |
| [measurement.md](measurement.md) | 6ヶ月 KPI 計画（3シナリオ・T=0=8/30 起点）・計測ツール・判断基準 |
| [operations.md](operations.md) | ソロ運転計画（週3ブロック制・チャネル優先順位・縮退設計・ツール整備ロードマップ） |
| [ops-log.md](ops-log.md) | 週次運転ログ（追記専用・`/weekly-ops` skill が記帳・Notion 運転席と同内容） |

## 運転面（Notion）との分担

設計書は「決めたこと」、Notion 🗓️ 運転席は「動いているもの」（TODO の ✓・週次の数値・関門の進捗）を持つ。**オーナーは転記しない**——両方へ書くのは Claude。分担の詳細は [operations.md §9](operations.md)、判断は [decisions.md §5.20](../decisions.md)。

## 読む順序

1. **plan.md** で全体像と期定義をつかむ
2. **phases.md** で各期の施策詳細を確認
3. **monitor.md** で公開後モニター制度の運用ルール
4. **measurement.md** で KPI と判断基準

## 関連

- 集客チャネル詳細 → [../acquisition/channels.md](../acquisition/channels.md)
- CV 導線詳細 → [../acquisition/funnel.md](../acquisition/funnel.md)
- 競合分析 → [../market/competitive.md](../market/competitive.md)
- 配布フロー実装 → [../product/service-blueprint.md](../product/service-blueprint.md)
