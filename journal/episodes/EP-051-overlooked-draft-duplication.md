---
ep: EP-051
title: 棚卸し怠ったやらかし（重複ドラフト board-copying-difficulty 作成事件）
date: 2026-05-15
session: B-3 執筆運用見直しセッション
themes: [ai-collaboration, ops-discipline, retrospective]
related_docs:
  - docs/drafts/articles/note-not-copying.mdx
  - docs/content-design-urls.md
status: draft
public_safe: true
---

# 棚卸し怠ったやらかし（重複ドラフト board-copying-difficulty 作成事件）

## 何が起きたか（要約）

B-3 執筆の進捗を「Phase 0 で 2 本完了」と認識したまま新規執筆に入り、`board-copying-difficulty.mdx`（KW #31+32「板書が写せない」）を 1 本書き起こした。書き終えてから `docs/drafts/articles/` を ls して既存ドラフトを確認したところ、同じ KW を扱う `note-not-copying.mdx` がすでに 2026-05-12 の夜間自律執筆で生成されていたことが判明。内容が完全に重複していたため新規作成分を削除し、Pillar A の内部リンクも `note-not-copying` に巻き戻した。同時に「Phase 0 は実は 10 本全てドラフトが存在していた」という棚卸し漏れも発覚し、進捗認識を 2 本完了 →10 本ドラフト存在（うち 1 本校了済・9 本要レビュー）に更新した。

## 状況・背景

2026-05-10 に B-3 着手し、1 本目 `tenzu-app-intro.mdx`・2 本目 Pillar A `point-drawing-guide.mdx` を仕上げた。MEMORY.md には「Phase 0=2/10 本完了」と記録し、次回以降の執筆対象として Phase 0 残り 8 本を想定していた。

2026-05-12 と 2026-05-13 の夜間自律執筆で、複数のドラフトがバッチ生成されていた。これは寝ている間に走るタスクとして組んでいたもので、生成自体は意図したものだったが、MEMORY.md への進捗反映が追いついていなかった。

2026-05-15 のセッション、Phase 0 の残り執筆を始める前に「板書が写せない・遅い子へ」（KW #31+32）を書こうとし、`urls.md` の確定スラッグ表から `board-copying-difficulty` を採用してファイル新規作成した。約 5KB の本文を埋め、Pillar A から内部リンクも張った。完成後に念のため `drafts/articles/` を ls したところ、`note-not-copying.mdx`（11KB・2026-05-12 生成）が同じ KW を扱う完成ドラフトとして既に存在していることが判明した。

## やり取りの中身

最初の判定は「どちらを残すか」だった。既存の `note-not-copying.mdx` は 11KB（あんたの「これでよい」確認は未取得）、新規の `board-copying-difficulty.mdx` は 5KB。本文密度・H2 構成の網羅性で既存の方が完成度が高く、既存を残して新規を削除する判断になった。

次に「スラッグの不整合」が問題になった。`urls.md §2.2` の確定スラッグ表では `board-copying-difficulty` が一次ソースだったが、既存ドラフトは `note-not-copying` のスラッグで生成されていた。同様の不整合が #28（`isometric-drawing-difficulty` vs `cannot-draw-isometric`）／#30（`spatial-imagery-difficulty` vs `cannot-imagine-3d`）／#27（`geometry-difficulty` 系 vs `weak-at-shapes`）でも発生している可能性が高く、`urls.md` を一次ソースとするか、既存ドラフトのスラッグに揃えて `urls.md` を直すかは次回判断に持ち越しになった。

3 つ目の発覚は「重複候補が他にもある」だった。`board-copy-help.mdx`（5.2KB・5-13 生成）vs `note-not-copying.mdx`／`shapes-help.mdx`（5.4KB・5-13 生成）vs `weak-at-shapes.mdx`／`3d-imagination-help.mdx`（5.5KB・5-13 生成）vs `cannot-imagine-3d.mdx` の 3 ペアが該当。いずれも 5KB 級の短縮版・別案の可能性があり、棚卸し時に単独評価して採用/破棄を判定する必要がある。

最終的に Pillar A の内部リンクは `note-not-copying` に巻き戻し、新規作成分の `board-copying-difficulty.mdx` は削除した。MEMORY.md の進捗認識を「Phase 0=2/10 本完了」から「Phase 0=10/10 本ドラフト存在（うち Pillar A 1 本校了済・残り 9 本要レビュー・重複候補 3 本要判定）」に更新した。次フェーズは「新規執筆」ではなく「既存 14 ドラフトの棚卸し＆採用判定」と再定義された。

## なぜそう判断したか

既存ドラフトを優先したのは、本文密度・H2 構成の網羅性が明確に上だったからだ。5KB vs 11KB の差は単なる量ではなく、症状の細分化・具体的処方・年齢別アドバイスの厚みの差で、夜間自律執筆の方が時間をかけて書けていた。

進捗認識を「2 本完了」から「10 本ドラフト存在」に更新したのは、夜間自律執筆を仕組みとして組んだ以上、その成果物を MEMORY.md に反映する運用ルールが必要だったからだ。今回のやらかしは「自律執筆を組んだのに進捗反映の仕組みを組まなかった」というギャップの帰結。今後は「新規執筆前に必ず `drafts/articles/` を ls する」をルール化した。

スラッグ不整合の即時解決を保留したのは、`urls.md` を一次ソースとして全件突合する作業が単独で 1 セッション分のスコープになるためだ。`board-copying-difficulty` 以外にも 3 件以上の不整合が確認されており、片方ずつ直すと他の参照箇所（Pillar 内部リンク・サイトマップ・GA イベント名）まで波及する。一括突合の判断は別セッションに切り出すことにした。

## 学び（一般化できるノウハウ）

1. **「自動化を組んだら成果物の反映ルールも同時に組む」** — 夜間自律執筆のような仕組みを組んだ際、生成物を進捗管理に反映する運用ルールを同時に作らないと、認識ギャップから二重作業が発生する。仕組みと運用は対で設計する。

2. **「新規作成前に必ず ls する」** — AI 執筆では既存ファイルの確認コストが低い（ls 一発）のに対し、重複作成のコスト（書き直し・リンク巻き戻し・MEMORY 更新）は高い。コスト非対称があるため、確認は常に行うべきルールにする。

3. **一次ソースの不整合は単独セッションのスコープ** — 設計書間のスラッグ不整合のような横断的問題は、片方ずつ直すと参照箇所が波及する。一括突合は別セッションで腰を据えて行う方が安全で、その場で部分修正しないという判断も設計運用の一部。

## 関連エピソード

- [EP-049](EP-049-b3-writing-voice-tuning.md) — B-3 執筆着手（本エピソードの前段・夜間自律執筆の運用開始時期）
- [EP-046](EP-046-docs-refactor-4phase-model.md) — 設計書全体リファクタ（urls.md・templates.md の一次ソース整備）
- [EP-006](EP-006-memory-archive-split.md) — MEMORY.md 運用（進捗反映の仕組み設計）
