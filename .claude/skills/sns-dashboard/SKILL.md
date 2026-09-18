---
name: sns-dashboard
description: TENZU の SNS ダッシュボード（dev 限定 /atelier/sns）に今週の数字を入れる。GA4（流入元別の訪問・メーカー起動・PDF 書き出し・購入）をスクリプトで取り、Instagram・X・note・Pinterest・Ameba の分析画面の数字をオーナーのログイン済み Chrome で読んで保存し、ダッシュボードを開いて渡すまで行う。「SNS の数字とって」「ダッシュボード更新して」「/sns-dashboard」、および /weekly-ops の数値チェックで使う。
---

# /sns-dashboard — SNS の数字を取ってダッシュボードに入れる

設計の SSOT は [engineering/analytics.md §7](../../../engineering/analytics.md)（構成・名寄せ・保存先・やらないこと）。見る数字／見ない数字の区分は [acquisition/sns-operations.md §7](../../../acquisition/sns-operations.md)。このファイルは手順だけを持つ。

## 前提

- `web/.env.local` に `GA4_PROPERTY_ID` と `GA4_KEY_FILE`（鍵はリポジトリの外）
- オーナーの Chrome で 5 つの SNS にログイン済み
- 数字の保存先は `web/.local/sns-dashboard/<取得日>.json`（.gitignore 済み）。**リポジトリは公開なので、このファイルを追跡対象にしない**

## 手順

### 1. GA4

```bash
cd web
npx tsx scripts/sns-dashboard.ts ga4
```

取得日の前日までの 7 日と、その前の 7 日を取る。月曜に回すと前の週（月〜日）になる。

### 2. 各 SNS の画面

Instagram・note・Ameba は Claude in Chrome で読む。**X と Pinterest はオーナーに分析画面のスクリーンショットを貼ってもらい、画像から読む**。

- Claude in Chrome が開くタブは、オーナーから見えない大きさ 0 のウィンドウに入る（どちらの Chrome でも同じ）。X と Pinterest は画面を描かないと本文が空のままなので、そのタブでは読めない。オーナーが自分で開いたタブは拡張から触れない
- 拡張につながった Chrome が複数あるときは、TENZU でログインしている方を選んでもらう
- 読むだけ。いいね・フォロー・投稿・設定変更はしない。ログイン画面・CAPTCHA・警告が出たら、その場で止めてオーナーに渡す
- 本文テキストに URL のクエリが混ざると、読み取りがブロックされることがある。JS で URL を伏せてから読む（下のスニペット）
- 画面に出ていない項目は `-` で保存する（0 と区別して残る）
- 保存は SNS ごとに `npx tsx scripts/sns-dashboard.ts set <sns> --period "<画面の期間表記>" key=値 ...`（`web/` で実行）。使える key は [web/app/atelier/sns/defs.ts](../../../web/app/atelier/sns/defs.ts) の `PLATFORM_METRICS`

#### Instagram（@tenzu.jp）

- 開く: `https://www.instagram.com/accounts/insights/?timeframe=7`
- 読む:

  ```js
  const t = document.body.innerText.replace(/https?:\/\/\S+/g, "<url>");
  t.slice(t.indexOf("過去"), t.indexOf("\nMeta\n"))
  ```

- 対応: 閲覧→`views`／閲覧者→`reach`／インタラクション→`interactions`／プロフィールへのアクセス→`profileVisits`／外部リンクのタップ→`linkTaps`／保存→`saves`・シェア→`shares`（インタラクションの内訳に出たときだけ。出ていなければ `-`）／合計フォロワー→`followers`
- 保存例: `set instagram --period "過去7日間" reach=0 saves=- shares=- profileVisits=1 linkTaps=- views=0 interactions=0 followers=0`

#### X（@sudocraft_jp）

- オーナーに頼む: 「X のアナリティクス（`https://x.com/i/account_analytics`）を過去 7 日にして、スクショを貼って」
- 対応する key: `profileVisits`・`linkClicks`・`bookmarks`（見る）／`impressions`・`engagements`・`likes`・`followers`（見ない）
- 画像に出ていない項目は `-`。期間は画像の表記どおりに `--period` へ書く

#### note（sudo_craft）

- note.com のどのページでもよいので開き、ページ上で fetch する（ログイン中の Cookie で自分の数字が返る）:

  ```js
  const s = (await (await fetch("/api/v1/stats/pv?filter=weekly&page=1&sort=pv")).json()).data;
  const c = (await (await fetch("/api/v2/creators/sudo_craft")).json()).data;
  ({ period: `${s.start_date_str}〜${s.end_date_str}`, views: s.total_pv, likes: s.total_like, comments: s.total_comment, followers: c.followerCount })
  ```

- 保存例: `set note --period "9/9〜9/15（週）" views=1 comments=0 likes=0 followers=0`（note の「週」は今日までの 7 日）

#### Pinterest（tenzuinfo）

- オーナーに頼む: 「Pinterest のアナリティクス（`https://analytics.pinterest.com/overview/`）を過去 7 日にして、『総合パフォーマンス』が入るスクショを貼って」。何も変えないと過去 30 日になる
- 「総合パフォーマンス」の対応: インプレッション数→`impressions`／アウトバウンドクリック数→`outboundClicks`／保存数→`saves`（見る。CTR はダッシュボード側で計算）／エンゲージメント数→`engagements`（見ない）。合計オーディエンス数とエンゲージしたオーディエンス数は key が無いので `--memo` に残す
- 画面に無い `pinClicks`・`followers` は `-`
- 保存例: `set pinterest --period "過去30日間（8/16〜）" impressions=596 outboundClicks=1 saves=0 engagements=4 pinClicks=- followers=- --memo "合計オーディエンス 327・エンゲージしたオーディエンス 1"`

#### Ameba（sudo-craft）

- 開く: `https://blog.ameba.jp/ucs/analysis/analysis.do?unit=seven_days`（GA4 と同じ「前日までの 7 日」になる）
- 読む: 「アクセス数」ブロックの期間表記と「合計：N」→ `access`
- フォロワー: `https://blog.ameba.jp/ucs/top.do` の「N フォロワー」→ `followers`
- 保存例: `set ameba --period "9/8〜9/14（7日間）" access=0 likes=- followers=0`

### 3. 確かめて渡す

1. `npx tsx scripts/sns-dashboard.ts show` の表を読み、所見を **3 行以内**で返す（北極星＝流入元別の PDF 書き出しと購入から。前の 7 日と比べる。虚栄指標では判断しない）
2. dev サーバー（Browser ツールの `preview_start` name=`web`・port 3001）で `/atelier/sns` を開いて渡す
3. 開いた Chrome のタブは閉じる

## やらないこと

- 保存データのコミット（`git add -f` で .gitignore を越えない）
- 毎日の取得（週 1 回・月曜の数値チェックに合わせる）
- SNS 側の画面での書き込み操作（読むだけ）
