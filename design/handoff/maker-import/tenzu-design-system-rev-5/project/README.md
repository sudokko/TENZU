# TENZU Design System rev.5

**version**: rev.5 草案 (2026-05-26 起票)
**status**: 視覚仕様確定済 ／ 5 ページモックアップ完了 ／ オーナー検収待ち
**前世代**: rev.4（Plex × Noto / paper #F4F2ED / boxy cards） — 「分類した感」で却下

---

## TENZU とは

**点描写プリントの専門店**。日本の家庭（子 4–9 歳）向けに、9 タスク × 5 レベル = 140 SKU の点描写 PDF を ¥200 一律で販売。親向けの「点描写メーカー」アプリ（Phase 0 · 5×5 まで · 画面で解かせない設計）を併設。

**MISSION**: 点描写を家庭の当たり前にして、空間認知の土台を持つ子を増やす。
**運営**: 個人運営。一人称「店主」。

### 出さない／やらない

- 不安マーケティング・煽り
- 画面学習（子に画面で解かせる UI を作らない）
- アップセル・サブスク・レコメンド
- マスコット・キャラクター
- 受験対策フレーミング
- ユーザーレビュー

---

## rev.5 で何が変わったか

| | rev.4 | rev.5 |
|---|---|---|
| Paper | `#F4F2ED` クリーム | `#FFFFFF` 純白 + dot grid overlay |
| Type | Plex × Noto 単層 | **3 階層** (Klee One ① / Zen Kurenaido ② / Plex Sans JP & Mono ③) |
| Dividers | box-heavy + colored cards | dashed 既定 + 4 種類だけ (D1〜D4) |
| Logo | wordmark 単独 | 4-dot square symbol + Ξ-form E wordmark |
| 痕跡 | 散発 | 5 種 × 場所別配分表で運用化 |
| Dark mode | 検討中 | **defer**（rev.5 ではやらない） |

---

## 入口

最初に読むべきファイル:

1. **`specs/typography.md`** — 3 階層フォント運用と決定樹
2. **`specs/background.md`** — 点格子の物理寸法
3. **`specs/divider-border.md`** — 4 種の罫線
4. **`specs/shopkeeper-traces.md`** — 店主の痕跡 5 種と配分表
5. **`specs/illustration.md`** — SVG 線質と 9 タスク図形ルール
6. **`specs/components.md`** — 部品リスト
7. **`specs/logo.md`** — ロゴ運用 (Horizontal / Symbol・floating)
8. **`colors_and_type.css`** — SSOT。token と既定スタイル
---

## ファイル構成

```
/colors_and_type.css     ← SSOT — 全ページの link 先
/README.md
/SKILL.md                ← Claude Code 互換

/assets/
  tenzu-logo-horizontal.png   ← canonical (2026-05-27 受領)
  tenzu-symbol-floating.png   ← canonical (2026-05-27 受領, rev.5 公式)
  tenzu-logo-horizontal.svg   ← legacy plate holder (deprecate)
  icons/
    task-copy.svg / task-mirror.svg / task-rotate.svg /
    task-translate.svg / task-scale.svg / task-overlay.svg /
    task-decompose.svg / task-fill.svg / task-solid.svg

/specs/
  phase-a-decisions.md        ← Q4 dark mode / Q2 a11y
  phase-b-decisions.md        ← Q3 pitch / Q5 PDF substrate
  phase-c-decisions.md        ← Q1 線質 / Q6 店主の痕跡
  typography.md
  background.md
  divider-border.md
  illustration.md
  shopkeeper-traces.md
  components.md
  logo.md                     ← ロゴ運用 (Horizontal / Symbol・floating)

/preview/
  phase-a-typography-specimen.html
  phase-b-dotgrid-specimen.html
  phase-c-illustration-traces-specimen.html
  c01〜c05  Colors cards
  t01〜t06  Type cards
  s01〜s04  Spacing cards
  co01〜co09 Components cards
  b01〜b05  Brand cards

/mockups/
  landing.html              ← LP（§2 4 群縦展開検証）
  product.html              ← 商品ページ（模写 Lv.2）
  article.html              ← 記事ページ（Pillar 1 第 1 回）
  maker.html                ← Maker App UI（Phase 0）

/uploads/
  brand.md                  ← 元ブリーフ（オーナー lock 部分含む）
  rev5-brief.md
  logo-regenerate-brief.md
  visual-identity.html      ← rev.4 末の VI 実装ルール
  tokens.css                ← rev.4 tokens（rev.5 で上書き）
  logopattern.png           ← ロゴコンタクトシート
```

---

## Content Fundamentals — コピーライティング

### Tone（声色）

- **同じ親として、先に気付いた立場**（brand.md §9 P3）
- **教える人ではない**。指導語彙（〜してあげましょう、〜が大切です）を使わない
- **不安を作らない**。診断・処方箋・弱点・特効薬の語彙を使わない
- **権威でマウントしない**。「研究によると」「専門家が」を避け、根拠の所在を明示して**TENZU 訳**を添える
- **達成を煽らない**。「がんばろう」「やりきろう」「できた！」を使わない

### Voice（一人称）

- **「店主」または無記名**で固定
- **「私たち」「弊社」「TENZU では…」は使わない**（TENZU は店の名前であって一人称ではない）
- 日付・改訂は **数値（Plex Mono ③）**。「先日」「最近」を使わない

### Casing（表記）

- 英数字: 半角・前後半角スペース
- 日付: ISO 風 `2026-05-12`
- 価格: ¥200 一律（カンマ無し）
- 単位: 12 問 ／ A4 縦 ／ 5×5（× は U+00D7）
- 改行は意味の切れ目で挟み、読みリズムを作る

### Vocabulary（推奨／禁則）

| ❌ 禁則 | ◯ 推奨 |
|---|---|
| 〜してあげましょう | （命令を抜いて「〜が見やすくなります」） |
| 〜が大切です | 「TENZU では…という根拠で…」 |
| 処方箋／特効薬／弱点／診断 | 観察 ／ 基礎 ／ 解像度 ／ 段階 |
| がんばろう／できた！ | お疲れさまでした ／ 今日の 1 枚 |
| 鍛える／修行／叩き込む | 練習 ／ 写す ／ 繰り返す |
| 研究によると／専門家が | TENZU では…という根拠で… |
| 点つなぎを卒業 | 点つなぎの次に ／ 点つなぎを楽しんだ後に |

### 文長

- 文の長さは 40〜80 字を中心。**長い 1 文より、短い 2 文**
- 段落 3〜5 行で改段
- 1 ページ内の感嘆符は 0〜1 個まで（「!」を使うのは Hero 1 回が上限）

### 具体例

- ❌「点描写で図形の苦手を克服しよう！」
- ◯「図形の基礎は、点描写から。」
- ❌「毎日続けてあげましょう。これがお子さんの図形力につながります。」
- ◯「1 日 1 枚。続いていない日があっても大丈夫です。」
- ❌「点つなぎを卒業した次の一手」
- ◯「点つなぎを楽しんだ後に、点描写を。」

---

## Visual Foundations — 視覚言語

### 色

- **Ink & Slate** ベース（黒〜灰の 4 段階 + 純白）。色面で意味を持たせず、**罫と書体で構造を作る**
- **accent #2C6E7F**（青磁色 teal）は **「達成・到達・完成形」のみ**。装飾には使わない
- **多色化しない**。warning だけ別系統（朱）を最小限

### 背景

- **substrate = 純白 `#FFFFFF`** ＋ **点格子 overlay**（24px desktop / 28px mobile / opacity 0.16）
- **写真・グラデーション・大判イラストは使わない**。背景は always 点格子のみ
- `.no-dot-grid` で局所解除（CTA・modal・写真領域・PDF 作業面）
- `bg-3 #FAF8F3` は parents-warm カードと footer のみ（点格子 OFF）

### タイプ（3 階層）

- **Tier ① Klee One 600** — 見出し・タスク名・プロミス（読ませて頭に残す）
- **Tier ② Zen Kurenaido** — メモ本文・lead・blurb（人がそこにいる感）
- **Tier ③ Plex Sans JP / Plex Mono** — UI・数値・長文（数えられる・押せる・速読）
- 詳細は `specs/typography.md`

### 罫線（4 種だけ）

- **D1**: H2 直下 `1.5px solid accent` underline（inline 幅）
- **D2**: `1px dashed line-thin` — 既定の区切り
- **D3**: `2px solid accent` left marker（観察メモ・親へのひとこと・引用）
- **D4**: `2px solid fg-2` left marker（選定理由・開発ノート）

### 角丸

- `r-chrome 0` / `r-control 2px` / `radius-soft 4px` / `r-token 9999px` の 4 値のみ
- カード・ボタン・memo は `radius-soft 4px`

### 影

- **shadow 系はほぼ無し**。罫線で構造を作る
- 例外: 商品サムネのみ `shadow-paper 0 1px 2px rgba(26,31,42,.04)`
- inner shadow・drop shadow 強度なし

### 動き

- **静的が既定**。連続アニメーションは使わない
- 例外: 線描画なしの opacity / position fade（dur-base 200ms / ease-line cubic-bezier(.22,.61,.36,1)）
- 「線が描かれる」演出は教材文脈と齟齬があるので不採用

### Hover / Press

- リンク hover: `border-color: accent` の underline appear（slide 動作なし）
- ボタン hover: bg を `--bg-3` に置換 or `--accent-ink` に暗色化
- pressed: 縮みなし。色だけ変える

### 透明・blur

- backdrop-filter は **使わない**
- 半透明は dot-grid (0.16) / accent fill 8% overlay のみ。それ以外は不透明

### 余白／密度

- desktop margin 64px / mobile 24px
- §section 間 80px
- 「呼吸」を作るために margin を削らない。「読みリズム」が UI の主軸

### 画像のトーン

- 写真は基本使わない（写真を載せると点描写の幾何性と干渉する）
- 写真を使う場合は **モノクロ・粒状感なし・hard edge** に限定（warm fade は避ける）

### Fixed elements

- header は scroll で固定しない（sticky なし）
- 「カートへ」CTA も sticky にしない（モバイル下部 sticky bar は anti-pattern）

---

## Iconography — アイコン

### アプローチ

- **9 タスク図形を SVG で内製**（`assets/icons/task-*.svg`、64×64 viewBox、stroke 1.5、round cap）
- **UI 用 icon は最小限**。undo / redo / clear / menu のみ
- **emoji 不使用**。装飾としても文中としても使わない
- **unicode 記号は限定使用**: `→` (CTA), `·` (区切り), `×` (掛け算), `↓ ↑` (折りたたみ)
- **Lucide / Heroicons などの汎用アイコンセットは使わない**（汎用味と TENZU の手書き温度が衝突する）

### 9 タスク図形のルール

- viewBox 64×64
- stroke `#1A1F2A` 1.5px / round cap / round join
- 背景 dot lattice: opacity 0.16 / 5×5 / 12px pitch
- accent `#2C6E7F` は「完成・到達・正解」状態のみ
- 補助線: `stroke-dasharray="3 3"` / opacity 0.35
- 詳細: `specs/illustration.md`

### ロゴ

- `assets/tenzu-logo-horizontal.png` — 横組み（2026-05-27 オーナー受領、鉛筆筆致版）
- `assets/tenzu-symbol-floating.png` — 4-dot floating symbol（2026-05-27 オーナー受領、rev.5 公式バリアント）
- 色バリアント (ink / white / cream / teal) は同フォルダに suffix 付きで生成済み
- 旧 plate holder SVG は legacy として残置
- 業態識別句「点図形（点描写）プリントの専門店」を必ず併記
- 詳細: `uploads/logo-regenerate-brief.md`

---

## 7 Open Questions の解決状況

| # | Open Question | 回答 | 場所 |
|---|---|---|---|
| Q1 | SVG 線質 | 直線維持 + round cap のみ。揺らぎ却下 | `specs/phase-c-decisions.md` / `specs/illustration.md` |
| Q2 | アクセシビリティ | Klee 16px / Pencil 15px 下限。長文・警告 NG | `specs/phase-a-decisions.md` / `specs/typography.md` |
| Q3 | モバイル点格子 | 28px (mobile) / 24px (≥601px) | `specs/phase-b-decisions.md` / `specs/background.md` |
| Q4 | Dark mode | **defer**。`<meta color-scheme="light">` | `specs/phase-a-decisions.md` |
| Q5 | PDF substrate | L1 作業面 = 載せない / L2 パッケージ面 = 5mm pitch 12% | `specs/phase-b-decisions.md` / `specs/background.md` |
| Q6 | 店主の痕跡 | 5 種 × 場所別配分表 × ページ上限 4 | `specs/shopkeeper-traces.md` |
| Q7 | §2 構造検証 | LP mockup で 4 群縦展開 → オーナー判定中 | `mockups/landing.html` |

---

## 既知のキャビアット

- **フォント zip 未受領** — Klee One / Zen Kurenaido / IBM Plex Sans JP / IBM Plex Mono は Google Fonts CDN で実装中。受領後 `fonts/` に配置して `@font-face` 差し替え
- **rev.5 ロゴ画像未受領** — plate holder の SVG で代用。`uploads/logo-regenerate-brief.md` の Gemini 出力後差し替え
- **記事ページの研究引用** — 擬似引用。本番では原典確認・実引用差し替え
- **UI kit (React component 化)** — モックアップ HTML までで止まっている。React 化が必要な場合は別フェーズ
- **印刷 PDF substrate 検証** — `specs/background.md` の 5mm/12% は実印刷未検証。Phase D 末で実機検証
- **§2 検証 (Q7)** — 「分類した感」が消えたかオーナー判定待ち

---

## 次にやること（提案）

1. オーナー: LP mockup を見て §2 検証（Q7）の YES/NO
2. オーナー: フォント zip 再アップロード／rev.5 ロゴ生成
3. もし §2 通った場合 → 残り SKU タイプの商品ページ展開、Maker App のインタラクション設計、PDF テンプレート作成
4. もし §2 戻る場合 → §2 構造の別案（pillar row のさらなる温度化）
