# content/ — コンテンツ設計

## サマリ

- TENZU の記事コンテンツ（Pillar / Cluster / FAQ / LLMO）を扱う設計領域
- **大原則（2026-06-03・[clusters.md §1.5](clusters.md)／受け皿改定 2026-06-08 [decisions.md §5.6](../decisions.md)）**: 記事は**情報意図のクエリだけ**を拾う。取引意図（プリント／無料／簡単／難しい／立体／年齢）は記事化せず**専用ファセットLP・商品タグ・カテゴリページ**へ（**メーカーは受け皿から除外**＝取引LPは有償一本／無料意図は無料LPの絵柄サンプル・仕様 [pack-design.md §25.6](../product/pack-design.md)）
- これにより**実際に書く記事は 16 ページ**: 正規ハブ P1 ＋ 確定 8 記事 ＋ 学術土台 C3-4 ＋ LLMO 2 ＋ FAQ 3。降格・削除は [clusters.md](clusters.md) 各表の「種別」参照
- 構造: **正規ハブ P1 ＋ 用途ハブ P2/P3/P4/P5**（5 Pillar）。Pillar 構造 SSOT は [decisions.md §3.32](../decisions.md)、本縮減は [decisions.md §3.42](../decisions.md)
- **執筆の役割分担**: 構成・目次＝AI 提案→**オーナー確定**（[structure-craft.md](structure-craft.md)）／本文化＝AI（[writing-craft.md](writing-craft.md)）／リード・TLDR＝AI 下書き→オーナー仕上げ（[decisions.md §3.49](../decisions.md)）
- 主要 IA: 3 階層フラット URL（全記事 `/{slug}/`）
- **ペルソナ SSOT は [personas.md](personas.md)**
- 旧ドラフトは `archive/retired-drafts/` 退避済（人格刷新前提で再利用）
- 詳細な分割は下表

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [article-writing-kit.md](article-writing-kit.md) | **記事執筆の入口索引**（ブラウザ起動用・出力先3分岐 tenzu/note/ameba・執筆キット12ファイルとパイプラインへの誘導） |
| [quick-reference.md](quick-reference.md) | **執筆クイックリファレンス（非SSOT）**（セッション立ち上げ高速化用の1枚チートシート・NG/OK置換・ペルソナ早見・フロントマター雛形） |
| [personas.md](personas.md) | **ペルソナ P0-P7 の SSOT**（読者ペルソナ・ターゲット層・キャラクター属性） |
| [pillars.md](pillars.md) | Pillar 5本（P1-P5）の H2構成・引用論文マッピング・共通運用ルール |
| [clusters.md](clusters.md) | **記事/非記事の振り分け原則（§1.5）**・確定 16 ページの種別表・降格/削除判断・内部リンク・GTM 配分 |
| [urls.md](urls.md) | URL命名規則・パンくず・タグ・内部リンクルール・記事スラッグ一覧 |
| [faq.md](faq.md) | FAQ 運用設計（C+案・長短ハイブリッド）・MDXフロントマター・段階別公開計画 |
| [templates.md](templates.md) | MDX フロントマター標準・11セクションテンプレ・3 フェーズ CTA（2026-05-28 統合）・ガードレール |
| [structure-craft.md](structure-craft.md) | **構成・目次提案 craft の SSOT**（dump 入力フォーマット・提案の境界線・構成設計技術・オーナー確定フロー） |
| [writing-craft.md](writing-craft.md) | **本文化 craft の SSOT**（構成メモ入力フォーマット・膨らませの境界線・文章術・リード/TLDR 作法） |
| [revision-craft.md](revision-craft.md) | **推敲 craft の SSOT**（推敲の境界線＝表現レベルのみ・推敲手順・変更点リスト形式） |
| [external-output.md](external-output.md) | **note/アメブロ整形規約の SSOT**（貼付用テキスト生成・ネイティブ要素翻訳・画像/alt・`/article-export` が参照） |
| [research.md](research.md) | B-2 リサーチ Phase 0（**本ファイル独自のリサーチフェーズ名・ローンチ Phase とは別概念**）・著者/読者ペルソナ・Voice・KW 候補・競合トピック構造 |
| [references-map.md](references-map.md) | 5系譜文献マップ・引用論文の正確な帰属・教育系メディアソース |

## 読む順序

1. **personas.md** でペルソナ定義をつかむ
2. **pillars.md** で 5 本柱の H2 構成と引用論文マッピングを見る
3. **clusters.md** で §1.5 振り分け原則と確定 16 ページの種別を確認
4. 個別記事の URL・スラッグ → **urls.md**
5. 構成・目次の組み立て方 → **structure-craft.md**
6. 本文化の書き方 → **writing-craft.md**
7. 推敲のやり方 → **revision-craft.md**
8. 運用ルール（フロントマター・CTA・ガードレール） → **templates.md**
9. FAQ 設計 → **faq.md**

## 重要な状態

**記事リスト確定（2026-06-03）**: 検索意図ベースで記事を 16 ページに縮減（[clusters.md §1.5](clusters.md)・[decisions.md §3.42](../decisions.md)）。取引意図クエリは専用ファセットLP・商品タグ/カテゴリ側（メーカー除外・[pack-design.md §25.6](../product/pack-design.md)・[decisions.md §5.6](../decisions.md)）。執筆は確定 8 記事＋P1 から着手可能。

## 附録

- 変遷: 直近の主要セッション履歴 → [../archive/sessions/](../archive/README.md)
