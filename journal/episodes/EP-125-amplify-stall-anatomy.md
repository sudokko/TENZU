---
ep: EP-125
title: Amplify ビルド8連続失敗＝33時間停止の解剖（手元で通り CI で落ちる・noindex の賭け金）
date: 2026-07-26
session: Amplify デプロイ停止の切り分けと修正＋プレビュー環境の noindex 化
themes: [ci-cd, incident, deployment, seo, noindex]
related_docs:
  - web/app/products/problems/published/index.ts
  - web/app/site.ts
  - web/app/robots.ts
  - decisions.md
  - launch/plan.md
  - engineering/phase-1-todo.md
  - web/.env.production.example
status: draft
public_safe: true
---

# Amplify ビルド8連続失敗＝33時間停止の解剖（手元で通り CI で落ちる・noindex の賭け金）

## 何が起きたか（要約）

content/article-drafts ブランチの Amplify ビルドが 07-25 14:01 のデプロイ38以降8回連続で失敗し、サイトは直前デプロイ37（07-25 13:10）の内容のまま約33時間止まっていた。push は成功しているのにサイトが更新されない。07-26 に切り分けを行い、原因を特定した——`published/index.ts` は問題 JSON を21巻 import しているのに、リポジトリには12巻しかコミットされていなかった。不足9巻はローカルに未追跡ファイルとして存在したため、手元の build は通り CI だけが落ちる典型だった。9巻を追加コミットして復旧（f92fd5d）。同日、プレビュー環境の noindex 化も実施し（870a966・decisions §3.89）、インデックス可否を SITE_URL 連動にした副作用として「本番接続時に SITE_URL を直し忘れると本番が丸ごと検索避けで開店する」という賭け金を、開店ゲートほか3箇所へ明記した。

## 状況・背景

TENZU の問題データは検品→publish で JSON を量産する構造で、`published/index.ts` の import 追記と JSON ファイルの git add が別作業になりやすく、追加漏れが構造的に起きやすい。「push したのに反映されない」という症状は、push 未到達・webhook 不達・Amplify 内部失敗のどの層でも起きうるため、闇雲にログへ向かう前に層を絞る必要があった。環境制約として AWS CLI は未インストールで、Amplify コンソールはログイン済みブラウザを介してしか読めない。

## やり取りの中身

**デプロイの年代測定による切り分け**。手順は5段。①`git status` で未コミットを疑う。②GitHub API でリモートブランチの HEAD を確認し push 到達を確定。③webhook の配信履歴を確認（202＝Amplify は受信済み）。④配信中アセットの HTTP ステータスで「いま動いているデプロイの年代測定」——コミットごとに追加された webp を直接叩き、200/404 の境目を探すと、配信中のビルドがどのコミット時点かが外形から分かる。ここまでで「Amplify 内部」に絞れた。⑤コンソールのビルドログで確定。ログ領域は仮想スクロールのため DOM 読取りだけでは末尾が取れず、実スクロール操作が必要だった。

**原因と修正**。ログの実体は `Module not found: Can't resolve './mirror-lv3-vol1.json'`。index.ts は21巻を import、コミット済みは12巻で、不足9巻（mirror 4・rotate 3・translate 2）はローカルに未追跡のまま存在し、手元ビルドは成功していた。Amplify はコミット済みファイルしか clone しない。修正自体は9巻の追加コミットだが、push 前に Amplify と同条件で検証した——`git worktree add --detach` で HEAD のみの作業ツリーを切り、`npm ci`、`next build`。node_modules をジャンクションで繋ぐ手抜きは Turbopack が panic するため不可で、`npm ci` を素直に走らせた。ログ精読の副産物として NFT の過剰トレース警告も見つかったが、実測のうえ実害軽微として P2 起票に留めた（77e4b48）。

**同日の noindex 化**。調査の過程で、Amplify のブランチ URL が index,follow で公開されており、開店前に amplifyapp.com の URL が検索インデックスに載りうると分かった。site.ts に IS_PREVIEW を新設し、SITE_URL のホストが localhost / *.amplifyapp.com なら layout.tsx の metadata で index:false を全ページへ効かせる。robots では `Disallow: /` を使わない——クロールを止めると noindex を読んでもらえず、既にインデックスされた URL が居座り続けるからだ。クロールは許しつつ sitemap を提示しない役割分担にした。

## なぜそう判断したか

**ローカルの build 成功を信用しなかった理由**。未追跡ファイルがある限り「手元で通った」は CI が通る保証にならない。CI と同じ入力＝コミット済みファイルのみ＋クリーンな依存を作って初めて再現テストになる。恒常的な push 前チェックとしては、コミット済み index.ts の import 一覧と `git ls-files` の突き合わせで足りることも確認した。

**ビルドログより先に年代測定をした理由**。コンソールのログは読取りコストが高い。配信中の実体から逆算すれば、push 到達→webhook→ビルドのどの層で止まっているかを HTTP リクエストだけで絞れる。安い観測で層を確定してから、高い観測（ログ精読）を最後に使う順序が結果的に最短だった。

**noindex の賭け金を3箇所に明記した理由**。本番ドメインをコードへ書かない原則を保つには、判定を SITE_URL のホスト側へ持たせるしかない。SITE_URL が壊れたときは検索避け側へ倒れる設計は誤公開より安全だが、代わりに開店時の直し忘れが単一障害点になる。設計で消せないリスクは、開店ゲート G4（launch/plan.md）・phase-1-todo・.env.production.example の3箇所へ確認手順として書き込み、運用で担保することにした。

## 学び（一般化できるノウハウ）

1. **CI の再現は「コミット済みだけの世界」で行う** — `git worktree add --detach` で HEAD のみの作業ツリーを作り、`npm ci` からビルドすれば、未追跡ファイルやローカル依存の混入なしに CI と同条件を再現できる。生成物を量産するリポジトリでは import と git add が乖離しやすく、この検証の価値が特に高い。

2. **デプロイ不全は配信物の年代測定から切り分ける** — コミットごとに増えた静的アセットの 200/404 境目を探せば、いま配信されているビルドの年代が外形観測だけで分かる。push・webhook・CI 内部のどの層で止まったかを、ログへ潜る前に安く絞れる。

3. **フェイルセーフの向きを決めたら、その代償を運用ゲートへ書く** — 「壊れたら安全側へ倒す」設計は、解除忘れという新しい失敗様式を生む。設計判断と同時に、解除条件と確認手順を運用チェックリストの複数箇所へ書き込むまでが一つの仕事である。

## 関連エピソード

- [EP-087](EP-087-cart-stripe-ses-checkout.md) — Amplify SSR の環境変数地雷という前例
- [EP-028](EP-028-amplify-preview-over-storybook.md) — Amplify 採用を決めた原点
