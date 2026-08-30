---
ep: EP-130
title: 実質の trunk が枝だった問題の解消（article-drafts 退役とブランチ・環境体制の確定）
date: 2026-08-01
session: ブランチ統合・環境体制の起票・G4 自動チェック新設
themes: [ci-cd, deployment, git-workflow, launch-ops, seo]
related_docs:
  - decisions.md
  - engineering/phase-1-todo.md
  - web/scripts/check-env-gates.mjs
status: draft
public_safe: true
---

# 実質の trunk が枝だった問題の解消（article-drafts 退役とブランチ・環境体制の確定）

## 何が起きたか（要約）

記事レビュー用に切った `content/article-drafts` が実質の trunk になり、**Amplify が実ビルドするブランチも article-drafts** という歪みが常態化していた。`deploy/amplify` は 29 コミット遅れの祖先、`main` はさらに古い祖先。tenzu.jp 接続（開店ゲート G4）を前にこれを解消し、**本番＝`main`／staging＝`deploy/amplify`／dev＝ローカルのみ**へ確定した。未コミット 113 ファイルを 1 コミットへ統合してクリーン worktree で検証、3 ブランチとも FF push。article-drafts は 08-23 に Amplify 接続解除とブランチ削除まで完了した（decisions §3.93）。

## 状況・背景

記事執筆をスマホから回すためにブランチを分けたのが発端で、そこに商品データも実装も積み上がった結果、「枝が幹になり、幹が化石になる」状態が生まれていた。この状態のまま tenzu.jp を接続すると、**どのブランチが本番なのかを人間が覚えていないと事故る**構造になる。開店前に片付けるべき負債だった。

## やり取りの中身

**統合の前にクリーン worktree で検証した**。これは EP-125 の教訓の直接の適用で、未コミットファイルがある限り「手元で通った」は CI が通る保証にならない。`git worktree add --detach` で HEAD のみの作業ツリーを切り、`npm ci` → `next build` を通してから push した。同じ罠（未追跡 import）を今回は**事前に**回収できた。

**staging を残す根拠を金額で確認した**。追加固定費はゼロでビルド代のみ（月数百円）。EP-125 で経験した 33 時間停止型の事故を本番の手前で受け止められるなら、その値段は安い。

**env をブランチ別に分けた**。main＝`SITE_URL=https://tenzu.jp`・Stripe live・GTM 本番／deploy/amplify＝SITE_URL 未設定・Stripe test・GTM なし。SITE_URL 未設定なら noindex が自動で維持される（EP-125 で入れた IS_PREVIEW）ので、staging に本番 env を入れてしまう事故も検出できる。

**G4 を自動チェック化した**。`check-env-gates.mjs` を新設し、本番が index,follow で canonical が本番ホスト、staging が noindex であることを**両方向**で判定する。片方向だけ見ると「SITE_URL の入れ忘れ」と「staging に本番 env を入れた」のどちらかを見落とす。

**退役の手順は迷いやすい場所にあった**。Amplify のブランチ接続解除は「ホスティング」配下ではなく、アプリケーションの設定 → ブランチ設定 → ブランチを選択 → アクション → ブランチの接続解除。削除前にタグ `archive/article-drafts-final` を打ち、履歴に戻れるようにしてから消した。

## なぜそう判断したか

**ブランチの役割は「人が覚えていなくても事故らない」形に置く**。3 本を lockstep で push する運用も検討したが、手順を守り続ける前提の設計は個人運営では破綻する。ホスト 2 面に減らし、日常フローを「ローカルで build → deploy/amplify（staging 実機確認）→ main へ FF push」と一本道にすれば、覚えることが減る。

**タグを打ってから消した理由**。ブランチ削除は取り消しに手間がかかる。タグ 1 本のコストはゼロに近く、「消したものへ戻れる」という保証は将来の判断を軽くする。捨てる決断を安くするために保全する。

## 学び（一般化できるノウハウ）

1. **「実質の trunk」がどれかを定期的に問い直す** — 一時的な用途で切った枝に作業が積もると、宣言上の幹と実態の幹がずれる。この歪みは、環境を増やす瞬間（本番ドメイン接続など）に必ず牙を剥く。

2. **検証は「本番と同じ入力」で行う（前回の教訓の再利用）** — EP-125 で痛い目を見た未追跡ファイル問題を、今回は統合前のクリーン worktree 検証で先回りして回収した。**障害から得た手順を次の作業の前工程に組み込む**ところまでやって、初めて学習になる。

3. **状態の確認は両方向で自動化する** — 「本番が正しいか」だけを見ると、staging 側の取り違えを見逃す。対になる 2 つの環境は、それぞれが**あるべき状態と、あってはならない状態**の両方を判定させる。

## 関連エピソード

- [EP-125](EP-125-amplify-stall-anatomy.md) — 未追跡 import の罠と noindex の賭け金
- [EP-137](EP-137-launch-audit-canonical.md) — 開店前フル整合監査
- [EP-147](EP-147-amplify-env-missing-one.md) — 同じ Amplify env が起こした別の事故
