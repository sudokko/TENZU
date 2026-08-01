---
name: motif-seed
description: TENZU の問題パックへ手設計モチーフ（絵になる図形）を一括投入する。「かさねLv.4にモチーフ追加して」「車×2、動物×2で14個、難易度20〜30」のような依頼で使う。座標を手設計 → 本物のロジックで巻ゲート・D窓・かぶりを検証 → コンタクトシートPNGで目視検品 → candidates へ status=pending 投入、まで進める。オーナー検品後の採否から次バッチの傾向を学ぶ「学習パス」も含む。publish はしない（採否はオーナー）。
---

# /motif-seed — 手設計モチーフの投入

生成器が作れない「絵になる図形」を手設計で candidates へ差し込む。**投入は status=pending まで。採否と publish はオーナーの atelier 作業**。

## SSOT（ここに複製しない・必ず読む）

| 内容 | 一次ソース |
|---|---|
| **何が採用されるか（絵の設計ルール）** | [product/motif-craft.md](../../../product/motif-craft.md) |
| 難易度 D の式・タスク別ラダー | [product/pack-tasks.md](../../../product/pack-tasks.md) |
| 巻ごとの実際のゲート値 | `web/app/products/problems/ladder.json` |
| D 計算の実装 | `web/app/products/problems/gen/difficulty.ts` |

**着手前に motif-craft.md を必ず読む**。数値ゲートは全通過して当たり前で、採否を分けるのは絵の質。ルールを外すと採用率が落ちる。

## 依頼の受け取り方

必要な入力は 3 つ。欠けていたら埋めてから進む。

1. **対象 SKU**（例 `overlay-lv4-vol1`。URL `/atelier/<sku>` で渡されることが多い）
2. **カテゴリ×個数**（例「車×2、動物×2、…で14個」）
3. **D 窓**（例「20以上〜30未満」）

## 手順

### 1. 巻の制約を読む

```bash
cd /c/dev/TENZU/web
```

`ladder.json` の該当 sku を見る。盤面 n・slopes・requireDiag45/requireNon45・線本数窓・タスク固有の窓（かさね＝絡み・移動＝dir/moves・回転＝angle）を控える。**盤面サイズで B の型が決まる**（motif-craft §5）。

### 2. スクリプトを用意する

既存のバッチスクリプトを雛形にする。**SEEDS 配列だけ差し替えれば動く**。

| タスク | 雛形 |
|---|---|
| かさね・分解 | `web/scripts/seed-overlay-motifs.ts`（A/B 2枚モデル・3ペイン描画） |
| 回転 | `web/scripts/seed-rotate-lv5vol1-motifs.ts` |
| 移動 | `web/scripts/seed-translate-lv5vol1-motifs.ts` |
| 模写 | `web/scripts/seed-motif-scatter.ts` |

同じ SKU へ追加投入するだけなら、雛形の SEEDS を書き換えて `--sku` で絞る。新しいタスクなら雛形をコピーして、そのタスクの生成器（`gen/<task>.ts`）のゲートに合わせて `checkSeed` を書き直す。

**必ず本物のロジックで検証すること**（`computeMetrics` / `taskDifficulty` / `<TASK>_LADDER` / `shapeSignature`）。式を書き写すと必ずずれる。

座標は `parsePaths(["c,r c,r c,r", ...])` 形式（r は下向き・折れ線を1本の文字列で書く）。

### 3. 検証を回す（--write なし）

```bash
npx tsx scripts/seed-overlay-motifs.ts --sku overlay-lv4-vol1
```

NG が出たら直す。よく出るもの:

- **D が窓の外** → 線を足す／減らす。D の効き方は `gen/difficulty.ts` を読んで判断する（かさね系は絡み 1 につき +2 と大きい）
- **絡みが窓の外**（かさね）→ 背景パターンの本数か主役の貫かれ方を変える
- **かたちが N つ**（連結ゲート）→ A・B それぞれが 1 つながりになっていない
- **形かぶり** → published 模写・既存候補・生成ライブラリのどれかと一致。作り直す

### 4. 目で見る（省略不可）

```bash
npx tsx scripts/seed-overlay-motifs.ts --png <scratchpad>/sheet.png
```

出した PNG を **Read ツールで開いて実際に見る**。数値ゲートは「線が団子になって読めない」「絵に見えない」を検出しない。motif-craft §3・§4・§6 の目で 1 枚ずつ判定し、駄目なものは作り直してから次へ進む。

### 5. 投入する

```bash
npx tsx scripts/seed-overlay-motifs.ts --write
```

検証 NG が 1 つでもあれば中断する作りになっている。`-mNN` 採番・`status=pending`・`provenance.source=blank`＋`label`（ひらがな名）で追記される。

### 6. 確認する

- **BOM なし UTF-8** で書けているか（BOM 付きだと atelier API が JSON.parse で落ち、候補が丸ごと消える）
- `npx tsc --noEmit` が通るか
- atelier で表示されるか。**別チャットの dev サーバーが 3001 を使っている**ときは `preview_start` の `web-attach`（既存サーバーに繋ぐだけ）を使う。`web` を起動しようとすると衝突する

### 7. 報告する

投入数・巻ごとの D レンジ・残作業（オーナーの atelier 検品 → 12問選抜 → publish）を伝える。**publish はしない**。

## 学習パス（次バッチの前に必ず回す）

オーナーが採否をつけた後、採用と保留を並べて見比べる。

```bash
npx tsx scripts/review-motifs.ts overlay-lv4-vol1 overlay-lv5-vol1 --out <scratchpad>/review.png
```

★採用（緑枠）と ・保留 が status 順に並ぶ。PNG を Read で開き、**採用された絵に共通する構図**を読む。傾向は巻・タスクで変わるので、次バッチはこの実績を土台に組む。

**保留＝却下ではない**。まだ検品していない巻の pending と混ざるので、判断材料にする前に「どの巻を見たか」をオーナーに確認する。読み取った傾向が motif-craft.md に無い新しい知見なら、同ファイルへ追記する。

## やらないこと

- **publish**（採否と公開はオーナーの判断）
- 既存候補の status 変更・削除
- ladder.json の編集（巻の定義を変えるのは別の意思決定）
- 生成器（`gen/`）の改造。モチーフは手設計で差し込むもの
