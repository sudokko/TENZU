# Typography Spec — 3 階層フォント運用

**version**: rev.5 草案 (2026-05-26)
**スコープ**: LP / 商品ページ / 記事ページ / Maker App / PDF 全てに横断適用
**SSOT**: `colors_and_type.css` の `--font-tier*-*` 変数群がこの doc の物理実装

---

## 1. 3 階層モデル

| Tier | 役割 | フォント | ウェイト | 「これは何のため？」 |
|---|---|---|---|---|
| **①** | 意味を運ぶ | **Klee One** | 600 | 読ませて頭に残したい文 |
| **②** | 人の温度 | **Zen Kurenaido** | 400 | 誰かが手で書いた感を出したい文 |
| **③** | 構造・機能 | **IBM Plex Sans JP / Plex Mono** | 300/400/500/600 | 数えられる・押せる・分類できる文 |

---

## 2. Decision Tree（迷ったとき必ずこの順で問う）

```
┌─────────────────────────────────────────┐
│ Q1: これは数値・記号・カウント・操作 UI？      │
│     （Lv, ¥, Vol, タグ, ボタン, ナビ等）     │
└────────────┬────────────────────────────┘
             │ YES → Tier ③ Plex（Mono または Sans）
             │ NO ↓
┌────────────▼────────────────────────────┐
│ Q2: これは 3 段落以上の連続本文？           │
│     （記事 body, 商品説明 long form）        │
└────────────┬────────────────────────────┘
             │ YES → Tier ③ Plex Sans JP 400
             │ NO ↓
┌────────────▼────────────────────────────┐
│ Q3: これは警告・エラー・バリデーション？      │
└────────────┬────────────────────────────┘
             │ YES → Tier ③ Plex Sans JP 400
             │ NO ↓
┌────────────▼────────────────────────────┐
│ Q4: これは「人がそこにいる」感を出す文？      │
│     （メモ本文・店主の一言・寄り添う説明）    │
└────────────┬────────────────────────────┘
             │ YES → Tier ② Zen Kurenaido
             │ NO ↓
┌────────────▼────────────────────────────┐
│ Q5: これは読ませて理解させたい文？           │
│     （見出し・プロミス・タスク名・レベル名）  │
└────────────┬────────────────────────────┘
             │ YES → Tier ① Klee One 600
             │ NO → 既定値 Tier ③ Plex Sans JP 400
└─────────────────────────────────────────┘
```

---

## 3. 場所別 早見表

### LP

| 部位 | Tier | フォント | サイズ目安 |
|---|---|---|---|
| Hero H1（コアタグライン） | ① | Klee One 600 | 30-36px |
| Hero サブコピー | ② | Zen Kurenaido | 17-19px |
| 業態識別句 | ③ | Plex Sans JP 400 | 13-14px |
| §section H2（teal underline 付） | ① | Klee One 600 | 22-26px |
| §section リード | ② | Zen Kurenaido | 16-17px |
| 群コード A/B/C/D | ③ | Plex Mono 400 | 14-16px |
| 群名（「観察と模写」等） | ① | Klee One 600 | 18-20px |
| 群の一文プロミス | ② | Zen Kurenaido | 15-16px |
| カテゴリラベル（観察・基礎 等） | ③ | Plex Sans JP 400 | 12px |
| タスク数・Vol 数 | ③ | Plex Mono 400 | 12-14px |
| CTA ボタン | ③ | Plex Sans JP 500 | 14px |
| フッター リンク | ③ | Plex Sans JP 400 | 13px |

### 商品ページ（1 SKU）

| 部位 | Tier | フォント |
|---|---|---|
| 商品名（タスク・レベル名） | ① | Klee One 600 |
| 一文プロミス（その SKU の約束） | ① | Klee One 600 |
| レベル説明（「どんな子に・どこから・次は」） | ② | Zen Kurenaido |
| 店主メモ「ここを見てください」 | ② | Zen Kurenaido |
| 親向け声かけブロック本文 | ② | Zen Kurenaido |
| 仕様（紙サイズ・問題数・Lv） | ③ | Plex Mono |
| カートへ / サンプルを見る | ③ | Plex Sans JP 500 |
| ¥価格 | ③ | Plex Mono 400 |
| 改訂履歴日付 | ③ | Plex Mono 400 |

### 記事ページ（Pillar）

| 部位 | Tier | フォント |
|---|---|---|
| 記事 H1 | ① | Klee One 600 |
| H2（§ アンダーライン付） | ① | Klee One 600 |
| H3 | ① | Klee One 600 |
| 本文（長文）| ③ | Plex Sans JP 400 |
| pull-quote / リード文 | ② | Zen Kurenaido |
| 図表 caption | ③ | Plex Sans JP 400（12px） |
| 引用ブロック（一次資料） | ③ | Plex Sans JP 400 |
| TENZU 訳ラベル「TENZU 訳：…」 | ② | Zen Kurenaido |
| 引用元 cite | ③ | Plex Mono 400 |

### Maker App UI

| 部位 | Tier | フォント |
|---|---|---|
| Tool name / セクション見出し | ① | Klee One 600 |
| 「作るのは画面、練習は紙」ファーストビュー | ① | Klee One 600 |
| ガイド文 | ② | Zen Kurenaido |
| ボタン・入力 label | ③ | Plex Sans JP 500 |
| グリッドサイズ・座標表示 | ③ | Plex Mono 400 |
| 警告（5×5 上限到達など） | ③ | Plex Sans JP 400 |

---

## 4. サイズスケール

```
Tier ① Klee One 600（rev.4 Plex 比 +2-4px・letter-spacing +0.01em）
  H1           30 / 1.45
  H2           22 / 1.5
  H3           18 / 1.55
  promise-line 17 / 1.7
  在庫の下限   16   ← これ未満は Plex に降格

Tier ② Zen Kurenaido 400（letter-spacing +0.01em・line-height 1.85）
  pencil       16 / 1.85
  pencil-sm    15 / 1.85    ← これ未満は Plex に降格
  blurb / lead 17 / 1.85
  在庫の下限   15

Tier ③ Plex Sans JP / Plex Mono（letter-spacing 0.01em）
  body         16 / 1.7
  body-sm      14 / 1.75
  meta         12 / 1.6 (+0.04em)
  label-caps   11 / 1.6 (+0.16em, uppercase, Mono)
  num/price    数値は Plex Mono 400・tnum/zero
  cta          14 / 1.5 (weight 500, +0.02em)
```

---

## 5. 禁則（必ず守る）

### Klee One ① の禁則

- ❌ **16px 未満で使わない**（書写体の入り抜きが潰れる）
- ❌ **3 段落以上の連続本文では使わない**
- ❌ **`fg-2` 以下の薄色では使わない**
- ❌ **数値・¥・Lv 番号・Vol 数では使わない**（→ Plex Mono）
- ❌ **タグ・ラベルでは使わない**（→ Plex）
- ❌ **CTA ボタンでは使わない**（→ Plex 500）
- ❌ **警告・エラー・バリデーションでは使わない**（→ Plex）
- ✅ weight `600` 固定（`400` は使わない）

### Zen Kurenaido ② の禁則

- ❌ **15px 未満で使わない**（鉛筆筆致が潰れる）
- ❌ **5 段落以上の連続本文では使わない**（短い blurb・1 行・メモ用）
- ❌ **`fg-3` 以下の薄色では使わない**
- ❌ **見出しには使わない**（→ Klee One）
- ❌ **数値・タグ・ボタン・警告に使わない**
- ✅ letter-spacing `+0.01em` 固定
- ✅ line-height `1.85` 固定

### Plex ③ が必ず勝つ場所（再掲）

- 数値・¥・Lv・Vol・座標・問題数
- タグ・カテゴリラベル・チップ
- CTA ボタン文言・ナビ・パンくず
- フォーム placeholder / label / error
- 警告・バリデーション・system message
- 長文本文（3 段落以上）
- URL・パス・コード（Mono）

---

## 6. 階層越境を許す例外

### 店主メモブロック（3 階層共存）

```
┌─────────────────────────────────────┐
│ [Klee ①] ここを見てください          │  ← Klee One 17px
│ [Pencil ②] このレベルの ⟨対称タスク⟩  │  ← Zen Kurenaido 16px
│ [Pencil ②] は鏡を渡すよりも、軸を      │
│ [Pencil ②] 見つけてもらうほうが先です。│
│                                     │
│ [Mono ③] 2026-05-12                 │  ← Plex Mono 11px
└─────────────────────────────────────┘
```

### 商品カード（3 階層共存）

```
[Mono ③] A · 観察と模写 · Lv.2
[Klee ①] 模写 Lv.2 — 4×4 まで
[Pencil ②] 点と点の距離を、目で測れるように。
[Plex ③] 12 問 / ¥200 / [カートへ →]
```

---

## 7. 実装ユーティリティ（colors_and_type.css に対応）

| クラス | 用途 |
|---|---|
| `h1`, `h2`, `h3` | Klee One ① |
| `.promise-line` | Klee One ① 一文プロミス |
| `.h2-section` | H2 + 1.5px teal underline |
| `.pencil` | Zen Kurenaido ② 標準 |
| `.pencil-sm` | Zen Kurenaido ② 15px |
| `.shopkeeper-memo`, `.group-promise`, `.level-description` | Zen Kurenaido ② エイリアス |
| `p`, `.body` | Plex Sans JP ③ 16px |
| `.body-sm` | Plex Sans JP ③ 14px |
| `.longform` | Plex Sans JP ③ 長文 |
| `.meta`, `small`, `figcaption` | Plex ③ 12px |
| `.num`, `.level`, `.data`, `.price` | Plex Mono ③ |
| `.label-caps` | Plex Mono ③ UPPERCASE |
| `.tag`, `.category-label` | Plex Sans JP ③ 12px |
| `.cta-text` | Plex Sans JP ③ 500（押せる感） |
| `.parents-warm` | bg-3 + line-height 1.85（P5 surface） |

---

## 8. アクセシビリティ早見（コントラスト）

| 組合せ | 比率 | OK か |
|---|---|---|
| `--fg #1A1F2A` on `--bg #FFFFFF` | 16.93 | ✅ AA 通常 OK |
| `--fg-2 #424955` on `--bg #FFFFFF` | 9.45 | ✅ AA 通常 OK |
| `--fg-3 #767D89` on `--bg #FFFFFF` | 4.45 | ⚠️ AA 通常 NG → 18px 以上 or `--meta` のみ |
| `--fg-4 #B0B5BD` on `--bg #FFFFFF` | 2.36 | ❌ テキスト不可・絶対値ラインのみ可 |
| `--accent #2C6E7F` on `--bg #FFFFFF` | 5.42 | ✅ AA 通常 OK |
| white on `--accent #2C6E7F` | 5.42 | ✅ AA 通常 OK（CTA 最強用） |

**Klee One / Zen Kurenaido は数値上 OK でも体感コントラストが落ちる**ため、`fg-2` 以下では使わない（再掲）。
