# content/ — コンテンツ設計

## サマリ

- TENZU の記事コンテンツ（Pillar / Cluster / FAQ / LLMO）を扱う設計領域
- **大原則（2026-06-03・[clusters.md §1.5](clusters.md)／受け皿改定 2026-06-08 [decisions.md §5.6](../decisions.md)）**: 記事は**情報意図のクエリだけ**を拾う。取引意図（プリント／無料／簡単／難しい／立体／年齢）は記事化せず**専用ファセットLP・商品タグ・カテゴリページ**へ（**メーカーは受け皿から除外**＝取引LPは有償一本／無料意図は無料LPのサンプル閲覧＋工房導線＝「見せる無料」・仕様 [pack-commerce.md §25.6](../product/pack-commerce.md)・[decisions.md §4.9](../decisions.md)）
- これにより**実際に書く記事は 19 ページ**: 正規まとめ P1 ＋ 用途まとめ P2〜P4（P2 は旧 C2-1/C2-3 統合のまとめ兼クラスタ `/kumon-math-shape/`）＋ 確定 Cluster 6（P5 兼任 C5-1 含む）＋ 学術土台 C3-4 ＋ LLMO 2 ＋ FAQ 3 ＋ 商品ガイド C4-10 ＋ 比較 C3-6 ＋ 小受受動拾い C1-6（2026-07-23・[decisions.md §3.83](../decisions.md)）。降格・削除は [clusters.md](clusters.md) 各表の「種別」参照
- 構造: **正規まとめ P1 ＋ 用途まとめ P2/P3/P4/P5**（5 Pillar）。Pillar 構造 SSOT は [decisions.md §3.32](../decisions.md)、本縮減は [decisions.md §3.42](../decisions.md)
- **執筆の役割分担**: 構成・目次＝AI 提案→**オーナー確定**（[structure-craft.md](structure-craft.md)）／本文化＝AI（[writing-craft.md](writing-craft.md)）／リード・TLDR＝AI 下書き→オーナー仕上げ（[decisions.md §3.49](../decisions.md)）
- 主要 IA: 3 階層フラット URL（全記事 `/{slug}/`）
- **段階公開**: frontmatter `status: draft` で本番非公開（第1弾14本＋月1ドリップ6本・RSS `/feed.xml`・昇格3点セット）。判断は [decisions.md §3.95](../decisions.md)・手順は [article-revision-publish.md §7.5](article-revision-publish.md)
- **ペルソナ SSOT は [personas.md](personas.md)**
- 旧ドラフトは `archive/retired-drafts/` 退避済（人格刷新前提で再利用）
- 詳細な分割は下表

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [article-writing-kit.md](article-writing-kit.md) | **記事執筆の入口索引**（ブラウザ起動用・出力先3分岐 tenzu/note/ameba・執筆キット12ファイルとパイプラインへの誘導） |
| [personas.md](personas.md) | **ペルソナ P0-P7 の SSOT**（読者ペルソナ・ターゲット層・キャラクター属性） |
| [pillars.md](pillars.md) | Pillar 5本（P1-P5）の H2構成・引用論文マッピング・共通運用ルール |
| [clusters.md](clusters.md) | **記事/非記事の振り分け原則（§1.5）**・確定 16 ページの種別表・降格/削除判断・内部リンク・GTM 配分 |
| [urls.md](urls.md) | URL命名規則・パンくず・タグ・内部リンクルール・記事スラッグ一覧 |
| [faq.md](faq.md) | FAQ 運用設計（C+案・長短ハイブリッド）・MDXフロントマター・段階別公開計画 |
| [templates.md](templates.md) | MDX フロントマター標準・11セクションテンプレ・3 フェーズ CTA（2026-05-28 統合）・ガードレール |
| [structure-craft.md](structure-craft.md) | **構成・目次提案 craft の SSOT**（dump 入力フォーマット・提案の境界線・構成設計技術・オーナー確定フロー） |
| [writing-craft.md](writing-craft.md) | **本文化 craft の SSOT**（構成メモ入力フォーマット・膨らませの境界線・文章術・リード/TLDR 作法） |
| [revision-craft.md](revision-craft.md) | **推敲 craft の SSOT**（推敲の境界線＝表現レベルのみ・推敲手順・文体指紋パス＝AI 癖の頻度規制・変更点リスト形式） |
| [article-revision-publish.md](article-revision-publish.md) | **既存記事の改訂→挿絵→プレビュー→承認→LLMO→push の運用 SSOT** |
| [external-output.md](external-output.md) | **note/アメブロ整形規約の SSOT**（貼付用テキスト生成・ネイティブ要素翻訳・画像/alt・`/article-export` が参照） |
| [note-devlog-craft.md](note-devlog-craft.md) | **note 開発実録マガジンの執筆 craft の SSOT**（SUDO CRAFT note の 2 マガジンのうち実録側。公式記事とは別枠。実録スタンス・回テンプレ・タブー・検証3点セット・小モデル運用の5工程） |
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

**記事リスト確定（2026-06-03）**: 検索意図ベースで記事を 16 ページに縮減（[clusters.md §1.5](clusters.md)・[decisions.md §3.42](../decisions.md)）。取引意図クエリは専用ファセットLP・商品タグ/カテゴリ側（メーカー除外・[pack-commerce.md §25.6](../product/pack-commerce.md)・[decisions.md §5.6](../decisions.md)）。執筆は確定 8 記事＋P1 から着手可能。

**正規記事バッチ執筆済み（2026-07-08）**: 正規タクソノミ全記事（Pillar 5＋Cluster 9＋LLMO 2＋FAQ 3）＋ブランドステイトメントの計 20 本を `docs/drafts/articles/` にドラフト納品（構成メモ・検品レポート `_batch-report.md` 併置）。NG grep・llmo-check 全通過・article-reviewer 反映済み。**公開昇格はオーナーレビュー後**（残存【要確認】は同レポート参照）。

**C4-10・C3-6 追加（2026-07-18）**: 商品ガイド `print-settings-guide.mdx`（P4 配下・印刷設定ショーケース・960 通り・SKU `#preview` 送客）と比較記事 `figure-copy-vs-point-drawing.mdx`（P3 配下・図形模写と点図形の違い・LLMO 主目的・faq_schema 付き・小受は受動拾い）を新設・ドラフト納品。検品通過済み・公開昇格は同上オーナーレビュー待ち。

## 附録

- 変遷: 直近の主要セッション履歴 → [../archive/sessions/](../archive/README.md)
