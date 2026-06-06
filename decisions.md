# 横断的な設計判断ログ

## サマリ

- 「あの判断いつ確定した？根拠は？」を遡るときに参照する横断ログ
- 各項目は詳細設計書へのリンクを持つ。本ファイルは見出しと一行要約のみ
- 領域別の判断は各領域の設計書本体に書く。**横断的・歴史的に意味のある判断のみ**ここに集約

## カテゴリ別 索引

- §1. ブランド・コンセプト（Tier1=README残し）
- §2. 価格・課金（Tier1=README残し）
- §3. 商品設計（B-1）— 各タスクラダー・モチーフ・廃止判断
- §4. 配布・認証・サンプル（C-3）
- §5. 集客・GTM
- §6. 計測・KPI
- §7. アプリ
- §8. リリース戦略（Tier1=README残し）

---

## §3. 商品設計（B-1）— 各タスクラダー・モチーフ・廃止判断

> 一次ソース: [pack-design.md](./product/pack-design.md)

### 3.1 模写ラダー改定（2026-04-10）

旧7 Vol.→**8 Vol.**に改定。こぐま会「てんずけい１」＋教育図書21のベンチマーク反映。斜め導入をLv.2（3×3）に前倒し、最大グリッド7×7追加。構造は1/2/2/2/1のシンメトリー。壁は2つ（斜め/非45°）。
→ [pack-design.md §12](./product/pack-design.md)

### 3.2 Lv縦串思想＋年齢×キャッチコピー改定（2026-04-10）

Lv.1〜5はブランド全体の発達段階インデックス（歯抜けOK）。模写ラインで8段の年齢めやす＋内部2列（先取り層/標準層）＋キャッチコピーを確定。傷つきにくさ設計（共通フッター文・NGワード・課題性質フレーミング）も統合。
→ [pack-design.md §0.3.2 / §0.3.3 / §12.7](./product/pack-design.md)

### 3.3 仕上げ編 廃止（2026-04-25）

線対称・回転・平行移動の3タスクに設けていた仕上げ編を全廃。タスク間の不揃い解消＋混在判断は横串混在セット §14.7.1 に一本化。
→ [pack-design.md §0.3](./product/pack-design.md)

### 3.4 線対称ラダー確定（2026-04-12 / 2026-04-25 仕上げ編廃止）

**6 Vol.構成**（—/1/1/2/2）。対称軸方向（縦→横→斜め）が固有ドライバー。
→ [pack-design.md §15](./product/pack-design.md)

### 3.5 回転ラダー確定（2026-04-12 / 2026-04-25 仕上げ編廃止）

**5 Vol.構成**（—/1/2/2/—）。回転角度（90°右→90°左→180°）が固有ドライバー。
→ [pack-design.md §16](./product/pack-design.md)

### 3.6 平行移動ラダー確定（2026-04-12 / 2026-04-25 仕上げ編廃止）

**4 Vol.構成**（—/2/1/1/—）。移動方向（横→縦→斜め→複合）が固有ドライバー。
→ [pack-design.md §17](./product/pack-design.md)

### 3.7 拡大縮小ラダー確定（2026-04-12）

**6 Vol.構成**（—/—/—/3/3/仕上げなし）。上級専門タスク（Lv.4以上のみ）。変換方向×図形対称性×グリッドが固有ドライバー。お手本≠解答グリッドの唯一のタスク。
→ [pack-design.md §18](./product/pack-design.md)

### 3.8 分解をかさねから独立（2026-04-12）

設問タイプ8種→**9種**。分解はかさねと認知処理が近いが別タスク。

### 3.9 かさね（合成）ラダー確定（2026-04-13）

**7 Vol.構成**（—/入門1/基礎2/応用2/発展2/仕上げなし）。模写Lv完全連動。**線分数（少/多）** が同一Lv内Vol.分けのドライバー。
→ [pack-design.md §19](./product/pack-design.md)

### 3.10 分解ラダー確定（2026-04-13）

**7 Vol.構成**（—/1/2/2/2/仕上げなし）。かさねと構造同一。操作が「引き算（C-A=B）」。
→ [pack-design.md §20](./product/pack-design.md)

### 3.11 欠け補完ラダー確定（2026-04-13）

**8 Vol.構成**（1/1/2/2/2/仕上げなし）。唯一Lv.1スタート・歯抜けなし。固有ドライバー「欠け量」。
→ [pack-design.md §21](./product/pack-design.md)

### 3.12 平面8タスク全確定（2026-04-13）

Step 1完了。合計54 Vol.。

### 3.13 モチーフカテゴリ確定（2026-04-19）

具象6本（動物/乗り物/食べ物/宇宙/建物/自然）＋幾何1本。具象は**模写＋欠け補完の2タスクのみ**、他7タスクは幾何専用。**Lv.1基本不採用**（Lv.2〜5運用）。平面合計 **136 Vol.**（具象84＋幾何52）。
→ [pack-design.md §11](./product/pack-design.md)

### 3.14 立体模写ラダー確定（2026-04-19）

**5 Vol.構成**（—/—/1/2/2、仕上げなし）。**Lv.3スタート**（立体は認知負荷高でLv.1-2不採用）。固有ドライバー「構造タイプ/斜め辺の有無/ブロック数」。柱体・角錐は同格扱い（非格子辺を持つ点で一括）。壁は2つ（斜め辺導入: Lv.4内／抜け構造導入: Lv.4→5）。
→ [pack-design.md §22](./product/pack-design.md)

### 3.15 Step B-1 Step 2 完了（2026-04-19 / 2026-04-25 仕上げ編廃止反映）

立体模写ラダー確定でStep 2終了。**総単品SKU 140**（平面135＋立体5）＋**混在セット9 SKU**、全単品制覇時 **¥28,000**。
→ [pack-design.md §14.5](./product/pack-design.md)

### 3.16 Step B-1 完了（2026-04-25）

全9タスク年齢×キャッチコピー確定（§12.7・§15.8・§16.8・§17.7・§18.7・§19.7・§20.7・§21.7・§22.9）。Step B-2へ進行可能。

### 3.17 HO-B2-25 撤回（2026-05-08）

旧設計「先行リリース限定SKU 10本・先行価格¥100/¥200・クーポン3種」は撤回。フィードバック駆動型先行リリース（先行モニター制度）に置換。
→ [archive/retired-designs/2026-05-08-presale-pricing.md](./archive/retired-designs/2026-05-08-presale-pricing.md)

### 3.18 「先行SKU」概念の完全廃止（2026-05-09）

「Phase 1 で先行SKU 4本を限定販売」構想を概念ごと廃止。**Phase 1 以降は全140 SKU を通常価格 ¥200 で公開・販売**（売上ゼロでも非目的・主動線はモニター無償フルアクセス）。`cta_mode: sku-preview` enum 値も削除。
→ [archive/retired-designs/2026-05-09-presale-skus.md](./archive/retired-designs/2026-05-09-presale-skus.md) / [content-design-templates.md §2.3](./content/templates.md)

### 3.19 MDX phase 4値モデル確定（2026-05-09）

旧 `phase: pre-launch | post-launch` 2値モデルを廃止し、`phase: phase-0 | phase-1 | phase-2 | phase-3` 4値モデルへ。Phase 0 記事は `<SkuCards />` 非レンダリング、Phase 1+ は target_skus 指定通りに展開。
→ [archive/retired-designs/2026-05-06-two-phase-cta-model.md](./archive/retired-designs/2026-05-06-two-phase-cta-model.md) / [content-design-templates.md §2.3](./content/templates.md)

### 3.20 案F確定（2026-05-20）— 戦略大改修

3 AI 合議（Claude／Gemini／ChatGPT）+ ユーザー判断で **案F（ハイブリッド）** 確定。コンテンツ設計を大改修：

- **ブランド短期定義（C改）**: 「TENZUは、図形が苦手になる前にも、つまずいた後にも使える点図形（点描写）専門店」
- **差別化キーフレーズ**: 「戻れる」「ピンポイント」「解像度」（Gemini 案E から採用）
- **旧「ターゲット3層均等扱い」破棄** → 新「商品は3層対応、集客は予防+対処の両軸寄せ・初期突破口は中受 P3-a 全振り（上から下波及法則）」
- **ペルソナ再編**: 中核3（P3-a／P2-b／P2-a）+ 受動拾い4（P1-a／P1-b／P4／P5）／**P7 廃止・P2-b 吸収**／**P3-b 保留**
- **記事数**: 53-54本 → **18-20本前後**へ圧縮
- **選択肢ベース自己診断ツール導入**（5-7問・旧「診断導線不採用」を反転）
- **表現置換**: 処方箋・特効薬・弱点診断 NG → 練習プラン・次の一手・戻り道・土台チェック・抜けを補う・ピンポイント練習
- **表記階層化**: 主語＝点図形／副記＝点描写（SEO・商品名は点描写維持）
- **屋号語源（裏話）**: 音韻として「せんず」とも読みうるが、固有 IP 参照は本文・コピー・ビジュアル一切なし
→ [archive/retired-designs/2026-05-20-three-tier-equal.md](./archive/retired-designs/2026-05-20-three-tier-equal.md) / [content/personas.md §4](./content/personas.md)

### 3.21 Phase 0 廃止・3フェーズ構成へ（2026-05-20）

案F の P3-a 全振り戦略と無料作成アプリの構造的不整合（緊急モード P3-a に「アプリで遊んで」は刺さらない／X バズ起点になりにくい／自己診断ツールと役割衝突）を受けて、**Phase 0 を廃止**し3フェーズ構成（Phase 1/2/3）へ移行。

- **アプリは Phase 3 後のポスト・ローンチで運営判断による別個投入**（Phase 1/2/3 のいずれにも組み込まない・廃止ではなく延期・D5 アプリプロト降格）
- **「無料体験」役**: 選択肢ベース自己診断ツール（無料）＋ サンプルPDF 1本（無料）で代替
- **DM 構造**: 4通 → 3通へ再設計（別タスク・1通目「アプリ使ってみて」廃止）
- **MDX enum**: `phase-0` ／ `cta_mode: app-only` を deprecated
- Phase 1 = 初期フェーズ（サイト本体＋全140 SKU 通常販売＋初期記事 8-10本＋自己診断ツール＋先行モニター）
→ [archive/retired-designs/2026-05-20-phase-0.md](./archive/retired-designs/2026-05-20-phase-0.md) / [launch/phases.md](./launch/phases.md)

### 3.22 D0 ロゴ・D1 Design System フル刷新（2026-05-20）

旧 D0 案B'（正方形枠＋ドットグリッド＋斜線・TZ風）を破棄。案F 反映（「戻れる／ピンポイント／解像度」キーフレーズの視覚言語化）＋ 中受 P3-a 向け端正・知的・落ち着き重視で 2-3 案叩き台を Claude Design 側で量産（半日想定・別ワークストリーム）。配色 navy + cream + 山吹（達成・注目限定）／タイポ Zen Kaku Gothic New・Noto Sans JP・Schibsted Grotesk／主役グラフィック幾何要素方針は維持。
→ [archive/retired-designs/2026-05-11-logo-b-prime.md](./archive/retired-designs/2026-05-11-logo-b-prime.md) / [foundation/brand.md](./foundation/brand.md)

### 3.23 トップレベル F/M/P/C/D/E/L 7段階＋Foundation Tier 0 再編（2026-05-21）

旧 A/B/C/D 4領域構造を撤回し、頭文字＝意味直結の **F/M/P/C/D/E/L 7段階 + Foundation Tier 0** へ再編。「B ってなんだっけ」問題の根絶と SSOT 原則の回復が主目的。

- **Foundation 新設**: ブランド定義・MISSION・原則の SSOT を `foundation/brand.md` に集約（旧 `design/brand-brief.md` 一枚運用を撤回・分割）
- **Market**: 旧 `strategy/` を `market/` にリネーム（GTM・競合分析のみ残置）
- **Launch 新設**: `launch/plan.md` `launch/phases.md` `launch/monitor.md` `launch/measurement.md` を独立領域化（旧 `strategy/` から移動）
- **Engineering 新設**: 実装着手時の肉付け用に領域確保（README のみ）
- **Design 純化**: ビジュアル実装ルールを `design/visual-identity.md` に分離
- **9タスク×5レベルの「型」変更なし**: 案F「躓き解消」マッピング（症状→タスク・Lv・Vol 連結）は P-8 として別タスク化

→ [archive/retired-structures/2026-05-21-pre-fmpcdel.md](./archive/retired-structures/2026-05-21-pre-fmpcdel.md) / [README.md](./README.md) / [CLAUDE.md](./CLAUDE.md)

### 3.24 ブランド定義 §1-§12 全面再設計＋2 AI レビュー反映（2026-05-21）

旧 brand.md（運用ルール混在版）を撤回し、田中洋『ブランディング』5フェーズフレームを内部評価軸として、§1-§12 構成へ全面書き直し。Voice/Tone 運用ルールを `voice-tone.md` へ分離。GPT-5・Gemini の独立レビューを反映して 2 度目の改訂を実施。

**構成変更（brand.md）**:
- §1 MISSION／§2 Vision／§3 Values（コア2＋運営2、各意思決定例付き）／§4 Brand Story / Origin／§5 顧客インサイト（対処層／予防層／子ども本人 3小節）／§6 Brand Promise／§7 Brand Pillars（内部柱＋外向けコピー列）／§8 RTB（R1-R10）／§9 Brand Personality（4軸）／§10 Positioning Statement（+ §10.1 CEP 7個）／§11 Anti-Brand（+ §11.3 Brand Architecture）／§12 Tagline（コア＋業態識別句＋予防 LP バリアント）
- 附録: 屋号語源／田中洋5フェーズ・ナラティブ／変遷

**新規確定事項**:
- **Tagline 階層化**: コア「図形に、戻り道を。」＋ 業態識別句「点図形（点描写）プリントの専門店 TENZU」必須併記。予防 LP では「確かな土台と、戻り道を。」バリアント許容
- **「自己診断ツール」廃止 → 「レベル選びガイド」へ正式リネーム**: 診断語彙を概念レベルで Anti-Brand 化（医療・弱点・判定の連想を排除）
- **Brand Architecture（拡張境界）**: Core=PDF / Guide=レベル選び / Article=記事 / App=ポスト・ローンチ / NG=算数全般・知育全般・中受総合
- **CEP 7個明文化**: 子の手が止まったとき／中受図形でつまずいたとき／模試で白紙だったとき／市販パズルを投げ出したとき／無料プリント広告ストレスのとき／市販ドリル一冊買うほどではないとき／「点描写」に出会ったとき
- **RTB 拡張**: R1-R5（選び・買い・続けやすさ）に加え R6-R10（認知負荷コントロール／タスク設計基準公開／サンプル公開／AI 人間レビュー方針／改訂履歴）を実装の約束として宣言
- **§5 顧客インサイト 3小節化**: 旧版が対処層偏重だった点を Gemini レビューで指摘され、予防層（無理なく確かな土台・押し付けて嫌いにさせたくない）と子ども本人（拒否反応の連鎖）を追加

**voice-tone.md（新規分離）**:
- Voice NG/OK・温度設計・一人称・Phase 別デチューン・表記階層化を集約
- 「専門家の語り口」→「根拠を持った親の語り口」修正（同じ親立ち位置と整合）
- **SEO 例外運用ルール新設**: NG 語彙でも記事冒頭の「クエリとしての引用」のみ許容（H1・CTA は禁止）
- About での「私」と屋号の境界明示（区切り見出し方式）

**Positioning から「個人 × AI」を外向き Because から除外**: 親の購買理由としては不安要素にもなり得るため、About と内向き運営ノートへ降格。外向け Because は「中身公開・¥200 一律・広告ゼロ」に絞った。

→ [foundation/brand.md](./foundation/brand.md) / [foundation/voice-tone.md](./foundation/voice-tone.md) / [archive/retired-designs/2026-05-21-brand-brief-monolith.md](./archive/retired-designs/2026-05-21-brand-brief-monolith.md)

### 3.25 GPT 再レビュー反映：ブランド定義 v3 改訂（2026-05-21）

§3.24 で書き上げたブランド定義 v2 に GPT が再レビュー実施。「ブランド設計としては戦える水準だが、誠実性とコピー強度管理に残課題」との評価を受けて以下を改訂。

**§8 RTB の再構造化（最重要）**:
- 旧版は R1-R5 を「実装済」、R6-R10 を「リリース時に実装する約束」として並列に並べていた。GPT 指摘：「RTB は本来『すでに信じる理由』。未実装項目を混ぜると顧客信頼を落とす」
- §8 を 3 小節に再分離：
  - **§8.0 Brand Equity の源泉**: 5源泉（中身を見て選べる安心／一つ下に戻れる安心／一枚から試せる低リスク／広告に邪魔されない端正な体験／長期の信頼）を明文化
  - **§8.1 公開時に顧客へ提示する RTB**: R1-R5（実装済の事実のみ）
  - **§8.2 ローンチまでに実装必須の運営コミットメント**: C1-C5（内部管理用）。実装完了するまで外向け表示禁止
  - **§8.3 未実装時の外向け表示禁止原則**: 「予定」「準備中」での先出しも禁止

**R6 表現緩和**: 旧「**認知負荷の精密コントロール**」→ 新「**認知負荷に配慮した設計**」へ。実証データ無しの「精密」断言は Anti-Brand「煽らない・断定しない」と内部矛盾するため。

**§4 Brand Story 修正**: 「そのどれでもない場所を、AI と個人運営で作る」→「**そのどれでもない場所を、個人運営だからこそ小さく、丁寧に作る。制作には AI も使うが、最後に見るのは人の目である。**」へ。親の「AI 教材なの？」不安を回避。

**§5.1 対処層を 2小節化**: GPT 指摘「学校算数層は『間に合うか』では動かない」を受けて：
- **§5.1.a 中受対処層（P3-a）**: 自責・間に合うか・塾についていけるか
- **§5.1.b 学校算数対処層（P2-b）**: 宿題で揉める／親が教えると喧嘩／学校の図形だけ嫌がる／学校の授業だけでは足りない

**§12 予防バリアント変更**: 「確かな土台と、戻り道を。」（汎用語問題）→「**図形の土台に、戻り道を。**」へ。理由：
- コアタグライン「図形に、戻り道を。」と韻・構造を統一（「図形に / の」「〇〇を。」型）
- 「確かな土台」は教育業界の汎用語、「図形の土台」と限定することで TENZU 固有の記憶に残る
- 運用範囲も「予防向け記事・LP に限定」（SNS・OG・名刺では使わない・混ぜない）を明示

**voice-tone.md 追加**:
- **コピー強度マトリクス**（強すぎる／やや強い／適正／弱すぎる）を追加。AI 記事生成時のブレ防止
- **SEO 例外運用に固定テンプレ文**を 1個明示（自由記述禁止）。「『弱点診断』や『処方箋』という言葉で探している方もいるかもしれません。TENZU では、お子さんを判定するのではなく、今の地点から始めやすい一枚を選ぶことを大切にしています。」
- **場所別予防：対処比率を 3層で分離**: ブランドトップ（5:5・中立）／獲得 LP（中受 2:8 / 学校算数 4:6 / 予防 8:2・尖らせる）／記事（同じ比率）。「ブランドトップを獲得 LP として兼用」は禁止

**GPT による最終判定**: 「ブランド設計としてはもう戦える水準。次は LP・商品ページ・レベル選びガイド・SKU テンプレ・記事テンプレに作業重心を移すべき」→ ブランド定義側は本改訂で確定とし、次セッション以降は実装側へ重心移動。

→ [foundation/brand.md](./foundation/brand.md) / [foundation/voice-tone.md](./foundation/voice-tone.md)

### 3.26 Market → Market / Acquisition 分割（2026-05-21）

トップレベル領域 M を **M（Market）／A（Acquisition）** の2領域に分割し、F/M/A/P/C/D/E/L 8段階構成へ。きっかけは「GTM」が SaaS 由来の抽象語で `market/` の中身が「市場分析」と「獲得施策」の異質な2種類を抱えていた点。F/M/P/C/D/E/L の語呂は崩れるが、責務分離を優先。

**新構造**:
- `market/` ＝ **外を読む・立ち位置を決める**: competitive.md / targeting.md（新規）／ positioning.md（新規）
- `acquisition/` ＝ **認知を取って CV へ渡す**: channels.md（新規・DM/インフル/広告）／ funnel.md（新規・レベル選びガイド/LP/クーポン）／ monitor-recruit.md（新規・モニター公募導線）

**旧 gtm.md の扱い**: 今セッションでは骨組みのみ作成。次セッションで gtm.md §1-§7 を market/acquisition 各ファイルへ移植し、gtm.md は archive/retired-structures/ へ退避予定（→ §3.27 で完了）。

**横断更新**: README.md・CLAUDE.md の領域表・SSOT テーブル更新済。

→ [market/README.md](./market/README.md) / [acquisition/README.md](./acquisition/README.md)

### 3.42 検索意図ベースの記事/非記事の振り分け（2026-06-03）

「点描写」キーワード全数調査（[keyword-research.md §13](./content/keyword-research.md)・164 語）で、**非ゼロ語の約 9 割が取引意図**（点描写 プリント 1,600／プリント無料 260／プリント難しい 210／簡単 170／難しい 140 等）と判明。記事を当てても検索意図不一致で上位化しない。

**決定**: クエリを検索意図で 2 分し受け皿を分ける（[clusters.md §1.5](./content/clusters.md)）。
- **取引・回遊意図**（プリント／無料／ドリル／簡単／難しい／立体／年齢）→ **記事化しない**。商品タグ/ファセット・カテゴリページ・おためし点描写メーカーで拾う（仕様 SSOT: [pack-design.md §25](./product/pack-design.md)）
- **情報意図**（効果／鍛える／教え方／できない・苦手／つまずき／公文図形／見取り図描き方／とは）→ **記事（Cluster）**

**記事の縮減**: 旧 32 本構成 → **確定 8 記事＋P1 正規ハブ＋学術土台 C3-4＋LLMO 2＋FAQ 3 ＝ 16 ページ**。
- 確定 8: C4-2 空間認識能力(1,300)／C3-1 見取り図(140)／C2-1 公文図形(140)／C4-1 点描写効果(70・旗艦)／C3-2 点描写できない・苦手(50+50)／C3-3 小4つまずき(50)／C2-3 公文算数図形(30)／C5-1 教え方(10)
- **降格**（カテゴリLP・商品タグ・選びガイドUI・メーカーへ）: C1-2 始め方／C1-3 レベル選び／C1-4 立体／C1-5 年齢別／C4-3 空間認知プリント／C4-9 図形ドリル選び方
- **削除**: C4-4 ピグマリオン比較（競合名直撃で直接的すぎ＋立体は良問が作りにくく訴求弱）
- **統合**: C4-5〜C4-8 指名比較は軽量 LP／L-1 へ・C3-5 漢字字形は L-2 へ・C3-2 に「点描写 できない」統合し格上げ

**温存**: リサーチ上の全ワード（VOL）は [keyword-research.md](./content/keyword-research.md) に記録として残す。設計（何を記事にするか）と調査（市場に何があるか）を分離。

→ [clusters.md §1.5](./content/clusters.md)・[urls.md](./content/urls.md)・[pack-design.md §25](./product/pack-design.md)

### 3.41 Phase 構成 4→3 統合（2026-05-28）

旧 4 フェーズ（Phase 0/1/2/3・案 H''・2026-05-22）を 3 フェーズに統合。旧 Phase 1（ソフト開店）と旧 Phase 2（修正）は acquisition 観点で実質連続体であり、境界に対応する acquisition イベント（DM／広告学習サイクル／モニター回収）が薄かったため、新 Phase 2 として束ねた上で内部マイルストーン M2a（前半 6 週）／M2b（後半 4 週）で連続グラデーションを表現する。

**新体系**:
- **Phase 1**（旧 Phase 0 相当・1-2 週・仕込み）: App＋P1 正規ハブ先置き／DM 1 通目開始／広告 ¥10,000 ピクセル学習
- **Phase 2**（旧 Phase 1+2 統合・10 週・先行リリース）:
  - M2a 前半 6 週：サイト本体＋ SKU 通常販売＋モニター募集／**C3-1 ブルーオーシャン公開**
  - M2b 後半 4 週：フィードバック反映＋**P4 主力 C4-1** 投入＋ FAQ 3 本
- **Phase 3**（旧 Phase 3 維持・13 週〜・本リリース）: 受動拾い LP／DM 3 通目（クーポン）／規模化広告 ¥100,000+/月
- **春 LP**: 絶対時刻トラックとして独立扱い（毎年 1 月公開）

**対外呼称**: 「先行リリース」= Phase 1+Phase 2 ／「本リリース」= Phase 3。設計書内部表記と対外表記が初めて一致（旧体系の二重帳簿問題を解消）。

**統合判断の根拠**（オーナー判定 2026-05-28）:
1. 旧 Phase 1 で「全 140 SKU 通常販売開始」しており旧 Phase 2 と販売状態が同じ
2. 旧 Phase 1/2 境界に対応する acquisition イベントが薄い（DM／広告学習／モニター回収のいずれも境界に乗らない）
3. 既に [launch/plan.md §2.3](./launch/plan.md)（旧）で対外 2 段階呼称（先行リリース＝0+1+2／本リリース＝3）と内部 4 Phase の二重帳簿が併存していた
4. 春 LP 時期固定運用（毎年 1 月）と Phase 軸（相対時刻）の直交を Phase 表現に押し込む条件分岐（旧 §2.4）が複雑化していた

**広告予算の連続グラデーション**: 旧 Phase 1（¥20-30k）／旧 Phase 2（¥50-80k）の段差は、新 Phase 2 内の M2a → M2b マイルストーン遷移として表現。広告ピクセル学習サイクル（30 日）は Phase 1 で開始し Phase 2 M2a へ継承される設計（[acquisition/ads.md §2.1](./acquisition/ads.md)）。

**templates.md phase enum**: 値（`phase-1` / `phase-2` / `phase-3`）は新番号体系と一致するため enum 自体は維持。ただし `phase-1` の**意味が反転**:
- 旧: 初期フェーズ・全 140 SKU 通常販売中・SEO 記事公開
- 新: 仕込み・SKU 非公開・App＋P1 ハブのみ

このため既存ドラフト記事の frontmatter `phase: phase-1` を持つもの → `phase: phase-2` へ全数書き換え必要（別タスク化）。

**不採用案**:
- 旧 Phase 0+1 を新 Phase 1 に統合する案: CV 地点が同じ `generated_pdf` で acquisition 整合は良いが、「仕込み」と「ソフト開店」の性質差が消えるため却下
- 旧 Phase 0 を新 Phase 1 の冒頭マイルストーンに降格する案: Phase 0 の概念自体を消すが、acquisition の「学習データ収集」と「販売開始」の性質差が強いので独立 Phase を維持

**退避**:
- 旧 plan.md（4 フェーズ）: [archive/retired-designs/2026-05-28-launch-plan-old-4phases.md](./archive/retired-designs/2026-05-28-launch-plan-old-4phases.md)
- 旧 phases.md（4 フェーズ）: [archive/retired-designs/2026-05-28-launch-phases-old-4phases.md](./archive/retired-designs/2026-05-28-launch-phases-old-4phases.md)
- 旧 ads.md §2: [archive/retired-designs/2026-05-28-ads-old-4phases.md](./archive/retired-designs/2026-05-28-ads-old-4phases.md)

**現行 SSOT**: [launch/plan.md](./launch/plan.md)／[launch/phases.md](./launch/phases.md)

**残作業（次セッション以降）**: ① acquisition/ads.md §2 全面書き換え／② acquisition/channels.md・funnel.md の Phase 名置換／③ content/templates.md §2.3-§2.4 書き換え＋既存ドラフト frontmatter 棚卸し／④ B 級単発参照ファイル 8 本／⑤ engineering/phase-1-todo.md リネーム＋ HTML 再生成。

**注**: 本ファイル内の §3.21（Phase 0 廃止）／§3.30（Phase 0 復活）／§3.32（死の谷対策 Phase 別配置）／§3.33 等の旧 Phase 0/1/2/3 表記は当時の 4 フェーズ体系の史料として原文維持。新体系への対応は本セクション（§3.41）を参照。

### 3.40 Article page Pillar 表示名：SSOT「点図形（点描写）とは」に統一（2026-05-27）

Design rev.5 セッション後のレビューで、Article page mockup の breadcrumb / kicker が **「Pillar 1・図形の手前」** という SSOT 未登録の表示名を使っていることが判明。SSOT (`content/pillars.md §1`) で確定済みの **「P1 点図形（点描写）とは」** に統一する判断を確定。

**判断**: **(A) Pillar 名のみ SSOT に揃える。記事 H1 は mockup サンプルとして残す**。

**判断理由**:
- SSOT P1 名は SEO 主軸クエリ（「点描写」1,900／月）と一致する正規名。**検索流入の主トラフィック源**で UI 表示名を変えると SEO 内部リンクと UI 表示が乖離する
- 「図形の手前」は Design AI の創作で、Cluster／URL／クエリ群いずれにも紐付かない
- 記事 H1「点描写の手前にあるもの — 視覚空間認知の足場」は SSOT 未登録の創作だが、**Article page の component 検証用 mockup として機能している**ため修正対象外。実記事執筆時に SSOT C1-x Cluster と整合させる

**修正対象**:
- Design rev.5 `mockups/article.html`:
  - breadcrumb: 「記事 / Pillar 1・図形の手前 / 点描写の手前にあるもの」→「記事 / Pillar 1・**点図形（点描写）とは** / 点描写の手前にあるもの」
  - kicker: 「PILLAR 1 · 図形の手前」→「PILLAR 1 · **点図形（点描写）とは**」

**残課題（持ち越し）**:
- 記事 H1「点描写の手前にあるもの」は実記事執筆時に SSOT Cluster と整合させる
- Pillar 表示名の breadcrumb 用「短縮表示」が必要か検討（「Pillar 1・点図形とは」等の表示制約対応）

→ [content/pillars.md §1](./content/pillars.md)

### 3.39 LP Hero H1 確定：rev.4「点描写プリントの、専門店です。」を維持（2026-05-27）

Design rev.5 セッション後のレビューで、`mockups/landing.html` の Hero H1 が **「図形の基礎は、点描写から。」**（Klee Tier ① の typography specimen 例文の流用と推測）に変わっていることが判明。**2026-05-25 セッションで確定済みの rev.4 H1「点描写プリントの、専門店です。」を維持**する判断を確定。

**判断**: **(A) rev.4「点描写プリントの、専門店です。」を維持。Design rev.5 mockup 側を修正**。

**判断理由**:
- 2026-05-25 セッション ([decisions.md §3.36](./decisions.md)) でオーナーが**意識的に「業態主役」**へ刷新したばかり。10 日でこれを覆す積極理由はない
- Hero での「業態を 3 秒で伝える」訴求は LP の入口性能を担保する根幹で、後から再検討の余地はある
- 「図形の基礎力」（H''' 看板能力名）を Hero に降ろす案は今回見送り。**§2 以降の中盤訴求で出す方が、業態 → 価値の流れが自然**

**修正対象**:
- Design rev.5 `mockups/landing.html` Hero H1: 「図形の基礎は、点描写から。」→ **「点描写プリントの、専門店です。」**
- お品書き 2 行・Tagline trio・F3 公式訳カード等、2026-05-25 確定の他要素も rev.5 mockup に反映されてるか要確認

**後ろ向き Open**: 「図形の基礎力」フロント看板能力名を **Hero 以外のどこで出すか** は別途検討。候補は §2 リード文・§3 サンプル説明・お品書きキャッチ等。voice-tone.md §1「フロント＝図形の基礎力」を遅延実装する設計を次セッションで検討。

→ [decisions.md §3.36 (2026-05-25 H''' 確定)](./decisions.md) / [foundation/voice-tone.md §1](./foundation/voice-tone.md)

### 3.38 4 群命名 SSOT 確定：MEMORY ベース動詞型を採用・Design rev.5 修正方針（2026-05-27）

Design rev.5 セッション後の Chrome 経由レビューで、**Design 側が「観察 / 変換 / 構成 / 立体」（教育・心理学用語直接型）**で 4 群を命名していることが判明。SSOT `pack-design.md §13.7`（2026-05-26 確定）の **「見て写す / かたちを動かす / 重ねる・分ける / 立体でとらえる」（動詞ベース・親が口にできる粒度）** と乖離していた。さらに Design rev.5 内部でも Chips / Product card は「変換」、Product page breadcrumb は「観察と模写」と**内部矛盾**を起こしていた。

**確定方針**: **SSOT（pack-design.md §13.7）が正。Design rev.5 を SSOT に合わせて全面修正**。

**判断理由**:
- 「観察 / 変換 / 構成 / 立体」は **教育・心理学の専門用語直接型**。親が日常で口にしない硬さで、ブランド Voice の「親が子に寄り添う温度」と乖離
- 「見て写す / かたちを動かす / 重ねる・分ける / 立体でとらえる」は **動詞ベース**で、親が子どもに「次は『かたちを動かす』をやってみよう」と言える粒度
- 「変換 = transform」は心理学・数学用語で、子ども/親の語彙ではない。「かたちを動かす」が機能の本質を残しつつ温度を出している
- voice-tone.md の予防語彙 → 拡張語彙シフト原則（治療→練習プラン等）と同じ思想

**修正対象**:
- **Design rev.5 側（次セッションで Claude Design に依頼）**
  - CO08 Chips · Category pills: A 観察 → A 見て写す（B/C/D も同様）
  - CO07 Product card meta: `B · 変換 · Lv.2` → `B · かたちを動かす · Lv.2`
  - CO09 Pillar row H2: 「変換」→「かたちを動かす」
  - Product page breadcrumb: 「B 観察と模写」→ タスクに応じた正しい群（模写は **A 見て写す**）
  - Product page meta: 「B · 観察」→「A · 見て写す」（タスクが模写なら）
- **SSOT 側（あたしが今すぐ実施）**
  - voice-tone.md に「4 群命名規範：動詞ベース・教育用語直接 NG」を予防的に追記
  - pack-design.md §13.7 は既に正で変更なし

**Critical 学び**: Design AI に「群名は SSOT に揃えてください」と言わず「使いやすい群名にしてください」と渡すと教育用語に流れる。次回以降は **必ず §13.7 の確定表を Design ブリーフに同梱**する。

→ [pack-design.md §13.7](./product/pack-design.md) / [foundation/voice-tone.md §X](./foundation/voice-tone.md)

### 3.37 LP §2 再設計の 3 段反復＋デザインシステム rev.5 着手判断（2026-05-26）

§3.34 でオーナー判定「§2 の練り直しはイマイチ」を起点に、類似商材（少 SKU・専門店・選び方が複雑・購入前理解が要る商材）の LP/EC 構成を **Gemini ＋ GPT-5 に 3 本の DR**として投入。1 日で **3 段の方向修正**を経て、「§2 の問題ではなくデザインシステム rev.4 自体の温度設計問題」と判明。**Design rev.5（ロゴ含む全面再構築）へ着手**を決定。

**3 DR の役割整理**:

| DR | 対象 | 強み | TENZU への寄与 |
|---|---|---|---|
| **Gemini（異業種 15 件）** | チョコ・酒・コーヒー・染色・木のおもちゃ等 | 「説明 × 温度」の分離思想・5 パターン類型化 | 哲学レイヤー（Progressive Disclosure・Invisible Curator） |
| **GPT-5 ①（少SKU EC 10 件）** | LIGHT UP・煎茶堂・カキモリ・木村石鹸・Diaspora・Tom's Studio・Swiss Typefaces・Button Shy 等 | カキモリ型・店主温度の具体 UI／課題別導線の引き出し | 商品詳細・PDF・温度演出／「年齢より課題」軸の裏付け |
| **GPT-5 ②（国内教育 5 件）** | Z 会・七田式・学研「賢くなるパズル」・こぐま会・小学館 | **親ペルソナ視点・課題 × レベル二軸の実装パターン** | **§2 の構造そのもの**／二タブ案 |

**3 DR 共通で支持された方向（参考）**:

1. **全 SKU を平面マトリクスで出さない**（七田式・学研・小学館共通・カキモリも同様）
2. **「課題/用途」を主導線・年齢は補助**（TEAPOND・木村石鹸・Button Shy・Swiss Typefaces・学研全社一致）
3. **「はじめての TENZU」独立導線**（Minimal・LIGHT UP・木村石鹸・Diaspora・Tom's Starter Kits）
4. **「何の力が伸びるか」を一文で言い切る**（小学館・新進工房型）
5. **9 タスクを 3-4 群に束ねる**（GPT-5 ②単独・学研・小学館の小シリーズ感）
6. **Lv 表示は課題カード内に格納**（Swiss Typefaces「54 Styles」型・学研・小学館型）

**3 段の方向修正**:

| 段 | 仮説 | 検証物 | 結論 |
|---|---|---|---|
| **第 1 段** | 「課題から選ぶ × レベルから選ぶ」二タブ＋ 4 群カード（GPT-5 ② 案） | `/wireframe` 実装 | ✅ Plex 系・ボックスありで実装 → ❌ オーナー判定「分類した感が強い」 |
| **第 2 段** | 第三専門家「キュレーション棚→マトリクス→補助の三層」 | 検討のみ | ❌ オーナー判定「ターゲット 8 セル分散（年齢 × 習熟度）で curation 不可」 |
| **第 3 段** | **問題は §2 構造ではなくデザインシステム自体の温度不足** | `/preview` 実装＋`/wireframe` 拡張 | ✅ **方向確定：Design rev.5 へ** |

**第 3 段で確定した v5 デザイン要素**（Code 側 proof-of-concept 完了・SSOT は Design rev.5 で正式化）:

| 要素 | 採用内容 | 検証物 |
|---|---|---|
| **3 階層フォント** | ① 大見出し＝Klee One 600（書写体）／② 温度コピー＝Zen Kurenaido（鉛筆筆致）／③ 構造・メタ・数字＝Plex（rev.4 維持） | `/preview` 全セクション |
| **背景** | **真っ白 + 点描写格子のみ**（24px ピッチ・dot opacity 0.16）。紙クリーム色（rev.4 `#F4F2ED`）・紙繊維ノイズは廃止 | `/preview` 全体 |
| **ボックス削減** | カード・FAQ・Pillar list の box-border 全廃。dashed divider のみで区切る | `/preview` §2・§5・§7 |
| **アンダーライン** | §セクション見出しに 1.5px solid teal の直線（rev.4 まで無し・第 3 段初案の波線は却下） | `/preview` 全 H2 |
| **メモ系の左マーカー** | concern-strip・F3 公式訳・点描写とは details に左 2px teal border の「メモ書き枠」 | `/preview` §2・§5 |

**🔴 §2 構造の確定（運用変更）**:

- **タブ二択は廃止**（第 1 段で却下）。4 群は「分類器 UI」ではなく**棚レイアウト＝情報アーキテクチャ**として温存
- **curation 上層も廃止**（第 2 段で却下）。ターゲット 8 セル分散（年齢 × 習熟度）でおすすめ 3 本に絞れない
- 親が自分で探せる**メタ密度＋温度演出**（フォント・ボックス削減・点格子背景）で「分類した感」を緩和
- Design rev.5 完了後に §2 を最終実装

**4 群グルーピング**（SSOT = [pack-design.md §13.7](./product/pack-design.md)）— 運用ルール訂正:

| 群 | 内訳タスク | F3 三要素 |
|---|---|---|
| **見て写す** | 模写、欠け補完 | 向き＋位置＋大きさ（基礎） |
| **かたちを動かす** | 線対称、回転、平行移動、拡大縮小 | 変換 |
| **重ねる・分ける** | かさね、分解 | 位置＋大きさ |
| **立体でとらえる** | 立体模写 | 全要素（応用） |

**GPT-5 ② 原案「向きを変える」（4 タスク全格納）を改題**：平行移動・拡大縮小が F3「向き」と整合しないため。認知発達順「観察 → 変換 → 統合 → 応用」で並ぶ自然な体系へ補正。

**🔴 Design rev.5 着手の合意**:

rev.4 LOCKED 項目もすべて再検討対象（**ロゴ含む**）。オーナーは「ロゴは Gemini 画像生成 AI で別途リジェネ」方針。

| 要素 | rev.4 | rev.5 スコープ |
|---|---|---|
| ロゴ（4-dot square + Ξ-form E） | LOCKED | **🔴 全面再構築**（Gemini 画像生成） |
| カラー（Ink & Slate） | LOCKED | 維持を基本としつつ、白基調シフトに伴う微調整可 |
| タイポグラフィ | Plex × Noto Hybrid LOCKED | **🔴 Klee One ＋ Zen Kurenaido ＋ Plex の 3 階層へ全面改訂** |
| 角丸（`--radius-soft 4px`） | LOCKED | 維持（ボックス削減と整合） |
| 背景 | 紙クリーム `#F4F2ED` | **🔴 真っ白 `#FFFFFF` ＋点格子へ変更** |
| イラスト・SVG 線質 | 規則的直線 | Design rev.5 で再検討（直線維持 or 手描き化） |

**設計反映先**:

| ファイル | 反映内容 | 状態 |
|---|---|---|
| [product/pack-design.md §13.7](./product/pack-design.md) | 4 群グルーピング SSOT 新設・サマリにも追記 | ✅ 完了 |
| [web/app/wireframe/page.tsx](./web/app/wireframe/page.tsx) | §2 二タブ＋ 4 群展開ワイヤー | ✅ proof-of-concept（タブ二択は不採用が確定したが、4 群構造の検証物として保管） |
| [web/app/preview/page.tsx](./web/app/preview/page.tsx) | 本体 LP に v5 デザインを被せた sample | ✅ proof-of-concept（Design rev.5 への入力素材） |
| [web/app/tokens.css](./web/app/tokens.css) | Klee One ＋ Zen Kurenaido のフォントトークン追加 | ✅ 完了（rev.5 で正式化） |
| [design/handoff/rev5-brief.md](./design/handoff/rev5-brief.md) | Design rev.5 セッション用ブリーフ | 🚧 本セッション着手予定 |
| [design/visual-identity.md](./design/visual-identity.md) | rev.5 正式化 | 🚧 Design rev.5 完了後 |
| [web/app/page.tsx](./web/app/page.tsx)（本体 LP） | rev.5 反映 | 🚧 Design rev.5 完了後 |
| 商品ページ・記事ページ・Maker App UI | rev.5 反映 | 🚧 Design rev.5 完了後・5 卒業計画 ③④⑤ |

**店主の温度演出（3 DR 共通指摘）**:

Design rev.5 で「全ページに痕跡を散らす」運用方針も含めて再設計。商品詳細「店主の観察メモ」と PDF フッター「親向け一言メモ」は実装層なので Design rev.5 後の実装で扱う。

**不採用案の記録**:

| 案 | 不採用理由 |
|---|---|
| GPT-5 ② 提案「課題から選ぶ × レベルから選ぶ二タブ」 | オーナー判定「タブ二択は親に選択責任を渡す＝冷たい売り場」。第 1 段で実装→却下 |
| 第三専門家「キュレーション棚（はじめての／図形好き／店主おすすめ）上層」 | ターゲット 8 セル分散（年齢 × 習熟度）で curation 不可。第 2 段で却下 |
| Hero CTA 3 本拡張（curation 性質） | 同根の理由で却下 |
| 紙繊維ノイズ（fractalNoise）背景 | 第 3 段で点格子と併用→オーナー判定「真っ白に」で廃止 |
| 紙クリーム色（`#F4F2ED`・rev.4） | 同上 |
| 波線アンダーライン（第 3 段初案・SVG path 鉛筆風） | オーナー判定「波線だと合わない」→ 1.5px solid teal の直線へ |
| こぐま会型「順序カリキュラム」（DR 由来） | 受験くさく出る・「家庭で無理なく」と整合せず |
| Z 会型「学年タブ先行」（DR 由来） | 年齢より課題で推奨が変わる TENZU の前提と不整合 |
| Gemini 推奨「Sensory タグ（#ヒラメキ #ジックリ思考）」（DR 由来） | 既存設計で Sensory 化済・二重タグで情報過多 |
| Gemini 推奨「想像のトビラがひらく」系コピー（DR 由来） | 煽りに近い瞬間性／voice-tone.md §1 拡張語彙シフトとズレ |

→ [pack-design.md §13.7](./product/pack-design.md) / [design/handoff/rev5-brief.md](./design/handoff/rev5-brief.md) / 関連セッション: 2026-05-26 セッション

---

### 3.36 3-way DR 統合・ブランドアーキテクチャ最終確定（2026-05-25 夜）

LP 違和感を起点に投げた 4 論点 DR（Gemini ＋ GPT-5）の回答が揃い、あたしの実測ベース判断と統合した結果、**ブランドの 3 層構造を最終確定**。同日 §3.35 二刀流ルールから一歩進めて、看板（Hero）レイヤーの構造転換まで含む大規模アーキテクチャ確定。

**3-way 統合結果**:

| 論点 | あたし（実測） | Gemini | GPT-5 | **最終確定** |
|---|---|---|---|---|
| 1 用語 | 二刀流 | 認識完全排除 | 認知=学術 RTB／フロント使わず／FAQ で違い扱い | **二刀流維持**＋H1 認識採用範囲を P4 啓蒙ハブ／L-2 限定に縮減 |
| 2 看板 | 点描写プリント維持 | Hero=図形の基礎力 | Hero=図形の基礎力／空間認知=RTB | **🔴 Hero に「図形の基礎力」採用**（2 AI 一致＋あたしの「流入語と Hero 機能混同」自省） |
| 3 9タスク | 中受操作×OS バランス | OS→アプリ グラデーション | 入門/学校接続/差別化 3層 | **両メタファー併用**（説明文に採用）／3層 SKU 再編は次セッション宿題 |
| 4 屋号 | TENZU 維持 | TENZU 維持 | TENZU 維持＋**天美 TENBI 衝突発見** | **TENZU 維持確定**・TENBI 完全棄却・descriptor 必須運用 |

**🔴 ブランドアーキテクチャ最終 3 層構造**:

| レイヤー | 採用語 | 場所 |
|---|---|---|
| **屋号** | **TENZU 維持**（点図形プリント専門店 TENZU・descriptor 必須セット） | 屋号紹介・LP H1 上部・About |
| **Hero 看板能力**（フロント・購買心理直撃） | **図形の基礎力** | LP Hero・広告・初回購入導線・商品サムネ |
| **学術 RTB**（裏付け・専門性） | **空間認知の土台**（学術正式名） | PR・LLMO・evidence.md・記事 H2-2 以降 |
| **SEO 流入**（用途別二刀流） | 点描写プリント＋空間認知プリント＝メイン／空間認識＝啓蒙記事 H1 限定 SEO 例外 | カテゴリ／記事 H1 |

**🔴 Tagline 最終確定（H'' Tagline trio → H''' へ）**:

| | 採用 |
|---|---|
| **メイン Tagline** | **「図形の基礎は、点描写から。」**（GPT-5 案・ChatGPT 提案ベース） |
| **サブ Tagline** | **「模写から対称・回転・立体まで。空間認知の土台を、家庭で着実に。」**（GPT-5 案） |
| **業態識別句** | 「点図形（点描写）プリントの専門店 TENZU」（H'' 維持・Hero 上部または直下） |
| **現行「点と点がつなげるようになったら、点描写を。」** | **降格活用**：オンボーディング（最初の 1 枚案内）・FAQ「何歳から？」「点つなぎとの違い」セクション。CEP1 拾い導線維持 |

**Tagline 改訂の Why**:

- GPT-5 案「家庭で着実に」は [voice-tone.md §1 拡張フレーム](./foundation/voice-tone.md) と完全整合
- Gemini 案「点をつなぐ。図形が見える」は「見える」が結果保証ニュアンス（voice-tone NG 抵触リスク）／サブ「算数の壁を越える」は煽り「○年生で差がつく」型抵触
- GPT-5 案は MISSION「点描写を家庭の当たり前にして…」と語感一致

**TENBI 完全棄却の根拠（GPT-5 新発見）**:

- 日本酒ブランド **長州酒造「天美 TENBI」** が日本国内検索で支配的・指名検索敗北確定
- 商標調査の**称呼類似負荷**が極めて高い
- 音象徴での若干の優位（軽さ・親しみ）は決定打にならない
- tenzu.jp 取得済み・ロゴ・SNS・既存言及など埋没コスト >> 改名ベネフィット

**descriptor 必須セット運用**（GPT-5 推奨）:

- ロゴ・ヘッダー単独で「TENZU」は使わず、必ず「**点描写プリント専門店 TENZU**」または「**TENZU てんず**」＋日本語 descriptor とセット
- 初見の理解コストを下げ・「点図形＝図形に強くなる場所」のブランド意味整合を毎回担保

**あたしの前回判断の自省（論点 2）**:

「Hero に『図形の基礎力』を出すと塾系 SEO 戦場（競合性 79-100）に巻き込まれる」と反論したが、これは**流入語と Hero コピー機能の混同**。SEO 流入は「点描写 プリント 1,600」「空間認知 プリント 320」から来るので、Hero コピーは**流入後の親の理解と決断**を担う翻訳機能。学校語彙「図形」が刺さるほうが CV 高い。GPT-5「LP・広告・初回購入＝図形／PR・LLMO＝空間認知」用途分けが正解。

**論点 3 タスク評価の統合**:

- Gemini「OS（模写・欠け補完）→ 幾何アプリ（タスク 3-9）グラデーション」
- GPT-5「入門（模写・欠け補完）／学校図形接続（対称・平行移動・拡大縮小）／TENZU 差別化（回転・かさね・分解・立体模写）」
- 両者は補完的。**ブランド差別化の芯は変換系（回転・かさね・分解・立体模写）**で一致。LP §2 マトリクスの解説文・商品ページの「主に伸びる力」記載に両メタファー採用

**設計反映先（同日完了予定）**:

| ファイル | 反映内容 |
|---|---|
| [foundation/brand.md §12](./foundation/brand.md) | Tagline 全面改訂（H'' trio → H''' 3 階層） |
| [foundation/voice-tone.md §1](./foundation/voice-tone.md) | ①「図形＝フロント／空間認知＝RTB」用途分けルール ②descriptor 必須セット運用 ③H1 認識採用範囲限定 |
| [content/evidence.md §3](./content/evidence.md) | Gemini 意味論整理（認知=WM+実行機能）＋GPT-5 APA spatial cognition 定義追記 |
| [content/clusters.md L-2](./content/clusters.md) | 「認知 vs 認識 違い」FAQ を LLM 参照先づくり目的として仕様強化 |
| [content/pillars.md §5 P4](./content/pillars.md) | H2-1 主見出し「点描写の効果」→「点描写で育つ図形の基礎力（RTB=空間認知）」改訂 |
| [web/app/page.tsx](./web/app/page.tsx) | LP Hero リファクタ第 2 波：H1 を「図形の基礎は、点描写から。」へ・現行 H'' Hero「点描写プリントの、専門店です」は業態識別句として H1 直下に降格 |

**残宿題（次セッション以降）**:

- [product/pack-design.md](./product/pack-design.md) / [product/pack-tasks.md](./product/pack-tasks.md) SKU 3層再編（入門/学校接続/差別化）：本日 7 番タスクとして提示したがオーナー判断で見送り。商品ページ「主に伸びる力」記載は別途検討
- LP §3 効能セクション新設（「図形の基礎力 = 学校算数のどこに効くか」可視化）

→ [keyword-research.md §12](./content/keyword-research.md) / [voice-tone.md §1](./foundation/voice-tone.md) / [brand.md §12](./foundation/brand.md) / [clusters.md](./content/clusters.md) / [pillars.md §5](./content/pillars.md)

---

### 3.35 「空間認知」vs「空間認識」二刀流運用確定（2026-05-25）

LP「空間認知の土台をつくる」サブコピーへの違和感を起点に、ラッコキーワード GoogleLive で**空間認知 族 267 ワード／空間認識 族 247 ワード**を全数実測。「空間認識能力」9,900/月が「空間認知能力」1,900/月の **5.2 倍**であることが判明。ブランド軸は「空間認知」のまま固定し、SEO 啓蒙記事のみ「空間認識」を H1 採用する**二刀流運用**を確定。新発見「**空間認知 プリント 320／競合性 1**」は P4 配下 Cluster として新設。

**実測ハイライト（[keyword-research.md §12](./content/keyword-research.md)）**:

| 系統 | 空間**認知** | 空間**認識** | 倍率 |
|---|---:|---:|---:|
| 〜能力（看板級） | 1,900（競合性 1） | **9,900**（競合性 0） | **5.2倍** |
| 〜能力 鍛える | — | **1,300** | — |
| 〜能力 低い | 170 | **1,000** | 5.9倍 |
| 〜能力 テスト／診断 合算 | 110 | **1,990** | 18倍 |
| **〜 プリント** 🔥 | **320**（競合性 1） | 40 | **0.13倍**（認知が逆転） |

**構造的発見**:

- **「認識」族＝抽象・自己診断・大人世界**（合計 推定 15,000+/月）。検索意図はスポーツ／運転／VR/AR／発達障害評価 → TENZU 縁遠いが流入母数大
- **「認知」族＝教育・知育・プリント世界**（合計 推定 5,000-6,000/月）。検索意図はプリント探し → TENZU 直結
- **「違い」系全ゼロ**（空間認知 空間認識 違い 0 など）→ LLMO 専用テリトリーとして L-2 で押さえる
- **新発見「空間認知 プリント 320／競合性 1」**: 「点描写 プリント 1,600」隣接の購買意図最強ワード。商品 PDF 140 SKU と直結

**運用ルール（[voice-tone.md §1](./foundation/voice-tone.md) 確定）**:

| 場所 | 採用語 |
|---|---|
| ブランド軸（LP・MISSION・Hero・サブコピー・商品・FAQ・voice） | **空間認知** 固定 |
| 啓蒙記事の H1・冒頭引用 | **空間認識** 許容（SEO 例外） |
| 啓蒙記事の本文 | **空間認知** へブリッジ必須（「教育心理学では『空間認知』と呼ばれます」） |
| LLMO 専用記事（L-1／L-2） | 両方併記＋「違い」FAQ で TENZU が定義する立場を確保 |

**汚染ゾーン回避必須**: 「空間認識」族には「低い／病気／発達障害／脳梗塞／認知症／スポーツ／VR/AR」など TENZU 縁遠い汚染領域がある。啓蒙記事 H1 で踏むと V1「煽らない」NG 抵触＋ターゲット層誤認。**必ず「子供／家庭／ドリル／育てる」で文脈固定**。voice-tone.md §1 NG grep に「空間認識能力 低い」「空間認識能力 病気」追記。

**設計反映（同日完了）**:

| ファイル | 反映内容 |
|---|---|
| [foundation/voice-tone.md §1](./foundation/voice-tone.md) | 二刀流ルール節新設・NG grep 拡張 |
| [content/keyword-research.md §12](./content/keyword-research.md) | 全数実測 SSOT 化（5 サブセクション） |
| [content/clusters.md](./content/clusters.md) | C4-2 主軸を「空間認知能力 鍛え方 30」→「空間認識能力 鍛える 1,300」昇格／**C4-3「空間認知 プリント 320」新設**／L-2 に「認知 vs 認識 違い FAQ」組込／旧 C4-3〜C4-8 を C4-4〜C4-9 リナンバー／P4 合算 810→**2,430** |
| [content/urls.md §3.5/§8](./content/urls.md) | C4-2 スラッグ変更 `/how-to-train-spatial-recognition/`・C4-3 新設 `/spatial-awareness-printables/`・Schema 拡張 |
| [content/pillars.md §5](./content/pillars.md) | P4 H2 構成 12→13 へ拡張（H2-2 空間認識／H2-3 空間認知プリント新設）・Phase 別公開順反映 |

**戦略含意**:

- P4 が初期 3 か月主トラフィック源として **2,430/月規模に拡大**（指名比較 710＋空間認識主軸 1,300＋空間認知プリント 320＋効果 70＋啓蒙 30）
- ブランド整合と SEO 流入の両取り（[voice-tone.md §1 既存「SEO 例外運用」](./foundation/voice-tone.md) の思想拡張）
- LLMO で AI が「違い」を聞かれた際の引用源として TENZU が**両方をブリッジする立場**を確保

**残宿題**:

- decisions.md §3.36 として論点 2/3/4（看板能力名／9 タスク評価／屋号 TENZU vs TENBI）の DR レビュー結果反映予定（次セッション以降）
- pillars.md P4 LP §5 ARTICLES ハードコード問題は次セッションで [web/](./web/) 側に反映

→ [keyword-research.md §12](./content/keyword-research.md) / [voice-tone.md §1](./foundation/voice-tone.md) / [clusters.md §5・§7](./content/clusters.md) / [urls.md §3.5](./content/urls.md) / [pillars.md §5](./content/pillars.md)

---

### 3.34 案H'' ビジュアル ID 確定＋ LP 初版 Next.js 実装完了（2026-05-24）

Claude Design rev.4 でビジュアル ID（カラー・タイポ・ロゴ）を全項目 locked へ収束。同日中に Handoff to Claude Code → Next.js 16 (App Router) スケルトン化 → LP HTML を React 化 → dev server 動作確認まで完了。**Design セッションを 1 日でクローズし、以降は Code 中心の運用へ移行**。

**rev.1 → rev.4 の収束プロセス（4 ラウンド）**:

1. **rev.1（初版）**: agent デフォルトで「日本の伝統書店」方向に過剰回転（Mincho 明朝・墨と金色・書道風 wordmark）→ 3 軸コンセプト不整合
2. **rev.2（修正）**: 軸再バランス＋ Mincho 全排除＋ Gold 排除＋旧 4-dot symbol を比較対象温存。カラー・タイポ 3 案ずつ提示
3. **rev.3（finalize）**: A・Ink & Slate と A・Plex System をデフォルト化、Plex × Noto Hybrid（記事だけ Noto）に分岐
4. **rev.4（実物 fit）**: 旧ロゴ実物との差分 2 点（4 ドット ⇄ 線のギャップ・カスタム Ξ-form E）反映＋ paper warmth shift（#F2F3F1 → #F4F2ED）＋ P5 用 `.parents-warm` クラスと `--radius-soft: 4px` 新設

**確定値（locked）**:

| 項目 | 値 |
|---|---|
| 主色（ink） | `#1A1F2A`（near-black ink, cool undertone） |
| 背景（paper） | `#F4F2ED`（cool paper-white・rev.4 で warm 寄せ） |
| アクセント（teal） | `#2C6E7F`（青磁・petroleum teal・「達成/注目」限定） |
| 補助 fg | `#424955` / `#767D89` / `#B0B5BD`（fg-2/3/4） |
| 補助 bg | `#EBE8E1`（sunken）/ `#FAF8F3`（raised）/ `#FFFFFF`（PDF substrate） |
| 補助 line | `#D8D6CF`（thin）/ `#A8A69E`（mid）/ `#1A1F2A`（strong） |
| 見出し・UI body | IBM Plex Sans JP 500 / 400 |
| Long-form body（`/articles/` のみ） | Noto Sans JP 400 |
| 数字 | IBM Plex Mono |
| Wordmark | IBM Plex Sans JP weight 500・tracking +0.10em・**カスタム Ξ-form E（縦軸なし 3 横線）** |
| シンボル | 4-dot square・stroke 2.2・**コーナードット浮き（visible gap from frame）** |
| P5 角丸 | `--radius-soft: 4px`（親向け声かけブロック・/for-parents/・Maker reminder のみ） |
| Spacing 基本単位 | 4px（s-1〜s-24） |

**LP 実装範囲（Next.js）**:

- 配置: `C:/dev/TENZU/web/`（Next.js 16 + App Router + Turbopack + TypeScript・Tailwind 不採用）
- ファイル構成: `app/page.tsx`（Server）／`app/SiteHeader.tsx`（Client・useState ハンバーガー＋ scroll 検知）／`app/tokens.css`（design system tokens SSOT）／`app/landing.css`（LP 専用スタイル）／`public/assets/`（logo-square.svg / logo-wordmark.png / watermark-grid.svg）
- 全 7 セクション実装: Hero / Structure（9×5 マトリックス）/ Samples / Maker / Articles / Continuity / FAQ + Footer
- アイコン: Lucide CDN UMD → `lucide-react` パッケージへ置換
- production build エラー 0・dev/prod 両方動作確認済（実機モバイル含む）

**Design / Code 使い分けルール確立**:

- **Design = 視覚言語の定義**（5 セッションで卒業予定: ①design system ✅ ②LP ✅ ③商品ページ ④記事ページ ⑤Maker App UI）
- **Code = 量産・更新・実装統合・モバイル responsive・実 SKU データ反映・JS インタラクション**
- **Design 戻し条件**: token・コンポーネント定義の変更が必要な時のみ。視覚バグ・実装バグは全部 Code 側で

**残課題（次セッション送り）**:

- 9×5 マトリックス: placeholder データ → `product/pack-design.md` SSOT から差し替え
- 5 Pillar 説明文: agent 即興コピー → `content/pillars.md` SSOT から差し替え
- 真正フォントファイル: Google Fonts 代替 → SIL OFL 商用ライセンス確認後に置換
- ロゴ SVG: agent-drawn プレースホルダー → 実デザイナー差し替え方針
- favicon 未設定
- 商品ページ／記事ページ／Maker app UI: 別途 Claude Design セッションで設計後 Next.js 実装

→ [design/visual-identity.md](./design/visual-identity.md) / [design/handoff/](./design/handoff/) / [engineering/README.md](./engineering/README.md)

### 3.33 旧 ChatGPT DR レビュー反映：年齢・季節軸第 4 分類追加＋C1-5/春LP 設計（2026-05-23 後半）

過去に投げて結果が遅れて戻ってきた ChatGPT DR（「TENZU の 5〜10 歳向けビッグワード集客機会」）を案H''／§3.32 確定後の設計に照らしてレビュー。**新セグメント追加・新 CEP 追加・新 LP バリアントは却下し、既存構造内に吸収する精緻化**で対応。

**DR 採用判定**:

| 採否 | 内容 | 理由 |
|---|---|---|
| 🟢 採用 | 年齢入口（年長／小1）＋ 季節入口（入学準備／春）を追加 | 親決済意図が異常に強く、案H'' の S-a 内に内包可能 |
| 🟢 採用 | 「点つなぎの次に」橋渡し記事の独立価値 | 既に C2-2 で扱い中・運筆 5,400 同居拡張で強化 |
| 🟢 採用 | OAI-SearchBot 許可・Product schema・Merchant Center 整備 | engineering/ Phase 1 TODO 追加（次セッション） |
| 🔴 却下 | Pinterest 縦長 2:3 ピン運用・春3ヶ月前仕込み | [channels.md §6 不採用](./acquisition/channels.md)（日本ユーザー数規模・副業運用負荷）を優先・§3.32 死の谷対策 3 も撤回 |
| 🟢 採用 | 「広い入口 → 翻訳ページ → SKU」の三層導線 | 案H'' F2 と整合・春 LP 経由フローを §6 に追加 |
| 🟡 部分 | 自主学習ノートは別クラスタで小さく | 本体不可・LLMO 専用記事 1 本のみで対応予定 |
| 🟡 部分 | 「空間認識」「空間把握」推し | F3 公式訳「形の向き・位置・大きさをとらえる力」優先で吸収 |
| 🔴 却下 | 「治療的・診断的語彙を避けよ」 | voice-tone.md「予防→拡張シフト」で既にカバー済 |
| 🔴 却下 | 検索ボリューム数値そのまま採用 | DR 推定は公開 SERP 推測・**ラッコ実測 13 ワードで再検証**して採用判定 |

**ラッコ実測 13 ワード（2026-05-23）**:

| KW | VOL | 競合性 | 季節性 | 配置先 |
|---|---|---|---|---|
| **入学準備 ドリル** | 320（**春 880**） | 93 | 1-4月明確 | **春 LP（新設）** |
| **年長 プリント** | 320 | **3** | 春ピーク | **C1-5 年齢別入口（新設）** |
| **小1 プリント** | 320 | **2** | 春・夏休み | C1-5 同 |
| 年長 ドリル | 210 | 98 | 通年 | C1-5 内併記 |
| 年中 プリント | 110 | 9 | 微季節 | C1-5 内併記 |
| **運筆 プリント** | 5,400 | **1** | 通年 | **C2-2 同居**（点つなぎ・運筆の次に） |
| 思考力 プリント | 90 | 12 | 通年 | P4 メタ語彙吸収 |
| 入学準備 プリント | 40 | 5 | 1-4月 | 春 LP 内併記 |
| 小2 算数 図形 | 90（**+594% 急騰**） | 5 | 単元期 | **観察のみ・Cluster 化見送り** |
| 入学準備 図形 | **0** | — | — | DR 仮説完全外れ |
| 幼児 ドリル | **0** | — | — | データ元問題か・対応不要 |
| 小1 算数 図形 | 10 | 15 | — | DR 推定 1,000-5,000 大幅外れ |
| 小学校 準備 プリント | 10 | 1 | — | 入学準備 ドリル に吸収 |

**設計反映（4 ファイル）**:

| ファイル | 主な変更 |
|---|---|
| `market/targeting.md` | サマリ 2 行追記／§1 S-a 行を「公文非利用の年齢検索型親」内包に拡張／§1.3 末に小2図形急騰観察メモ／**§1.4 春スパイク新設**／§4.1 表に実測 9 ワード追記＋却下 4 ワード注記 |
| `market/positioning.md` | サマリ 1 行追記／§2.2 末「年齢検索ワードは原則の例外として攻める」注記／§2.3 **「季節・年齢ワード第 4 分類」追加** |
| `content/clusters.md` | サマリ 3 行追記（24→25 本）／**C1-5 新設**（年齢別入口・S-a 受け口）／**C2-2 拡張**（運筆 5,400 同居）／§7 を「記事カウント外 LP 群」に再構成・**§7.2 春 LP 注記新設**／§9 死の谷対策 4 に C1-5 追記／§10 内部リンク方針に年齢入口ライン追加 |
| `acquisition/funnel.md` | サマリ 1 行追記／**§4.3 季節・年齢ワード第 4 分類表新設**／§6 購入導線に春 LP 経由フロー追加／**§10 季節限定 LP（春）完全仕様新設**（時期・FV・CTA・SKU 方針・やらないこと） |

**新規 / 拡張サマリ**:

- 新 Cluster: **C1-5 年齢別入口（年中・年長・小1）** 1 本
- 拡張 Cluster: **C2-2「点つなぎ・運筆の次に」** （運筆 5,400 同居）
- 新 LP（記事カウント外）: **春 LP「入学準備ドリル｜春から始める形と位置の練習」**
- 新セグメント: **ゼロ**（S-a 内部拡張のみ）
- 新 CEP: **ゼロ**（ブランド層ロック維持）
- 新 LP バリアント: **ゼロ**（S-a/S-b/S-c/P3-a の 4 本維持）

**やらなかったこと（意思決定）**:

- **小2 算数 図形 +594% 急騰** は Cluster 化見送り → 観察のみ。VOL 200+ 定着または急騰要因（学校単元 SNS バズ仮説）特定時に C3 追加判定
- **CEP 13/14 追加**（入学準備モード・年齢検索モード）は ChatGPT/Gemini 自発推薦データ蓄積後に判断。ブランド層 8-12 週ロック中（[brand.md §10.1](./foundation/brand.md) 維持）
- **LP バリアント追加**（春 LP / 年齢別 LP をセグメント別 LP に格上げ）却下。layer が違うため funnel.md 側で季節キャンペーン LP として管理
- **優先順位の SSOT 化**は今回見送り。launch/plan.md 改訂時に Phase 別配分として整理

**次セッション着手**:

1. content/keyword-research.md に実測 13 ワード追記（エビデンス記録）
2. engineering/ Phase 1 TODO に「OAI-SearchBot 許可・Product schema・Merchant Center フィード」を追加
3. C1-5・春 LP の Phase 別公開順を launch/plan.md・launch/phases.md に反映
4. MEMORY 更新（今ここの状態を反映）
5. **Pinterest 撤回の波及確認**: clusters.md・funnel.md・targeting.md・keyword-research.md から Pinterest 言及を削除

→ [market/targeting.md](./market/targeting.md) / [market/positioning.md](./market/positioning.md) / [content/clusters.md](./content/clusters.md) / [acquisition/funnel.md](./acquisition/funnel.md)

---

### 3.32 SEO/LLMO Pillar Page 設計 DR 実行＋F1-F5 確定（2026-05-22 後半-4）

§3.31 案H'' 確定後の最優先タスク（[[seo-pillar-dr-brief]]）を実行。GPT-5 ＋ Gemini 両 AI に独立で DR 投入し、ラッコキーワードで GPT 提示数字の完全一致を確認。Pillar 構造を最終確定。並行して F1-F5（FV ／ CTA ／ 空間認知公式訳 ／ App 呼称 ／ PDF/App 差分）を確定。

**セグメント軸の確定**:

- ブランド側 §5.1 a/b/c は **SEO セグメントとしてはそのままでは弱い**ことが両 AI 一致で判明。**「カテゴリ既知/未知 × job 軸（次の一手探索／課題逆引き／比較・選定）」の複合軸**へ再定義
- **§5.1.b 紙とペン重視**: SEO セグメントからは降格→**メッセージレイヤー**として維持（「タブレット 学習 紙」10/月・「紙 学習」30/月でラッコ実測ベースの SEO 単体弱さを裏取り済）。**ブランド軸としては変更なし**
- **書字軸独立 Pillar 案（Gemini 提案）**: 却下。「漢字 字形 苦手」「視覚空間 漢字」両方 0/月でラッコ実測ゼロ。**Cluster 1 本 + LLMO 専用記事**へ降格
- **CEP 空白の追加発見**: CEP6（「点描写」で偶然出会う層）が a/b/c 全空白。CEP7（中受対処）も完全空白で受動拾い扱い継続

**Pillar Page 構造の確定（GPT 推奨ベース・ラッコ補正）**:

| # | Pillar 名 | 主軸クエリ | 月間 VOL 合算 |
|---|---|---|---|
| **P1** | 点図形（点描写）とは | 点描写 1,900 / 点図形 260 / 点描写 効果 70 / 点描写 立体 90 等 | 約 2,500 |
| **P2** | **公文の次に**、家庭で図形を足す（旧「点つなぎの次に」改題） | 公文 図形 140 / 中学受験 低学年 準備 30 | 約 200 |
| **P3** | 形を見て、写す力から | 図形 苦手 小学生 50 / 見取り図 描き方 140 / 小4 算数 つまずき 50 | 約 300 |
| **P4** | 選び方と使い分け（**最優先昇格**） | ピグマリオン 点描写 210 ＋ 天才ドリル 70 ＋ サイパー 70 ＋ こぐま会 40 ＋ 小学生図形ドリル 90 ＋ 図形問題集小学生 90 ＋ 究極の立体 140 | 約 710 |

- **構造**: 単一主柱ではなく**正規ハブ 1（P1）＋ 用途ハブ 3（P2-P4）の階層型**。Google AI Overviews の query fan-out と ChatGPT search の会話文脈解析との整合が根拠
- **P2 タイトル差し替え**: 「点つなぎ 次」0/月 vs「公文 図形」140/月でラッコ実測差が決定的。主タイトルを「公文の次に」、サブ見出しに「点つなぎの次に」を残す形で CEP 1/2 両拾い
- **P4 が最大トラフィックエンジン**: 指名比較系合算 710/月。最優先リソース投入

**F1-F5 確定**:

| # | 確定案 |
|---|---|
| **F1 FV** | **「子供の"空間認知の土台"を、家庭で無理なく育てる。／点図形（点描写）プリント専門店 TENZU。」**（B 案・Brand Promise そのまま）＋ FV 直下に F3 公式訳の即時解説ブロック必須 |
| **F2 CTA** | **メイン「サンプルを見る」**（"中身が見える"差別化の最短体現）／サブ①「おためし点描写メーカーで作ってみる」／サブ②「レベル選びガイドで自分の子のはじめ方を見る」の 3 段構造 |
| **F3 空間認知公式訳** | **「形の向き・位置・大きさをとらえる力」**（視覚空間能力の 3 要素を平易語に分解。9 タスク全対応・LLM 引用しやすい・「とらえる」が静かで Anti-Brand 適合）。サイト全体で**初出時必ず併記運用**、voice-tone.md §1 にルール化予定 |
| **F4 App 呼称** | **「おためし点描写メーカー」**（「ジェネレータ」廃止・親語・入口体験＋競合非カニバリ示唆。GPT・Gemini 一致推奨） |
| **F5 PDF/App 違いの一文** | **「おためし点描写メーカーは、オリジナルの 1 枚を作れる入口。商品 PDF は、レベル順に続ける本練習。」**＋補足「**作るのは画面、練習は紙。**」。「今の 1 枚」案は曖昧として却下、AI 生成の本質を「オリジナル」で言語化 |

**死の谷対策（両 AI 統合・初期 3 か月・**Pinterest 撤回後 4 戦術に縮減**）**:

1. **正規カテゴリ資産を先に置く**（GPT 推奨）: 薄い 40 本量産 ＞ **少数の強い引用資産 4 本 + 15-20 本の Cluster** ＋ 公開サンプル ＋ SKU メタデータ
2. **AI 検索の入口を塞がない**（GPT 推奨）: OAI-SearchBot を robots.txt 許可・構造化データ（HowTo / FAQPage Schema）厳密実装
3. **ブルーオーシャンクエリ一点突破**（両者共通）: 「見取り図 描き方」140/月競合性 0 を P3 配下で押さえる
4. **学術エビデンスの構造的近接配置**（Gemini RAG 対策）: P3 配下に学術背景→点描写解決策の論理展開を機械可読 HTML 構造で配置

**撤回**: 旧対策 3「Pinterest 視覚検索の獲得」（Gemini 推奨）は **§3.33（2026-05-23 後半）で撤回**。日本のユーザー数規模・副業運用負荷の観点で [channels.md §6 不採用](./acquisition/channels.md)の判断を優先。

**CEP 追加候補（両 AI 提案統合・brand.md §10.1 追記予定 5 個）**:

1. 無料プリントで試したあと、少しずつ難しくしたいとき（無料サイトとの階段設計）
2. 市販ドリルを周回するうちに、子供が「答えの形を覚えてしまった」と感じたとき（AI 生成の無限性が刺さる瞬間）
3. アプリやパズルでは楽しめるが、紙に写す時間も取りたいとき（究極の立体の「紙書けない」弱点突き）
4. 見取り図の前に、平面で形をとらえる練習を入れたいとき（140/月の隣接需要）
5. SNS で「空間認識能力が算数の土台」啓蒙投稿を見て、家で何をすればいいか分からず途方に暮れたとき

**ラッコ裏取り結果（GPT 提示数字との完全一致確認・2026-05-22）**:

- GPT 提示 13 クエリ全数値がラッコ実測と**完全一致**: 点描写 1,900／点図形 260／ピグマリオン 点描写 210／天才ドリル 点描写 70／サイパー 点描写 70／こぐま会 点図形 40／究極の立体 140／点描写 効果 70／点描写 立体 90／公文 図形 140／小学生 図形 ドリル 90／図形 問題集 小学生 90／中学受験 低学年 準備 30
- **ゼロ群の判明**: 点つなぎ 次 0／点描写 何歳から 0／漢字 字形 苦手 0／視覚空間 漢字 0／タブレット 学習 紙 10／紙 学習 30
- **減衰トレンド**: 究極の立体 12ヶ月で -54%／中学受験 低学年 準備 -69% 急減

**両 AI 評価**:

- 総合 GPT-5 6 : Gemini 4 で GPT の構造的論理が勝った（階層型 Pillar／b 降格／F2 サンプル主導線が私たちの判断と一致）
- **Gemini の独自貢献**: Pinterest 戦術・RAG 対策の具体性
- 両 AI 共通の致命指摘なし→案H'' のブランド層との整合性 OK

**次セッション**:

1. **brand.md §10.1 CEP 追加候補 5 個を追記**
2. **voice-tone.md §1 に F3 公式訳の併記ルール追記**
3. **content/clusters.md・urls.md 大改修**（P1-P4 ＋ 各 Cluster 5-8 本反映）
4. **launch/plan.md・phases.md 全面改訂**（Phase 0 復活＋ App 仕様反映）
5. **content/personas.md 改訂**（3 セグメント × 年中〜小2）
6. **acquisition/funnel.md 改修**（F1-F5 反映・サンプル主導線設計）
7. **既存 drafts/articles/ 10 本を archive/retired-drafts/ へ退避**

→ [foundation/brand.md](./foundation/brand.md) / DR ブリーフ: [[seo-pillar-dr-brief]] / [content/keyword-research.md](./content/keyword-research.md)

---

### 3.31 案H' → 案H'' 部分改訂：2 AI 合議反映で Pillar 5 本化＋Promise 1 文化＋App 仕様確定＋セグメント 3 分割（2026-05-22 後半-3）

案H' 確定（§3.30）後、GPT-5 ＋ Gemini 2 AI に 9 観点で独立レビューを依頼。両者が**独立に検出した構造的弱点 4 点**＋ Gemini 単独の鋭い指摘 2 点に対応し、案H'' へ部分改訂。**案H' からの「全面書き換え」ではなく「精緻化」**（案H → 案H' と同様のスタンス）。

**2 AI 合致論点（独立検出）**:

1. **P2 解像度と P4 言語化の被り**: 顧客視点で「中身を見せる」と「暗黙知を言葉に」が同じ箱に見える
2. **P3 発見が Pillar ではなく施策レベル**: 特に Gemini が「Product 単体で体現できない構造的矛盾」と指摘
3. **「継続／親子で取り組みやすい情緒的価値」Pillar の欠落**: 4 本は知的・構造的に強いが、家庭で続ける情緒的価値が弱い
4. **Brand Promise 1 文化が未達**: Mission はあるが顧客への約束（売り場の一言）が言語化されていない

**Gemini 単独の鋭い指摘**:

5. **App と PDF 140 SKU の自己カニバリゼーション**: Gemini が「最重要論点」と名指し。App の出来次第でビジネスモデルが揺らぐ
6. **啓蒙の構造的危険**: 「『空間認知は算数達成に効く』という事実そのものが親の焦りを誘発する構造」。クッション言葉で受け手側の変換は止められない

**brand.md 改訂内容（§6・§7・§10・§11.3・§12・§5・サマリ・附録）**:

- **§6 Brand Promise**: 「TENZU は…続けられる形に整え…場所であり続けます」長文版 → **「子供の"空間認知の土台"を、家庭で無理なく育てる点描写プリント」** 1 文版へ全置換。Mission 直結＋業態明示で「3 秒で何の店か」問題を Promise レベルで解決
- **§7 Brand Pillars 5 本化**: 旧 4 本 → 5 本。**P5「継続（親が子に寄り添える設計）」を新設**（PDF 解説・声かけガイド・親向け補助情報）。**P4 言語化を「暗黙知を言葉に」→「タスク × 能力の対応を言語化」へフォーカス再定義**（P2 解像度との被り解消・TENZU 独自の知的資産化）。**P3 発見の実装軸に Sample PDF を追加**（Gemini 指摘の Product 単体で体現できない構造的矛盾を解消）。順序: 体系→解像度→発見→言語化→**継続**
- **§5.1 中核セグメント 3 分割**: 旧「公文家庭は代表例」だけでは抽象すぎて LP・広告・SNS・SEO の判断基準にならないという 2 AI 合致指摘に対応。**§5.1.a 先取り知育／§5.1.b 紙とペン重視／§5.1.c 図形・書字に不安**の 3 セグメントで行動ベース具体化。公文家庭は §5.1.a の代表的入口セグメントへ
- **§10 Positioning**: For を 3 セグメントで明示・4 本柱 → **5 本柱**・because に「親が次の一手と声かけに迷わない補助情報」追加
- **§11.3.1 App 仕様確定（新設）**: ①完全に親向けツール（子供 UI 排除）／②**模写のみ**（9 タスク中の 1）／③**最大 5×5 まで**／④画面で解かせる UI を持たず生成 → PDF ダウンロード一直線／⑤「**作るのは画面、練習は紙**」を FV 明示。これで Gemini 指摘の自己カニバリ問題を機能制限レベルで解消（App = 入口体験／PDF = 本練習）
- **§12 Tagline サブコピー必須併記**: 「**空間認知の土台をつくる。**」を新設。2 AI 両方が指摘した「Tagline 単体でベネフィット欠落」課題に対応。Tagline（いつ？）＋ サブコピー（何が育つ？）＋ 業態識別句（何の店？）の **3 段必須併記**
- **§12 バリアント整理**: 「先取り知育」「紙とペン重視」「図形・書字に不安」の 3 セグメント別 LP ＋ 対処層バリアント 1 本（「図形に、戻り道を。」）に再整理。対処層は本体ブランドには出さず受動拾い専用 LP・FAQ のみ温存

**voice-tone.md 改訂内容**:

- **§1 「予防語彙 → 拡張語彙シフト」新設**: Gemini の鋭い指摘（『空間認知は算数達成に効く』という事実そのものが親の焦りを誘発する構造）に対応。主語を「**欠落の予防**」から「**可能性の拡張**」へシフト。NG 例「○○でつまずかないために」「○○が苦手にならないように」「○年生で差がつく前に」／OK 例「○○を頭の中で自由に動かせるように」「○○の土台になる／支える／広げる」「子の中にひとつ"見える道具"を増やす」。運用ルール：啓蒙記事・LP は拡張フレーム基本／予防・対処型語彙は受動拾い対処層 LP・FAQ でのみ使用
- **NG grep 拡張**: 「つまずかないために／苦手にならないように／取りこぼさないために／やっておかないと／後悔する」追加

**却下・部分採用論点（記録）**:

- **GPT-5 提案「Article Core 降格を撤回し 10 本基幹記事を準 Core に」** → **却下**（オーナー判断・指示）。Article は Sub 維持。Architecture 複雑化のリスクを優先
- **GPT-5 提案「Tagline をベタに『点つなぎの次の、図形プリント。』へ」** → **却下**。案H'' で意図的に避けた「下に見る表現」に逆戻りする危険。サブコピー併記で記憶性を補う方針へ
- **既存記事 10 本「全廃棄」過剰** → 部分採用。**「全廃棄」→「人格刷新で素材保持」へ方針修正**（次セッションで `archive/retired-drafts/` へ移すが、図形でつまずく理由・空間認知の素材は再利用前提で保管）
- **対処層 P3-a 完全降格は勿体ない** → 部分採用。**「図形に、戻り道を。」LP を 1 本バリアント温存**（§12）。本体ブランドには出さず受動拾い専用

**退避**:

- 旧 4 Pillar 構成・旧 P4 定義・旧 Brand Promise 長文版 → [archive/retired-designs/2026-05-22-brand-anh-prime-4pillars.md](./archive/retired-designs/2026-05-22-brand-anh-prime-4pillars.md)

**次セッション（案H'' 確定後）**:

1. **案H'' を 2 AI に再投入して点数変化を検証**（今セッション末でプロンプト準備）
2. **SEO/LLMO Pillar Page 設計の DR 実行**（最優先・[[seo-pillar-dr-brief]] 参照）
3. launch/plan.md・phases.md の Phase 0 復活＋ App 仕様反映
4. content/personas.md 全面改訂（3 セグメント × 年中〜小2）
5. market/competitive.md 大改修
6. acquisition/channels.md・funnel.md 改修

**5 評価点（2 AI 平均・案H' 時点）**:

- GPT-5: 総合 3.6/5（一貫性 4.1／差別化 3.7／実装性 3.5／伝達力 3.2）
- Gemini: 総合 3.8/5（一貫性 4／差別化 4／実装性 4／伝達力 3）

→ [foundation/brand.md](./foundation/brand.md)（案H'' 改訂版） / [foundation/voice-tone.md](./foundation/voice-tone.md) / [archive/retired-designs/2026-05-22-brand-anh-prime-4pillars.md](./archive/retired-designs/2026-05-22-brand-anh-prime-4pillars.md)

---

### 3.30 案H → 案H' 部分改訂：Pillar 4本化＋App Phase 0 復活＋Tagline 刷新（2026-05-22 後半）

案H で確定した点描写啓蒙ブランド軸を維持しつつ、オーナーとの突合で 6 点の軸修正を実施。**案H からの「全面書き換え」ではなく「精緻化」**。brand.md を案H' で改訂。

**修正点 6 つ**:

1. **公文家庭の格下げ**: 「中核・旗艦」→「TENZU の理想顧客像に最も近い親層の**例示**」。中核は「公文に通わせるような知育意識のある親」全般。対象年齢を**年中〜**へ引き上げ
2. **戻り道軸の扱い維持**: 削除はせず、対処層向けの受動拾いとして温存（brand.md §6・§12 バリアントで限定運用）
3. **Article の Core 格下げ**: 「Core 2 として Product と並列」を撤回。**Core は Product のみ・Article は Sub**。個人運営での記事工数二倍はスケールしないという現実判断。「事業の二本柱」表現を全削除
4. **Tagline 全面差し替え**: 「点つなぎの次に、点描写を。」→「**点と点がつなげるようになったら、点描写を。**」。完走待ち前提ではなく能力獲得タイミングで自然に移行を促す
5. **ノースクリーン軸のサブ降格**: 「ノースクリーン知育」独立 RTB から「**書く学習は紙とペン**」軸のサブ化へ。タブレットは**対立軸ではなく使い分け**（タブレット = 立体回転・展開図アニメ・選択式／紙 = 書く・線を引く・写し取る）。brand.md §16 章ごと削除、§8 R4・§10 unlike へ分解吸収
6. **App = Phase 0 投入・Core 2 昇格候補**: 「採点支援・進捗記録」アプリ案を撤回、「**自作点描写問題ジェネレータ → PDF 印刷**」設計へ。紙の学習を矛盾なく補強する入口（P3 発見の主実装）。Phase 0 復活で launch/plan.md・phases.md 改訂対象

**Brand Pillars 4 本確定（順序確定）**:

| # | 内部柱 | 役割軸 | 外向けコピー |
|---|---|---|---|
| **P1** | 体系 | Product 軸 | 9タスク × 5レベルで点描写を整理 |
| **P2** | 解像度 | Product / Guide 軸 | 買う前にサンプル・難易度・根拠が読める |
| **P3** | 発見 | App + Article（体験的） | 触って出会える |
| **P4** | 言語化 | Article（知的） | 一次資料で言葉にする |

順序は「体系から入り、解像度で開示し、発見で出会わせ、言語化で納得させる」流れ。旧 3 本（点つなぎの次／紙で続く／中身が見える）の処遇は [archive/retired-designs/2026-05-22-brand-pillars-old3.md](./archive/retired-designs/2026-05-22-brand-pillars-old3.md) に退避。

**Tagline バリアント刷新**:

- 公文家庭向け LP: 「**公文では取り扱わない図形を、点描写で。**」（並列・補完ニュアンス。旧「計算の次は」「公文の図形を、家でそっと。」を廃止）
- 書く学習軸 LP: 「**画面のない時間に、点と点を。**」（旧ノースクリーン軸から名称変更・コピー維持）
- 対処層（受動拾い）: 「**図形に、戻り道を。**」（限定運用維持）

**brand.md 改訂内容（具体的）**:

- サマリ全行更新（Pillars 4 本／Tagline 新コア／Positioning／Equity 5 源泉・項目 1「体系化された段階設計」へ）
- §5 顧客インサイト 3 群を「知育意識のある親層／書く学習志向層／対処層」へ
- §5.1 公文家庭→「知育意識のある親層（中核）」へリネーム＋例示扱い
- §5.2 ノースクリーン→「書く学習志向層（サブ軸）」へリネーム
- §7 Pillars 4 本化＋§7.1〜§7.4（Pillar 間関係／4 本のルール／コピー使い分け／ビジュアル指針）構造化
- §8.0 Equity 5 源泉の項目 1 を刷新／R1・R4 を案H' 整合
- §10 Positioning For/unlike を案H' 整合（タブレット教材は使い分け前提括弧で残す）
- §10.1 CEP 10→7 個に整理（旧 #6 コグトレ／#8 広告ストレス／#10 療育を削除・#1 を「楽しく取り組んでいる子」修正）
- §11.3 Brand Architecture を案① で再構成：Core 1 Product／Core 2 候補 App／Sub Article・Guide／NG
- §12 Tagline コア全置換／バリアント 3 種更新
- §13 啓蒙原則の書き出し「事業の二本柱」前提撤回
- §16 ノースクリーン章ごと削除／§17 点つなぎとの関係を §16 へリナンバー
- 附録 F1-F5 ナラティブを案H' 版に更新

**追加 DR 観点**:

- §10.1 CEP の追加候補探索を次セッションの SEO/LLMO Pillar Page DR で実施
- §11.3 App の Core 2 昇格確定は GPT-5 + Gemini 意見聴取後

**次セッション**:

1. SEO/LLMO Pillar Page 設計の DR 実行（最優先・[[seo-pillar-dr-brief]]）
2. DR 結果で SEO 構造確定・ブランド Pillar 最終調整
3. launch/plan.md・phases.md の Phase 0 復活改訂
4. ペルソナ全面改訂（年中〜・公文家庭は例示）
5. competitive.md 大改修（タブレット教材＝使い分け／天才ドリル・ピグマリオン・コグトレ書籍＝同志）

→ [foundation/brand.md](./foundation/brand.md)（案H' 改訂版） / [archive/retired-designs/2026-05-22-brand-pillars-old3.md](./archive/retired-designs/2026-05-22-brand-pillars-old3.md)（旧 3 Pillar の退避）

---

### 3.29 案G → 案H 軸足移動：点描写啓蒙ブランド軸への全面再起動（2026-05-22）

案G（小受 40 + 小1-2 予防 40 + 中受対処 20）の3層配分を本格反映する前に、オーナーが**根本方針を再考**。案F・案G ともに「受験準備／対処」に対象を閉じ込めていたが、点描写は本来「**知育**」のジャンルであり、受験しない大多数の家庭にも価値が届く。案H へ全面移行。

**案H の中核（オーナーの本意）**:

1. **「点描写＝TENZU」第一ブランド化**: SEO「点描写」一位を中期目標。まずはロングテール
2. **点描写啓蒙**: 「点描写は空間認知を育てる知育」を一次資料に裏付けられた形で広める（コグトレ文脈・漢字書字・算数達成）
3. **EC 収益化は前提として維持**: ボランティアではない。記事と購入導線を一体で設計

**3つの固有前提（オーナー追記）**:

1. **メイン顧客の体感像＝公文家庭**: 公文は受験可否を問わず通わせる多数派クラスタ。公文は図形が対象外のため、補填として点描写は親和性が極めて高い。**「公文の図形補填」は新ブランドの中核訴求**
2. **紙＝ノースクリーン知育**: スクリーンタイム過多時代の積極的価値。タブレット教材との明確な差別軸。**独立 RTB・独立 Pillar 化**
3. **点つなぎとの関係**: 保育園での標準化は狙わない。点つなぎ＝楽しみ・運筆／点描写＝能力向上、性質が違う。**点つなぎを否定せず「点つなぎの次に」と階段で位置づける**

**エビデンス調査（書き換え前に実施・確保済）**:

- 視覚空間 × 漢字書字: Nature Sci Rep 2021（PMC7838263）／PMC7033238
- 視覚空間 × 算数達成: Psychonomic Bulletin & Review 2021 メタ分析（45本）／PMC3729464 縦断研究
- 空間認知 × 一般知能: 図学研究 第34巻 MCT 研究
- コグトレ位置づけ: 三輪書店・東洋館出版社の公式書籍／点描写は「写す」トレーニングとして正統位置
- 市場ギャップ: 無料プリント4強・天才ドリル20万部・ピグマリオン体系本／「点描写を知育の標準に」啓蒙ポジションは空き地
- → 全文は [content/evidence.md](./content/evidence.md) 新設

**brand.md §1-§12 + §13-§17 改訂内容**:

- **MISSION**: 「点描写を家庭の当たり前にして、空間認知の土台を持つ子を増やす」へ
- **Brand Promise**: 「点描写を家庭で続けられる形に整え、空間認知の土台を静かに育てる場所」へ全面書き換え。旧「戻り道」は受動拾い側へ降格
- **Brand Pillars**: 「点つなぎの次／紙で続く／中身が見える」へ刷新。旧「戻れる／ピンポイント／解像度」のうち「戻れる」「ピンポイント」は内部設計実装として温存
- **顧客インサイト**: 「公文家庭（中核）／ノースクリーン志向層／対処層（受動拾い）」の3群へ
- **Positioning**: 「公文家庭の図形補填を中核に、点つなぎの次の段階として点描写を体系化した家庭向けプリント専門店」へ
- **CEP**: 10個に拡張（点つなぎ完走／公文の図形手薄／タブレット教材から離れたい／漢字の書き順／コグトレ／無料プリント広告ストレス／中受／療育 等）
- **Tagline**: 「**点つなぎの次に、点描写を。**」へ。バリアントとして公文向け「**計算の次は、点描写を。**」、ノースクリーン軸「**画面のない時間に、点と点を。**」、対処層（受動拾い）に旧コア「図形に、戻り道を。」を限定運用
- **Anti-Brand**: 「**点つなぎを下に見る言説**」「**点つなぎの代替を狙う構え**」「**啓蒙者ぶり**」を追加
- **Brand Architecture**: **Article を Core 2 として Product と並列**（啓蒙が事業の二本柱の片方）。**App は紙（§16 ノースクリーン軸）との緊張があるため、紙の補助機能に限定**
- **新設 §13-§17**: 啓蒙コンテンツ原則／インフル連携方針／専門家監修との関係／ノースクリーン知育としての立ち位置／点つなぎとの関係

**ブランド書き換えのレビュー（次セッション）**:

GPT-5 + Gemini 2 AI 合議でレビュー。観点：(1) 啓蒙と煽りの境界 (2) 漢字書字訴求の科学的妥当性 (3) 「戻り道」削除による P3-a 流入への影響 (4) Tagline 強度。

**連鎖改修（別セッション化）**:

1. voice-tone.md（場所別比率を予防：啓蒙：対処 の3軸へ）
2. personas.md（公文家庭を旗艦に再定義／P-公文-a／P-知育-a/b／P-小受／受動拾い）
3. market/targeting.md・positioning.md（知育啓蒙軸追加）
4. market/competitive.md（無料プリント4強・コグトレ・天才ドリル・ピグマリオン・タブレット教材を正面整理）
5. content/pillars.md・clusters.md（啓蒙寄せ・記事 18-20 本再選定）
6. product/pack-design.md（Lv.0 検討／空間認知ラベリング）
7. acquisition/channels.md・funnel.md（インフル連携を中核チャネル化）

→ [foundation/brand.md](./foundation/brand.md)（案H 全面書き換え版） / [content/evidence.md](./content/evidence.md)（一次資料 SSOT 新設）

---

### 3.28 案F → 案G 軸足移動：3層配分の再定義＋ブランド再検討着手（2026-05-22）

ラッコキーワード 6バッチ＋AI 検索テスト 5問×2 AI（Gemini／ChatGPT）＋外部 Deep Research 2本（Gemini／ChatGPT）の統合インサイトを踏まえ、案F の P3-a 全振り戦略を放棄し、**3層配分構造（案G）**へ移行。

**新ターゲット配分**:

| 層 | 配分 | 位置づけ | 主訴求 |
|---|---|---|---|
| **小1-2 中受予防層** | 40% | メイン | LLMO（ChatGPT が Q4 で点描写を最優先推薦） |
| **小学受験層（新規追加）** | 40% | メイン | SEO「点描写プリント」1,600/月＝小受層が主体 |
| **小4 中受躓き P3-a** | 20% | 受動拾い | サブ層・SNS/DM 経由 |

**判断の根拠**:

1. **ラッコ調査の結論**: 「中受 × 症状」直球検索は壊滅的（月0-10）。「点描写プリント」1,600/月の検索者は小受・低学年層が主体。P3-a 親は Google 検索行動として実在しない
2. **AI 検索テストの結論**: ChatGPT は Q3（育成系）・Q4（低学年予防）で点描写を自発推薦、Q4 では「超重要・最優先」と明示。Gemini は Q2 直球以外で点描写ゼロ言及。**LLMO は ChatGPT 優先で確定**
3. **DR 2本の合意**: 「P3-a 全振り」も「低学年予防全振り」も棄却され、併走推奨。ChatGPT DR は「初期売上は低学年で確保、P3-a には時間をかけて橋を架ける」を第一推奨
4. **競合の弱点 = TENZU の機会**: 天才ドリル「入試直結性なし」・究極の立体「紙書けない」・立体王「体系性なし」→ TENZU の 140SKU 体系で全て埋められる
5. **LTV 導線**: 小受 → 小1-2 予防 → 中受低学年 → 中受本番（6-8年顧客化）

**ブランド Promise 再検討（次セッションで 2 AI 合議）**:

「**図形に、戻り道を。**」は対処層前提。予防 40 + 小受 40 = 80% が予防文脈になるため、Brand Promise・Tagline・Pillar の再設計が必要。`foundation/brand.md` §1-§12 を GPT-5 + Gemini レビュー再投入予定。MISSION「図形力が得意な子を増やす」は維持。

**既存 drafts/articles/ 10本の処遇**: 全廃棄（再検討）。Pillar A 校了済の `point-drawing-guide.mdx` 含む全10本を `archive/retired-drafts/` へ退避予定。次セッション以降の記事選定は予防＋小受文脈で 18-20本を再選定。

**チャネル設計の刷新**:

- **LLMO（ChatGPT 優先）= 中核**
- **SEO = 補完**（点描写プリント／見取り図描き方／小4算数つまずき／小学受験 点描写）
- **インフル DM = 補助線**（プロ講師＝権威付け／Instagram知育＝量的リーチ。主軸ではない）

**次セッション以降の改修順序**:

1. ブランド再設計（`foundation/brand.md` §1-§12・2 AI 合議）
2. ペルソナ再定義（`content/personas.md`・P0 小学受験層新設）
3. 市場・獲得設計刷新（`market/targeting.md`・`market/positioning.md`・`market/competitive.md`・`acquisition/channels.md`・`acquisition/funnel.md`）
4. コンテンツ再設計（`content/pillars.md`・`content/clusters.md`・記事18-20本選定）
5. ローンチ計画調整（`launch/plan.md`・`launch/phases.md`）

→ [content/keyword-research.md](./content/keyword-research.md)（調査エビデンス全集）

---

### 3.27 gtm.md 解体完了・SSOT 再配置（2026-05-21）

§3.26 の領域分割を受けて骨組み状態だった `acquisition/channels.md` `acquisition/funnel.md` `market/positioning.md §2` に本文を流し込み、旧 `market/gtm.md`（310行・8節）を解体・退避完了。

**移植マップ**:

- `market/gtm.md` §1・§2・§4・§8（集客チャネル・DM 戦略・広告・学習リソース）→ `acquisition/channels.md`
- `market/gtm.md` §5・§6・§7（SEO ワード分離・連載・購入導線・メアド）→ `acquisition/funnel.md`
- `market/gtm.md` §5 の市場ポジショニング部分 → `market/positioning.md §2`
- `market/gtm.md` §3（点描写作成アプリ戦略・DM フック前提）→ [archive/retired-designs/2026-05-21-app-as-dm-hook.md](./archive/retired-designs/2026-05-21-app-as-dm-hook.md) へ完全退避（アプリ Phase 3 後降格で前提崩壊）

**DM 3通の SSOT 化**: phases.md §3.4／§3.5／§5.5 の DM 構造を `acquisition/channels.md §3` に SSOT 集約。phases.md 側はタイミング・運用のみ残し、構造詳細は channels.md 参照に切り替え。コピー文は「たたき台」注記付き（ユーザー側で本リリース前に書き直し）。

**案F 反映**: 移植時に「自己診断ツール → レベル選びガイド」「Phase 0 アプリ前提 → 削除」「処方箋・特効薬 → 練習プラン・次の一手」等を一括適用。

**退避**: `market/gtm.md` 削除＋ [archive/retired-structures/2026-05-21-gtm-monolith.md](./archive/retired-structures/2026-05-21-gtm-monolith.md) に経緯記録（全文は git 履歴）。

→ [acquisition/channels.md](./acquisition/channels.md) / [acquisition/funnel.md](./acquisition/funnel.md) / [archive/retired-structures/2026-05-21-gtm-monolith.md](./archive/retired-structures/2026-05-21-gtm-monolith.md)

---

## §4. 配布・認証・サンプル（C-3）

> 一次ソース: [product/service-blueprint.md](./product/service-blueprint.md)

### 4.1 無料サンプル方針確定（2026-04-19）

**独立サンプルPDFは提供しない**。試食は「アプリ」「WEBプレビュー」「記事内サンプル」の3層で代替。**B-2ローンチ要件**: 各タスク（9種）の紹介記事＋サンプル問題必須。
→ [pack-design.md §14.6](./product/pack-design.md)

### 4.2 アカウント機能 Phase 1 不要

Stripe Link＋MailerLiteで代替。
→ [acquisition/funnel.md §6.1](./acquisition/funnel.md)

---

## §5. 集客・GTM

> 一次ソース: [acquisition/channels.md](./acquisition/channels.md) / [acquisition/funnel.md](./acquisition/funnel.md)

### 5.1 ブロガーDMは2段構え

1通目アプリ紹介 → 2通目先行体験提案。
※ 2026-05-08 フィードバック駆動型転換に伴い、2通目は「お礼＋無償提供」に変更（投稿依頼ではない）。

### 5.2 SEOワード分離（2026-04-02）

流入ワード（点描写 プリント等）と転換ワード（図形苦手・展開図苦手等）を分けて設計。
→ [acquisition/funnel.md §2](./acquisition/funnel.md)

### 5.3 連載コンテンツ × リマケ（2026-04-02）

メアドなしのナーチャリング。
→ [acquisition/funnel.md §4.1](./acquisition/funnel.md)

### 5.4 リマーケティング導入（2026-04-02）

広告予算の30〜40%をリマケに配分。
→ [acquisition/channels.md §5](./acquisition/channels.md)

### 5.5 画面遷移・サイトマップの正本＝テキスト系（Mermaid＋単独HTML）（2026-06-05 / 2026-06-06 更新）

画面遷移図の**正本は [design/navigation/screen-flow.md](./design/navigation/screen-flow.md)**（Mermaid 遷移マップ）、全ページの俯瞰ワイヤーは [design/navigation/pages-overview.html](./design/navigation/pages-overview.html)（単独HTML）。編集はプロンプト経由前提でテキスト系に統一（座標計算なし・`preview` でレンダリング検証可）。確定事項①〜⑤は screen-flow.md §2 に集約。要点のみ：**TOP が玄関兼カタログ**（商品一覧 /products を吸収・メーカーCTAはHero非掲載）／広告は独立LPを持たず **/maker?from=ad モード**で着地／**購入フロー（/cart→Stripe→/thanks）は現状ゼロ＝最優先P0**。

**2026-06-06 変更**：旧正本 draw.io（`screen-flow.drawio`）はプロンプト編集に不向き（絶対座標 XML）のため Mermaid＋単独HTML へ移行。退避記録 [archive/retired-structures/2026-06-06-screen-flow-drawio.md](./archive/retired-structures/2026-06-06-screen-flow-drawio.md)。

---

## §6. 計測・KPI

> 一次ソース: [gtm-measurement.md](./launch/measurement.md)

### 6.1 KPI CVR改定（2026-04-02）

アプリ→購入CVRを **1.5〜2%** に下方修正（旧3〜5%）。サイト遷移→商品理解→Stripe決済の多段ステップを考慮。
→ [gtm-measurement.md §1](./launch/measurement.md)

### 6.2 6ヶ月3シナリオKPI（普通シナリオが基準線）

| 指標 | 好調 | 普通 | 最低 |
|---|---|---|---|
| 月間PV | 15,000 | 8,000 | 3,500 |
| アプリ利用 | 2,000/月 | 900/月 | 400/月 |
| 月間購入 | 40件 | 16件 | 5件 |
| 月間売上 | ¥16,000 | ¥6,400 | ¥2,000 |

→ [gtm-measurement.md §2](./launch/measurement.md)

---

## §7. アプリ

### 7.1 アプリ品質重視（2026-04-02）

MVP的に削らない。AIを活用して丁寧に作る。アプリはブロガーDMのフック＝TENZUの第一印象、という旧戦略は 2026-05-21 撤回（§3.27 参照）。アプリは Phase 3 後の運営判断による別個投入に降格。
→ [archive/retired-designs/2026-05-21-app-as-dm-hook.md](./archive/retired-designs/2026-05-21-app-as-dm-hook.md)

---

## §8. リリース戦略（Tier1 = README残し）

> 一次ソース: [launch/plan.md](./launch/plan.md)

詳細はREADME.mdに残し、本ファイルでは履歴のみ追記。

### 8.1 旧3フェーズ→新4フェーズ転換（2026-05-08）

フィードバック駆動型へ全面再設計。
→ [launch/plan.md](./launch/plan.md)

---

## §X. メアド・アカウント方針（Tier1 = README残し）

詳細はREADME.mdに残し、本ファイルでは履歴のみ追記。

### X.1 メアド取得はStripe決済に一本化

アプリはメアド不要で誠実に。
→ [acquisition/funnel.md §6](./acquisition/funnel.md)

### X.2 メアド方針一部緩和（2026-05-08）

LP上の任意メール/LINE登録を許可（本リリース通知用・アプリ本体は引き続きメアド不要）。
→ [launch-plan.md §4.3](./launch/plan.md)

---

## 履歴的決定の参照ガイド

| 「あれいつ決まった？」と思ったとき | 見るファイル |
|---|---|
| 商品ラダー・タスク構造・モチーフ・SKU構成 | [pack-design.md](./product/pack-design.md) |
| 配布・認証・PDF生成・購入フロー | [product/service-blueprint.md](./product/service-blueprint.md) |
| 集客・ブロガーDM・広告・SEO戦略 | [acquisition/channels.md](./acquisition/channels.md) / [acquisition/funnel.md](./acquisition/funnel.md) |
| KPI・計測・判断基準 | [launch/measurement.md](./launch/measurement.md) |
| 記事構造・Pillar/Cluster・URL | [content/README.md](./content/README.md) 系 |
| FAQ運用 | [content/faq.md](./content/faq.md) |
| リリース計画・先行モニター・Phase | [launch/plan.md](./launch/plan.md) 系 |
| 競合分析 | [market/competitive.md](./market/competitive.md) |
| ブランド定義（§1-§12 SSOT）・MISSION・Values・Tagline | [foundation/brand.md](./foundation/brand.md) |
| Voice/Tone・温度設計・NG/OK・SEO 例外運用 | [foundation/voice-tone.md](./foundation/voice-tone.md) |
| ビジュアル実装ルール | [design/visual-identity.md](./design/visual-identity.md) |
| セッション履歴・経緯 | `~/.claude/projects/C--dev-TENZU/memory/` |
