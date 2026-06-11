# Background Spec — 点描写格子の正式仕様

**version**: rev.5 草案 (2026-05-26)
**SSOT**: `colors_and_type.css` の `--dot-grid-*` 変数群

---

## 1. 基本仕様（locked）

| プロパティ | 値 | 備考 |
|---|---|---|
| substrate | `#FFFFFF`（`--bg`） | 完全な白。rev.4 の paper `#F4F2ED` から変更 |
| pitch (desktop / tablet) | `24px` | `--dot-grid-pitch` |
| pitch (mobile, ≤ 600px) | `28px` | `--dot-grid-pitch-mobile` |
| dot color | `#1A1F2A`（`--fg`） | accent teal は使わない |
| dot opacity | `0.16` | `--dot-grid-opacity` |
| dot radius | `1px` | `--dot-grid-radius` |
| position | `0 0` 固定 | 揃え／ズレ禁止 |

## 2. CSS 実装

### 標準（body 全面）

```css
body {
  background: var(--bg);
  background-image:
    radial-gradient(
      circle,
      rgba(26, 31, 42, 0.16) 1px,
      transparent 1px
    );
  background-size: var(--dot-grid-pitch) var(--dot-grid-pitch);
  background-position: 0 0;
}

@media (max-width: 600px) {
  body { background-size: 28px 28px; }
}
```

### ユーティリティ（局所適用）

```css
.dot-grid {
  background-image:
    radial-gradient(circle, rgba(26, 31, 42, 0.16) 1px, transparent 1px);
  background-size: var(--dot-grid-pitch) var(--dot-grid-pitch);
  background-position: 0 0;
}
```

### 除外（`.no-dot-grid`）

```css
.no-dot-grid {
  background-image: none !important;
}
```

CTA 最強・モーダル・写真領域・PDF 作業面の親要素に付与する。

## 3. 「点格子を載せない場所」

| 場所 | 理由 |
|---|---|
| CTA 最強ボタン（accent ベタ塗り） | 注目を集める表面に背景パターンは入れない |
| Hero に load される写真・グラフィック領域 | 視覚混雑 |
| モーダル / dialog 内部 | コンテンツ集中 |
| 画像・SVG 図形の上 | 線質との干渉 |
| `.parents-warm` カード内 | 寄り添う温度を出す余白の確保 |
| PDF 作業面（子が鉛筆で書くエリア） | 商品の puzzle dots と衝突 |

## 4. レイヤー差での濃淡（option）

| surface | bg color | dot opacity 上書き |
|---|---|---|
| 標準（`--bg`） | `#FFFFFF` | 0.16 |
| sunken（`--bg-2`） | `#F4F2ED` | 0.10（より退く） |
| parents-warm（`--bg-3`） | `#FAF8F3` | 0 (=載せない) |

## 5. レスポンシブ・印刷時の挙動

| breakpoint | pitch | 用途 |
|---|---|---|
| `≤ 600px` | 28px | スマホ（iPhone 375 / 390 / 414） |
| `601 – 1023px` | 24px | iPad portrait・小型タブレット |
| `≥ 1024px` | 24px | デスクトップ |
| **`@media print`** | none on L1 / 5mm on L2 | §6 を参照 |

```css
@media print {
  body { background-image: none; }
  .pdf-package-surface {
    background-image:
      radial-gradient(circle, rgba(26, 31, 42, 0.12) 0.2mm, transparent 0.2mm);
    background-size: 5mm 5mm;
  }
}
```

## 6. PDF 内の運用

| PDF 内レイヤー | 役割 | 点格子 |
|---|---|---|
| **L1 作業面** | 子が鉛筆で写すページ | ❌ 載せない（substrate 完全な白） |
| **L2 パッケージ面** | 表紙・タスク説明・親向け声かけ・改訂履歴 | ✅ 5mm ピッチ・12% opacity・点半径 0.2mm |
| **L3 サンプル領域** | 記入例 | ❌ L1 と同じ扱い |

## 7. 「TENZU の 3 種の点」整理

| 点の種類 | 用途 | 物理 | 出現場所 |
|---|---|---|---|
| ブランド点格子 | 「TENZU の紙の上」演出 | 24/28px・opacity 0.16 | Web 全面・PDF L2 |
| 商品点 (puzzle dots) | 子の作業対象 | 5/7/10mm・ベタ塗り | PDF L1 のみ |
| 記入点 (user input) | 子の出力 | 鉛筆任せ | PDF L1 の上 |

**3 つの点が同一面に重ならない**。これが rev.5 の骨。

## 8. アンチパターン

- ❌ 点格子の上に別の点装飾（puzzle dots を 9px ピッチで重ねる等）
- ❌ 点を四角や三角に変える（grid の意味がブランド点格子に固定されている）
- ❌ 点格子全面に teal の dot を載せる（点格子は黒 fg のみ、accent は退避）
- ❌ pitch を動的にアニメーションさせる（背景は静的）
- ❌ pitch を `clamp()` で連続変化させる（24px / 28px の 2 ステップで離散）
- ❌ opacity を 0.16 以上に上げる（紙の主張が強くなり「分類」感が戻る）
