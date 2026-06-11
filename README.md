# TENZU 設計書インデックス

## サマリ

- **サービス名**: 点図形（点描写）プリント専門店 TENZU
- **MISSION**: 点図形（点描写）の実践を通して、図形力が得意な子を増やす
- **ブランド短期定義**: 「TENZU は、図形が苦手になる前にも、つまずいた後にも使える点図形（点描写）専門店。9タスク × 5レベル × Vol細刻みで、見る・写す・回す・重ねる力を、戻れるところから育てます」
- **差別化キーフレーズ**: 戻れる／ピンポイント／解像度
- **提供物**: レベル別 PDF パック（¥200一律）＋**おためし点描写メーカー**（無料 Web ジェネレータ・Phase 1 仕込みで投入・[foundation/brand.md §11.3.1](foundation/brand.md)）
- **技術スタック**: Next.js / AWS Amplify / Stripe / MailerLite
- **フェーズ構成**: **3 フェーズ（Phase 1 仕込み / Phase 2 先行リリース[M2a+M2b] / Phase 3 本リリース）**＋春 LP 絶対時刻トラック（2026-05-28 統合・[decisions.md §3.41](decisions.md)）
- **設計書構造**: Foundation Tier 0 ＋ 7領域（M/A/P/C/D/E/L）。ブランド定義・MISSION 等は [foundation/brand.md](foundation/brand.md) を SSOT とする
- 設計書の書き方ルールは [CLAUDE.md](CLAUDE.md) の5原則を参照

## 領域索引

### Tier 0 — 全領域が参照する基盤

| 領域 | 内容 | 索引 |
|---|---|---|
| **F: foundation/** | ブランド・MISSION・原則・表記階層化・Voice NG/OK | [foundation/README.md](foundation/README.md) |

### Step 階層（F→M→A→P→C／D→E→L の順で派生）

| 領域 | 内容 | 索引 |
|---|---|---|
| **M: market/** | 市場分析・ターゲット・ポジショニング・競合 | [market/README.md](market/README.md) |
| **A: acquisition/** | 認知獲得（DM・インフル・記事ハブ・広告）・CV 導線（レベル選びガイド・LP・クーポン）・モニター公募 | [acquisition/README.md](acquisition/README.md) |
| **P: product/** | 9タスク・5Lv・Vol・SKU・価格・サービス BP | [product/README.md](product/README.md) |
| **C: content/** | ピラー・クラスター・記事・FAQ・ペルソナ | [content/README.md](content/README.md) |
| **D: design/** | ロゴ・Design System・サイト UI・ビジュアル実装 | [design/README.md](design/README.md) |
| **E: engineering/** | Next.js・Amplify・Stripe・MailerLite・計測基盤 | [engineering/README.md](engineering/README.md) |
| **L: launch/** | フェーズ管理・モニター・計測・ローンチ運用 | [launch/README.md](launch/README.md) |

## ルート直下（横断）

| ファイル | 内容 |
|---|---|
| [decisions.md](decisions.md) | 横断的な設計判断ログ（Tier 1・最重要） |
| [CLAUDE.md](CLAUDE.md) | プロジェクト指示・設計書5原則 |

## アーカイブ・ドラフト

| ディレクトリ | 内容 |
|---|---|
| [archive/](archive/README.md) | 撤回設計・撤回構造・セッション履歴 |
| [drafts/](drafts/README.md) | 記事ドラフト・参照マップ |
