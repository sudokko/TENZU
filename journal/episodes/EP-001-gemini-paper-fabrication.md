---
ep: EP-001
title: Gemini Deep Research の論文捏造事件と発見プロセス
date: 2026-05-07
session: B-2 Block 1 後の宿題セッション
themes: [ai-collaboration, multi-ai, fact-checking, hallucination]
related_docs:
  - docs/drafts/references-map.md
  - docs/content-design-pillars.md
  - memory/MEMORY.md
status: draft
public_safe: true
---

# Gemini Deep Research の論文捏造事件と発見プロセス

## 何が起きたか（要約）

B-2 Pillar 記事の引用論文体系を補強するため、Deep Research を 3 並列（ChatGPT 版・Gemini 日本語版・Gemini 英語版）で実行した。Gemini が著者名・誌名・DOI を複数件捏造していたことが、原典確認の過程で判明した。「架空著者 渡部宏幸」「架空誌 Cognitive Training Review」「実在しない DOI」などが具体例として確認された。結果として 14 本の論文を不採用とし、新規に 10 本（No.25〜34）を採用した。

## 状況・背景

TENZU の Pillar 3 本（A: 入門ガイド／B: 中受版／C: 苦手な子向け）は、教育心理学・認知発達領域の論文引用を根拠の柱に位置づけている。「専門店が厳選したエビデンス」という訴求が差別化の核であり、引用論文に捏造や低品質な情報が混入すると、専門家読者からの信頼が一気に毀損するリスクがある。

B-2 Block 1 の完了時点で既存 references-map.md には 5 系譜・24 本の文献が整備されていた。しかし「立体模写の発達」「視覚的閉合」「空間訓練→数学転移」「DCD 介入」「図形模写の予測因子」という領域の文献が手薄で、B-3 執筆フェーズに向けた補強が必要だった。

当初は 1 つの Deep Research ツールで補強する想定だったが、より多角的な探索のために 3 並列投入に切り替えた。

## やり取りの中身

### Gemini が提示した捏造の具体例

Gemini DR 日本語版は 9 本を提示した。その中に以下の捏造が含まれていた。

- **渡部宏幸** — 架空著者。J-STAGE・CiNii 等でヒットなし
- **Cognitive Training Review** — 架空誌名。存在しない学術誌
- **実在しない DOI** — 2 件。DOI.org で解決不能

Gemini DR 英語版はさらに追加投入したが、PMC8321716 として提示した Beery 2021 論文の実体が別著者別論文（Carsone et al. (2021) Occupational Therapy International）だったことが確認された。

### ChatGPT DR との対比

同じ領域で ChatGPT DR は 15 本を提示し、著者名・誌名・DOI の精度は明らかに高かった。「該当なし」と判断した領域では誠実に「該当する論文が見つからない」と明示し、不確実な場合は「要確認」と注記した。ChatGPT DR が捏造を示した事例はゼロだった。

### 全件原典確認プロセス

Gemini の捏造が発覚した後、ChatGPT・Gemini 双方の提示論文を全件 J-STAGE / PubMed Central / DOI.org / 大学リポジトリで実在確認した。確認ステップは「誌名が実在するか」「著者名が実在するか」「DOI が解決できるか」「PMC 番号が一致するか」の 4 点だ。

### 新規採用 10 本（No.25〜34）

実在確認を通過した論文を採用した。代表的なものを以下に示す。

| No. | 著者・年 | 領域 | アクセス |
|---|---|---|---|
| 25 | 大伴 潔 (2009) | 立体模写発達・小学生 n=625 | 東京学芸大リポジトリ無料 |
| 28 | Lange-Küttner & Vinueza Chavez (2022) | 立体模写発達・5-12 歳 | Frontiers OA |
| 29 | Kavšek (2024) | 視覚的閉合・3-11 歳 | PMC11480146 |
| 32 | Gilligan, Thomas, Farran (2020) | 空間訓練→数学転移 RCT n=250 | UCL Discovery 無料 |
| 33 | Gao et al. (2025) | DCD 介入メタ分析 | Sports Med Open OA |

### 不採用確定

Bigorra et al.(2015)・Lange-Küttner & Ebersbach(2013)・Demirci(2025) は有料壁で内容確認不可として不採用。Gotoh et al.(2020) は論文自体は実在・CC-BY だが掲載誌「Journal of Asian Research」が Beall's List に掲載されるプレデター誌（Scholink Inc.）と確認され、不採用とした。TENZU の権威性にとって引用先誌の信頼性は不可欠だ。

## なぜそう判断したか

教育商材における引用論文の信頼性は「ブランドの権威」を直接構成する。1 本でも捏造論文を引用してしまうと、専門的なバックグラウンドを持つ読者（研究者・特別支援教育の専門家・医師等）からの信頼が崩れる。修復コストは初期確認コストの数十倍になる。

「複数 AI を使う」の本質は「冗長性」ではなく「相互検証」だ。Gemini が捏造した論文を ChatGPT が「該当なし」と返した事例が複数あり、相互検証によって捏造の確率が下がった。1 つの AI だけを使っていた場合、捏造論文が気づかずに記事に組み込まれていた可能性がある。

Gemini DR を完全に切らなかった理由は、初期の「どんな領域がありそうか」というブレスト・領域探索の用途では有用だからだ。提示された全論文を採用することなく、ChatGPT との比較・原典確認を組み合わせることで、Gemini の広域探索力を安全に活用できる。

## 学び（一般化できるノウハウ）

1. **専門性が必要な領域では AI 出力を必ず原典確認する** — 著者名・誌名・DOI は機械的に J-STAGE / PMC / DOI.org で検証できる。これを怠ると高確率で捏造が混入する。Gemini DR の捏造率は今回のサンプルで 33% 以上だった。

2. **複数 AI の役割分担を認識する** — Gemini DR はブレスト・領域探索向き（広域出力・速い）／ChatGPT DR は採用判定向き（精度高い・誠実な不明示あり）。用途を分けて使い、最終採用判断は人間が原典確認後に行う。

3. **不採用記録を運用に組み込む** — references-map.md に「不採用確定理由」を残すことで、次セッションで同じ論文を再提案された際に即座に却下できる。「なぜ採用しなかったか」の記録が二重作業を防ぐ。

## 関連エピソード

- [EP-002](EP-002-multi-ai-role-mapping.md) — 役割分担マップが固まるまでの全体像
- [EP-003](EP-003-references-map-ops.md) — references-map.md による不採用記録運用法
