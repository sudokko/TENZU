# KDP用埋め込みフォント

書体指定は [visual-identity.md](../../../../design/visual-identity.md) に従う。いずれもGoogle Fontsの公式リポジトリから取得した未改変の静的TrueType。取得日2026-10-04。

| ファイル | 用途 | 配布元・ライセンス |
|---|---|---|
| KleeOne-SemiBold.ttf | 見出し | [kleeone](https://github.com/google/fonts/tree/main/ofl/kleeone) / [OFL](kleeone-OFL.txt) |
| IBMPlexSansJP-Regular.ttf | 日本語の本文・一覧 | [ibmplexsansjp](https://github.com/google/fonts/tree/main/ofl/ibmplexsansjp) / [OFL](ibmplexsansjp-OFL.txt) |
| IBMPlexSansJP-Bold.ttf | 表紙タイトル・数量・年齢・特典の強調 | [ibmplexsansjp](https://github.com/google/fonts/tree/main/ofl/ibmplexsansjp) / [OFL](ibmplexsansjp-OFL.txt) |
| IBMPlexMono-Regular.ttf | 数字・URL | [ibmplexmono](https://github.com/google/fonts/tree/main/ofl/ibmplexmono) / [OFL](ibmplexmono-OFL.txt) |

SIL Open Font License 1.1に従いライセンス本文を同梱。PDFにはフォント全体を埋め込む。各ファイルのSHA-256は書き出し時のmanifest.jsonに保存する。

IBM Plex Sans JP Boldは2026-10-18に公式配布元から取得。未改変のまま使用する。
