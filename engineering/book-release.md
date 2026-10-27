# 書籍の購入者特典の公開手順

## サマリ

- 対象は『はじめての点図形（点描写）』（[kdp-paperback.md](../product/kdp-paperback.md)）。受取ページは `/book/hajimete`、コード確認は `/api/book/hajimete/unlock`、PDFと詳細設定の問題は認証後の専用APIから配る。
- 収録巻・配布ファイル・次の案内の正本は [catalog.ts](../web/app/book/hajimete/catalog.ts)。本の書き出し（`SERIES.first`）と同じ12巻・同じ並び。
- 配布PDFは `web/private/book-hajimete/` の4ファイル（全144問・たす72問・うつす72問・じぶんでつくろう）。公開ディレクトリへ置かず、Next.jsのトレース設定でSSRに同梱する。
- 問題番号は本の manifest から取る。本を書き出してから特典を書き出す（逆順だと止まる）。
- コードは本の6ページ（特典案内）に印刷する `HJ<刷>-XXXX-XXXX`（第1刷は `HJ1-`）。原文はGit除外の `web/.local/book-hajimete-print<刷>.json` だけに置き、本番には SHA-256 だけを `BOOK_HAJIMETE_CODE_SHA256` に設定して `AUTH_SECRET` と合わせて使う。値をコミット・メッセージに貼らない。
- cookie・署名・コードは本ごとに分ける。凍結した7課題の本を出すときも、この本の受取は開かない。
- 書籍コードは既存Stripe商品の所有権を発行しない。共通コードは厳密な購入証明ではない。

## 詳細

### 制作と検査

`web/` から順番に実行する。

```powershell
npx tsx scripts/export-kdp-series.ts --book first
npx tsx scripts/export-book-benefits.ts
python scripts/subset-book-benefits.py
npx tsx scripts/check-book.ts
python scripts/preflight-book-benefits.py
npm run build
```

- `subset-book-benefits.py` は、`export-book-benefits.ts` が日本語フォントを丸ごと埋め込んだPDF（6〜13MB）のフォントをサブセット化する。Amplify は約5.7MBを超える応答を413で落とすため、書き出したら必ず通す（描画の一致を確かめてから差し替え、manifest のハッシュも直す）。
- `export-book-benefits.ts` は、本の manifest の問題番号・元問題IDでPDFを作る。本を書き出したあとに元のJSONが変わっていたら止まる（本を書き出し直す）。Webのカタログと `SERIES.first` の巻の並びが違っても止まる。
- じぶんでつくろうは、オーナーがデザインした本のページ（95〜98）をA4に拡大して1ファイルにする。
- `check-book.ts` は描画コードと別に、座標変換と辺集合の関係で全144問を確かめ、コードの正規化・改ざん・失効・別の本のcookie・入力制限を確かめる。
- `preflight-book-benefits.py` は、ハッシュ・ページ数・A4・問題番号の並び・文字の大きさと余白・フォント埋め込み（デザインページの入れ子のフォントも含む）を確かめる。Popplerがあれば全ページ画像も作る（なければ `--skip-reader-render`）。
- 公開していない巻は、本と同じ代わりの巻で場所を取る（紙面とPDFに「準備中」）。公開したら、そのまま本物を使う。

開発用のコードは `npx tsx scripts/setup-book.ts` で作る（原文はGit除外の `web/.local/book-hajimete.json`、ハッシュは `.env.local`）。本に印刷するコードとは別物。開発サーバーを起動した状態で `npx tsx scripts/check-book-http.ts` を実行すると、未認証・不正コード・別オリジン・改ざん・連続入力、12巻の問題と並びが本と一致すること、本にない巻を開かないこと、4ファイルのハッシュを確かめる。`BOOK_TEST_URL` で確認先を指定できる（不正コード連続入力の検査を含むため、通常はローカルかstaging）。

### 受取ページ

- 認証前：本の6ページにある受取コードの入力欄（ページ番号は `catalog.ts` の `BOOK.codePage`）。
- 認証後：問題PDF（144問）とじぶんでつくろうの2つを大きく出し、「たす」「うつす」だけのPDFは折りたたむ。「自分に合う紙面にする」で、12巻を本と同じLv・Vol・番号で選び、購入後画面の [SkuPrintPreview](../web/app/products/SkuPrintPreview.tsx) と同じ詳細設定で印刷できる。巻の中の並びは本と同じく難易度の低い順。
- 認証前後とも：本の先にある7つの課題（各課題の入口の巻）、うつす・たすのLv.5、メーカーを案内する。どれも本に入っていない巻で、本の12巻は折りたたみの一覧で「買い直す必要はない」と示す。
- 問題データは `/api/book/hajimete/volumes/[sku]` が書籍cookieを確かめてから返す。収録12巻にない巻は404、未認証と改ざんは401。応答は `private, no-store` と `noindex`。

### 本に印刷するコード

`web/` から `npx tsx scripts/create-book-code.ts --print 1` で作る。紙から読んでスマホで打つため、見間違えやすい文字（0/O・1/I/L・2/Z・5/S・8/B・Q）を除いた24文字からランダムに8文字を選び、頭に本と刷の印 `HJ1` を付ける。原文は `web/.local/book-hajimete-print1.json` に保存し、画面にはAmplifyへ入れるハッシュだけを出す。同じ刷のファイルがあれば作り直さずに止まる（印刷済みのコードを変えないため）。オーナーはファイルからコードを読み、デザインの特典案内ページに入れる。

`.local/` はGitに入らないため、このファイルが唯一の控えになる。オーナーのパスワード管理など、リポジトリの外にも控えを置く。

### 本番環境への設定

1. Amplifyのmainブランチに `BOOK_HAJIMETE_CODE_SHA256` を設定する。値は `create-book-code.ts` が出したハッシュ。コード原文や `AUTH_SECRET` をログ・メッセージ・Gitへ貼り付けない。
2. `amplify.yml` の環境変数許可リストがこのキーを `.env.production` へ渡すことを確かめる。
3. `web/private/book-hajimete/` の4ファイルを、同じリリースに含める。Next.jsのファイルトレースに含まれることをビルド出力で確かめる。
4. 本番で、本の6ページのコードで受け取れること、配布ファイルと `benefits-manifest.json` のハッシュが一致することを確かめる。
5. 未認証のPDF直アクセスは401、未知のファイルIDは404であることを確かめる。

コード確認の同一オリジン検査は `SITE_URL` を基準にする（Amplify SSRでは `req.nextUrl.origin` が内部ホストになり、すべての読者を拒否してしまう）。`SITE_URL` がない開発環境では、ブラウザが開いたHostを基準にする。コードの設定値が欠けている場合は、受取APIを503で止める。固定の開発用コードへフォールバックしない。PDF不足も成功扱いにしない。

### コードの変更と運用

`BOOK_HAJIMETE_CODE_SHA256` はカンマ区切りで複数のハッシュを持てる。刷り直しでコードを変えるときは `--print 2` で `HJ2-` を作り、ハッシュを足す。すでに印刷された本のコードは無効にしない。Amazonの試し読みに6ページが出てコードが広まったときも、次の刷から `HJ2-` に切り替え、古いコードを止めるかどうかは別に決める。入口URLは保つ。配布場所の変更・障害・訂正は受取ページに案内を残す。

連続した不正コード入力はインスタンス内で補助的に制限する。分散したアクセス全体に対する厳密な制限ではない。共通コードの転送や試し読みへの掲載は防ぎ切れないため、注文情報を検証した購入認証とは表現しない。

PDFを更新するときは、同じ問題番号と元問題IDを保ち、版・更新日（`catalog.ts` の `BOOK`）・訂正内容・manifestを更新する。

### 計測と確認

- イベント定義は [analytics.md §9](analytics.md)。本のQRは utm を付けず `tenzu.jp/book/hajimete` を指す（受取ページに来るのは本の読者だけのため）。
- PCとスマホで、入力エラー、再取得、PDF保存、A4白黒印刷、問い合わせ、次の巻へのリンクを確かめる。

### 公開前にオーナーが確認するもの

本文の使い方、購入者特典の紙面、実際の受取ページを確かめる。本に印刷する受取コードを決め、デザインの特典案内ページに入れる。表紙はオーナーが制作し、入稿時に登録する題名・副題と照合する。校正刷りでは線・点・裏写り・のど・QR・バーコード・ページ順を確かめる。最終出版の操作、価格とAI申告の確定はオーナーが行う。

## 附録

- 変遷: [書籍216問の購入者特典の公開手順](../archive/retired-designs/2026-10-23-book-216-release.md)
