# Illustration Spec — SVG 図形の描き方統一ルール

**version**: rev.5 草案 (2026-05-26)
**前提**: Phase C で確定した「直線維持 + 端点 round cap」方針

---

## 1. 物理規格（locked）

| 項目 | 値 |
|---|---|
| viewBox | `0 0 64 64` |
| stroke 色（fg） | `#1A1F2A` |
| stroke 色（accent） | `#2C6E7F` ※「正解線・補助 overlay」のみ |
| stroke 幅 | 1px 補助 / **1.5px 基本** / 2px 強調 |
| stroke-linecap | `round` |
| stroke-linejoin | `round` |
| fill | `none` 既定（dot は `fill="#1A1F2A"`） |
| dot 半径 | 2px（puzzle dot 表現） |
| ガイド線 | `stroke-dasharray="3 3"` または `"4 4"` |
| ガイド opacity | 0.35 |
| 余白 | viewBox 内 ≥ 8px |
| 端点 → dot の visible gap | 0.5px |

## 2. SVG ベーステンプレ

```html
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="（タスク名）">
  <!-- ① 背景 dot lattice — 必要なら opacity 0.16 -->
  <g class="lattice" fill="#1A1F2A" opacity="0.16">
    <circle cx="12" cy="12" r="1"/>
    <!-- ... 5×5 等で配置 -->
  </g>

  <!-- ② ガイド線 — 軸・補助線・dashed -->
  <g stroke="#1A1F2A" stroke-width="1" stroke-dasharray="3 3"
     stroke-linecap="round" fill="none" opacity="0.35">
    <!-- ... -->
  </g>

  <!-- ③ 元の図形 -->
  <g stroke="#1A1F2A" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- polyline / polygon for the source figure -->
  </g>

  <!-- ④ 答え / 完成形 — accent teal -->
  <g stroke="#2C6E7F" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- ... only when state = "answered/overlaid" -->
  </g>
</svg>
```

## 3. 9 タスク描き分け

下表の「主構成」を最小単位として再現。複合する場合（例: 線対称 × 回転）は両方のルールを合成する。

| # | タスク（jp） | task code | 主構成 | accent の用途 | 補助線 |
|---|---|---|---|---|---|
| 1 | 模写 | `copy` | 左図 + 中央矢印 + 右に空格子（または同じ図） | 右の完成例 | なし |
| 2 | 線対称 | `mirror` | 左半分の図 + 中央 vertical axis dashed + 右半分 mirror | 鏡像 | 中央軸 dashed |
| 3 | 回転 | `rotate` | 元図 + 弧矢印 + 回転後 | 回転後 | 回転中心の十字 |
| 4 | 平行移動 | `translate` | 元図 + ストレート矢印 + 移動後 | 移動後 | 移動量 dashed |
| 5 | 拡大縮小 | `scale` | 小さい元図 + 中央矢印 + 大きい相似 | 相似 | スケール比補助 |
| 6 | かさね | `overlay` | 2 図形が部分的に重なる | 重なり領域に teal fill 8% | なし |
| 7 | 分解 | `decompose` | 大図形 → 分割線 → パーツ群 | パーツ群 | 分割線 dashed |
| 8 | 欠け補完 | `fill` | 一部 dashed（欠け）+ 補完で完成 | 補完辺 | 欠け辺 dashed |
| 9 | 立体 | `solid` | 2D 平面 + 矢印 + 等角投影 | 見える辺 | 隠れる辺 dashed |

## 4. アクセント色の物理ルール

- **`#2C6E7F` の登場意味は「完成・到達・正解」固定**
- 「これが答えです」「重なるのはここです」「次の状態です」を示すときに限って使う
- 状態として "before / after" の "after" だけが accent

## 5. dot lattice の使い分け

| 用途 | lattice 表示 |
|---|---|
| 商品サムネ・カード内図 | あり（5×5・opacity 0.16） |
| ヒーロー大型図 | なし（背景の body 点格子に任せる） |
| 印刷可能 PDF L2 のサムネ | あり |
| in-app（Maker UI）内のリアルタイム表示 | あり（active dot を highlight） |

## 6. アンチパターン

- ❌ stroke-linecap: butt（角張った端 — TENZU の温度に合わない）
- ❌ stroke 内に dasharray でランダム揺らぎ
- ❌ 角丸を逆に大きくして「ぽい」絵柄にする
- ❌ accent teal を「元の図形」に使う（accent は答えのみ）
- ❌ fill を使った塗りつぶし図形（teal 8% overlay 以外）
- ❌ 図形内に文字を入れる（タスク名は SVG の外で Klee ① に書く）
- ❌ アニメーションで線が描かれる演出（rev.5 は静的）

## 7. ファイル命名

```
assets/icons/task-copy.svg
assets/icons/task-mirror.svg
assets/icons/task-rotate.svg
assets/icons/task-translate.svg
assets/icons/task-scale.svg
assets/icons/task-overlay.svg
assets/icons/task-decompose.svg
assets/icons/task-fill.svg
assets/icons/task-solid.svg
```

## 8. アクセシビリティ

- 全 SVG に `role="img"` ＋ `aria-label="（タスク名 - 状態）"`
- 装飾用に使うとき `role="presentation"` ＋ `aria-hidden="true"`
- accent teal だけで意味伝達しない（色覚配慮）— **必ず stroke-dasharray の差や形の差で同時表現**
