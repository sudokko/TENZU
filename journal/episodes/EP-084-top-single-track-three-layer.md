---
ep: EP-084
title: TOP を A 基調に一本化決着（少 SKU 専門店 UI 三層「入口で導く→一覧で圧縮→詳細はあと」）
date: 2026-06-08
session: TOP A 基調一本化決着セッション
themes: [landing-page, information-architecture, progressive-disclosure, ux-research]
related_docs:
  - web/app/page.tsx
  - decisions.md
  - acquisition/funnel.md
status: draft
public_safe: true
---

# TOP を A 基調に一本化決着（少 SKU 専門店 UI 三層「入口で導く→一覧で圧縮→詳細はあと」）

## 何が起きたか（要約）

EP-083 で並存していた TOP のパターン A（チップ圧縮カタログ）とパターン B（内容解説リッチ）を、A 基調へ一本化して決着させた。決め手は ChatGPT による少 SKU 専門店カタログ UI の実態調査（ABRSM／Busuu／Headspace／HackerRank）で、結論は「入口で導く→一覧で圧縮→詳細はあと」の三層。A/B の択一ではなく統合で決着した。三層の実装は — ① 入口で導く＝帯グラフ直下に「レベル選びガイド」誘導 CTA のみ（Q1/Q2/Q3 診断は TOP に内蔵せず、既存独立ガイドの SSOT 二重化と「診断」語彙の Anti-Brand 抵触を回避）、② 一覧で圧縮＝ A 案のチップ横並び・巻数・歯抜け淡色を `<summary>` に、③ 詳細はあと＝ B 案を格下げして各行を `<details>` 純 CSS アコーディオンに（Server Component 維持・Client JS なし）。開くと B の内容解説（notes）＋「★最初の 1 冊」（最初の非ゼロ Lv・`findIndex(v>0)` で算出）を出す。俯瞰ミニマップは見送り。`/top-b` は削除し archive 退避した。

## 状況・背景

EP-083 の午後改修で、TOP には `web/app/page.tsx`（パターン A＝チップ圧縮）と新規 `web/app/top-b/page.tsx`（パターン B＝内容解説リッチ）の 2 版が並存していた。A は一覧性が高いが各タスクの中身が薄く、B は中身が濃いが一覧が長くなる。どちらを TOP の正本にするかが未決だった。

この日、外部事例調査で決着の論理を得た。ChatGPT に少 SKU の専門店・サブスク学習サービスのカタログ UI 実態を調べさせ、共通パターンを抽出した。

## やり取りの中身

ChatGPT の調査対象は ABRSM（音楽試験）・Busuu（語学）・Headspace（瞑想）・HackerRank（コーディング）など、少〜中 SKU で「選び方が複雑・購入前理解が要る」サービス群。共通して見えたのが「入口で導く→一覧で圧縮→詳細はあと」の三層構造だった。

これを TOP に適用し、A/B 択一をやめて統合した。

① 入口で導く。帯グラフ（レベル 5 段階×対象年齢）の直下に「レベル選びガイド」への誘導 CTA だけを置いた。Q1/Q2/Q3 形式の診断を TOP に内蔵しなかったのは 2 つの理由 — 既存の独立ガイド（funnel.md §3）が SSOT であり TOP に Q を再掲すると二重化する、そして「診断」語彙は Anti-Brand 化されている（voice-tone §1）ため。

② 一覧で圧縮＝ A 案。各タスク行はチップ横並びで、巻数表示と歯抜けの淡色グレーアウトを `<summary>` に収めた。

③ 詳細はあと＝ B 案を格下げ。各行を `<details>` の純 CSS アコーディオンにした（Server Component を維持し Client JS を使わない）。開くと B の内容解説（notes）と「★最初の 1 冊」を出す。★最初の 1 冊は「最初の非ゼロ Lv」を `findIndex(v>0)` で算出し、各タスクで最初に提供されるレベルの巻を指す。

俯瞰ミニマップ（全タスク×全レベルの一覧マップ）は見送った。3 群一覧と重複し、流入の少ない TOP には過剰と判断した。

`/top-b` ルートは削除し `archive/retired-designs/2026-06-08-top-b-level-notes-superseded.tsx` に退避。検証で `/`=200・10 種類 63 巻・アコーディオン開閉・★各タスク正位置・`/top-b`=404・エラー 0・モバイル幅 OK を確認。SSOT は decisions §3.44／pack-design §12.8（★ルール）／funnel §3（TOP 導線）に反映した。

## なぜそう判断したか

A/B を択一せず統合したのは、両者が「同じ情報の異なる粒度」だったからだ。A の一覧性と B の中身の濃さは対立ではなく、表示の段階（progressive disclosure）で両立できる。外部事例の三層構造が、その両立の具体的な型を与えた。一覧では圧縮し、知りたい人だけが詳細を開く。

診断 Q を TOP に内蔵しなかったのは、SSOT の単一性とブランドの一貫性のため。レベル選びガイドは独立ページが SSOT で、TOP に Q を再掲すると同じ内容が 2 か所に出て更新がズレる。加えて「診断」語彙は TENZU で Anti-Brand 化しており、TOP にそれを持ち込むと語彙統制が崩れる。入口は「ガイドへの導線」に徹し、診断ロジックはガイド側に一本化した。

`<details>` 純 CSS を選んだのは、Server Component を維持して Client JS を増やさないため。アコーディオンの開閉に JS は不要で、純 CSS なら初期ロードが軽く、流入の少ない TOP に余計な JS を載せずに済む。

俯瞰ミニマップを見送ったのは、3 群一覧と情報が重複し、TOP の流入規模に対して過剰だから。低流入のページに情報を盛ると、作る手間に見合わない。

## 学び（一般化できるノウハウ）

1. **「一覧 vs 詳細」は択一せず progressive disclosure で統合する** — 一覧性と中身の濃さは対立ではなく表示段階の問題。「入口で導く→一覧で圧縮→詳細はあと」の三層なら両立できる。外部の少 SKU 専門店事例がこの型を裏付けた。

2. **入口は導線に徹し、ロジックは SSOT に一本化する** — 診断 Q を TOP に内蔵すると独立ガイドと二重化し更新がズレる。入口は「ガイドへの誘導」だけにし、診断ロジックは SSOT ページに集約する。語彙統制（Anti-Brand）も SSOT 側で一括管理できる。

3. **低流入ページに JS と情報を盛らない** — アコーディオンは `<details>` 純 CSS で足り、Server Component を維持できる。俯瞰マップのような重複情報も低流入 TOP には過剰。流入規模に表示コストを合わせる。

## 関連エピソード

- [EP-083](EP-083-top-storefront-promotion.md) — 本エピソードで統合した A/B 並存を生んだ前日の改修
- [EP-065](EP-065-seo-transactional-facet-lp.md) — 同日の SEO 取引意図 LP 分離（TOP を綺麗に保つ判断と同根）
- [EP-062](EP-062-acquisition-zerobased-redesign.md) — acquisition ゼロベース再設計（少 SKU 専門店事例 ChatGPT 圧勝の前例）
