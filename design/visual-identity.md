# Visual Identity — ビジュアル実装ルール（Design System rev.5）

## サマリ

- 本ファイルは「見せ方の実装ルール」の SSOT。ブランド哲学・MISSION・Pillar 5 本柱は [../foundation/brand.md](../foundation/brand.md) を参照。実装詳細（CSS・モック・プレビュー）の正は [handoff/maker-import/tenzu-design-system-rev-5/project/](handoff/maker-import/tenzu-design-system-rev-5/project/)（以下「rev-5 bundle」）＋ [../web/app/tokens.css](../web/app/tokens.css)
- **基板**: 純白 `#FFFFFF` ＋ body 全面の**点格子**（pitch 24px desktop ／ 28px mobile・`#1A1F2A`・opacity 0.16）。配色は `Ink & Slate`、アクセント petroleum teal `#2C6E7F` は**「到達・正解・完成形」のみ**
- **タイポ 3 階層**: Tier① **Klee One 600**（見出し・プロミス＝意味を運ぶ）／ Tier② **Klee One 400**（温度コピー・店主メモ＝人の温度・①と同一書体でウェイト違い）／ Tier③ **IBM Plex Sans JP & Plex Mono**（UI・数値・長文＝構造・機能）
- **罫線は 4 種のみ**（D1 H2 underline ／ D2 dashed 既定 ／ D3 accent 左マーカー ／ D4 fg-2 左マーカー）。solid フル枠・shadow はほぼ無し（`shadow-paper` は商品サムネのみ）。radius-soft 4px。動きは静的が既定
- **ロゴ**: 鉛筆筆致版が canonical。Symbol = 4-dot floating（点と線分に visible gap）／ Wordmark = Ξ-form E（縦軸なし 3 横線）。Lockup 5 バリアント（D-2 Klee One 版優先）。業態識別句は必須併記・タグライン本体は同梱しない。**屋号 SUDO CRAFT は TENZU とは別系統のビジュアル**（マスコット Symbol ＋丸ゴシック Wordmark・別パレット・用途は SNS 3 アカウント/屋号ページ/法務表記に限定・§5.4）
- **CTA 4 段階**（弱／中／強／最強）・ディレクトリ別密度・**店主の痕跡 5 種 × 場所別配分表**で温度を構造化。加えて **LP Hero に無記名の店主紹介文 1 枠**（§8.1・顔/実名/マスコットなし）
- **AI 全面活用**（[brand.md §3 V4](../foundation/brand.md)）。端正さの担保は人間レビュー＋パーツライブラリ化
- キャビアット: フォントは Google Fonts CDN 経由（zip 受領後 `@font-face` へ差し替え予定）

## 詳細

### §1. 配色

`Ink & Slate`。色面で意味を持たせず、**罫と書体で構造を作る**。

#### §1.1 確定値（token）

| 役割 | 変数 | HEX | 用途 |
|---|---|---|---|
| 主色（ink） | `--fg` | `#1A1F2A` | 本文・見出し・線・点格子の点 |
| 補助テキスト | `--fg-2` | `#424955` | 補助テキスト・D4 マーカー |
| 弱テキスト | `--fg-3` | `#767D89` | meta・kicker（18px 以上のみ AA） |
| 最弱 | `--fg-4` | `#B0B5BD` | 極小ラベル・テキスト不可 |
| 背景 | `--bg` | `#FFFFFF` | 純白基板（＋点格子 overlay） |
| sunken | `--bg-2` | `#F4F2ED` | callout シェル・section divider 面 |
| parents-warm | `--bg-3` | `#FAF8F3` | 親向け声かけ・footer（点格子 OFF） |
| PDF substrate | `--bg-pure` | `#FFFFFF` | PDF 作業面 |
| アクセント | `--accent` | `#2C6E7F` | **「到達・正解・完成形」限定** |
| accent 淡 | `--accent-mute` | `#D5E1E4` | hover トラック |
| accent 濃 | `--accent-ink` | `#1F5260` | pressed（白地で AAA） |
| 罫（細） | `--line-thin` | `#E5E3DC` | D2 dashed divider |
| 罫（中） | `--line-mid` | `#BFBDB5` | mid rule |
| 罫（強） | `--line-strong` | `#1A1F2A` | 主色と同値 |

#### §1.2 原則

- **モノクロ完全機能**: `#1A1F2A` 単色だけで全 UI が成立すること（印刷適性・色覚配慮）。accent だけで意味伝達しない（形・線種で同時表現）
- **accent は before/after の "after" のみ**: 正解線・到達チップ・購入確定 CTA・完了画面。装飾・「楽しさ」表現には使わない
- **多色化しない**。warning のみ別系統（朱）を最小限
- ダークモードは持たない（`color-scheme: light` 固定。`prefers-color-scheme: dark` に反応しない）
- **PDF と画面の同一性**: 印刷時と画面表示で印象が崩れないこと
- コントラスト実測: fg/白 16.93・fg-2/白 9.45・fg-3/白 4.45（18px 以上限定）・accent/白 5.42（[rev-5 bundle specs/phase-a-decisions.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/phase-a-decisions.md)）

### §2. 背景 — 点描写格子

substrate は常に純白 ＋ 点格子 overlay。**写真・グラデーション・大判イラストを背景に使わない**。

#### §2.1 物理仕様

| プロパティ | 値 |
|---|---|
| pitch（desktop / tablet ≥601px） | 24px |
| pitch（mobile ≤600px） | 28px（2 ステップ離散・clamp 連続変化禁止） |
| dot color | `#1A1F2A`（teal は使わない） |
| dot opacity | 0.16（これ以上に上げない） |
| dot radius | 1px・position `0 0` 固定 |

実装は `radial-gradient` 反復（[rev-5 bundle specs/background.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/background.md)）。局所解除は `.no-dot-grid`。

#### §2.2 点格子を載せない場所

CTA 最強ボタン／モーダル内部／画像・SVG 図形の上／`.parents-warm` カード内／PDF 作業面。`--bg-2` 面は opacity 0.10 に下げ、`--bg-3` 面は載せない。

#### §2.3 PDF 内の運用（3 レイヤー）

| レイヤー | 役割 | 点格子 |
|---|---|---|
| L1 作業面（子が写すページ） | 子の作業域 | **載せない**（完全な白） |
| L2 パッケージ面（表紙・説明・声かけ・改訂履歴） | 親が読む面 | 5mm pitch・12% opacity・点半径 0.2mm |
| L3 サンプル領域（記入見本） | 記入例 | 載せない（L1 と同扱い） |

**3 種の点（ブランド点格子／商品 puzzle dots／子の記入点）を同一面に重ねない**ことが骨格。

### §3. タイポグラフィ — 3 階層

| Tier | 役割 | フォント | ウェイト | 使う場所 |
|---|---|---|---|---|
| **①** | 意味を運ぶ | **Klee One** | 600 固定 | H1/H2/H3・タスク名・一文プロミス |
| **②** | 人の温度 | **Klee One** | 400 | 店主メモ本文・lead・blurb・声かけ |
| **③** | 構造・機能 | **IBM Plex Sans JP / Plex Mono** | 300-600 | UI・数値・タグ・CTA・長文・警告 |

**①と②は同一書体（Klee One）・ウェイト違い**（見出し 600・本文 400）に統一（2026-07 差し替え・旧②は Zen Kurenaido）。階層は書体の違いではなく太さの違いで判別する。長文プレーンテキストの可読性向上と、サイト全体の書体を実質 Klee One＋Plex の2種へ集約する目的。

迷ったら決定樹（数値・操作 UI？→③ ／ 3 段落以上の連続本文？→③ ／ 警告？→③ ／ 人がそこにいる感？→② ／ 読ませて理解させたい？→①・既定は③）。詳細は [rev-5 bundle specs/typography.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/typography.md)。

#### §3.1 サイズスケール

- Tier①: H1 30 ／ H2 22 ／ H3 18 ／ promise-line 17（line-height 1.45-1.7・letter-spacing +0.01em）。**16px 未満では使わない**（→ Plex に降格）
- Tier②: pencil 16 ／ pencil-sm 15 ／ lead 17（line-height 1.85 固定・letter-spacing +0.01em）。**15px 未満では使わない**
- Tier③: body 16/1.7 ／ body-sm 14 ／ meta 12 ／ label-caps 11（Mono・+0.16em uppercase）／ 数値は Plex Mono（`tnum`/`zero`）／ CTA 14・weight 500

#### §3.2 禁則（必ず守る）

- Klee One①: 16px 未満・3 段落以上の連続本文・`fg-2` 以下の薄色・数値・タグ・CTA・警告では使わない。weight 600 固定
- Klee One②(400): 15px 未満・5 段落以上・`fg-3` 以下・見出し・数値・ボタン・警告では使わない（**唯一の例外**: カート CTA のサブコピー 1 行・12.5px → §7.1）
- **Plex③ が必ず勝つ場所**: 数値・¥・Lv・Vol・座標／タグ・チップ／CTA・ナビ・パンくず／フォーム／警告・エラー・バリデーション／長文（3 段落以上）／URL・コード（Mono）
- 越境例外: 店主メモブロック（Klee ラベル＋Pencil 本文＋Mono 日付の 3 階層共存）・商品カード（Mono コード＋Klee 商品名＋Pencil プロミス＋Plex 価格）

#### §3.3 Web フォント

Google Fonts CDN 経由でロード中。フォント zip 受領後に `fonts/` 配置＋ `@font-face` へ差し替え予定。

### §4. 罫線・面・動き

#### §4.1 罫線 4 種のみ（これ以外は使わない）

| # | 名前 | 仕様 | 用途 |
|---|---|---|---|
| **D1** | §section H2 underline | `1.5px solid var(--accent)`・inline 幅（全幅禁止） | H2 直下「ここから新セクション」。H1/H3 には付けない |
| **D2** | dashed divider | `1px dashed var(--line-thin)` | **既定の区切り**。カード境界・list separator・行間すべて |
| **D3** | memo left marker | `2px solid var(--accent)` | 観察メモ・親へのひとこと・引用ブロック |
| **D4** | rationale left marker | `2px solid var(--fg-2)` | 選定理由・開発ノート（到達感不要のため accent を使わない） |

NG: 1px solid フル枠／double border／dotted（点描写の点と混線）／gradient・animated border。

#### §4.2 角丸・影

- radius は 4 値のみ: `r-chrome 0` ／ `r-control 2px` ／ `radius-soft 4px`（カード・ボタン・memo）／ `r-token 9999px`（chip）
- **shadow ほぼ無し**。例外は商品サムネのみ `shadow-paper: 0 1px 2px rgba(26,31,42,.04)`。inner shadow 不可

#### §4.3 動き・hover

- **静的が既定**。連続アニメーション・「線が描かれる」演出・パララックス不採用。許容は opacity/position fade のみ（dur-base 200ms・ease-line `cubic-bezier(.22,.61,.36,1)`）
- リンク hover は underline appear、ボタン hover は `--bg-3` 化 or `--accent-ink` 暗色化。pressed は色のみ（縮みなし）
- backdrop-filter 不使用。半透明は点格子 0.16 と accent fill 8% overlay のみ
- header・CTA の sticky 固定はしない（モバイル下部 sticky bar は anti-pattern）

#### §4.4 余白

spacing は base 4px スケール（`--s-1`〜`--s-24`）。desktop margin 64px ／ mobile 24px ／ §section 間 80px。「読みリズム」のために margin を削らない。

### §5. ロゴ

**鉛筆筆致版が canonical**。Symbol = **4-dot floating**（4 隅ドットと線分が触れない visible gap）／ Wordmark = **Ξ-form E**（縦軸なし 3 横線・N/Z 角に微丸み）。gap は「点と線がまだつながっていない」物語そのもの＝ブランドメッセージ。

#### §5.1 アセットと格納先

| 区分 | パス |
|---|---|
| マスター原本 | `logodesign/透過HORIZONTALLOOKUP.png`・`透過symbol.png` |
| Design SSOT | rev-5 bundle `assets/tenzu-logo-horizontal*.png`・`tenzu-symbol-floating*.png`（ink/white/cream/teal 4 色トーン） |
| Code 配信用 | `web/public/assets/logo-horizontal.png`・`symbol-floating.png` |

色トーン: ink 既定（白・bg-3 上）／ cream・white は反転用（fg・accent 背景上。cream＝紙の温度を残す既定、white＝最大コントラスト）／ teal は到達訴求バナーのみの特例。

#### §5.2 Lockup 5 バリアント

| # | 構成 | 用途 |
|---|---|---|
| A | Symbol Only | ファビコン・Touch Icon・認知済み文脈の極小用途 |
| B | Vertical | 縦長スペース |
| C | Horizontal | **既定**。ヘッダ・フッタ・PDF パッケージ面・OGP・名刺 |
| D-1 | Full Lockup（Plex 版） | 構造寄り・極小用 |
| D-2 | Full Lockup（Klee One 版） | **優先採用**（3 階層ルール①と整合）。SNS・OGP・印刷。最小 height 80px |

#### §5.3 運用ルール

- **最小サイズ**: Horizontal は高さ 28px ／ 0.8cm（Ξ-form E が崩れない限界）。それ未満が必要な場面は Symbol に置き換える（Symbol 最小 16px・1:1 固定）。推奨 36-48px（web header）。ヘッダ実機 32-36px で鉛筆質感が見えないのは想定内
- **safe area**: 周囲に Symbol 高さの 1/2 を最小余白として確保。アスペクト比固定（変形禁止）
- **業態識別句「点図形（点描写）プリントの専門店」を必ず併記**（Plex Sans JP 400・12px・fg-3。header は水平並列・footer は縦併記）。Symbol 単独使用時は未認知層向け面なら「TENZU」テキストラベル（Plex 500 14px）を添える
- **タグライン本体（コア「見て、考えて、書く力を、点描写から。」）はロゴに同梱しない**。3 段セット（コア＋サブコピー＋業態識別句・SSOT は [brand.md §12](../foundation/brand.md)）は LP ヒーロー・OG・名刺等のレイアウト側で併記する
- アンチパターン: effect 追加（shadow/glow）・回転・斜行・グラデ塗り・写真上配置・点線ボックス囲み・Symbol の点と線の接続・アニメーション・4 色トーン以外の色変え。迷ったら「Horizontal／ink／白地」に戻し、レイアウト側を調整する
- 詳細: [rev-5 bundle specs/logo.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/logo.md)

#### §5.4 屋号 SUDO CRAFT のビジュアル（TENZU とは別系統）

**屋号は TENZU の規定を継承しない別系統として持つ**（[decisions.md §5.17](../decisions.md)）。屋号が立つ面は「作り手の人格」を出す面であり、TENZU の端正さ（純白＋点格子・幾何のみ・キャラクター不採用）とは目的が違う。両者が視覚的に混ざらないことは**名義の分離**（[sns-accounts.md §1.4](../acquisition/sns-accounts.md)）が担保する。

- **適用範囲**: SNS 3 アカウント（X・note・Ameba）のアイコン／ヘッダー／屋号ページ `/sudo-craft`／法務表記まわり。**商品ページ・記事・PDF 紙面・LP・Pinterest・Instagram には一切出さない**
- **構成 = Symbol（マスコット）＋ Wordmark の Lockup**。TENZU の Symbol（4-dot floating）は点描写固有の物語なので流用しない
- **Symbol**: 青い丸型キャラクター（うさぎ耳・眼鏡・蝶ネクタイ）。太い濃紺の輪郭線＋フラットなパステル塗り。**由来は公表しない**（[sns-accounts.md §4.3](../acquisition/sns-accounts.md) の非特定原則）
- **Wordmark**: 太い丸ゴシック（ジオメトリック・全大文字・字間広め・角丸ターミナル）。**2 段組**（SUDO / CRAFT・アイコン用）と**横 1 段**（ヘッダー・屋号ページ・法務表記用）の 2 種
- **配色**（`Ink & Slate`（§1）とは別パレット。屋号面でのみ使う）:

  | 用途 | 値 |
  |---|---|
  | 屋号文字・輪郭線 | `#1E3A6B` |
  | ブランド名・アクセント | `#F26B7A` |
  | 背景 | `#F9D7DD` |

- **§6「キャラクター不採用・写真不使用・子どもイラスト不使用」は TENZU 面の規定**であり、屋号面には適用しない。ただし**実写だけは名義を問わず使わない**
- **確定版は再生成しない**（§10 パーツライブラリ化）。**同じ画風は生成では再現できない**ため、使うカットは一度に作って確定版を格納し、以後はそれを参照する。差し替えは新版として履歴管理
- **ヘッダーには作っているもの**（当面 TENZU の Lockup C または D-2）を置く。屋号ロゴだけでは何の作り手か伝わらないため
- **ファイル名にもキャラクターの由来を書かない**（リポジトリと配信 URL に残るため。上記の非公表と同じ理由）
- **アセット一覧**（マスター＝`logodesign/sudocraft/`。配信は `web/scripts/img-optimize.mjs` を通して `web/public/assets/sudocraft-*.png` へ複製。マスターは 1 枚 1.5MB 級なので直接配信しない）:

  | ファイル | 中身 | 主な用途 |
  |---|---|---|
  | `lockup-icon.png` | 円形 Lockup（マスコット＋ Wordmark ＋ TENZU 併記・ピンク地） | **SNS 3 アカウントのアイコン** |
  | `wordmark-stacked.png` | Wordmark 2 段組（透過・濃紺） | 正方形・小サイズの枠 |
  | `wordmark-horizontal.png` | Wordmark 横 1 段（透過・濃紺） | 屋号ページ・ヘッダー・法務表記 |
  | `mascot-wave.png` | 立ち・手を振る（透過） | 屋号ページ導入・X ヘッダー |
  | `mascot-think.png` | 鉛筆を持って考える（透過） | note 記事のアイキャッチ |
  | `mascot-present.png` | 紙を差し出す（透過） | お知らせ・商品紹介 |
  | `mascot-bust.png` | バストアップ（透過） | 小サイズアイコン・署名 |

  白抜きの Wordmark が要るときは、上記の濃紺を `#FFFFFF` へ**色置換して作る**（再生成すると字形が変わり同一性が保てない）

### §6. 主役グラフィック・イラスト

「点・直線・図形」の幾何要素が主役。**写真不使用**（使う場合はモノクロ・hard edge 限定）・子どもイラスト不使用・キャラクター不採用（[brand.md §11.1](../foundation/brand.md) Anti-Brand）。

> **本節は TENZU 面の規定**（サイト・商品・PDF・LP・Pinterest・Instagram）。屋号 SUDO CRAFT の面はマスコットを持つ別系統（§5.4）で、キャラクター不採用は適用されない。

#### §6.1 SVG 物理規格

| 項目 | 値 |
|---|---|
| viewBox | `0 0 64 64`・余白 8px 以上 |
| stroke | `#1A1F2A`・1.5px 基本（1px 補助／2px 強調）・**round cap / round join** |
| 線質 | **直線維持**。揺らぎ・wobble・Rough.js 系手描き化・紙テクスチャは不採用（素材感はロゴのみの特権） |
| dot | 半径 2px・ベタ `#1A1F2A`。線端と dot の visible gap 0.5px（ロゴと同じ物語） |
| ガイド線 | `stroke-dasharray 3 3 / 4 4`・opacity 0.35 |
| accent | 「正解線・到達後・完成形」のみ。元の図形には使わない |
| lattice | カード内図は 5×5・12px pitch・opacity 0.16。ヒーロー大型図は body 点格子に任せて省略 |

9 タスク（copy/mirror/rotate/translate/scale/overlay/decompose/fill/solid）の描き分け・テンプレは [rev-5 bundle specs/illustration.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/illustration.md)。アイコン実体は同 bundle `assets/icons/task-*.svg`。**Lucide 等の汎用アイコンセット・emoji は使わない**（UI icon は undo/redo/clear/menu のみ最小限）。

#### §6.2 Pillar 5 本柱の視覚翻訳

| Pillar | 視覚翻訳 | 主な実装場所 |
|---|---|---|
| P1 体系 | 段階接続を示す直交格子・ステップが線でつながる構造図 | 商品一覧・レベル選びガイド |
| P2 解像度 | サンプル開示・メタデータの可視化・薄いガイド線 | 商品ページ・サンプルプレビュー（SKU 詳細の紙面プレビュー） |
| P3 発見 | ドットの組み替えから図形が生まれるモチーフ（動きは静的原則内） | Web ジェネレータ FV・OG・記事カード glyph |
| P4 言語化 | タスク × 能力対応表・図と注釈の端正な共存 | 記事内図表・引用ブロック |
| P5 継続 | 余白を残した PDF レイアウト・親向け声かけブロック | PDF フッター・`/for-parents/`・商品ページ「続け方」 |

### §7. コンポーネント

部品リストの正は [rev-5 bundle specs/components.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/components.md)。要点のみ。

#### §7.1 CTA 強度 4 段階

| 強度 | スタイル | 用途 |
|---|---|---|
| 弱 | テキスト＋accent＋`→`・hover で underline | 関連リンク・FAQ・本文中 |
| 中 | `1px solid var(--fg)` 枠＋bg-3 | サブ CTA |
| 強 | `var(--fg)` ベタ＋白文字 | 主 CTA（カートへ・サンプルを見る） |
| 最強 | `var(--accent)` ベタ＋白文字 | 購入確定・達成完了のみ。Hero では使わない |

すべて Plex Sans JP 500・14px・radius-soft。Hero CTA は装飾なし。

- **カート CTA（商品詳細・「強」の具体形）**: 二段構成。上段＝プリンタ icon（inline SVG 18px・依存なし）＋「カートへ」（Plex 500・15px）／下段＝サブコピー「印刷は、おうちのプリンタで」（Klee One 400・12.5px・`#9FE1CB` → hover で白）。地は `--fg` ベタ・hover で `--accent`・買い物カラム内フル幅・radius-soft。サブコピーは購入後体験（家庭で印刷）の予告を兼ねる。**Tier② をボタン内で使う唯一の例外**（§4 タイポ禁則の例外として相互参照）。実装: `web/app/products/product.css` `.btn-cart`

#### §7.2 主要部品の約束

- **Header**: 高さ 72px・点格子通過・bottom D2。ロゴ C horizontal＋業態識別句。active nav に D1 パターンの underline
- **商品カード**: 上下 D2 のみ（枠なし）・左 64-80px タスク icon・hover で bg-3（点格子 OFF）・shadow なし
- **Chip**: `r-token` 丸チップ・Mono 12px。`data-state="reached"` のみ accent
- **PDF プレビュー**: aspect-ratio 210/297・内部 `.no-dot-grid`
- **Footer**: bg-3・点格子 OFF・top D2
- **採用しない**: カルーセル／toast（inline message で代替）／レビューウィジェット／like UI／レコメンド／sticky CTA バー／マスコット

#### §7.3 親向け声かけブロック（`.parents-warm`）

bg-3＋radius-soft＋line-height 1.85＋点格子 OFF。D3 左マーカー併用。指導語彙（「〜してあげましょう」「〜が大切です」）禁止（[voice-tone.md](../foundation/voice-tone.md)）。accent は文字色に使わない。

### §8. 店主の痕跡（5 種 × 場所別配分）

「個人運営の温度」は痕跡 5 種（T1 観察メモ／T2 改訂履歴／T3 選定理由／T4 親へのひとこと／T5 開発ノート）を**場所別配分表で上限管理**して出す。痕跡 T1-T5 について LP 本体は 0（§「家庭での続け方」のみ T4 を 1）／商品ページ最大 4／PDF L2 最大 3／PDF L1 は 0。一人称は「店主」または無記名（「私たち」「TENZU では」不可）。日付は数値・Plex Mono。配分表・テンプレの正は [rev-5 bundle specs/shopkeeper-traces.md](handoff/maker-import/tenzu-design-system-rev-5/project/specs/shopkeeper-traces.md)。

#### §8.1 店主紹介文（LP Hero・唯一の例外枠）

T1-T5 とは別枠で、**LP Hero に「店主紹介文」を 1 ブロックだけ**恒久設置する（知育村型の冒頭挨拶に相当）。§8 本体の「LP 本体 0」は T1-T5 の観察・記録系痕跡に対する上限で、この**店を紹介する常設枠はそこに数えない**。目的＝作り手が実在すること・値付けの筋（有料の理由）・「発達に合わせて選べる」中核特徴を、Hero で一度だけ伝えて信用を作る。

- **文体＝無記名の三人称**（店を紹介する）。「TENZU のプリントは〜」で始め、一人称「店主」は名乗らない（T1-T5 の一人称メモとは別物）。締めは招き入れ（「〜見ていってください」）
- **個人開示は最小**（「二児の父」「IT で新製品企画」程度の 1-2 語まで。実名・顔写真・生活描写・趣味の列挙・肩書の過剰具体は不可＝§6 顔出しなし／キャラ不採用と整合）。**マスコット・人物イラストは付けない**
- **タイポ＝Tier② Klee One 400**（人の温度）。「店主より」等のラベルは付けない（紹介文自体で店の声と分かる）
- **面＝淡い teal 敷きカード**（`#EAF2F3`・`--accent-mute` 枠＋`--accent` 3px 左罫・radius-soft）。Hero 白地から浮かせ、コアタグライン（Tier①）とは別レイヤーの「店の声」と分かる形に。強調は `--accent-ink` の太字までに留め、accent ベタは使わない（§7.1 Hero 禁則と整合）
- **設置は Hero サブ枠に 1 つのみ**（旧サブタグラインの置換）。他ページ・複数設置は不可。実装＝`web/app/page.tsx` `.tr-hero-note`／`web/app/top-rich.css`
- **未解決（別件）**: 「なぜ、点描写なのか」節の実写 photo（`why-tensha.webp`）は §6「写真不使用」と未整合のまま。本 §8.1（テキストのみの紹介枠）とは切り離し、写真の可否はオーナー判断待ち

### §9. ディレクトリ別密度・3 軸配分

3 軸コンセプト＝**書店**（端正・P1/P2）×**研究室**（知的解像度・P4）×**親の手元**（温度・P5/P3）。サイト全体で常時混在させず、ディレクトリ／コンポーネント単位で主役を切り替える。

| パス | 密度 | 軸の主役 |
|---|---|---|
| `/products/` | ミニマル・密度高め | 書店（端正な棚） |
| `/articles/` | ゆとり・余白多め | 研究室 |
| `/for-parents/` | 余白最大・読み物体 | 親の手元 |
| `/maker/`（おためし点描写メーカー） | 機能的・装飾極小 | 書店＋親の手元（「作るのは画面、練習は紙。」明示） |

### §10. マイクロコピー・トランジション

- ボタン周り・404・完了画面・エラーに専門家としての配慮と人間味を仕込む。達成煽り（「がんばろう」「できた！」）NG、「お疲れさまでした」「次は明日でも大丈夫です」型を採用
- 決済（硬）→完了画面（温）は冒頭事務的→スクロールで「店主からのメッセージ」が現れる情報階層化
- ページ間遷移はフェードのみ。ホバーは §4.3 の範囲内

### §11. AI 生成物の運用ルール

[brand.md §3 V4](../foundation/brand.md)「AI を全面活用して企業並みの品質を出す」に基づき、画像生成 AI・SVG/Canvas コード生成すべて推奨。担保はツール制限ではなく:

- **人間レビュー必須**（[brand.md §8.2 C4](../foundation/brand.md)）: AI 生成物は運営者確認後に公開
- **パーツライブラリ化**: 反復使用するグラフィックは確定版を格納して参照（ロゴ一式・タスク icon・OGP テンプレ・404/完了画面図版）。ピクセル運用の確定版は再生成しない（差し替えは新版として履歴管理）
- 座標精度が必要な図版（格子・多角形）は SVG/Canvas コード生成、記事内の抽象図版は画像生成 AI 可

## 附録

- 変遷: [../archive/retired-designs/2026-06-11-visual-identity-rev4.md](../archive/retired-designs/2026-06-11-visual-identity-rev4.md)（旧 rev.4: paper `#F4F2ED`・Plex × Noto Hybrid・旧 4-dot square symbol）
- 実装詳細の正: [handoff/maker-import/tenzu-design-system-rev-5/project/](handoff/maker-import/tenzu-design-system-rev-5/project/)（colors_and_type.css・specs/・mockups/）／ Code 側 token: [../web/app/tokens.css](../web/app/tokens.css)
- 関連 SSOT: [../foundation/brand.md §7 Pillars・§11.3 Brand Architecture・§12 Tagline 3 段](../foundation/brand.md)・[../foundation/voice-tone.md](../foundation/voice-tone.md)
