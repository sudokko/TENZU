---
ep: EP-076
title: ビジュアル ID rev.4 確定＋ LP 初版 Next.js 実装（Design セッション卒業計画 ①）
date: 2026-05-24
session: Design rev.4 確定 + LP Next.js 実装セッション
themes: [design-system, visual-identity, design-vs-code]
related_docs:
  - design/visual-identity.md
  - design/handoff/README.md
  - engineering/README.md
  - web/app/page.tsx
status: draft
public_safe: true
---

# ビジュアル ID rev.4 確定＋ LP 初版 Next.js 実装（Design セッション卒業計画 ①）

## 何が起きたか（要約）

Claude Design セッションで rev.1 から rev.4 まで 4 ラウンドを回し、配色・タイポ・ロゴ・トーン全項目を locked した。同じ日のうちに、確定した視覚言語を Next.js 16（App Router + Turbopack）で LP 初版として実装し、全 7 セクションを動作確認まで持ち込んだ。配色は `Ink & Slate · 墨と石板`（主色 `#1A1F2A` ／ 背景 `#F4F2ED` ／ アクセント青磁 `#2C6E7F`）、タイポは `Plex × Noto Hybrid`（heading/UI body は IBM Plex Sans JP 500/400・long-form body は Noto Sans JP 400・数字は IBM Plex Mono）、ロゴは 4-dot square symbol（コーナードット浮き）＋ カスタム Ξ-form E（縦軸なし 3 横線）の wordmark。P5「継続」用に `.parents-warm` クラスと `--radius-soft: 4px` を新設した。あわせて Design セッションと Code 作業の役割分担を「視覚言語の定義は Design・量産と実装は Code」と明文化し、Design セッションの卒業計画（全 5 セッション）の 1 本目を消化した位置付けに整理した。

## 状況・背景

D1 ロゴ叩き台と D2 Design System は前週までに方向性が出ていたが、配色・タイポ・ロゴ意匠の細部が確定値として揃っておらず、LP 実装に着手できる状態ではなかった。Claude Design 側のセッションが膨張気味で、1 ラウンドあたりに比較案を 3-4 種類並列提示するスタイルが続き、収束に時間がかかっていた。

LP 実装側は `web/` ディレクトリが未着手で、フレームワーク選定（Next.js 系で確定済みだったがバージョンと App Router 採否は未決）、CSS 戦略（Tailwind か tokens.css ベタか）、コンポーネント分割粒度などが全て未着手だった。「視覚言語が決まる前に実装は始められない」「実装してみないと視覚言語の使い勝手は判定できない」という典型的な鶏卵問題を抱えていた。

## やり取りの中身

rev.1 では Claude Design が agent モードで過剰に回転し、明朝体／金色アクセント／書道風 wordmark という TENZU の Voice 設計（点描写プリント・家庭向け・親しみと知性の両立）から大きく外れた案を返してきた。「重厚」「格式」方向への過剰補正で、ブランド側の温度感と矛盾していた。

rev.2 で「軸を再バランスする・3 案だけ比較で出す」と指示したところ、Plex 単独／Noto 単独／Plex × Noto Hybrid の 3 案が並んで返ってきた。ここで初めて「heading は構造を出す Plex・記事本文は読みやすさを優先して Noto」という分業案が出た。

rev.3 で Plex × Noto Hybrid を採用方向で確定。heading/UI body は IBM Plex Sans JP（500/400）、long-form body（記事本文）のみ Noto Sans JP 400、数字は IBM Plex Mono。Plex のラテン部分が和文と並んだときの「構造感」が、点描写プリント＝幾何の文脈と整合した。

rev.4 で 3 つの細部を一気に確定した。ロゴシンボルは 4-dot square で「4 つのコーナードットだけが浮いている」造形（点と点の関係を示す最小単位の視覚化）。Wordmark の E は縦軸なしの 3 横線（Ξ-form）に置き換え、TENZU の T-E-N-Z-U で E だけが「点だけで構成される文字」になることで symbol と wordmark が意味的に接続される。paper warmth は当初 `#F2F3F1`（やや青み）だったが、印刷紙の温度に寄せて `#F4F2ED`（クリーム寄り）へシフト。P5「継続」（親が子に寄り添える設計）の温度を出すために `.parents-warm` クラスと `--radius-soft: 4px` を新設し、他セクションの硬めの角丸（2px）と差別化した。

その日のうちに Next.js 16 を `C:/dev/TENZU/web/` に初期化。App Router + Turbopack 構成、Tailwind 不採用で tokens.css ベタ、src/ なし、lucide-react を採用。LP 全 7 セクションを実装した：Hero（F1 FV ＋ Tagline 3 段 ＋ F3 公式訳カード ＋ Primary/Secondary CTA）／ Structure（9×5 マトリックス）／ Samples（A4×3 ＋ Lv chip in teal）／ Maker（parents-warm バンド ＋ 5×5 mockup）／ Articles（Pillar 5 本柱リスト）／ Continuity（parents-warm 3 つの設計）／ FAQ（details accordion ×4）＋ Footer。React 化のポイントとして、SiteHeader.tsx だけを Client Component（useState のハンバーガー、scroll 検知）、他は Server Component に分けた。Lucide icons は lucide-react package で導入。

動作確認は dev server（localhost:3001）と production build でエラー 0、実機モバイル（LAN 経由）で目視確認まで通した。handoff bundle を `C:/dev/TENZU/design/handoff/` に保管（README.md ＋ project/ ＋ chats/）。

## なぜそう判断したか

rev.4 まで進めた段階で「全項目 locked」を宣言したのは、視覚言語の定義をこれ以上 Design セッションに引き留めると、Code 実装での検証フィードバックなしに机上の細部最適化を続けてしまうからだ。視覚言語は実装してみないと「使い勝手」「データを流し込んだときの破綻」「モバイルでの密度感」などが判定できない。一度 locked して Code に渡し、実装側で問題が出れば再 unlock する運用にした方が判断が前に進む。

Tailwind を採用せず tokens.css ベタにしたのは、TENZU のデザイントークン（配色 3 階層・タイポ 3 種・余白スケール）がそれほど複雑ではなく、Tailwind の class 名で覆い隠すよりも CSS 変数で SSOT 化した方が、Design 側（visual-identity.md）との対応関係が読みやすいと判断したからだ。トークンの一次ソースを SSOT に集約し、tokens.css が SSOT のミラーになる構造の方が、後から見たときに改修負荷が下がる。

Design セッションと Code 作業の責務分離を明文化したのは、Claude Design が agent モードで過剰回転する根本原因が「視覚言語の定義」と「量産・実装」の責務が曖昧で、Design 側が「全部 Design でやる」モードに入りやすいからだ。「Design = 視覚言語定義／Code = 量産・更新・実装・モバイル・データ反映」を明文化し、「ビジュアル言語の定義に原因があれば Design、それ以外は全部 Code」という判定基準を置いた。これにより Design セッションを 5 本（① design system ／ ② LP ／ ③ 商品 ／ ④ 記事 ／ ⑤ Maker App）の卒業計画に切り出せた。

## 学び（一般化できるノウハウ）

1. **視覚言語の locked と unlock を運用に組み込む** — 視覚言語は実装してみないと使い勝手が判定できない。「永久 locked」ではなく「locked して Code に渡す・実装で破綻したら再 unlock」のサイクルを許容する方が判断が前に進む。

2. **AI Design セッションは「1 ラウンド 1 パターン提示 → YES/NO」型が効く** — 3-4 案並列提示は意思決定コストを膨らませる。1 パターンを提示させて YES/NO で受け、NO のときだけ次案を出す型にすると 4 ラウンドで 1 日完結できる。

3. **Design と Code の責務分離を明文化する** — 「視覚言語の定義は Design・量産と実装は Code」のように責務を切り、判定基準（ビジュアル言語の定義に原因があれば Design、それ以外は Code）を一文で書く。Design 側が「全部 Design でやる」モードに入る根本原因が責務曖昧さなので、ここを文書で固定する。

## 関連エピソード

- [EP-071](EP-071-logo-decision-plan-b-prime.md) — D0 ロゴ案B' 確定（本エピソードで全面刷新されることになる前段）
- [EP-072](EP-072-design-system-d1.md) — D1 Design System 叩き台（rev.1-4 で再構築される元）
- [EP-073](EP-073-design-concept-plan-w.md) — デザインコンセプト案W 確定（rev.1-4 の温度設計の上位前提）
- [EP-074](EP-074-lp-v3-1-completion.md) — LP v3.1 完成（本エピソードで Next.js 実装に置き換わる前世代）
