---
ep: EP-080
title: Design rev.5 全面実装＋ 4 ページ完成（ハンドオフ bundle 忠実移植）
date: 2026-05-29
session: Design rev.5 実装セッション（Maker/LP/商品/記事）
themes: [design-system, nextjs, handoff, design-tokens]
related_docs:
  - design/visual-identity.md
  - design/handoff/maker-import/tenzu-design-system-rev-5/
  - web/app/page.tsx
status: draft
public_safe: true
---

# Design rev.5 全面実装＋ 4 ページ完成（ハンドオフ bundle 忠実移植）

## 何が起きたか（要約）

EP-078 で着手判断した Design rev.5 を、Claude Design から受け取ったハンドオフ bundle を import して全ページに一気に適用した。完成したのは 4 ページ — `/`（LP）、`/maker`（おためし点描写メーカー）、`/products/copy-lv2-4x4`（商品ページ）、`/articles/visual-spatial-cognition`（記事ページ）。前夜に独自実装していた Maker v0.1 は、bundle 入手後に全捨てして bundle 忠実実装へ置換した。rev.5 の視覚言語のキモは、純白 `#FFFFFF` 基板に全面ドットグリッド（点描写の格子そのもの）を敷き、フォントを 3 階層（Klee One 600 = 見出し・プロミス／Zen Kurenaido = 温度コピー・メモ／IBM Plex Sans JP & Mono = UI・数値・長文）に分け、divider を 4 種に絞り、アクセント `#2C6E7F`（青磁）を「到達・正解」だけに使う、というもの。`web/app/tokens.css` を bundle の `colors_and_type.css` で上書きし、確定ロゴ（Gemini 4 イテレーションの最終形・鉛筆筆致版）を `web/public/assets/` に配置した。

## 状況・背景

EP-078 で rev.4 LOCKED 縛りを全解除し、rev.5 着手が決まった。EP-079 でロゴリジェネが採用ラインに乗った。残るは「rev.5 の視覚言語を実コードに落とす」工程で、これを Claude Design 側で全体設計し、bundle としてハンドオフする運用にした。

bundle の場所は `design/handoff/maker-import/tenzu-design-system-rev-5/` で、これを rev.5 の SSOT とした。中身は `colors_and_type.css`（トークン）、`specs/` 7 ファイル（ロゴ・コンポーネント仕様）、`mockups/` 4 ファイル（landing/product/article/maker の HTML モック）。Code 側はこのモック HTML を verbatim で Next.js に移植する役回りに徹した。

## やり取りの中身

最初に方針を確定。前夜に Maker v0.1 を独自実装していたが、bundle のモックと構造がズレていたため、独自実装は全捨てして bundle 忠実移植に切り替えた。「Design = 視覚言語の定義、Code = 量産・移植」という EP-076 で確立した責務分離の徹底である。

4 ページを順に実装した。

`/` LP は Hero（H1 Klee 44px「点描写プリントの、専門店です。」＋お品書き 2 行＋ Tagline 2 段＋ CTA＋ 9 タスクアイコン strip）、§1 Why、§2 を 4 群縦展開の pillar-stack（A 見て写す／B かたちを動かす／C 重ねる・分ける／D 立体でとらえる）＋「店主から」メモ、§3 家庭での続け方 4 cards、§4 maker-promo で構成。landing.css も rev.5 モックを verbatim 移植した。

`/maker` は 3 カラムシェル（260/1fr/480・1200px 以下で 1 カラム）。LEFT がタスク（模写固定）・グリッド 3-5・用紙 6 種・オンボーディングメモ、CENTER がツールバー＋作図 SVG、RIGHT が保存リスト＋レイアウトセレクタ＋ PDF プレビュー SVG。`@page { size: ${paper.cssSize} }` を動的注入し、`window.print()` で OS の PDF 保存に流す設計。

`/products/copy-lv2-4x4` は SKU ヘッド 2 列、レベルラダー 5 段（現在レベルを teal outline で示す）、観察メモ「ここを見てください」、inside-grid 3 セル、rationale「店主から」、parents「親へのひとこと」、改訂履歴、関連 SKU 3 cards。

`/articles/visual-spatial-cognition` は Pillar 1 第 1 回として、article-meta、lead-graf、H2 ×3＋ H3 ×1、TENZU 訳ブロック、引用、5×5 格子＋中央 square の diagram、関連記事 3 件で構成。本文幅 760px・全体 1080px の混在運用にした。

技術スタックは Next.js 16（App Router + Turbopack）。SiteHeader に `currentNav` prop を追加し、各ページがアクティブナビを渡す形にした。フォントは Google Fonts CDN 経由（zip 未受領のため）で、受領後に `@font-face` 差し替え予定とした。

## なぜそう判断したか

bundle 忠実移植に振り切ったのは、rev.5 が「トークン・コンポーネント・モック」まで含めて Design 側で完結した設計だったからだ。Code 側が解釈を挟むと、せっかく定義した視覚言語が実装でブレる。前夜の独自 Maker を惜しまず捨てたのも同じ理由 — 独自実装を温存すると bundle との二重管理が生まれ、どちらが正かが曖昧になる。

純白＋ドットグリッドを基板にしたのは、点描写の格子が製品そのものであり、背景に薄く敷くだけでブランドの「何の店か」が一目で立つから。アクセント青磁を「到達・正解」だけに限定したのは、色の意味を 1 つに固定することで、ユーザーが「青磁＝できた印」と学習できるようにするため。多用すると意味が薄まる。

フォント 3 階層は、rev.5 の温度設計の核。Klee One の書写体で見出しに手書きの温度を、Zen Kurenaido の鉛筆筆致でメモに「店主の声」を、Plex で UI・数値に構造の冷たさを割り当てる。1 書体で全部やると、温度か可読性のどちらかが破綻する。

## 学び（一般化できるノウハウ）

1. **ハンドオフ bundle は「トークン＋仕様＋モック」を 1 セットで受け取り SSOT 化する** — Design がトークン・コンポーネント仕様・モック HTML まで含めて完結させ、Code は verbatim 移植に徹すると、視覚言語が実装でブレない。Design/Code の責務分離（EP-076）を bundle という物理単位で担保する。

2. **独自先行実装は bundle 入手時に惜しまず捨てる** — bundle と構造がズレた先行実装を温存すると二重管理になり「どちらが正か」が曖昧になる。捨てるコストより二重管理のコストの方が高い。

3. **アクセント色は意味を 1 つに固定する** — 「到達・正解」だけに青磁を使うと、ユーザーが色＝意味を学習できる。多用すると意味が薄まり、ただの装飾になる。

## 関連エピソード

- [EP-076](EP-076-visual-id-rev4-lp-nextjs.md) — Design/Code 責務分離の確立（本エピソードの bundle 運用の前提）
- [EP-078](EP-078-section2-3iter-rev5-unlock.md) — rev.5 着手判断とフォント 3 階層の確定
- [EP-079](EP-079-logo-regenerate-gemini-4iter.md) — 本エピソードで配置した確定ロゴの生成過程
- [EP-081](EP-081-maker-uiux-overhaul.md) — 本エピソードで実装した Maker の UI/UX を直後に修正
