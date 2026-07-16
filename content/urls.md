# URL・パンくず・タグ・内部リンク・構造化データ

## サマリ

- **2026-06-03 検索意図振り分け反映（[clusters.md §1.5](clusters.md)）／2026-06-08 受け皿改定（[decisions.md §5.6](../decisions.md)）**: 記事スラッグは情報意図のクエリのみ。取引意図（プリント／無料／簡単／難しい／立体／年齢）は**専用ファセットLP（`/lp-*`）・商品タグ・カテゴリ**側の URL が受ける（**メーカーは受け皿から除外**＝取引LPは有償一本・無料意図は無料LPの絵柄サンプルが受ける）。`/lp-*`・`/products/...`・`/categories/...` 系の URL 設計は [engineering/](../engineering/) 管轄。本ファイルは**記事スラッグ**を定義
- 確定記事スラッグ: P1＋8 記事＋C3-4＋LLMO 2＋FAQ 3。降格分（C1-2〜C1-5/C4-3/C4-9）と削除（C4-4）は §3 各表の「種別」参照
- URL 階層: **3 階層フラット**（全記事 `/{slug}/`）
- 命名規則: ハイフン区切り・英小文字・KW を含む・5 語以内 40 文字以内目安
- 表記階層化「点図形（点描写）」は本文・タイトル側で適用。**URL スラッグは英語 kebab-case 維持**
- パンくず: トップ > 親 Pillar > 記事タイトル（仮想階層・3 階層フラット URL と独立）
- タグ: 3 軸（ペルソナ／タスク／症状・関心）／タグページは noindex
- 内部リンク: Pillar ↔ Cluster ↔ FAQ ↔ LLMO の 4 方向確保・1 記事 7 本以下
- **構造化データ**: Pillar に HowTo Schema・FAQ＋LLMO に FAQPage Schema 厳密実装（[decisions.md §3.32 死の谷対策 2](../decisions.md)）
- **OAI-SearchBot**: robots.txt 許可必須（[engineering/](../engineering/) で実装定義）
- Cluster 構成本体は [clusters.md](clusters.md)

## 詳細

### §1. 設計方針

| 項目 | 設計値 | 根拠 |
|---|---|---|
| URL 階層 | 3 階層フラット（全記事 `/{slug}/`） | 1 人事業の運用負荷最小化 |
| スラッグ言語 | 英語（日本語固有名詞のみ romaji） | SEO クロール強さ＋多言語化準備 |
| スラッグ形式 | kebab-case（lowercase + ハイフン） | 業界標準・URL 可読性 |
| スラッグ長 | 5 語以内・40 文字以内目安 | SERP 表示制約 |
| パンくず | URL 階層と独立した仮想階層で表示 | 3 階層フラットでも UI 上は階層感を出す |
| タグ | 3 軸（ペルソナ／タスク／症状・関心）・**noindex** | 内部回遊用・SEO 目的ではない |
| 内部リンク密度 | 1 記事 3〜7 本 | 過剰相互リンクは検索評価マイナス |

---

### §2. スラッグ命名規則

| カテゴリ | パターン | 例 |
|---|---|---|
| Pillar | `/point-drawing-{purpose}/` ／ `/from-{action}/` ／ `/next-after-{ref}/` ／ `/teaching-{topic}/` | `/point-drawing-guide/` ／ `/teaching-point-drawing/` |
| P1 配下 Cluster | `/point-drawing-{topic}/` | `/point-drawing-3d/` |
| P2 配下 Cluster | `/{ref}-shape-supplement/` ／ `/from-{prev}/` ／ `/{ref}-math-shape/` | `/kumon-shape-supplement/` |
| P3 配下 Cluster | `/{symptom}-{solution}/` ／ `/how-to-{action}/` | `/how-to-draw-isometric/` |
| P4 配下 Cluster | `/vs-{brand}/` ／ `/{brand}-support/` ／ `/{topic}-comparison/` ／ `/point-drawing-{effect-topic}/` ／ `/how-to-train-{ability}/` | `/vs-pygmalion/` ／ `/point-drawing-effects/` |
| P5 配下 Cluster | `/teaching-{topic}/`（P5 ハブ兼任） | `/teaching-point-drawing/` |
| FAQ | `/faq-{topic}/` | `/faq-commercial-use/` |
| LLMO 専用 | `/{topic}-complete-guide/` ／ `/{topic}-qa/` | `/point-drawing-complete-guide/` |
| 受動拾い LP | `/lp-{purpose}/`（noindex 候補） | `/lp-back-to-shapes/` |

#### 英語化・romaji の使い分け

- **英訳が自然 → 英語**: 「点描写」=`point-drawing`／「線対称」=`line-symmetry`／「商業利用」=`commercial-use`／「空間認知」=`spatial-awareness`
- **日本語固有名詞 → romaji**: 「予習シリーズ」=`yotsuya-yoshu-series`／「こぐま会」=`kogumakai`／「サイパー」=`saipa`／「究極の立体」=`kyukyoku-no-rittai`
- **海外通用ブランド → 英語**: 「サピックス」=`sapix`／「ピグマリオン」=`pygmalion`／「モンテッソーリ」=`montessori`

---

### §3. 全スラッグリスト（31 本）

#### 3.1 Pillar（5 本）

| # | 仮タイトル | スラッグ |
|---|---|---|
| **P1** 正規ハブ | 点図形（点描写）とは | `/point-drawing-guide/` |
| **P2** 用途ハブ | 公文の次に、家庭で図形を足す | `/next-after-kumon/` |
| **P3** 用途ハブ | 形を見て、写す力から | `/from-copying-shapes/` |
| **P4** 用途ハブ | 選び方と使い分け | `/how-to-choose-and-use/` |
| **P5** 用途ハブ | 点描写の教え方（親向け実践・C5-1 と同一記事） | `/teaching-point-drawing/` |

#### 3.2 P1 配下 — 全て非記事へ降格（2026-06-03）

記事スラッグは発行しない。下記は移譲先。

| # | 旧 KW | 旧スラッグ（廃止） | 種別・移譲先 |
|---|---|---|---|
| C1-2 | 点描写 始め方 | ~~`/point-drawing-getting-started/`~~ | メーカーオンボーディング＋P1 本文小節 |
| C1-3 | 点描写 レベル 選び方 | ~~`/point-drawing-level-guide/`~~ | 選びガイドUI（funnel） |
| C1-4 | 点描写 立体 | ~~`/point-drawing-3d/`~~ | 商品タグ「立体」＋カテゴリ |
| C1-5 | 年齢別入口 | ~~`/point-drawing-by-age/`~~ | 年齢別カテゴリLP（`/categories/by-age/` 系・engineering 管轄） |

**注**: 旧 C1-1（旧スラッグ `/point-drawing-effects/`）は P4 配下 **C4-1** へ移設（同スラッグ維持・URL 変更なし・SEO 資産そのまま継承）。

#### 3.3 P2 配下 Cluster（3 本）

| # | KW | スラッグ |
|---|---|---|
| C2-1 | 公文 図形 | `/kumon-shape-supplement/` |
| C2-2 | 点つなぎ 次（CEP 内部誘導） | `/from-dot-connecting/` |
| **C2-3** | **公文 算数 図形（新設）** | **`/kumon-math-shape/`** |

#### 3.4 P3 配下 Cluster（記事 4 本）

| # | KW | スラッグ | 種別 |
|---|---|---|---|
| **C3-1** | **見取り図 描き方（ブルーオーシャン）** | **`/how-to-draw-isometric/`** | 記事・最優先 |
| C3-2 | 図形 苦手 小学生＋**点描写 できない 50** | `/weak-at-shapes/` | 記事・格上げ（タイトル「点描写ができない・図形が苦手な子へ」） |
| C3-3 | 小4 算数 つまずき | `/grade-4-math-stuck/` | 記事 |
| C3-4 | 視覚空間 学び（学術背景） | `/visuospatial-and-learning/` | 記事・学術土台 |
| ~~C3-5~~ | ~~漢字 字形~~ | ~~`/kanji-form-recognition/`~~ | **L-2 へ統合**（VOL 0・独立記事化しない） |

#### 3.5 P4 配下（記事 2 本＋カテゴリLP／LP）

| # | KW | スラッグ | 種別 |
|---|---|---|---|
| **C4-1** | **点描写 効果 70（P4 旗艦・C1-1 から移設）** | **`/point-drawing-effects/`** | **記事・旗艦** |
| **C4-2** | **空間認識能力 鍛える 1,300（啓蒙ハブ）** | **`/how-to-train-spatial-recognition/`** | **記事・啓蒙ハブ** |
| C4-3 | 空間認知 プリント 320 | `/spatial-awareness-printables/` | **カテゴリLP**（記事でなく商品一覧＋上部ガイド・ItemList/Product Schema） |
| ~~C4-4~~ | ~~ピグマリオン 点描写 210~~ | ~~`/vs-pygmalion/`~~ | **削除（2026-06-03）** |
| C4-5 | 天才ドリル 点描写 70 | （`/vs-tensai-drill/` 保留） | 軽量 LP／L-1 統合 |
| C4-6 | サイパー 点描写 70 | （`/vs-saipa/` 保留） | 軽量 LP／L-1 統合 |
| C4-7 | こぐま会 点描写 40 | （`/vs-kogumakai/` 保留） | 軽量 LP／L-1 統合 |
| C4-8 | 究極の立体 140 | （`/kyukyoku-no-rittai-support/` 保留） | 軽量 LP／L-1 統合・立体は前面化しない |
| C4-9 | 小学生 図形 ドリル 90／図形 問題集 90 | `/shape-drill-comparison/` | **カテゴリLP（図形ドリル一覧）＋L-1** |

**スラッグ判断**: C4-2 は主軸「空間認識能力 9,900」と整合し `spatial-recognition`。`spatial-awareness-printables` は C4-3 **カテゴリLP** で使用（ブランド軸＝認知＝awareness）。C4-5〜C4-8 の `/vs-*/` は軽量 LP 化する場合のみ発行（記事スラッグとしては保留・サイトマップ掲載は控えめ）。

#### 3.6 P5 配下 Cluster（1 本・新設）

| # | KW | スラッグ |
|---|---|---|
| **C5-1** | **点描写 教え方 10** | **`/teaching-point-drawing/`**（P5 ハブと同一記事） |

#### 3.7 LLMO 専用記事（2 本・新設）

| # | カバー領域 | スラッグ |
|---|---|---|
| **L-1** | **P4 系ゼロ群集約（選び方完全ガイド）** | **`/point-drawing-complete-guide/`** |
| **L-2** | **J4 啓蒙系＋S-c 書字系ゼロ群集約（育て方 Q&A）** | **`/family-shape-spatial-qa/`** |

#### 3.8 FAQ 独立（3 本）

| # | KW | スラッグ |
|---|---|---|
| F-1 | 点描写 商業利用 | `/faq-commercial-use/` |
| F-2 | 点描写 ライセンス 教員 | `/faq-teacher-license/` |
| F-3 | 点描写 著作権 | `/faq-copyright/` |

#### 3.9 受動拾い LP（記事カウント外・参考）

| # | 用途 | スラッグ | 備考 |
|---|---|---|---|
| LP-1 | 中受対処層「図形に、戻り道を。」 | `/lp-back-to-shapes/` | 本体ナビ・サイトマップ非掲載／C3-3 から内部リンク |
| **LP-2** | **中受対処層「展開図 苦手」40（新設）** | **`/lp-net-of-solids/`** | 本体ナビ・サイトマップ非掲載／C3-1 から内部リンク／C3-3・LP-1 と相互リンク |

---

### §4. パンくず構造

3 階層フラット URL でも UI 上は仮想階層を表示。

| 記事タイプ | パンくず例 |
|---|---|
| P1 正規ハブ | ホーム > 点図形（点描写）とは |
| P1 配下 Cluster | ホーム > 点図形（点描写）とは > 立体の点描写 |
| P2 配下 Cluster | ホーム > 公文の次に > 公文の図形が手薄だと感じたら |
| P3 配下 Cluster | ホーム > 形を見て、写す力から > 見取り図の描き方 |
| P4 配下 Cluster | ホーム > 選び方と使い分け > 点描写で育つ「形の向き・位置・大きさをとらえる力」 |
| P5 配下 Cluster | ホーム > 親が子に寄り添う > 点描写の教え方 |
| LLMO 専用 | ホーム > 選び方ガイド／育て方 Q&A（FAQ ハブ隣接表示） |
| FAQ | ホーム > FAQ > 商業利用 |

各記事のフロントマターに `parent_pillar` を必須化（FAQ・LLMO のみ `parent_category: faq` または `parent_category: llmo`）。

---

### §5. タグ運用

#### 5.1 3 軸

| 軸 | タグ例 | 用途 |
|---|---|---|
| **ペルソナ** | `persona-kumon`（§5.1.a 公文家庭・代表例）／`persona-paper-pen`（§5.1.b 紙とペン重視）／`persona-shape-worry`（§5.1.c 図形・書字に不安）／`persona-cope`（受動拾い対処層）／`persona-teacher` | 内部回遊 |
| **タスク** | `task-mosha`／`task-line-symmetry`／`task-rotation`／`task-3d-mosha`／`task-overlay`／`task-translation`／`task-scaling`／`task-completion`／`task-decomposition` | タスク横断回遊 |
| **症状・関心** | `interest-getting-started`／`interest-3d`／`interest-kumon-supplement`／`interest-comparison`／`interest-juken`（受動拾い）／`interest-teaching`（親向け）／`interest-spatial-awareness`（啓蒙）／`symptom-board-copying`／`symptom-isometric` | 症状横断回遊 |

#### 5.2 ルール

- 1 記事 2-5 タグ
- タグページは `noindex`（重複コンテンツ回避）・サイトマップから除外
- 旧 P1-P5／P7 番号系タグは廃止（案 F 時代・[archive/](../archive/) 参照）

---

### §6. 内部リンクルール

| リンク種別 | 必須/推奨 | 本数 | 配置 |
|---|---|---|---|
| Pillar → 配下 Cluster 全本 | 必須 | 本文中 1 本ずつ＋末尾「次に読む」3-5 本 | CTA ブロック中心 |
| Cluster → 親 Pillar | 必須 | 1 本 | 冒頭 or 末尾 |
| Cluster → 同テーマ Cluster | 推奨 | 2-3 本 | 本文中 or 末尾 |
| LLMO → Pillar | 必須 | 1-2 本（L-1 → P4／L-2 → P3・P4） | 末尾 |
| 学術エビデンス参照 → [evidence.md](evidence.md) | 推奨 | 1 本 | 引用直近の脚注または末尾 |
| 総密度上限 | — | 1 記事 7 本以下 | 過剰リンクは検索評価マイナス |

---

### §7. 親 Pillar 判定マッピング

| Cluster 群 | 親 Pillar |
|---|---|
| C1-2 〜 C1-5 | P1 正規ハブ |
| C2-1 〜 C2-3 | P2 用途ハブ |
| C3-1 〜 C3-5 | P3 用途ハブ |
| C4-1 〜 C4-9 | P4 用途ハブ |
| C5-1 | P5 用途ハブ |
| L-1 ／ L-2 | なし（LLMO カテゴリ独立・FAQ ハブ隣接） |
| F-1 〜 F-3 | なし（FAQ カテゴリ独立） |
| LP-1 ／ LP-2 | なし（受動拾い専用・サイトマップ非掲載） |

---

### §8. 構造化データ・robots.txt

死の谷対策（[decisions.md §3.32](../decisions.md)）の実装側ルール。

- **Pillar 5 本**: HowTo Schema 実装（「点描写の始め方」「レベル選び方」「教え方」等の手順構造を機械可読化）
- **Cluster** C3-4「視覚空間能力と学び」: Article Schema ＋ ScholarlyArticle 参照（学術エビデンス記事）
- **Cluster** C4-1「点描写の効果」: Article Schema ＋ ScholarlyArticle 部分参照（[evidence.md](evidence.md) 厳選引用）
- **Cluster** C4-2「子供の空間認識能力を育てる」: HowTo Schema（家庭での育て方手順）・H1 SEO 例外運用「空間認識」採用→本文ブランド語「空間認知」ブリッジ
- **Cluster** C4-3「空間認知を育てる家庭プリント」: ItemList Schema（年齢別 SKU リスト）＋ Product Schema 連携
- **FAQ 3 本＋LLMO 2 本**: FAQPage Schema 厳密実装
- **robots.txt**: OAI-SearchBot を Allow（ChatGPT search の入口確保）／その他 AI クローラーは [engineering/](../engineering/) で個別判定
- 実装詳細とテンプレートは [engineering/](../engineering/) で別途定義（準備期着手時）

---

### §9. 既存スラッグの維持・刷新

| 既存スラッグ | 処遇 |
|---|---|
| `/point-drawing-guide/` | **維持**（P1 正規ハブとして継続・既存ドラフトの SEO 資産保持） |
| `/point-drawing-effects/` | **維持・親 Pillar のみ P1 → P4 へ移設**（URL 変更なし・301 不要・記事内容は P4 旗艦「効果論」へ再構成） |
| `/weak-at-shapes/` | 維持（C3-2 として継続） |
| `/cannot-draw-isometric/` | C3-1 `/how-to-draw-isometric/` へ統合・旧 URL は 301 リダイレクト |
| `/cannot-imagine-3d/` | C1-4 `/point-drawing-3d/` へ統合・301 |
| `/note-not-copying/`／`/diagonal-line-practice/`／`/penmanship-effect/` | C3-5 `/kanji-form-recognition/`＋L-2 `/family-shape-spatial-qa/` へ統合または個別退避（[archive/retired-drafts/](../archive/retired-drafts/) 移管時に最終判断） |
| その他旧スラッグ | [archive/retired-designs/2026-05-22-clusters-urls-pre-seo-dr.md](../archive/retired-designs/2026-05-22-clusters-urls-pre-seo-dr.md) 経由で個別判断 |

---

## 附録

- 旧 urls.md（案 F/G 時代・53-54 本構成）: [archive/retired-designs/2026-05-22-clusters-urls-pre-seo-dr.md](../archive/retired-designs/2026-05-22-clusters-urls-pre-seo-dr.md)
- 旧 urls.md（4 Pillar 24 本構成・C1-1 が P1 配下）: 2026-05-23 後半までの版・git 履歴参照
- **2026-06-03 改訂**: 検索意図振り分け（[clusters.md §1.5](clusters.md)）で記事スラッグを 16 に縮減。C1-2〜C1-5/C4-3/C4-9 をカテゴリLP・商品タグ・選びガイドUI へ降格、C4-4 削除、C3-5 を L-2 統合。決定: [decisions.md §3.42](../decisions.md)
- Cluster 構成本体: [clusters.md](clusters.md)
- Pillar 構造の SSOT: [decisions.md §3.32](../decisions.md)
