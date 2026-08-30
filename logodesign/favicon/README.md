# TENZU ファビコン書き出しセット

サイトのタブ・アプリアイコン用に、Symbol（4-dot floating）を極小サイズ向けへ
引き直したものの書き出し一式。**実装の SSOT は [`web/app/icon.svg`](../../web/app/icon.svg)**、
デザイン規定の SSOT は [`design/visual-identity.md` §5.1 / §5.3](../../design/visual-identity.md)。
このフォルダは「他所で使うときに取りに来る場所」であって、正本ではない。

## なぜ原本を縮小せず引き直したか

鉛筆筆致の原本（`../透過symbol.png`）は 16-32px へ縮小すると線幅が 1px を割り、
灰色に潰れて**点と線の visible gap が消える**。gap はブランドの物語そのものなので、
極小帯だけ幾何で引き直している。180px 以上は質感が見えるので原本を使う。

## 触るときの制約

- **32 単位・全座標を偶数に保つ**。これで 16 / 32 / 48px のどれでも整数ピクセル
  境界に落ち、細線でもアンチエイリアスで滲まない。奇数座標にすると滲みが再発する
- **点：線 = 3:1**（鉛筆原本の実測 20:6 と同比）
- 地は純白ベタが既定。**透過版を暗い面へ置かない**（ink `#1A1F2A` が沈む）

## ファイル

| ファイル | 用途 |
|---|---|
| `tenzu-favicon.svg` | ベクター原本（純白地）。サイズを問わずここから書き出す |
| `tenzu-favicon-transparent.svg` | 同・地なし。白／cream 系の面へ載せる用 |
| `tenzu-favicon.ico` | 16/32/48 を束ねた ICO。`web/app/favicon.ico` と同一 |
| `tenzu-favicon-{16,32,48,64,128,180,256,512,1024}.png` | 純白地 PNG |
| `tenzu-favicon-{256,512,1024}-transparent.png` | 透過 PNG |
| `tenzu-apple-icon-180.png` | iOS ホーム画面用。こちらは**鉛筆筆致の原本**（`web/app/apple-icon.png` と同一） |
| `contact-sheet.png` | 一覧確認用 |

再生成は `tenzu-favicon.svg` から。`web/app/` 側の 3 ファイルを差し替えたら、
このフォルダも合わせて更新すること。
