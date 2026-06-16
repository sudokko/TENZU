---
ep: EP-062
title: acquisition ゼロベース見直し：2 AI DR 4 本＋ 8 ファイル一括反映＋¥200 単品広告回収不能発見
date: 2026-05-27
session: acquisition ゼロベース見直し＋ 2 AI DR 4 本セッション
themes: [acquisition, ai-cross-review, bundle-pivot, ssot-cascade, ads-strategy]
related_docs:
  - acquisition/channels.md
  - acquisition/funnel.md
  - acquisition/ads.md
  - foundation/voice-tone.md
  - product/pack-design.md
  - launch/phases.md
  - engineering/README.md
  - decisions.md
status: draft
public_safe: true
---

## 何が起きたか

TENZU の acquisition 全体を「DM ＋ SEO ＋少額広告」の 3 本柱から、「オーガニック 4 チャネル＋広告独立軸」の二層構造へ全面再設計した。Gemini と ChatGPT に Deep Research を 4 本並走させ（① SNS チャネル別接触動線、②少 SKU 専門店事例、③ AI 自動化ライン、④広告運用）、論点ごとに採点した。結果、ChatGPT が出典付きで Gemini を 3 論点で圧倒し、事例ベース・data-driven・実務具体度のいずれでも上回った。再設計の結論は SSOT 8 ファイルへ一括反映され、channels.md は全面書き換え、funnel.md は §11-§15 を新設、ads.md は新規作成、voice-tone.md §7・pack-design.md §24・launch/phases.md §9・engineering/README.md §6・MEMORY.md がそれぞれ更新された。最大の発見は「¥200 単品では広告回収不能」であり、春 LP 連動の ¥1,000-2,000 バンドル SKU 導入を product 領域に逆波及させた、商品戦略レベルの帰結だった。

## 状況・背景

従来の acquisition 設計は「DM ＋ SEO ＋少額広告」の 3 本柱に信頼基盤を組み合わせる構成で、Phase 1 以降の輪郭は描けていた。しかし SNS の組み合わせ方、AI 自動化前提でのリソース配分、広告と SEO の交点、そして Pinterest 撤回後に残った「死の谷」対策などは未整理のままで、Phase 0 着手前に一度ゼロから組み直す必要があった。

加えて、副業 1 人運営の制約は重く、確保できる作業時間は週 3-5h が現実的なラインだった。この限られた工数を AI 自動化（Claude Pro と Gemini AI Pro）でどこまで巻き取れるかと併せて構造化しなければ、運用計画そのものが破綻する。今回はその両方を同時に解く必要があった。

## やり取りの中身

DR は 4 本並走で組み立てた。① SNS チャネル別接触動線（Instagram・TikTok・X・Threads・note・YouTube）、②少 SKU 専門店事例（紅茶専門、コーヒー豆専門、独立書店等の集客スタイル）、③ AI 自動化ライン（コピー生成、コメント返信、サムネ作成、スケジューラ）、④広告運用（Meta、Google、X 等）。同じ問いを Gemini と ChatGPT に独立投入し、論点ごとに勝敗を採点した。

ChatGPT は 3 論点で Gemini を上回った。事例ベースでは、正和堂書店の事例を引いて「IG は副業 1 人では持続不可能」という Gemini ① のカタログ降格論を実例で反証した。data-driven では、CV 地点の設計（Phase 0-1 は `generated_pdf`、Phase 2-3 は `purchase`）と GA4 イベント 10 個＋ Meta 拡張コンバージョンを具体化した。実務具体度では、月次オペレーションテンプレと予算リスケジュール基準まで降ろした。

オーガニック労力配分（週 3-5h）は、LLMO/SEO 35%、Instagram 30%、ブロガー DM 15%、X 15%、note 5% で確定。広告独立軸は週 1-2h・別予算とし、Meta + Google 検索のハイブリッドで Phase 0 から ¥10,000 検証を開始し、Phase 3 で ¥100,000+ 規模化する道筋を引いた。

構造的発見は 5 点に集約された。第一に、¥200 単品では広告回収が成立しない。そのため春 LP 連動の ¥1,000-2,000 バンドル SKU 導入が必須となり、pack-design.md §24 に新規論点として落とした。第二に、CV 地点を「Web ジェネレータ体験」に置くことで、Phase 0-1 は `generated_pdf`、Phase 2-3 は `purchase` という二段運用が成立し、Meta アルゴ学習を成立させて CPA を抑制できる。第三に、サンクスページが広告回収のほぼ全てを決める（funnel.md §14）。第四に、自分の家庭での実体験投稿は出さない方針が改めて確定し、IG ストーリーズの「日常風景フォト」型は使えず、UGC は他家庭依存に純化し、三人称プロダクト主語で書くことになった。第五に、正和堂書店の事例が「IG は副業 1 人持続不可能」論を実証的に反証した。

呼称統一の修正も大きかった。過去 DR で「App = ネイティブアプリ」と誤解されたため、今回は「Web ジェネレータ（おためし点描写メーカー）」に全 SSOT で統一した。インストール不要・ブラウザで即起動・PDF 出力で完結という性質を強調し、X PLG フックとの相性の良さを軸に据えた。広告コピーでは「アプリ／DL／インストール」は NG 語彙となり、voice-tone.md §7 に新設された。

SSOT への反映は 8 ファイルへ一括で行った。channels.md は 4 チャネル＋ AI 自動化前提＋週次運用テンプレで全面書き換え。funnel.md は §11-§15 を新設し、10 GA4 イベント、6 リターゲティングオーディエンス、広告 LP 7 セクション、サンクスページ設計、チャネル × ファネル交差表を載せた。ads.md は新規作成し、Phase 別予算・CPA/LTV 設計・月次オペレーションを SSOT 化した。voice-tone.md §7 では acquisition 運用 NG として、広告コピー NG・広告内蔵 AI 文言生成 NG・コメント／DM の AI 自動応答 NG（Air Canada 事件型）・自動 DM 規制対応・UGC マスキング NG を明示。pack-design.md §24 では春 LP 用の ¥1,000-2,000 セット候補 5 つを並べた。launch/phases.md §9 はチャネル＋広告統合表を新設し、§2.3 集客レバー表に Meta+Google 広告 Phase 0 投入とオーガニック 4 チャネルを追加した。engineering/README.md §6 は Phase 0 計測実装（GA4 + GTM + Meta Pixel + Google 拡張コンバージョン + 10 イベント）と、サンクスページ・広告 LP の実装 TODO を載せた。MEMORY.md は本セッション記録を追記した。

不採用は明確に切った。TikTok は温度感不一致、YouTube 通常動画は副業崩壊リスク、Threads 単独運用は日本市場が未成熟、X 広告と LINE OpenChat も今回は除外した。

ツール構成は月 ¥6,100 で確定。Claude Pro $20 ＋ Gemini AI Pro ¥2,900 ＋ Canva Free ＋ CapCut Free ＋ Meta Business Suite ＋ Buffer Free。¥3,900 の余剰はモニター謝礼と UGC 許諾管理に転用する（ChatGPT DR ③ 提案）。週次運用テンプレは合計 ~3.7h で組んだ。月 20 分（数値確認＋ NG grep）、火 40 分（IG カルーセル 2 本 Canva Bulk Create）、水 30 分（X 7 投稿 Buffer 予約）、木 50 分（記事/note 草稿隔週）、金 40 分（DM 5 件＋月次リール隔週）、土 25 分（コメント／DM 返信・100% 人間）、日は完全オフ。広告週 1-2h は別枠で確保。

過去の「動画切り判定」は一部撤回し、月 1-2 本のリール（IG 主・YouTube Shorts はゼロ編集同投稿）を Phase 1 から開始する。素材は紙・プリント・Web ジェネレータ画面録画に限定する。

## なぜそう判断したか

判断軸は 3 つだった。第一に、AI の得意領域は「統合」ではなく「役割分離」で活用したほうが鋭くなる。GPT は構造設計や戦術枠組みに強く、Gemini は対抗リスク（RAG 対策等）や細かい機械可読化に強い。両者を統合しようとすると論点がぼやけるが、役割を分離すれば各々の最良案を採用しやすい。今回は ChatGPT を主軸、Gemini を補完位置に固定した。

第二に、¥200 単品の広告回収不能は集客領域の枝葉ではなく、商品戦略レベルの問題だった。Acquisition funnel を再計算した結果、¥200/枚の SPF（Spend Per Free）が予算回収ラインを下回ることが判明した。これは acquisition 単体では解けず、バンドル SKU 導入を product/pack-design.md §24 で新規論点化することで商品設計に逆波及させた。集客の数字が商品の SKU を決めにいく構造になった。

第三に、副業 1 人運営の継続可能性を最初に予算化した。TikTok、YouTube 通常動画、Threads は「リソース消費 vs リターン」の比率で不採用とし、週次運用テンプレを最初から ~3.7h に収めた。広告週 1-2h は別枠として切り出し、燃え尽き防止を構造的に担保した。

## 学び

第一に、2 AI DR の並走と役割分離は再現性が高い。同じ問いを 2 AI に独立投入し、論点ごとに勝敗を採点する。「統合」を狙うと薄まり、「役割分離」で各 AI の強みを最大化する設計が、今回 Gemini と ChatGPT で 3 論点圧勝が分かれた要因だった。

第二に、集客戦略の発見は商品戦略を逆引きしうる。広告回収可能性の数字（¥200/枚の SPF）を計算した結果、商品の SKU 設計（バンドル必須）に波及した。集客は商品の下流ではなく、商品設計を逆検証する装置として機能する。

第三に、副業運営の継続可能性は最初に予算化する。週次運用テンプレを最初から ~3.7h に収め、追加可能性は「広告週 1-2h は別枠」として切り出した。燃え尽きは「やりすぎ」で起こる前に、構造的に防ぐべき変数として最初から組み込む。

第四に、AI 出力の解釈誤読は SSOT 改訂で防ぐ。「App = ネイティブアプリ」と過去 DR で誤読された反省を踏まえ、全 SSOT で「Web ジェネレータ（おためし点描写メーカー）」に呼称を統一し、voice-tone.md §7 に広告コピー NG 語をルール化した。語彙レベルの統一が、AI 自動化前提の運用での誤動作を予防する。

## 関連エピソード

- EP-055 — SEO Pillar DR（2026-05-22 夜）：DR を 2 AI 並走させる作法の原型
- EP-057 — ChatGPT DR レビュー反映（2026-05-23 後半）：Pinterest 撤回も今回統合
- EP-077 — LP §2 オーナー判定（2026-05-25）：類似商材 DR の発端と地続き
