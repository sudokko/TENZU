# 旧構造スナップショット：F/M/P/C/D/E/L 再編前（2026-05-21）

## 撤回内容

旧 A/B/C/D 4領域構造 → F/M/P/C/D/E/L 7領域 + Foundation Tier 0 へ再編。「B ってなんだっけ」問題の根絶と、SSOT 原則（brand-brief.md 散在）の回復が目的。

## ロードマップ対応表

| 旧 | 新 |
|---|---|
| A: GTM | M: Market（M-2 GTM 戦略） |
| B-0: 競合分析 | M-1 競合分析 |
| B-1: 問題パック設計 | P-1〜P-3（9タスク・5Lv・Vol） |
| B-2: コンテンツ設計本設計 | C-1〜C-5（ペルソナ・ピラー・クラスター・URL・テンプレ） |
| B-3: 執筆 | C-6〜C-8（記事選定・執筆・レビュー） |
| C-3: サービスブループリント | P-6 |
| D0: ロゴ | D-1 |
| D1: Design System | D-2 |
| D2: サイト全体デザイン | D-3 |
| D3: アプリ デザイン | D-4（ポスト・ローンチ） |
| D4: Design Tokens | D-5 |
| D5: アプリ プロト | D-6（ポスト・ローンチ） |
| D6: 本実装 | E-1〜E-5（Next.js / Amplify / Stripe / MailerLite / 計測） |
| （Launch は領域なし） | L-1〜L-4 を独立領域化 |
| （Foundation は領域なし） | F-1〜F-6 を Tier 0 として独立 |

## ディレクトリ対応表

| 旧 | 新 |
|---|---|
| `strategy/` | `market/`（一部）＋ `launch/`（フェーズ・モニター・計測系） |
| `strategy/phases.md` | `launch/phases.md` |
| `strategy/monitor.md` | `launch/monitor.md` |
| `strategy/gtm-measurement.md` | `launch/measurement.md` |
| `strategy/launch-plan.md` | `launch/plan.md` |
| `strategy/gtm.md` | `market/gtm.md` |
| `strategy/competitive.md` | `market/competitive.md` |
| `design/brand-brief.md`（一枚運用） | `foundation/brand.md`（哲学・原則）＋ `design/visual-identity.md`（ビジュアル実装ルール） |
| （存在せず） | `foundation/`（新設） |
| （存在せず） | `engineering/`（新設・Phase 1 実装で肉付け） |
| （存在せず） | `launch/`（新設） |

## 撤回理由

1. **「B ってなんだっけ」問題**: A/B/C/D 表記が意味不明瞭で、毎回 README 索引を引き直していた
2. **brand-brief.md の哲学的歪み**: ブランド定義が design/ にあるのは情報設計上不自然。design は brand の派生物
3. **SSOT 原則違反**: MISSION が README/CLAUDE/brand-brief/MEMORY に分散
4. **Launch/Engineering の領域化漏れ**: phases/monitor/measurement が strategy/ に埋没

## 関連

- 後継構造の SSOT：[../../README.md](../../README.md)（領域索引）
- 設計5原則：[../../CLAUDE.md](../../CLAUDE.md)
