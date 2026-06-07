# product/ — 商品設計・サービスブループリント

## このディレクトリの責務

TENZU の商品（問題パック）の設計と、購入〜配布〜利用〜補填までのサービスフロー全体を扱う。9タスク仕様の一次ソースは `pack-design.md`。

## ファイル一覧

| ファイル | 責務 |
|---|---|
| [pack-design.md](pack-design.md) | 問題パック設計・**9タスク仕様の SSOT**・SKU 構成・価格設計・モチーフカテゴリ・各タスクラダー・**§25 検索意図対応の商品タグ/ファセット**（取引意図クエリを記事でなく商品側で拾う・[content/clusters.md §1.5](../content/clusters.md) と対） |
| [pack-tasks.md](pack-tasks.md) | 9タスクの個別仕様・出題ルール・難易度ドライバー |
| [service-blueprint.md](service-blueprint.md) | サービスブループリント（7フェーズ × 4レイヤー）・配布・認証・補填フロー |

## 読む順序

1. **pack-design.md** で商品ラインナップ全体（ローンチ63 SKU＝幾何ライン＋絵柄1シリーズ・模写のみ／将来上限140＋混在セット9）と価格戦略をつかむ
2. タスク個別仕様を見るなら **pack-tasks.md**
3. 購入〜配布〜利用の全体フロー → **service-blueprint.md**
