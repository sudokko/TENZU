# TENZU Brand Spec

ロゴ・配色・タイポの**機械可読な仕様書**。Claude Design への投入用一次資料。
画像（PNG）は補助参照のみ。**この Markdown と SVG コードが正**。

> 関連: [foundation/brand.md](../../foundation/brand.md) ／ [visual-identity.md](../visual-identity.md) ／ [README.md](../README.md)

---

## 1. Colors

| ロール | Hex | 名称 | 用途 |
|---|---|---|---|
| Main | `#3F475F` | Calm Navy Gray | ロゴ・見出し・本文・線・主要UI |
| Background | `#FAF3EB` | Premium Off-White | サイト背景・PDF背景・カード地色 |

- **2色基調を厳守**。アクセント色（最強CTA用）は D1 デザインシステムで別途定義（warm rust / テラコッタ系を検討中）
- モノクロ完全機能：navy 単色だけで全コンポーネントが成立すること

## 2. Logo Geometry（symbol）

ベース viewBox: **100 × 100 units**（座標値は全てこの単位系）

| 要素 | 値 | 備考 |
|---|---|---|
| 正方形枠 x, y | 22, 22 | 余白18% |
| 正方形枠 w, h | 56, 56 | |
| 正方形 stroke-width | 2.5 | 細め・知的トーン |
| 正方形 fill | none | 中抜き |
| ドット半径 | 6 | stroke幅の 2.4倍 |
| ドット座標 | (22,22) (78,22) (22,78) (78,78) | 枠の4隅・線上に重なる |
| ドット fill | navy 単色 | stroke なし |
| 角丸 | 0 | シャープな矩形 |

**意味論**：4ドット = 点描写の起点。正方形の線 = 点と点を結ぶ直線。シンボル全体で「点 → 直線 → 図形」の関係を1象徴に圧縮。

## 3. Wordmark

| 要素 | 値 | 備考 |
|---|---|---|
| Font family | Custom geometric sans-serif | 最終フォント未定 |
| Fallback stack | Outfit → Sora → Manrope → system-ui | SVG実装の暫定 |
| Weight | 300 (Light) | 細め・上品 |
| Letter-spacing | +0.22em | 広め・呼吸 |
| Color | `#3F475F` | Main |
| Text-transform | uppercase | "TENZU" |

**重要**：現状のSVGは web font 参照。Claude Design や本実装フェーズでは**最終フォントを `<path>` でアウトライン化**してフォント非依存にする。

## 4. Lockup Variants

| バリアント | viewBox | 用途 |
|---|---|---|
| Symbol only | 100 × 100 | ファビコン・極小サイズ・アプリアイコン |
| Wordmark only | 360 × 80 | フッター・記事末尾の小サインなど |
| Horizontal lockup | 480 × 100 | ヘッダー・名刺・封筒・LP上部 |
| Vertical lockup | 360 × 200 | パッケージ・PDFカバー・縦長広告 |

### Padding rules
- 横ロックアップ：シンボル右辺〜ワードマーク左辺 = シンボル高さの **1.0x**
- 縦ロックアップ：シンボル下辺〜ワードマーク上辺 = シンボル高さの **0.4x**
- 周囲クリアスペース（外側余白）：シンボル幅の **0.5x** 以上を必ず確保

## 5. Watermark Grid

ヒーロー領域や帯のみに使う**控えめなドットグリッド**。

| 要素 | 値 |
|---|---|
| ドット間隔 | 12 units（viewBox 単位） |
| ドット半径 | 0.5 units |
| 色 | `#3F475F` α=0.18（薄く） |
| 適用範囲 | ロゴ周辺・ヒーロー・特定セクションのみ。**全面適用は禁止** |
| フェード | radial / linear で端を抜くと品が出る |

## 6. Tone & Formality

- **Formality**: 4 / 5（5段階）
- **Tone**: Professional / Expert / Intellectual（プロ・専門家・知的）
- **メタファー**: Dots / Paper / Figures（点・紙・図形）
- **メタファー型**: **専門店**（点図形（点描写）プリントの専門店 TENZU・[brand.md §12](../../foundation/brand.md) 業態識別句）
- **NG**: ゲーミフィケーション過多／道場・塾感／媚びた子ども向け演出／点描画（pointillism）連想／**「街の選書本屋」コンセプト（2026-05 撤回済）**

## 7. Dual Application

同一ブランドが2媒体で機能すること：

| 媒体 | 主用途 | 留意点 |
|---|---|---|
| Print (A4 PDF) | 商品本体（点描写プリント140 SKU + 9混在セット） | 黒線中心・印刷適性・モノクロ完全機能 |
| Screen UI | LP・記事・商品ページ・作成アプリ | navy+cream の2色基調・モバイル7割 |

両媒体でロゴが同じ印象を保つこと。print用に派手な装飾を加えたり、UI用にネオン彩度を上げたりしない。

## 8. Files (this directory)

| ファイル | 内容 |
|---|---|
| `tenzu-symbol.svg` | 4ドット正方形シンボル単体 |
| `tenzu-wordmark.svg` | TENZU 文字組単体 |
| `tenzu-lockup-horizontal.svg` | シンボル＋Wordmark 横並び |
| `tenzu-lockup-vertical.svg` | シンボル＋Wordmark 縦並び |
| `brand-spec.md` | このファイル（一次仕様書） |

## 9. Self-review（PNG リファレンスとの差分）

PNG（Gemini 出力）と本SVGの差分メモ：

| 観点 | 差分 | 対応 |
|---|---|---|
| シンボル太さ | 概ね一致 | stroke 2.5 で再現。微調整余地あり |
| ドットサイズ | 概ね一致 | r=6 で stroke の 2.4倍。やや大きめに見えるなら r=5 に調整可 |
| Wordmark フォント | **未確定**（PNGは Custom geometric sans-serif） | Outfit Light で仮置き。最終フォント確定後にパス化必須 |
| Letter-spacing | 概ね一致 | +0.22em（PNG は推定値 0.18〜0.25em の中央） |
| 色 | 一致 | #3F475F 単色 |

## 改訂履歴

| 日付 | 版 | 変更 |
|---|---|---|
| 2026-05-11 | v1 | 初版（Claude Code が PNG リファレンスから SVG 4本＋本仕様書を起こし） |
