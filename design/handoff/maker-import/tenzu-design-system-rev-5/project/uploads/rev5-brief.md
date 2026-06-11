# Design rev.5 セッション用ブリーフ

**起票日**: 2026-05-26
**起票者**: 本リポジトリ Claude Code セッション
**目的**: Claude Design rev.5 セッションへ入る前に、改訂理由・採用方向・rev.4 からのスコープ変更・注意点を事前共有する

## サマリ（読むのはこの 12 行で足りる）

- rev.4（locked 済み）は「Plex × Noto・紙クリーム色・ボックス UI・直線 SVG」で、業務系の落ち着きはあるが**親に対する温度が薄い**。「分類した感が強い」と本日 LP §2 検証で判明
- rev.5 は **デザインシステム全面再構築**。ロゴ（4-dot square + Ξ-form E）もリジェネ対象。**rev.4 の LOCKED 縛りはすべて解除**
- 採用方向は Code 側 proof-of-concept で検証済み：[/preview](../../web/app/preview/page.tsx) と [/wireframe](../../web/app/wireframe/page.tsx)
- 鍵は **3 階層フォント運用（Klee One ／ Zen Kurenaido ／ Plex）・点描写格子背景・ボックス削減・直線アンダーライン**
- ロゴは**オーナーが Gemini 画像生成 AI で別途リジェネ**。Design セッションには「rev.5 全体と整合するロゴ要件」までを定義してもらう
- 経緯詳細: [decisions.md §3.37](../../decisions.md)
- 5 卒業計画上の位置：①Design System を rev.5 でやり直し → ②LP・③商品・④記事・⑤Maker App を rev.5 で順次実装

## 1. なぜ rev.5 が必要か（経緯）

### 1.1 引き金

- 2026-05-25 夜の LP §2 実装（5 段階の旅カード）に対しオーナー判定「練り直しはイマイチ」（[decisions.md §3.34](../../decisions.md)）
- 類似商材 LP/EC を Gemini ＋ GPT-5 に 3 本 DR 投入（異業種 15 件・少 SKU EC 10 件・国内教育 5 件）
- DR 結果から §2 を 3 段で反復したが、最終診断は **「§2 構造の問題ではなく、デザインシステム自体の温度設計問題」**

### 1.2 3 段の方向修正

| 段 | 仮説 | 結論 |
|---|---|---|
| **第 1 段** | 「課題から選ぶ × レベルから選ぶ」二タブ＋ 4 群カード | ❌ オーナー判定「分類した感が強い」 |
| **第 2 段** | キュレーション棚（はじめての／図形好き／店主おすすめ）を上層に被せる | ❌ オーナー判定「ターゲット 8 セル分散で curation 不可」 |
| **第 3 段** | デザインシステム自体に手を入れる（フォント・背景・ボックス） | ✅ 方向確定 |

### 1.3 オーナー自身のルール直撃

CLAUDE.md 内ルール：**「視覚言語の定義に原因があれば Design、それ以外は Code」**。第 3 段で「視覚言語の定義」に原因があると判明したため、Design rev.5 へ移行するのが正規ルート。

## 2. rev.5 のスコープ（rev.4 → rev.5 差分）

| 要素 | rev.4（LOCKED） | rev.5 スコープ |
|---|---|---|
| **ロゴ**（4-dot square + Ξ-form E） | locked | **🟡 差分アップデート**（2026-05-26 方針確定）。骨格は完全維持・(b) ハイブリッド案で Wordmark の Ξ-form E 端点に鉛筆筆致風揺らぎ ＋ N・Z 角に 0.5px 微丸み ＋ 全体素材感を一段強化。詳細要件: [logo-regenerate-brief.md](logo-regenerate-brief.md)。Gemini 画像生成 AI でリジェネ |
| **カラー**（Ink & Slate） | locked | 維持を基本としつつ、白基調シフトに伴う微調整可（teal accent `#2C6E7F` は維持） |
| **タイポグラフィ** | Plex × Noto Hybrid locked | **🔴 3 階層運用へ全面改訂**（§3 参照） |
| **角丸**（`--radius-soft 4px`） | locked | 維持（ボックス削減と整合） |
| **背景** | 紙クリーム `#F4F2ED` | **🔴 真っ白 `#FFFFFF` ＋点描写格子へ変更** |
| **罫線・ボックス** | 1px solid・カード型 | **🔴 ボックス削減・dashed divider 主体** |
| **アンダーライン** | rev.4 まで無し | **🔴 1.5px solid teal の直線アンダーライン**を §セクション H2 に統一適用 |
| **イラスト・SVG 線質** | 規則的直線 | rev.5 で再検討（直線維持 or 手描き化） |

## 3. 3 階層フォント運用（rev.5 採用ルール）

| 階層 | フォント | 役割 | 適用箇所 |
|---|---|---|---|
| **① 意味を運ぶ** | **Klee One 600**（書写体ベース） | 教材の声・読ませたい文 | 大見出し（H1/H2/H3）／タブ名／群名／タスク名／レベル名／レベルの一文約束／店主メモのラベル |
| **② 人の温度** | **Zen Kurenaido**（鉛筆筆致） | 「誰かが手で書いた」感を出したい説明 | 群の一文約束／店主の一言メモ本文／レベル説明文／LP の lead・blurb |
| **③ 構造・機能** | **Plex Sans JP / Plex Mono**（rev.4 維持） | データ・記号・操作 UI | 群コード A/B/C/D／観察・基礎などの分類ラベル／Vol 数・問題数・Lv 数字・年齢めやす／タスク数／CTA リンク／全件導線テキスト |

### 階層判定の基準（迷ったとき用）

| 問い | YES なら |
|---|---|
| 「これは**読ませたい**文か（理解させたい）」 | **Klee One**（①） |
| 「これは**人がそこにいる**感を出したい文か（観察・寄り添い）」 | **Zen Kurenaido**（②） |
| 「これは**機能・操作・カウント**か（数えられる・押す・分類する）」 | **Plex**（③ 維持） |

### サイズ・ウェイト微調整

Klee One・Zen Kurenaido は Plex より字面が小さく見えるため：

- Klee One：Plex 比で **+2px〜+4px**（H1: 28→30、H2: 32→34、H3: 18→20）
- Klee One：Weight **500→600**（書写体は線が細いため一段太く）
- Zen Kurenaido：行間 **+0.15**（1.7→1.85）
- letter-spacing: **+0.01em**（字間がやや窮屈なため）

### Klee One を使わない場所

- 数字・Lv 番号・Vol 数・年齢めやす → Plex Mono
- タグ・ラベル（観察・基礎／変換系／2 タスク／展開 ↓）→ Plex
- 長文本文（3 段落以上）→ Plex（疲れ防止）
- CTA ボタン文言（「○○のページへ →」）→ Plex（押せる感）

## 4. 入力素材（Design セッションで Claude に見せる物）

| 種別 | 場所 | 役割 |
|---|---|---|
| **動作する v5 proof-of-concept** | http://localhost:3001/preview ／ [web/app/preview/page.tsx](../../web/app/preview/page.tsx) | rev.5 方向の最高解像度サンプル |
| **§2 専用ワイヤー** | http://localhost:3001/wireframe ／ [web/app/wireframe/page.tsx](../../web/app/wireframe/page.tsx) | 4 群グルーピングの構造検証 |
| **判断ログ** | [decisions.md §3.37](../../decisions.md) | 3 段反復の経緯・不採用案 |
| **本ブリーフ** | このファイル | rev.5 改訂方針 |
| **rev.4 ハンドオフ束** | [design/handoff/](.) | rev.4 までの設計言語 |
| **brand SSOT** | [foundation/brand.md](../../foundation/brand.md) | ブランド本体（Pillar 5・Tagline 等） |
| **voice-tone SSOT** | [foundation/voice-tone.md](../../foundation/voice-tone.md) | コピー Voice ルール |
| **4 群グルーピング SSOT** | [product/pack-design.md §13.7](../../product/pack-design.md) | 9 タスク → 4 群の対応 |

## 5. Design rev.5 セッションへの期待アウトプット

| カテゴリ | 期待物 |
|---|---|
| **tokens** | rev.5 カラー・タイポグラフィ・スペーシング・ラディウス・シャドウの token list（rev.4 tokens.css を上書きする形） |
| **typography spec** | 3 階層運用ルールの decision tree／サイズ・ウェイト・行間の運用表 |
| **background spec** | 点描写格子の正式仕様（ピッチ・色・opacity・例外パターン） |
| **divider / border spec** | 1.5px solid teal アンダーライン・dashed 区切り・メモ系左マーカー（2px teal）の使い分け |
| **logo requirement** | Gemini 画像生成 AI へ渡すロゴ要件書（rev.4 4-dot + Ξ-form E のどこを維持／どこを再構築） |
| **illustration guideline** | SVG 図形の線質ルール（直線・揺らぎ線・端点処理）／タスク図形・サンプル図形の描き方統一 |
| **component spec** | 主要 component（card / list-row / details / FAQ-item / sample-sheet / pillar-row）の rev.5 表現 |
| **page-level mockup** | LP・商品ページ・記事ページ・Maker App UI の 4 種をそれぞれ rev.5 で叩く（5 卒業計画 ②③④⑤ の初稿） |

## 6. 注意点・ガードレール（Claude Design が暴走しないように）

| カテゴリ | 守るべきこと |
|---|---|
| **ブランド本体は触らない** | Pillar 5・Brand Promise・Tagline trio・MISSION は [brand.md](../../foundation/brand.md) で確定済（[decisions.md §3.36](../../decisions.md)）。視覚言語の話に閉じる |
| **Voice ルールは触らない** | NG 語彙・拡張語彙シフト・F3 公式訳併記ルールは [voice-tone.md](../../foundation/voice-tone.md) で確定。視覚で煽らない／予防語彙化しない |
| **「これは patch ではなく system 化」と明示** | 「LP §2 だけ」ではなく「全ページに波及する design system rev.5」が目的 |
| **rev.4 から維持する物を伝える** | teal accent `#2C6E7F`・`--radius-soft 4px`・基本カラーパレット（Ink & Slate） |
| **rev.5 で却下されたものを再提案しない** | 波線アンダーライン・紙繊維ノイズ・紙クリーム色・キュレーション 3 本・Sensory タグ・想像のトビラ系コピー（詳細は [decisions.md §3.37](../../decisions.md) 不採用案表） |
| **Maker App UI も rev.5 で先決め** | 5 卒業計画 ⑤ は最後だが、Design rev.5 で先に Maker App の見え方も決めるのが効率的 |
| **教材文脈と親リテラシーのバランス** | 書写体＋鉛筆体で「学校教材っぽい子供向け」に振れすぎない／親が読める洗練度を保つ |

## 7. 残課題・Open Questions

Design rev.5 セッションで判断してほしい論点：

1. **イラスト・SVG 線質**：直線維持か、手描き揺らぎ化か。タスク図形（模写・線対称・回転 etc）を rev.5 でどう描き直すか
2. **ロゴ Gemini リジェネ要件**：✅ 2026-05-26 確定 — (b) ハイブリッド案で骨格維持 ＋ Wordmark 微強化。既存 12 意味は完全踏襲し新規 2 意味（Symbol ⑦親と子の対話／Wordmark ⑦専門店の確かさ）追加。Lockup は 3 種 → 4 種（業態識別句同梱 Full Lockup 追加）。詳細: [logo-regenerate-brief.md](logo-regenerate-brief.md)
3. **アクセシビリティ**：Klee One・Zen Kurenaido のコントラスト比検証。長文本文・警告系で使わない運用ルールの正式化
4. **モバイル時の点格子**：24px ピッチがスマホで密に見えないか。28-32px へ広げるか
5. **dark mode**：rev.5 で dark mode 対応をスコープに入れるか（rev.4 では未対応）
6. **印刷 PDF との一貫性**：PDF substrate `#FFFFFF` と LP 背景白＋点格子の整合（PDF 上にも薄い点格子を載せるか）
7. **「店主の痕跡」運用ルール**：3 DR 共通指摘「全ページに痕跡を散らす」の具体ルール。観察メモ・改訂履歴・選定理由の置き場・頻度・トーン
8. **§2 の最終構造**：タブ廃止・curation 廃止・4 群縦展開＋メタ密度＋温度演出で「分類した感」が本当に消えるか、proof-of-concept で再検証

## 8. 5 卒業計画と本セッションの位置

| 段 | 内容 | 状態 |
|---|---|---|
| **① Design System rev.5** | 本ブリーフをインプットに Claude Design セッション | 🚧 本ブリーフが起票物 |
| **② LP rev.5 反映** | 本体 `web/app/page.tsx` を Design rev.5 結果で更新 | 待機 |
| **③ 商品ページ rev.5** | 140 SKU の商品詳細ページ | 待機 |
| **④ 記事ページ rev.5** | Pillar 5 本＋ Cluster 記事レイアウト | 待機 |
| **⑤ Maker App UI rev.5** | おためし点描写メーカーの UI | 待機（Design rev.5 で先に見え方を決めると効率的） |

---

**関連リンク**:
- [decisions.md §3.37](../../decisions.md) — 本日の判断ログ
- [decisions.md §3.36](../../decisions.md) — ブランドアーキテクチャ最終確定（同日 §3.36 と整合）
- [foundation/brand.md](../../foundation/brand.md) — ブランド本体 SSOT
- [foundation/voice-tone.md](../../foundation/voice-tone.md) — Voice ルール SSOT
- [product/pack-design.md §13.7](../../product/pack-design.md) — 4 群グルーピング
- [design/visual-identity.md](../visual-identity.md) — rev.4 SSOT（rev.5 で全面上書き対象）
