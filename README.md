# TENZU 設計書インデックス

## サマリ

- **サービス名**: 点図形（点描写）プリント専門店 TENZU
- **ブランディングコンセプト**: 考えながら書く力を育てる、点図形（点描写）プリント専門店（全施策の判断軸・[foundation/brand.md §0](foundation/brand.md)）
- **MISSION**: 点描写を家庭の当たり前にして、空間認知の土台を持つ子を増やす
- **Tagline**: コア「見て、考えて、書く力を、点描写から。」＋サブ＋業態識別句の3段セット（[foundation/brand.md §12](foundation/brand.md)）
- **クリティカルコア**: 設計図ごと、全部公開する（メタデータ・レベル根拠・サンプル閲覧・一次エビデンス開示・[foundation/brand.md §0.5](foundation/brand.md)）
- **主戦場**: 就学前後（年長〜小1前半・年長中心）の知育意識のある親層（[market/targeting.md](market/targeting.md)）
- **提供物**: レベル別 PDF パック（¥200一律・主役）＋**点描写メーカー**（クロスセル商材・per-maker 買い切り ¥980／模写は無料・有料ゲート＝PDF 書き出し・[foundation/brand.md §11.3.1](foundation/brand.md)）
- **技術スタック**: Next.js / AWS Amplify / Stripe / MailerLite
- **リリース体系**: **単一ローンチ＋宣伝2段化（T=0=2026-08-30 開店 → 静かな開店期 → 12月第1週 本格化 → 春スパイク期）**＋春 LP 絶対時刻トラック（2026-07-11・[decisions.md §3.76](decisions.md)）
- **設計書構造**: Foundation Tier 0 ＋ 7領域（M/A/P/C/D/E/L）。ブランド定義・MISSION 等は [foundation/brand.md](foundation/brand.md) を SSOT とする
- Claude / Codex の共同作業ルールは [AGENTS.md](AGENTS.md)、設計書の書き方ルールは [CLAUDE.md](CLAUDE.md) の5原則を参照

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
| [AGENTS.md](AGENTS.md) | Claude / Codex 共同作業ルール（作業場所・競合回避・Git・公開） |
| [decisions.md](decisions.md) | 横断的な設計判断ログ（Tier 1・最重要） |
| [CLAUDE.md](CLAUDE.md) | プロジェクト指示・設計書5原則 |

## アーカイブ・ドラフト

| ディレクトリ | 内容 |
|---|---|
| [archive/](archive/README.md) | 撤回設計・撤回構造・セッション履歴 |
| [drafts/](drafts/README.md) | 記事ドラフト・参照マップ |
