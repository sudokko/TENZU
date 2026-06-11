# Component Spec — rev.5

**version**: rev.5 草案 (2026-05-26)
**前提**: 全 Phase 決定済み。これは LP / 商品ページ / 記事ページ / Maker App で共通使用される部品リスト

---

## 0. 設計原則

1. **ボックス削減**: solid border のフル枠は使わない。区切りは dashed か underline か left-marker
2. **角丸控えめ**: 既定 `r-control 2px` / parents-warm 系 `radius-soft 4px` / chip 系 `r-token` のみ
3. **shadow ほぼ無し**: `shadow-paper`（0 1px 2px 4% opacity）を商品サムネだけ
4. **CTA は 4 段階**（弱・中・強・最強）
5. **背景の点格子**は body 全面が基本。例外は `.no-dot-grid` で明示

---

## 1. Header（サイト共通）

```
┌────────────────────────────────────────────────────────────┐
│  [TENZU logo C: horizontal]   商品  記事  レベル選び  おためし  About │
│  [Plex 13 / 点図形（点描写）プリントの専門店]               カート (0) │
└────────────────────────────────────────────────────────────┘
```

- 高さ: 72px
- 背景: `var(--bg)` + dot grid 通過
- bottom: 1px dashed line-thin（divider D2）
- ロゴ: C horizontal lockup（実物未受領のため plate holder）
- 業態識別句: 必須併記（ロゴ下に小さく Plex 13px / fg-3）
- nav: Plex Sans JP 400 / 14px
- active item: 直下に accent 1.5px underline（D1 と同パターン）

## 2. Hero

```
[Klee 30-36]  図形の基礎は、点描写から。
[Pencil 17]   模写から対称・回転・立体まで。
              空間認知の土台を、家庭で着実に。
[Plex 12]     点図形（点描写）プリントの専門店 TENZU

──── divider D2 ────

[CTA 強]  サンプル PDF を見る →    [CTA 弱]  点描写とは
```

- Hero 自体は background のみ。装飾画像なし
- 9 タスク icon strip（small 24×24）を Pencil コピーの下に配置することができる（option）
- 高さ: 自然成り行き（min-height 不要）

## 3. §section ヘッダ

```
[Klee 22 + 1.5px solid teal underline]
家庭での続け方

[Pencil 16]  そのセクションの 1 行 lead（任意）
```

- H2 は inline 幅で underline（D1）
- H2 と次のコンテンツの間に 28px の spacer

## 4. Pillar-row（§2 4 群縦展開の主役 component）

```
┌──────────────────────────────────────────────────────┐
│ [Mono 11]  A · 観察                                    │
│ [Klee 24]  観察と模写                                  │
│ [Pencil 16]  目で測れるところまで来てから、写し始める。  │
│                                                       │
│ [icons]    [模写]                                      │
│                                                       │
│ [Mono 12]  1 タスク · Lv.1〜5 · 各 12-16 問           │
│                              [CTA 弱]  群の一覧へ →   │
└──────────────────────────────────────────────────────┘
```

- top + bottom: 1px dashed divider（D2）
- 左に余白 0、内部 padding 上下 32px / 横 0
- icon strip: タスク数だけ並べる（A=1 / B=4 / C=3 / D=1）
- CTA 弱: テキストリンク（accent color、underline on hover）
- 4 群を縦に並べる。間に divider なし（top + bottom dashed が連続して見える）
- 例外: §2 内に **1 つだけ memo--observe** を入れることができる（4 群の終わりに「店主からの一言」として）

## 5. Card（商品サムネ・list view）

```
┌────────────┬────────────────────────────────────┐
│  [SVG]     │ [Mono 11]  B · 観察 · Lv.2           │
│  64×64     │ [Klee 18]  模写 Lv.2 — 4×4 まで      │
│  icon      │ [Pencil 14] 点と点の距離を、目で測れる │
│            │             ように。                   │
│            │ [Mono 12]  12 問   [Mono 13]  ¥200    │
└────────────┴────────────────────────────────────┘
```

- 全体: top + bottom 1px dashed divider のみ
- 左 icon: 64-80px square / `.task-icon` 流用
- 上に shadow なし
- hover: bg を `--bg-3` に変える（dot grid OFF）
- click 全面

## 6. List-row（FAQ・改訂履歴・サンプル一覧）

```
[Klee 17]  Q. 何歳から始められますか？              [Plex 13]  Expand ↓
─────────────────────────────────────
[Klee 17]  Q. 点つなぎとの違いは？                  [Plex 13]  Expand ↓
```

- 行間 16-20px
- 各 row の下に 1px dashed
- expand 時: 折りたたみ部分は Plex 14 で表示

## 7. Details（商品ページ属性ブロック）

```
紙サイズ    A4 縦
問題数      12 問
レベル      Lv.2
群          B 観察と模写
収録タスク  模写
最終改訂    v1.3  2026-05-12
```

- 2-column grid: label(Plex 12 fg-2) / value(Plex 14 fg or Mono 14)
- 各 row の下に 1px dashed
- bg: transparent

## 8. FAQ-item

List-row（§6）と同じ構造。トグルは accent 色の `↓` / `↑`。

## 9. Sample-sheet（PDF プレビュー）

```
┌─────────────────────────┐
│  [PDF page thumbnail]    │  ← border 1px dashed
│  aspect-ratio: 210/297    │
└─────────────────────────┘
[Mono 11]  L1 · 作業面 · A4 縦 · 5mm pitch
```

- 縦長 PDF: aspect-ratio 210/297
- 横長 PDF: aspect-ratio 297/210
- 内部: `.no-dot-grid` で背景 pattern 解除（puzzle dot との衝突回避）
- bottom にラベル Mono 11

## 10. CTA 4 段階

| 強度 | スタイル | 用途 |
|---|---|---|
| **弱** | テキスト + accent + 矢印 `→`、hover で underline | 関連リンク・FAQ・本文中 |
| **中** | `1px solid var(--fg)` 枠 + bg-3 + Plex 500 + `radius-soft` | サブ CTA |
| **強** | `var(--fg)` ベタ + 白文字 + Plex 500 + `radius-soft` | 主 CTA（カートへ・サンプルを見る） |
| **最強** | `var(--accent)` ベタ + 白文字 + Plex 500 + `radius-soft` | 購入確定・達成完了 |

```css
.btn-weak { background: none; color: var(--accent); }
.btn-weak::after { content: "  →"; }
.btn-medium { background: var(--bg-3); color: var(--fg); border: 1px solid var(--fg); padding: 10px 18px; border-radius: var(--radius-soft); }
.btn-strong { background: var(--fg); color: var(--bg); padding: 11px 20px; border-radius: var(--radius-soft); }
.btn-max    { background: var(--accent); color: var(--bg); padding: 11px 20px; border-radius: var(--radius-soft); }
```

すべて Plex Sans JP 500 / 14px / letter-spacing 0.02em。

## 11. Chip

```css
.chip-level {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 10px;
  border: 1px solid var(--line-thin);
  border-radius: var(--r-token);
  font-family: var(--font-tier3-mono);
  font-size: 12px;
  color: var(--fg-2);
  background: var(--bg-3);
}
.chip-level[data-state="reached"] { color: var(--accent); border-color: var(--accent); }
```

## 12. Memo blocks（再掲・shopkeeper-traces.md 参照）

- `.memo--observe` (T1)
- `.memo--revision` (T2)
- `.memo--rationale` (T3)
- `.memo--parents` (T4)

## 13. Article 内 components

- **lead**: Pencil 17px
- **TENZU 訳ブロック**: 「TENZU 訳：」label を Pencil 14 ＋ 本文 Plex
- **cite**: Mono 11px / fg-3 / 引用末尾

## 14. Footer

```
[Klee 22]  TENZU
[Plex 12]  点図形（点描写）プリントの専門店

商品 · 記事 · レベル選び · おためし · About
改訂履歴 · プライバシー · 特商法

[Mono 11]  © 2026
```

- top: 1px dashed
- 背景 bg-3、点格子 OFF
- nav: 横並び（mobile では縦並び）
- Plex Sans JP 400 / 14px

## 15. Maker App 専用

- canvas: dot lattice 表示（active dot に accent halo）
- toolbar: Plex Sans JP 500
- 「作るのは画面、練習は紙」ファーストビュー: Klee 24px
- 出力時の PDF download ボタン: CTA 最強

---

## 16. ❌ 採用しない component（明示）

- カルーセル
- modal の派手な enter/exit（fade のみ可）
- toast 通知（PDF download 完了 inline message を採用）
- マスコット・キャラクター
- 商品レビューウィジェット
- like / heart UI
- 「他のお客様も買いました」レコメンド
- パンくず以外のブレッドクラム装飾
- スティッキー CTA バー（モバイル下部）
