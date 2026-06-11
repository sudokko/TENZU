# ロゴリジェネ指示書（Gemini 画像生成 AI 向け）

**起票日**: 2026-05-26
**目的**: 既存ロゴ（4-dot square symbol + Ξ-form E wordmark）を rev.5 デザインシステムと整合する形に**差分アップデート**するための要件定義
**対象**: Gemini 画像生成 AI（オーナーが直接プロンプトに転用）
**方針**: (b) ハイブリッド案 — 骨格は維持し、Wordmark の Ξ-form E と N・Z 角に「鉛筆筆致風の微妙な揺らぎ／微丸み」で温度を 1 段上げる

## サマリ（読むのはこの 15 行で足りる）

- 既存ロゴの**骨格・記号性は完全維持**。Symbol（4-dot square）は 1 ピクセルも触らない
- 触るのは **Wordmark の 3 点のみ**：① Ξ-form E の 3 横線の端点に鉛筆筆致風揺らぎ ② N・Z の角に 0.5px 程度の微丸み ③ 全体の素材感を「わずか」→「触れる強度」に一段強化
- 既存ロゴの**12 個の意味書きは全項目維持**。うち Wordmark の ②④⑤ は意味を変えず**物理的に可視化する強度を上げる**だけ
- 新規追加意味は 2 個：Symbol ⑦「親と子の対話」／ Wordmark ⑦「専門店の確かさ」
- カラーは `#3F475F` → **`#1A1F2A`**（Ink Black, rev.5）に差し替え。Off-white 背景 `#FAF3EB` は廃止し**真っ白 `#FFFFFF`** へ
- Lockup バリアントは **3 種 → 4 種**に拡張（Symbol Only / Vertical / Horizontal / **Full Lockup with 業態識別句**）
- NG：紙クリーム背景／ゲーミフィケーション要素／キャラクター化／グラデーション／装飾線／角丸ボックス枠

## 1. 既存ロゴから維持するもの（変更禁止領域）

### Symbol（完全維持）

- 4 つの黒丸点が正方形の 4 角に配置
- 4 点を直線で結んで正方形を形成
- **🔴 点と線の間に微細な空白（gap）がある「コーナードット浮き」構造**を厳守。点と線は融合させず、点が独立した存在として角に浮いている見え方
  - gap の幅は線幅の **20-30%** 程度（点と線が「触れていない」と認識される最小限）
  - 線は正方形の 4 辺を構成し、各辺の両端は点の手前で止まる
- 線の太さ・点の半径・正方形のプロポーション
- 単色運用（黒 1 色で機能）

### Wordmark（骨格維持）

- 「TENZU」5 文字の幾何学サンセリフ骨格
- E の縦軸なし・3 本横線（Ξ-form E）の構造
- N・Z の直線性
- U の開き（底のカーブ）
- 均整のとれた字間
- 単色運用（黒 1 色で TENZU らしさが成立）

## 2. 変更点（(b) ハイブリッド案の具体要件）

### 2.1 Ξ-form E の 3 横線

- **現状**: 3 本とも完全な直線・端点はシャープ
- **rev.5**: 3 本の横線全体に**鉛筆で書いた線の質感**を入れる
  - **線の縁が完全な直線ではなく、わずかに不均一**（鉛筆を紙の上で引いたときの微細なブレ）
  - **端点（左右両端）は鉛筆の入り抜きを思わせる質感**（完全なフラット切断ではない）
  - 線の中央部はかすかに濃淡があってもよい（紙繊維にインクが乗ったような）
  - 揺らぎ幅: 線幅の **15-25%**（前回 10-15% から増強）
  - 真ん中の横線が最も短いことは維持
  - 「手書き」レベルまでは行かないが、**ベクター直線ではないことが一目でわかる**強度

### 2.2 N・Z の角

- **現状**: シャープな直角
- **rev.5**: **0.5px 程度の極めて微細な丸み**を内角に入れる
  - 「丸まった」と認識される手前のレベル
  - U の開きと連動して「鋭さとやわらかさの両立」を一段強化

### 2.3 全体の素材感

- **現状**: ベタ塗りの単色
- **rev.5**: **紙繊維にインクが乗ったような質感**を全体に入れる
  - 線・点の境界部に **3-5%** のフェザリング（前回 1-2% から増強）
  - わずかな濃淡ムラ（鉛筆 / 万年筆で書いた感じ）
  - 「ベクター直線」ではなく「紙の上の筆跡」と一目でわかる強度
  - ベクター出力時は維持されないため、SVG 版とラスター版で運用差を許容

### 2.4 カラー

| 要素 | 旧 | 新 |
|---|---|---|
| Logo 主色 | `#3F475F` (Calm Navy Gray) | **`#1A1F2A`** (Ink Black, rev.5) |
| 推奨背景 | `#FAF3EB` (Premium Off-white) | **`#FFFFFF`** (Pure White, rev.5) |
| Accent（使用時） | なし | `#2C6E7F` (Seiji Teal, rev.5)：単色版が原則だが、業態識別句のみ teal 可 |

## 3. Lockup バリアント（3 種 → 4 種）

| バリアント | 構成 | 用途 |
|---|---|---|
| **A. Symbol Only** | 4-dot square のみ | ファビコン・極小サイズ・SNS アイコン・既に文脈がある場所 |
| **B. Vertical Lockup** | Symbol 上 / Wordmark 下 | アプリ起動画面・縦長配置・正方形枠 |
| **C. Horizontal Lockup** | Symbol 左 / Wordmark 右 | LP ヘッダー・名刺の主面・ナビゲーション横並び |
| **🆕 D-1. Full Lockup (Plex 版)** | Horizontal + 業態識別句「点描写プリントの専門店」を Wordmark 下に IBM Plex Sans JP 400 で小さく | 構造・記号性寄り。Wordmark との視覚的調和が最優先な場面 |
| **🆕 D-2. Full Lockup (Klee One 版)** | Horizontal + 業態識別句「点描写プリントの専門店」を Wordmark 下に Klee One 600（書写体）で小さく | SNS プロフ画像・OGP・印刷物・名刺の裏面・フッター・初見ユーザーに**温度ごと**業態を伝える場面。rev.5 の 3 階層フォントルール「① 意味を運ぶ＝ Klee One」と整合 |

### D. Full Lockup 詳細仕様（共通）

- 業態識別句のテキスト: **「点描写プリントの専門店」**
- サイズ: Wordmark 高さの **約 30-35%**
- 色: 主色 `#1A1F2A` か Accent `#2C6E7F`（運用で選択可）
- 配置: Wordmark の右端・左端を超えない幅で中央寄せ
- 余白: Wordmark との垂直距離は Wordmark の x-height の **50% 程度**

### D-1 vs D-2 使い分けルール

| バリアント | フォント | 用途 | 最小サイズ |
|---|---|---|---|
| **D-1 Plex 版** | IBM Plex Sans JP 400 | 構造・記号寄り。極小印刷・低解像度・モノクロ FAX 等で読める強度が必要な場面 | Wordmark height 40px / 印刷 4mm |
| **D-2 Klee One 版** | Klee One 600（書写体） | 温度・親しみ寄り。SNS プロフ・OGP・名刺・印刷物・LP フッター等、温度を出したい場面 | **Wordmark height 80px / 印刷 8mm**（Klee One は線が細いため極小では潰れる） |

**判断基準**: 「温度を出すか／構造を保つか」。迷ったら **D-2 Klee One 版**を優先（rev.5 の 3 階層ルール ① と整合）。極小・低解像度の場合のみ D-1 へフォールバック。

## 4. ロゴが体現する 14 意味（既存 12 + 新規 2）

### Symbol（7 項目）

| # | 意味 | rev.5 での状態 |
|---|---|---|
| ① 4 つの点 | 図形認識の出発点 | 完全維持 |
| ② 結ぶ動作 | 点と点を線で結ぶ行為そのものを可視化 | 完全維持 |
| ③ 正方形の出現 | 点から秩序ある形が現れる構図 | 完全維持 |
| ④ グリッド感 | 整然とした思考・観察・反復 | **強化**（サイト全体 24px 点格子背景と呼応） |
| ⑤ 余白と簡潔さ | 小さくしても識別できるミニマル設計 | 完全維持 |
| ⑥ 上達の示唆 | ひとつずつ結ぶ蓄積が、確かな形になる | 完全維持（Pillar 5「継続」と整合） |
| **🆕 ⑦ 親と子の対話** | 4 点を「結ぶ」動作は親が子と一緒に進める行為のメタファー。1 点目（親が示す）→ 2 点目（子が結ぶ）→ 形になる | Pillar 5「継続（親が子に寄り添う）」対応 |

### Wordmark（7 項目）

| # | 意味 | rev.5 での状態 |
|---|---|---|
| ① 幾何学的な骨格 | 秩序と構造を感じる字形 | 完全維持 |
| ② E の 3 本線 | ガイド線や反復、蓄積のニュアンス | **微強化**（端点に鉛筆筆致風揺らぎで「反復・蓄積」を物理的に可視化） |
| ③ 均整のとれた字間 | 落ち着きと信頼感を生む | 完全維持 |
| ④ 鋭さとやわらかさの両立 | N・Z の直線性と U の開きで、冷たすぎない印象 | **微強化**（N・Z の角に 0.5px の微丸みで温度を一段上げる） |
| ⑤ 手の痕跡 | 紙と鉛筆を思わせる、わずかな素材感 | **可視化強化**（「わずか」→「触れる強度」に一段上げる） |
| ⑥ 単色で機能 | 黒 1 色でも TENZU らしさが成立 | 完全維持（色は `#1A1F2A` に差し替え） |
| **🆕 ⑦ 専門店の確かさ** | 幾何学的骨格と手の痕跡の両立は「専門店（プロ）が手で 1 枚ずつ作っている」感の表現。大量生産タブレット教材との対立軸の視覚化 | Pillar 1「体系」＋ ノースクリーン軸対応 |

## 5. NG リスト（やってはいけないこと）

- ❌ 紙クリーム色背景 `#FAF3EB`（rev.5 で廃止）
- ❌ ゲーミフィケーション要素（キャラクター・マスコット・装飾アイコン）
- ❌ グラデーション・シャドウ・3D 効果
- ❌ Symbol の正方形を歪める／非対称化する
- ❌ Wordmark の E を通常の E（縦軸あり）に戻す
- ❌ 装飾線・フレーム・角丸ボックスでロゴを囲う
- ❌ 「手書き感」が前面に出るレベルの揺らぎ（あくまで「素材感」レベル）
- ❌ Tagline「点と点がつなげるようになったら、点描写を。」をロゴに同梱（長すぎて視認性を殺す）

## 6. Gemini プロンプト用テンプレ（オーナー転用前提）

```
Generate the TENZU brand logo with the following specifications. This is a third revision. Previous attempt achieved good hand-drawn texture and refined proportions, but the symbol lines need to be slightly thicker — more weight and presence on the page. The dots should NOT get larger to match; keep dots delicate so lines visually dominate.

== STYLE REFERENCE ==
Imagine the logo was hand-drawn with a sharp graphite pencil (2B-4B) on textured cotton drawing paper, by a skilled adult illustrator working slowly and carefully. Think of architectural sketches, Bauhaus drafting studies, or fine pencil-on-paper diagrams from a designer's notebook. NOT digital, NOT vector, NOT clean Illustrator output. The paper texture should be visible through the strokes.

== SYMBOL STRUCTURE ==
- Four small filled circles (dots) placed at the four corners of a square
- Four short straight line segments connecting the dots, forming the square's edges
- CRITICAL: Each line segment STOPS SHORT before reaching the dots, leaving a clear visible gap. The dots and lines must NOT touch. The dots should appear to "float" at the corners, with the lines as separate independent segments.
- Gap width between dot and line: approximately 20-30% of the line thickness
- Refined, delicate proportions:
  - Lines: medium-weight confident strokes — slightly thicker than the previous output, but still NOT bold or chunky. Think of a 2B pencil pressed firmly but not heavily.
  - Dots: small and refined, roughly EQUAL to the line thickness in diameter, or only marginally larger (NOT chunky, NOT oversized)
  - The dot-to-line diameter ratio should be approximately 1.0-1.2x (dots should NOT visually dominate the lines)
- This must feel precise like a careful pencil diagram, NOT chunky like a modern app icon
- The lines should have presence and weight on the page, but the overall feel remains delicate and architectural

== WORDMARK ==
- The word "TENZU" in geometric sans-serif letterforms
- The letter "E" has NO vertical stem — only three horizontal bars (Ξ-form). The middle bar is shortest.
- N and Z: straight, geometric, but with extremely subtle (0.5px equivalent) rounding at inner corners
- U: open curved bottom
- Even letter spacing, calm and intellectual

== HAND-DRAWN PENCIL QUALITY (MUST BE CLEARLY VISIBLE) ==
This is where the previous output failed. The pencil quality must be obvious at first glance:
- Stroke edges are slightly irregular, not perfectly straight (subtle wobble as if drawn freehand against a ruler)
- Visible graphite grain inside each stroke — slight density variation along the stroke
- Stroke ends show characteristic pencil entry/exit marks, not flat machine cuts
- Soft feathering at stroke edges (3-5% of stroke width) — graphite catches paper fibers
- Some strokes may be very slightly darker in the middle or at one end (natural pressure variation)
- Paper texture (cotton/cold-press) faintly visible through and around the strokes
- BUT: this is a skilled adult's careful hand, NOT a child's scribble. Lines are confident and intentional, just not mechanically perfect.

== COLOR ==
- Stroke color: deep ink black (#1A1F2A), but rendered as graphite (so it reads as dark gray-black with paper showing through)
- Background: pure white textured paper (#FFFFFF base with subtle paper grain)
- Monochrome only — no gradients, no shadows, no color accents

== OUTPUT VARIANTS (5 panels) ==
- A: Symbol Only — just the 4-dot square
- B: Vertical Lockup — Symbol above, "TENZU" wordmark below, centered
- C: Horizontal Lockup — Symbol on the left, "TENZU" wordmark on the right, baseline-aligned
- D-1: Full Lockup (Plex version) — same as C, but with the Japanese tagline "点描写プリントの専門店" placed below the wordmark in a clean geometric sans-serif (IBM Plex Sans JP 400 equivalent), at about 30% of the wordmark's cap height. This version emphasizes structure and harmony with the geometric wordmark above.
- D-2: Full Lockup (Klee One version) — IDENTICAL layout to D-1, but the tagline "点描写プリントの専門店" is rendered in Klee One 600 style — a Japanese semi-formal handwritten/calligraphic typeface with the warmth of a teacher's handwriting on educational worksheets (think: school workbook handwritten model letters, "kyokasho-tai" but slightly warmer). The strokes should have the same gentle hand-drawn pencil quality as the symbol above, providing tonal continuity. This version emphasizes warmth and the "specialist who personally crafts each worksheet" feel.

== STRICT NO ==
- No fused dot-and-line shapes (the gap is mandatory)
- No clean vector look (must look hand-drawn)
- No thick chunky strokes (refined and thin)
- No gradients, no drop shadows, no 3D effects, no embossing
- No cartoon or character elements
- No decorative frames or borders around the logo
- No cream/beige background — pure white only
- No childlike scribble or wild distortion
- No vertical stem on the letter E
- No color other than graphite black on white paper
```

## 7. 関連リンク

- [design/handoff/rev5-brief.md](rev5-brief.md) — Design rev.5 全体ブリーフ
- [foundation/brand.md](../../foundation/brand.md) — ブランド本体 SSOT（Pillar 5・Tagline trio）
- [design/visual-identity.md](../visual-identity.md) — rev.4 SSOT（rev.5 で全面上書き対象）
- [decisions.md §3.37](../../decisions.md) — rev.5 着手判断
