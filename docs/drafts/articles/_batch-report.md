# 正規記事バッチ執筆 納品レポート（2026-07-08）

全 20 本（正規タクソノミ 19 本＋ブランドステイトメント）のドラフトを `docs/drafts/articles/` に納品。
構成メモ（src 注釈つき）は `docs/drafts/memos/` に併置。**公開昇格（web/content/articles/ への移動）は未実施＝オーナー作業**。

## 納品一覧と検品状態

| # | slug | 種別 | 字数帯 | NG grep | llmo-check | article-reviewer |
|---|---|---|---|---|---|---|
| 1 | point-drawing-guide (P1) | pillar | 6,000 | PASS | ERROR 0 | ✅ High1/Med4 修正済 |
| 2 | tenzu-concept（ステイトメント） | pillar 準用 | 1,700 | PASS | ERROR 0 | ✅ 公開可・Low 反映済 |
| 3 | how-to-draw-isometric (C3-1) | cluster-howto | 3,400 | PASS | ERROR 0 | ✅ High1（メモ正式採用で解消）/Med1 修正済 |
| 4 | visuospatial-and-learning (C3-4) | cluster-academic | 4,300 | PASS | ERROR 0 | ✅ 公開可・Med1/Low 反映済 |
| 5 | point-drawing-effects (C4-1) | cluster-howto | 3,500 | PASS | ERROR 0 | ✅ Critical1（引用範囲）/High1 修正済 |
| 6 | how-to-train-spatial-recognition (C4-2) | cluster-howto | 4,600 | PASS | ERROR 0 | ✅ Critical/High 0・Med3 修正済 |
| 7 | how-to-choose-and-use (P4) | pillar | 4,800 | PASS | ERROR 0 | ✅ Med1（30〜56問）修正済 |
| 8 | weak-at-shapes (C3-2) | cluster-symptom | 4,300 | PASS | ERROR 0 | ✅ Med2 修正済 |
| 9 | grade-4-math-stuck (C3-3) | cluster-symptom | 4,000 | PASS | ERROR 0 | ✅ 公開可・Med2 反映済 |
| 10 | from-copying-shapes (P3) | pillar | 5,800 | PASS | ERROR 0 | ✅ High2（F3併記/分布主張）修正済 |
| 11 | kumon-shape-supplement (C2-1) | cluster-howto | 3,600 | PASS | ERROR 0 | ✅ 公開可・Med1/Low 反映済 |
| 12 | kumon-math-shape (C2-3) | cluster-howto | 3,300 | PASS | ERROR 0 | ✅ 公開可・Med2 修正済 |
| 13 | next-after-kumon (P2) | pillar | 4,900 | PASS | ERROR 0 | ✅ 重点4項目合格・Med1 修正済 |
| 14 | how-to-teach-point-drawing (C5-1) | cluster-howto | 3,600 | PASS | ERROR 0 | ✅ High1（メモ正式採用で解消）修正済 |
| 15 | for-parents (P5) | pillar | 4,600 | PASS | ERROR 0 | ✅ Critical/High 0・Med1 修正済 |
| 16 | point-drawing-complete-guide (L-1) | llmo | 5,200 | PASS※1 | ERROR 0 | ✅ 公開可・Med1/Low5 修正済 |
| 17 | family-shape-spatial-qa (L-2) | llmo | 5,900 | PASS | ERROR 0 | ✅ 公開可・Med1/Low4 修正済 |
| 18 | faq-copyright (F-3) | faq long | 1,700 | PASS | ERROR 0 | ✅ 束 Critical1/High1（線引き統一・【要確認】隠蔽）修正済 |
| 19 | faq-commercial-use (F-1) | faq long | 1,600 | PASS | ERROR 0 | ✅ 束レビュー・単体欠陥なし |
| 20 | faq-teacher-license (F-2) | faq long | 1,900 | PASS | ERROR 0 | ✅ 束 Med2（phase 統一・schema 整合）修正済 |

※1 L-1 の「アプリ」1 件は第三者教材への言及（CEP10 の設計どおり）で目視 OK。C4-2 の「知育アプリ」・C4-1 の related カード内「空間認識」（C4-2 正式タイトル）も同様に想定内ヒット。

## 横断検証（バッチ最終）

- **内部リンクグラフ**: 全リンク先が正規 19 スラッグ＋実装済みルート（/maker・/level-guide・/products・/products/copy・/products/solid・/articles）のみ。死リンクゼロ。Cluster→親 Pillar 必須 1 本・P1→4 用途ハブ・課題/公文/啓蒙/親向けラインの相互リンク・LLMO→Pillar 各 1 本、すべて充足
- **NG grep（HARD）**: 全 20 本 0 件（SEO 例外の固定テンプレ使用もゼロ＝クエリ引用なしで書き切った）
- **llmo-check**: 全 20 本 ERROR 0 / WARN 0
- **未実装受け皿へのリンク**: 張っていない。LP-1/LP-2・C4-3 カテゴリ LP・SkuCards は `{/* TODO */}` コメントで位置だけ印
- **最終スイープ（全レビュー反映後・2026-07-08）**: 20 本一括で HARD grep 0 件・llmo-check ERROR 0 / WARN 0 を再確認済み

## 実行時ルーリング（プラン承認済み＋バッチ中の追加判断）

1. **内部リンクは実装ルート `/articles/<slug>` 形式**（urls.md のフラット `/{slug}/` 設計とは乖離＝要オーナー方針決定。移行時は一括置換で対応可能）
2. **H1 の「点図形（点描写）」並記は屋号紹介系（P1・ステイトメント）のみ**。KW 記事は clusters.md 仮タイトル優先・本文初出で並記/切替宣言（voice-tone §5 の「統一可」規定を利用）。※voice-tone §5/templates §7.0 の字面とは緊張あり＝SSOT への除外明記 or 全 H1 並記への変更はオーナー判断
3. **MDX 部品は実装済み 5 種のみ使用**（LeadGraf/TenzuTranslate/Diagram/Quote/SideNote）。TLDR=「## 結論（要点）」・目次=省略（未実装）・SkuCards=商品リンクで代替・RelatedPosts=frontmatter related（実装済）・References=Markdown 見出し。HowTo/ScholarlyArticle Schema は実装側未対応（Article+Breadcrumb+FAQPage のみ出力）
4. **author: 店主**（templates §2.1 の `tenzu-tenshu` でなく表示実装に合わせた。デモ記事と同じ）
5. **FAQ long 字数 1,200〜1,800**（templates/faq.md の二重定義の中間）・**Pillar H2 数は pillars.md 優先**（LLMO「4-6」超過は許容）
6. **年齢表記は記事内「歳」統一**（商品面の「才」＝decisions §3.45 とはサーフェス別で共存）
7. **引用 ID**: evidence.md E 系を references-map §12（No.35〜47・今回新設）に登録して frontmatter references の機械検証を成立させた

## 残存【要確認】（公開前にオーナー判断が必要）

- **F-1/F-2 の規約**: 指導者ライセンス草案（F-2 本文の【案・確定前】ブロック）の採否と料金。採用時は `web/app/products/purchase-faq.ts`「利用できる範囲は？」の文言更新が必要
- **F-3 の SNS 線引き案**（写り込み歓迎／全面複製形は不可）と利用規約ページ実体との整合
- **問い合わせ窓口の実体**（FAQ 3 本が「お問い合わせください」参照・faq.md §10 の残課題と同件）
- **ブランドステイトメントの slug と置き場所**（仮 slug=tenzu-concept・記事 or About 配下）
- **C3-1「2×2」**: pillars.md §2 H2-5 の「2×2 グリッド」はメーカー実装の最小 3×3 と齟齬→記事は 3×3 に読み替え済み。SSOT 側の更新はオーナー判断
- **JP3/JP6 の誌名・巻号**（P1 参考文献）: 旧ドラフト由来の書誌情報。原典最終確認を推奨
- **公文カリキュラム記述の粒度**（C2-1/C2-3）・**塾の進度記述**（C3-3 FAQ）・**指導要領の単元記述**（C3-1/C3-3/P3 は学年断定を回避済み）
- **P1 の「ぬりえ」「数字」**（brand §0.2 の例示語からの微置換・レビュー指摘・無害だが要追認）
- **メモ外の一般化 2 件**（P1/C4-1「2 問めに手が伸びる」・P3 単元名列挙と改善サイン例）

## SSOT 側の同時変更（実施済み）

- `content/templates.md` §2.1/§2.2 enum を現行タクソノミへ整合（p1-p5・S-a 系・hub/cluster/llmo/faq・cluster-academic/llmo 追加）＋§7.1 stale（スタート診断・土台チェック）修正＋§9 履歴追記
- `content/references-map.md` §12 新設（evidence E 系 ↔ No.35〜47 の台帳）
- 各構成メモに、レビュー反映（メモ正式採用）の追記あり: how-to-draw-isometric（辺 12 本・3 かど・唱え文句）・weak-at-shapes（近道の根・自己客観化）・point-drawing-effects（コグトレ）・how-to-choose-and-use（リンク一覧の stale 修正）

## SSOT ドリフト所見（今回は触っていない・別途の掃除タスク推奨）

- clusters.md/content/README の「16 ページ」勘定（実 19 本・P2〜P5 ハブ未カウント）
- pillars.md §9 フェーズ表・P4 H2-6〜10 の 2026-06-03 縮減前 stale
- faq.md §2.1/§8 の旧 4 本構成（#60 教室利用・/faq-classroom-use/）→ 現行 3 本（F-1/F-2 に吸収の整理案）
- FAQ の公開 phase: faq.md §8（M2a/M2b 分割）・urls.md §2.1（F-2/F-3=Phase 3）・templates §8.1（M2b に FAQ 3本）が三様。ドラフトは相互リンク切れ回避のため 3 本とも phase-2 に統一（公開時期の最終判断はオーナー）
- urls.md フラット URL 設計 vs 実装 /articles/ プレフィックス
- research.md §1.9 トーン③自己客観化（「私」型例文）と voice-tone §3（記事の一人称は屋号）の緊張→「店として正直に言えば」型で運用した

## 公開昇格の手順（オーナー向けメモ）

1. 残存【要確認】を解消（特に FAQ 規約とステイトメント slug）
2. アイキャッチを Gemini で生成 → `/article-image` で配置（未指定でも動的 OG でフォールバック可）
3. `docs/drafts/articles/<slug>.mdx` → `web/content/articles/<slug>.mdx` へ移動 → `/llmo` で最終検査 → commit/push（Amplify で即公開）
4. 公開順は launch/phases.md（P1=phase-1 先置き → M2a: C3-1/P2/P3/P4/F-1 → M2b: C4-1/C4-2/L-1/F-3 → Phase 3: 残り）。**未公開記事への related カード/本文リンクは公開時点で 404 になるため、昇格の都度 related を絞るか公開順を寄せること**

## レビュー詳報の反映ログ

- P1: 合成命題の研究帰属を TENZU 帰属へ／段階断定を緩和／比較表追加／才→歳／TenzuTranslate 訳のはみ出し削除／SideNote 和ラベル化
- ステイトメント: description 増補・reading_time 実測化・常体 1 文の敬体化（「ぬりえ」「往復」は意図的置換として温存）
- C3-1: 辺 12 本検算をメモ正式採用／ステップ 2 の「3 つのかど」明示／カッコ削減
- C3-4: 透視図（見取り図）の原典語併記／関連 3 章に抽出用の要点 1 行ずつ／子→お子さん・子ども
- C4-1: 「学校や支援の現場」を引用範囲内へ縮退（Critical）／立体模写の 4 群二重計上を解消（High）／特性フレーム語へ置換／劇的・必ず・読点過多を調整
- P4: 30〜56 問へ事実修正／descriptor 完全形／reading_time 実測化／「報告」反復解消
- C3-2: TLDR に差別化フック復元／FAQ の効率主張を緩和／3 ステップの番号リスト化／自己客観化 1 行（店主語）／癖語削減
- C3-3: 列挙の中点化＋見取り図の 1 行定義／自己客観化 1 行／「静かに」の反復削減
- C2-1: 並走 3 条件の箇条書き化／「一貫した思想」削除（粒度キャップ内へ）／FAQ 見出しの期限語を除去／癖語・主語の微修正
- P3: 空間認知の公式訳併記を本文に実装（High）／「ほとんど」分布主張を留保表現へ（High）／見取り図 3 ステップの番号リスト化／「よく寄せられます」の実績含意を除去／表記統一
- C4-2: ✅ Critical/High 0・Med3 反映（です3連続解消／「長さ」→3要素 triad へ統一／「子供（タイトル系）・子ども（本文）」の SEO 二刀流をメモに明文化）
- C2-3: ✅ 公開可・Med2 反映（「入っていない」→「中心に置かれていない」粒度合わせ／ダッシュ双方向挿入の別文化）＋Low（FAQ 回答の実績含意除去・description に点描写 1 回）
- P2: ✅ 重点4項目（点つなぎ・降格タグライン・No.38 引用範囲・公文粒度/一表中立）全合格・Med1 反映（reading_time 17→7）＋Low（「の」連続・常体言い切りの敬体化・縦断研究の因果ブリッジ緩和）。レビュアーが copy-lv1-vol1.json 実データで「3×3・まっすぐ2〜3本」を裏取り済み
- P5: ✅ Critical/High 0・Med1 反映（LeadGraf に「点図形（点描写）」並記＝voice-tone §5 の切替宣言ルートで充足・同修正を C5-1 にも適用）＋Low（P2 導線追加・カッコ書き別文化）。「教える」否定形運用・NG3つの説教回避・3フレーズ SSOT 文字単位一致をレビュアー確認済み
- C5-1: ✅ Critical 0・High1（H2 #6 見出しの本文採用形をメモ正式更新＝案 B・コピー運用素材の H2-5 移設も正式化）・Med1 反映（reading_time 12→7）＋Low（根拠行「商品設計」→「声かけ設計」・LeadGraf 並記は P5 レビュー時に適用済み）。3フレーズ/NG3つの SSOT 文字単位一致・「教える」全出現の否定形運用をレビュアー確認済み
- L-1: ✅ 公開可・Med1 反映（5軸を定義リスト化＝読点過多解消＋LLMO 原則2充足）＋Low（「続く家庭の共通点」→設計論へ／「在庫」語の自然化／faq_schema Q を本文文言へ／「究極の立体」の媒体ラベル（アプリ系）を撤回し「立体特化の教材」へ後退＝媒体が SSOT 未確定のため／天才ドリル20万部の帰属を「点描写」タイトルに限定）
- L-2: ✅ 公開可・「認知 vs 認識」4問の clusters §7 完全準拠をレビュアー確認。Med1 反映（Q1 定義文の2文分割）＋Low（Q2/Q4 を §7 の 200-400字下限へ増補・schema Q5 の例を本文一致・3レーンのリスト化）
- FAQ 束: ✅ **Critical1**＝線引き基準の不統一（F-3「紙面が届く形」vs F-2「データのまま広がる形」が教員草案の紙配布 OK と字面衝突）→**「データ/複製が非購入者に渡る形＝NG」で3本一本化**。High1＝F-3 の【要確認】が本文素通し→「現在の考え方（確定前）」注記＋JSX コメント化。Med2＝F-2 の phase を phase-2 へ統一（3本同時公開・草案先出しの意義から。※urls.md §2.1 は F-2/F-3 を Phase 3 と記載＝SSOT 側の phase 揺れとして下記に追記）・faq_schema の「紙面」誤記を「PDF データ」へ
