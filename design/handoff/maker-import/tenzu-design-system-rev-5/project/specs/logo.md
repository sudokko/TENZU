# Logo Usage — rev.5 ロゴ運用

**version**: rev.5 草案 (2026-05-27)
**前提**: `uploads/logo-regenerate-brief.md` (オーナー lock) と整合
**SSOT アセット**: `assets/tenzu-logo-horizontal.png` ／ `assets/tenzu-symbol-floating.png`

---

## 1. ロゴ・アセット 2 種

| アセット | 用途 | ファイル |
|---|---|---|
| **Horizontal lockup** | 既定。ヘッダ・フッタ・名刺・PDF パッケージ面 | `assets/tenzu-logo-horizontal.png` |
| **Symbol · floating** | アイコン用途・極小サイズ・スタンプ的訴求 | `assets/tenzu-symbol-floating.png` |

両方とも **鉛筆筆致版** が canonical。SVG plate holder（`assets/tenzu-logo-horizontal.svg`）は legacy として残置するが、新規実装では参照しない。

### 4 色トーン

各アセット 4 色展開済み。背景に合わせて選ぶ：

```
*-ink.png    #1A1F2A  既定 — 白／クリーム背景
*-white.png  #FFFFFF  反転 — fg/accent 背景・最大コントラスト
*-cream.png  #FAF8F3  反転 — fg 背景・紙の温度を残したいとき推奨
*-teal.png   #2C6E7F  特例 — 達成/到達訴求バナーのみ
```

---

## 2. どちらを使うか — Decision Tree

```
Q1: 業態識別句「点描写プリントの専門店」を併記できるスペースがある？
    YES → Horizontal lockup
    NO  ↓
Q2: そのロゴで「TENZU を初見の人に説明する」必要がある？
    YES → スペースを作って Horizontal lockup を使う
    NO  ↓
Q3: 既に TENZU と認知している層向けの面（マイページ・通知・ファビコン）？
    YES → Symbol · floating
    NO  → 原則 Horizontal lockup
```

### 場所別 既定

| 場所 | 既定 | 補足 |
|---|---|---|
| サイトヘッダ | Horizontal lockup | 業態識別句必須 |
| サイトフッタ | Horizontal lockup | bg-3 上 |
| 商品ページ PDF 表紙 | Horizontal lockup | パッケージ面 L2 |
| 商品ページ PDF 作業面 | **なし** | 子の作業域に置かない |
| ファビコン (16/32/48px) | Symbol · floating | ink 単色 |
| Apple Touch Icon (180px) | Symbol · floating | ink 単色 |
| Maker App ヘッダ | Horizontal lockup | アプリ名「おためし点描写メーカー」併記 |
| メール署名 | Horizontal lockup | 添付画像で |
| OGP / Twitter Card | Horizontal lockup | 1200×630 中央配置 |
| 名刺 | Horizontal lockup | 業態識別句必須 |
| キャンペーンバナー | 場合による | 達成/到達訴求のみ teal 特例可 |

---

## 3. Horizontal lockup — 運用ルール

### 寸法

- **最小サイズ**: 高さ 28px / 0.8cm
  - これ未満では Wordmark の「Ξ-form E」が崩れる
  - 16px 未満が必要な場面では **Symbol · floating に置き換える**
- **推奨サイズ**: 36-48px（web header）／ 24-32mm（印刷）
- **アスペクト比**: 3:1 固定（変形禁止）

### 余白（safe area）

ロゴの周囲に **Symbol の高さの 1/2** を最小余白として確保する：

```
┌────────────────────────────┐
│         ↕  h/2              │
│   ┌──────────────────┐      │
│   │   [TENZU LOGO]   │      │
│   └──────────────────┘      │
│         ↕  h/2              │
└────────────────────────────┘
   ←h/2→               ←h/2→
```

### 業態識別句との並置

業態識別句「点図形（点描写）プリントの専門店」は **Horizontal lockup と必ず併記**（visual-identity §4.5）。並置パターン:

```
[LOGO]  │  点図形（点描写）プリントの専門店
        ↑ 1px dashed line-thin で区切る
        ↑ 業態識別句は Plex Sans JP 400 / 12px / fg-3 / letter-spacing 0.04em
```

- header 内では水平並列
- footer 内では ロゴ下に縦に併記（改行 OK）

---

## 4. Symbol · floating — 運用ルール

### 構造的意図

4 隅ドット + 線分が**触れない**「浮いた」構成は、**「点と線がまだ繋がっていない」TENZU の物語**そのもの。Symbol を見せること自体が「点描写は完成形を示す絵ではなく、子の手で完成させるもの」というブランドメッセージ。

このため:
- ❌ 線分とドットの間隔を狭める／消す（物語が破綻）
- ❌ ドットの大きさを変える（4 つの重さが等価でなくなる）
- ❌ 角丸を加える（鉛筆筆致の温度と矛盾）

### 寸法

- **最小サイズ**: 16px（ファビコンの極小用途）
- **推奨サイズ**: 24-64px
- **比率**: 1:1 固定

### 単独使用ルール

- 単独で使う場合 **「TENZU」のテキストラベル**を併記する（Plex Sans JP 500 14px）— ブランド未認知層への配慮
- ファビコン・通知 icon など、すでに認知済みの文脈では単独 OK

---

## 5. 色運用

### ink（既定）

```
on bg #FFFFFF      ◯
on bg-3 #FAF8F3    ◯
on bg-2 #F4F2ED    ◯（rev.4 legacy paper 上）
on dot grid        ◯（点格子の上でも黒で十分に読める）
```

### cream / white（反転）

```
on fg #1A1F2A      ◯  fg 背景には cream 推奨（紙の温度を残す）
on accent #2C6E7F  ◯  white で最大コントラスト
```

`cream` と `white` の使い分け:
- **cream**: 「紙のロゴが暗い面に乗っている」温度を残したいとき（既定）
- **white**: 視認性を最大化したいとき・小サイズ・コントラスト不足が懸念されるとき

### teal（特例）

```
on bg #FFFFFF      △  達成バナー・キャンペーンのみ
on bg-3 #FAF8F3    △  同上
```

- **常用しない**。teal の「達成・到達」意味と矛盾する場面で使うとブランド一貫性が崩れる
- 「卒業」「累計 N 枚達成」など、特定の到達訴求のみに限定
- 1 サイトで teal 版が 1 ヶ月に 1 箇所以上現れる頻度になったら使い過ぎ

---

## 6. アンチパターン（locked）

| ❌ NG | 理由 |
|---|---|
| ロゴの上に追加 effect（drop shadow, glow, outline） | 鉛筆筆致と矛盾 |
| ロゴを回転・斜行・skew | 教材文脈と齟齬 |
| ロゴをグラデーション塗りつぶし | rev.5 アンチパターン |
| ロゴを写真上に直接配置 | 写真背景はそもそも使わない |
| ロゴ周囲に「点線で囲んだボックス」を付ける | 点格子と衝突 |
| Horizontal lockup を縦組み化 | 業態識別句との並置設計が崩れる |
| 業態識別句を省略 | visual-identity §4.5 違反 |
| Symbol の線分とドットを「接続」させて描く | corner-dot float の物語が破綻 |
| ロゴをアニメーションさせる（描画 effect 等） | rev.5 静的方針と矛盾 |
| 「ロゴの色だけ変える」キャンペーン展開 | teal 特例以外、4 色から逸脱しない |

---

## 7. 緊急差し替えルール

「ロゴが小さすぎる」「コントラストが足りない」と思ったら **既定（ink on white）に戻す**。

迷ったら:
1. Horizontal lockup ／ ink ／ bg = white
2. これで成立しない場面なら、レイアウト側を調整する（ロゴ側を変えない）

---

## 8. ファイル一覧

```
assets/
  tenzu-logo-horizontal.png         ← 原版（canonical）
  tenzu-logo-horizontal-ink.png     ← 既定
  tenzu-logo-horizontal-white.png   ← 反転 (最大コントラスト)
  tenzu-logo-horizontal-cream.png   ← 反転 (紙の温度)
  tenzu-logo-horizontal-teal.png    ← 特例
  tenzu-logo-horizontal.svg         ← legacy plate holder (deprecate)

  tenzu-symbol-floating.png         ← 原版（canonical）
  tenzu-symbol-floating-ink.png
  tenzu-symbol-floating-white.png
  tenzu-symbol-floating-cream.png
  tenzu-symbol-floating-teal.png
```
