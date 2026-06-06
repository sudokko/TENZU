# build-html

TENZU プロジェクト全体の `.md` を見やすい HTML に一括変換するツール。

## 使い方

```sh
cd tools/build-html
npm install           # 初回のみ（marked が入る）
node build.mjs
```

リポジトリ全体を再帰的に走査し、`.md` の隣に同名 `.html` を生成。ブラウザで `docs/html-index.html` を開くと領域別一覧から全 HTML へジャンプできる。

## 対象

リポジトリ直下から再帰的にすべての `.md` を拾う。**`build.mjs` 内で対象を固定列挙する必要はない**。新規 `.md` を作っても次の実行で自動的に拾われる。

### 除外ディレクトリ

`build.mjs` の `EXCLUDE_DIRS` で定義（ディレクトリ名一致でスキップ）：

- `node_modules` … 依存パッケージ
- `.git` … Git 内部
- `.claude` … Claude 設定
- `tools` … ツール自身の README（必要なら個別対応）
- `journal` … Claude とのやり取り履歴（CLAUDE.md 明記）
- `__pycache__` … Python 系

## 仕様

- **GFM 準拠**（テーブル・コードブロック・チェックボックス対応）
- **`.md` リンクは自動で `.html` に書き換え**（`#anchor` も保持）。プロジェクト内ファイル間のリンクが切れない
- **目次自動生成**：各 HTML 冒頭に h2 / h3 から抽出した目次
- **見出しアンカー**：h2-h4 にホバーすると `#` リンク表示
- **「← 一覧へ戻る」**：ディレクトリ階層に応じて `docs/html-index.html` への相対パスを自動算出
- **配色**：案 W ベース（生成り背景・落ち着いたブラウン）の暫定インライン CSS
- **長いテーブルは横スクロール対応**

## ファイル構成

```
tools/build-html/
├── build.mjs        # 変換スクリプト本体
├── package.json     # marked 依存定義
├── package-lock.json (gitignore)
├── node_modules/   (gitignore)
└── README.md       # このファイル
```

生成物:

```
TENZU/
├── docs/html-index.html   # 領域別一覧（エントリポイント）
├── foundation/*.html
├── content/*.html
├── ... (各領域の .md と同じ場所に .html)
└── archive/retired-designs/*.html
```

## メンテ

- **配色・フォントを変えたい**: `build.mjs` の `CSS` 定数を編集 → `node build.mjs` で全 HTML 再生成
- **除外ディレクトリを足したい**: `EXCLUDE_DIRS` セットに追記
- **特定ファイルだけ除外したい**: 現状は未実装。必要になったら `EXCLUDE_FILES` セットを追加する
- **テンプレ（ヘッダ・フッタ）を変えたい**: `wrap()` 関数を編集

## トラブルシュート

- **HTML が生成されない / 件数が少ない**: `EXCLUDE_DIRS` に意図しないディレクトリ名が入っていないか確認
- **リンクが切れる**: 参照先 `.md` がリポジトリ外（または除外対象内）にある場合は HTML が生成されない。`build.mjs` の対象に含める必要があれば除外ルールを見直す
- **marked のエラー**: `npm install marked@latest` で更新。renderer の API シグネチャが marked v12+ 形式に依存
