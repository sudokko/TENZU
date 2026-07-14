> ⚠️ **退避済み（2026-07-11）**: Phase 1/2/3 の3フェーズ構成・先行モニター事前公募は [decisions.md §3.76](../../decisions.md) で「2026-08-30 単一開店＋宣伝2段化（静かな開店→本格化）」体系に置換された。現行 SSOT は launch/plan.md・launch/phases.md・launch/monitor.md を参照。

# TENZU リリース戦略

## サマリ

- **3 フェーズ構成（Phase 1/2/3・合計 11-14 週間 ≒ 2.5-3.5 ヶ月）**（2026-05-28 統合・[decisions.md §3.41](../decisions.md)）
- 主目的=集客／副目的=ブラッシュアップ／**非目的=売上**（先行期はゼロでOK）
- **Phase 1（仕込み・1-2 週）**: おためし点描写メーカー＋P1 正規ハブ＋サンプル PDF 先置き／DM 1 通目開始／広告 ¥10,000 検証（[brand.md §11.3.1](../foundation/brand.md)）
- **Phase 2（先行リリース・10 週）**: 内部マイルストーン M2a 前半 6 週（サイト本体＋ SKU 通常販売＋モニター募集／C3-1 公開）／M2b 後半 4 週（フィードバック反映＋ P4 主力＋ FAQ）
- **Phase 3（本リリース・13 週〜）**: 全 SKU 公開＋ DM 3 通目（クーポン）＋規模化広告＋受動拾い LP
- **対外 2 段階呼称**: 先行リリース＝ Phase 1+2 ／ 本リリース＝ Phase 3。設計書内部表記と対外表記が一致
- 記事構造: **4 Pillar ＋ 18 Cluster ＋ 3 FAQ = 25 本**（[clusters.md](../content/clusters.md)）
- **記事カウント外 LP**: 受動拾い専用 LP「図形に、戻り道を。」（Phase 3）／**春 LP「入学準備ドリル」（絶対時刻トラック・毎年 1 月公開）**（[../acquisition/funnel.md §10](../acquisition/funnel.md)）
- 経路分離: インフル DM 経路と先行モニター経路は完全独立
- **DM 3 通構造**（[channels.md §3](../acquisition/channels.md) SSOT）: 1 通目記事ハブ誘導（Phase 1 開始）／2 通目即時お礼（Phase 2 内紹介発生時）／3 通目本リリース＋クーポン（Phase 3）
- 先行モニター: 10 名前後・全 SKU 無償フルアクセス・LP 公募中心
- クーポンは Phase 3 のみ（Stripe Promotion Code・1 SKU 100% OFF）
- **死の谷対策 4 戦術**（[decisions.md §3.32](../decisions.md)）を Phase 別に配置
- 詳細は [phases.md](phases.md)（フェーズ別公開物）／[monitor.md](monitor.md)（モニター制度）

## 詳細

### §1. 目的・成功定義

#### 1.1 主目的・副目的・非目的

| 区分 | 内容 |
|---|---|
| **主目的** | 集客＝P3 ブルーオーシャン（見取り図 描き方 140/月競合性 0）と P4 指名比較系（合算 710/月）でカテゴリ資産を先置き。LLM 引用と SEO 評価の土台を作る |
| **副目的1** | サイト UX・F2 主導線・レベル選びガイドのブラッシュアップ |
| **副目的2** | ニーズ把握。どのセグメント／タスク／レベルが刺さるか定性データで掴む |
| **非目的** | 先行期間で売上を作ること。極論ゼロでよい |
| **歓迎するもの** | 濃いコミュニケーション・直接フィードバック・継続的な関係構築 |
| **避けるもの** | 投稿依頼の押し付け・販売を前面に出す訴求 |

#### 1.2 成功の定量定義

| 観点 | 最低ライン | 推奨ライン |
|---|---|---|
| 先行モニター獲得 | 5 名 | 10 名以上 |
| フィードバック回収率 | 60% | 80%以上 |
| 改善反映件数 | 5 件以上 | 10 件以上 |
| インフル／ブロガー言及 | 2 件 | 5 件以上 |
| Web ジェネレータ累計利用 | 200 回 | 500 回以上 |
| レベル選びガイド完了 | 100 回 | 300 回以上 |
| メール／LINE 登録 | 30 件 | 100 件以上 |
| Stripe・DL フロー検証 | エラー 0 件 | エラー 0 件＋全パターン確認済 |

#### 1.3 中断条件（NoGo 判定）

- 先行モニター 3 名未満で募集が止まる
- Web ジェネレータまたはサイトの致命的バグ多発・修正不能
- フィードバックが「コンセプト自体への否定」に集中

---

### §2. 3 フェーズ構成（Phase 定義の一次ソース）

#### 2.1 全体タイムライン

```
T-3M ──────────────────────────────────── T=0（本リリース）
│              │                          │
Phase 1        Phase 2（先行リリース）    Phase 3
1-2 週         M2a 6 週 ＋ M2b 4 週       13 週〜
仕込み         サイト本体＋モニター→修正  本リリース
App＋P1                                   規模化
```

合計 **11-14 週間（2.5-3.5 ヶ月）**。春 LP は絶対時刻トラックとして独立扱い。

#### 2.2 各フェーズの位置付け

| Phase | 期間 | 主目的 | 公開物（概要） | 終了条件 |
|---|---|---|---|---|
| **Phase 1**（仕込み） | 1-2 週 | Web ジェネレータ＋P1 正規ハブ＋サンプル PDF 先置き／DM 1 通目開始／広告 ¥10,000 ピクセル学習 | おためし点描写メーカー／P1／サンプル PDF 1 本／OAI-SearchBot 許可＋ HowTo Schema | Web ジェネレータ累計 50 回＋実反応 3 名以上＋ HowTo Schema 実装完了 |
| **Phase 2**（先行リリース） | 10 週（M2a 6 週＋M2b 4 週） | サイト本体＋全 140 SKU 通常販売＋先行モニターによるブラッシュアップ＋ P4 主力投入 | M2a: Pillar 残り 3 本／C3-1 ブルーオーシャン／P1 配下 5 本＋ P3 配下 4 本／レベル選びガイド／M2b: P4 配下 6 本＋ FAQ 3 本＋ C3-4 学術エビデンス | M2b 終了時に致命的対応 100%＋再評価過半数合意（= Phase 3 GO 判断） |
| **Phase 3**（本リリース） | 13 週〜 | 本リリース＋ DM 3 通目（クーポン）＋規模化 | P2 配下 2 本／受動拾い LP「図形に、戻り道を。」／`/faq/` 集約／PR TIMES | 継続運用フェーズへ |
| **絶対時刻トラック** | 毎年 1 月 | 春 LP「入学準備ドリル」公開・2-4 月最大化 | **記事カウント外 LP**・C1-5 と相互リンク | T=0 タイミングで Phase 配置変化（§2.4） |

詳細は [phases.md](phases.md)。

#### 2.3 対外 2 段階呼称

設計書内部の Phase 表記と対外呼称が一致するよう、対外コミュニケーションは 2 段階で表現する。

| 対外呼称 | Phase 対応 |
|---|---|
| ① 先行リリース | Phase 1 ＋ Phase 2（M2a / M2b） |
| ② 本リリース | Phase 3 |

旧体系（〜2026-05-27）の「3 段階呼称（Phase 0+1+2 を先行リリース／ Phase 3 を本リリース）」と内部 4 Phase の二重帳簿は本統合で解消。

#### 2.4 春 LP の絶対時刻トラック運用

春 LP「入学準備ドリル」（[../acquisition/funnel.md §10](../acquisition/funnel.md)）は **毎年 1 月公開・2-4 月最大化**の絶対時刻ベース運用。Phase 軸（相対時刻）とは直交するため独立トラックとして扱う。T=0 タイミングで Phase 配置が変化する：

| T=0 タイミング | 春 LP 仕込み |
|---|---|
| T=0 が 1-3 月 | Phase 1 〜 Phase 2 M2a で並走仕込み（前年 10-11 月から）・本リリース直後の主要 LP として運用 |
| T=0 が 4-9 月 | Phase 3 内のマイルストーンとして翌年 1 月公開を設定（初年度はスキップ） |
| T=0 が 10-12 月 | Phase 3 内で 1-2 ヶ月仕込み・1 月初公開 |

詳細運用は [phases.md §6](phases.md) で T=0 確定時に判断。

---

### §3. 経路分離の原則

インフル DM 経路と先行モニター経路は完全独立。

| 経路 | 目的 | 終着点 |
|---|---|---|
| インフル DM | 認知拡大・読者経由流入 | Phase 3 で読者用クーポン配布（DM 3 通目） |
| 先行モニター | サイト UX・レベル選びガイド・Web ジェネレータのブラッシュアップ | Phase 3 で TENZU 開店記念ギフト |

DM 構造の詳細は [channels.md §3](../acquisition/channels.md)。DM 通番（1/2/3 通目）と Phase 番号（1/2/3）は独立した体系なので混同しないこと。

---

### §4. 先行モニター制度（要約）

| 項目 | 値 |
|---|---|
| 呼称 | TENZU 先行モニター |
| 規模 | 10 名前後（最低 5 名・上限 20 名） |
| 募集 | Phase 2 M2a 開始時から開始。第 1 優先：LP 公募／第 2 優先：DM 経由／第 3 優先：X / note / LINE 公募 |
| 提供 | 全 SKU 無償フルアクセス＋Web ジェネレータ無制限利用＋直接連絡チャネル |
| 期待 | フィードバック必須（Google Form / LINE アンケート＋直接やりとり） |
| 投稿 | 任意（ステマ規制対応で提供品である旨の明示前提） |
| 謝礼 | 本リリース時に「TENZU 開店記念ギフト」（新規 SKU 5 本程度の無償継続提供） |

詳細は [monitor.md](monitor.md)。

---

### §5. 死の谷対策の Phase 別配置

初期 3 か月のトラフィック獲得難（[decisions.md §3.32](../decisions.md)）に対する 4 戦術（Pinterest 撤回後）。

| 対策 | 投入 Phase |
|---|---|
| 1. 正規カテゴリ資産先置き（4 Pillar＋18 Cluster＋3 FAQ） | Phase 1 〜 Phase 2 M2b で段階先置き |
| 2. OAI-SearchBot 許可＋構造化データ（HowTo / FAQPage Schema） | Phase 1（実装）／Phase 2 で全記事適用 |
| 3. ブルーオーシャン一点突破（見取り図 描き方 140/月競合性 0） | **Phase 2 M2a 最優先** |
| 4. 学術エビデンス近接配置（C3-4・[evidence.md](../content/evidence.md) SSOT） | Phase 2 M2a 〜 M2b |

**撤回**: 旧対策 3「Pinterest 視覚検索」は [decisions.md §3.33](../decisions.md)（2026-05-23 後半）で撤回（[channels.md §6 不採用](../acquisition/channels.md)を優先）。

実装詳細は [engineering/](../engineering/) で別途定義（Phase 1 着手時）。

---

## 附録

- 変遷:
  - 旧 4 フェーズ（2026-05-08）→ 3 フェーズ Phase 0 廃止（2026-05-20 案 F）→ 4 フェーズ Phase 0 復活（2026-05-22 案 H''）→ **3 フェーズ統合・Phase 1+2 を新 Phase 2 に束ね M2a/M2b マイルストーン化（2026-05-28・[decisions.md §3.41](../decisions.md)）**
  - 旧 4 フェーズ版 plan.md: [archive/retired-designs/2026-05-28-launch-plan-old-4phases.md](../archive/retired-designs/2026-05-28-launch-plan-old-4phases.md)
  - 旧 plan.md（案 F・Phase 0 廃止・DM 4 通）: [archive/retired-designs/2026-05-22-launch-plan-old-anf.md](../archive/retired-designs/2026-05-22-launch-plan-old-anf.md)
- 関連設計書: [phases.md](phases.md)／[monitor.md](monitor.md)／[measurement.md](measurement.md)／[../acquisition/channels.md](../acquisition/channels.md)／[../acquisition/funnel.md](../acquisition/funnel.md)／[../acquisition/ads.md](../acquisition/ads.md)／[../product/pack-design.md](../product/pack-design.md)
