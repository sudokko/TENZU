---
name: article-edit
description: TENZU の記事をオーナーが自分で見ながら直す「編集モード」（dev 限定 /atelier/articles/<slug>）を開く。記事編集の既定の入口。タイトルの一部か slug から記事を特定し、dev サーバーを起動して Browser ペインに編集画面を出すまで行う。「○○の記事を編集したい」「記事を直したい」「編集モードを開いて」「/article-edit」で使う。Claude に本文の書き換えを任せる依頼（「改訂して」「書き直して」）は article-revise-publish を使い、そのプレビューもこの編集モードで見せる。
---

# /article-edit — 記事の編集モードを開く

オーナーが記事を公開ページと同じ見た目で開き、クリックした箇所をその場で直すための入口。
使い方・保存と公開の関係・編集中の約束の SSOT は [content/article-revision-publish.md §3.5](../../../content/article-revision-publish.md)。このスキルには「開いて渡すまで」の手順だけを書く。

## 手順

1. **対象を決める**
   - 引数（タイトルの一部・slug）があれば、`web/content/articles/*.mdx` の `title:` 行とファイル名から探す
   - 1 件ならその slug。複数なら候補のタイトルを並べて選んでもらう。0 件・引数なし・「一覧」なら記事一覧 `/atelier/articles` を開く
2. **状態を見る**: `git status --short --branch`。対象記事に未コミットの変更があれば、何が変わっているかを一言添える（止めはしない）
3. **dev サーバーを起動する**: Browser ツールの `preview_start`（name=`web`・port 3001）。Bash では起動しない
   - 別の場所ですでに 3001 の dev サーバーが動いていて起動に失敗したら、`web-attach` で接続する（Next 16 は同じ `web/` で dev サーバーを 2 つ立てられない）
   - 編集画面が 404 で、`/articles/<slug>` や `/api/me` など 2 階層目以降のページも軒並み 404 なら、dev のキャッシュが壊れている。`preview_stop` → `web/.next/dev` を削除（自動生成物）→ `preview_start` で直る
4. **編集画面を開く**: `http://localhost:3001/atelier/articles/<slug>` へ移動し、画面上部に「本文 N/N」が出るまで待つ。タブを前面に出す（`tabs_select`）
   - 「記事の本文が表示されていません」と出たら、下書き記事の表示に要る `web/.env.local` の `SHOW_DRAFTS=1` を確認する。env は書き換えず、オーナーに伝える
   - 「本文 M/N」で M < N なら、その数と「対応しないブロックは『全文ソース』で直せる」ことを伝える
5. **渡す**: URL と、次の 3 点だけを短く伝える
   - 文章をクリック → 直して「保存（Ctrl+S）」→ 数秒で表示に反映
   - 説明文は「タイトル・説明文」、画面から開けない項目は「全文ソース」
   - 保存しただけでは公開されない。終わったら「公開して」

## 渡したあと

- オーナーが編集している間は、同じ記事ファイルを書き換えない（§3.5）
- 「公開して」と言われたら article-revise-publish の手順へ進む（§3.5 の扱いに従う）

## 使えない環境

claude.ai/code（クラウド）やスマホのセッションには dev サーバーと Browser ペインが無い。その場合は「編集モードはデスクトップの Claude Code から開ける」と伝え、本文の書き換えを頼まれているなら article-revise-publish で進める。
