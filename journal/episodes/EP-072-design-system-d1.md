---
ep: EP-072
title: D1 Design System 完了（Claude Design 活用・カラー/タイポ/コンポーネントの基礎確立）
date: 2026-05-12
session: D1 Design System セットアップセッション
themes: [design-system, claude-design-ops, design-tokens]
related_docs:
  - docs/design/brand-brief.md
  - docs/design/README.md
status: draft
public_safe: true
---

# D1 Design System 完了（Claude Design 活用・カラー/タイポ/コンポーネントの基礎確立）

## 何が起きたか（要約）

D0 ロゴ確定（案B'）の翌日、Claude Design（design.claude.com）の Design System セットアップ画面にブランドブリーフを投入し、TENZU Design System の初版を確立した。配色（鉄紺 #2B3D5A 主役・山吹 #D9A237 アクセント・生成 #F7F2E7 背景）／タイポ（見出し Zen Kaku Gothic New・本文 Noto Sans JP・数字 Schibsted Grotesk）／コンポーネント（ボタン・カード・スライダー・トグル必須・CTA 強度 4 段階）／幾何主役グラフィック方針、までが Claude Design 内で参照可能な形になった。シェア URL を MEMORY.md に登録し、以後のデザイン議論はこの URL を起点に進める運用へ切り替えた。

## 状況・背景

着手プラン（warm-yawning-harbor.md）で「ツールは Claude Design でビジュアル → Claude Code で実装のハイブリッド」と定めていた。保存規約は「デザイン本体は Claude Design 側、リポジトリは docs/design/README.md と brand-brief.md のみ」で、Figma などの中間ファイルを持たない方針。

D0 ロゴ確定で navy + cream の 2 色基調・幾何シンボルが固まり、これを基礎にサイト全体・アプリ・OGP・印刷物まで拡張するために、Design System としての形式化が必要になっていた。

ブランドブリーフ（brand-brief.md）はこの時点で v4 程度の完成度で、矛盾を構造で解く設計（企業並み端正 × 個人運営の温度の場所別使い分け）・ターゲット 3 層均等扱い・コアグラフィック領域への画像生成 AI 使用禁止、などの方針が出揃っていた。

## やり取りの中身

Claude Design の Design System セットアップ画面は、①Company name and blurb ②Provide examples（資産アップロード） ③Any other notes? の 3 セクション構造。

①には「TENZU（てんず）: 点描写プリント（ドット繋ぎで図形を写す練習）の専門 EC サイト。LP・記事・商品ページに加え、無料の問題作成アプリ（サブドメイン）の 3 面構成」を投入。

②の資産アップロードでは、D0 確定ロゴ（symbol / wordmark / lockup の 3 形式）のみアップロード。Figma 資産・GitHub コード連携は「D4 Tokens 抽出 → コード化以降に連携」として空欄継続。フォントは ③ のテキスト指定で十分とした。

③が最も情報量が大きく、ブランドブリーフから以下をテキストとして投入した：
- ベンチマーク（すたペンドリル／ピノトレ）と NG（ちびむす／ぷりんときっず）
- フォーマル度 5 段階中 4・抑制的・端正・知的・要所で温かい
- ページ種別ごとの温度レベル表（LP=中・商品=低・記事=中高・About=高・カート=最低 等）
- 一人称使い分け（「TENZUは」「TENZUでは」を場面別固定）
- Phase 別の W の濃度（Phase 0=Y 寄り → Phase 3=完全版）
- ターゲット 3 層均等扱い
- 主役グラフィックは点・直線・図形の幾何要素
- 配色 3 色・タイポ 3 種・コンポーネント要件・マイクロコピー方針

Claude Design 側で初期生成された Design System が、上記方針をどこまで反映できているかを確認しながら、配色トークン・タイポスケール・スペーシング・コンポーネント初版を順次調整。最終的にシェア URL を生成して MEMORY.md に登録した。

## なぜそう判断したか

Claude Design を中心ツールに据えたのは、ビジュアル探索とブランド整合性チェックを同じ環境で回せるからだ。Figma は中間成果物が増えてバージョン管理コストがかかる。Claude Design 内の Design System を一次ソースとし、コード側は Tokens 抽出のタイミングで取り込む流れにすることで、デザイン版と実装版の二重管理を回避できる。

ブランドブリーフをそのまま ③ Other notes に貼ったのは、Claude Design に「TENZU の世界観」を端的に教えるのに、設計判断の集約版を渡すのが最短だったからだ。個別の指示を細切れに与えると、生成された結果が部分最適に陥る。世界観全体を渡してから細部を調整する順番が、AI 生成ツールでは効率が良い。

ロゴ以外の資産（Figma・既存サイト・参考画像）をアップロードしなかったのは、「他にもありそう」な方向に引っ張られないためだ。参考画像を与えると AI はそれに似たものを生成しがちで、独自性が薄まる。ブランドブリーフのテキスト指示のみで生成させることで、TENZU 独自の視覚言語が立ち上がる余地を残した。

## 学び（一般化できるノウハウ）

1. **デザインの一次ソースをどこに置くか先に決める** — Figma・Claude Design・コード（Tailwind config）など複数候補がある中で、一次ソースを 1 つに定め、他は派生物として扱う。二重管理を回避する基本構造を最初に決めることで、後段の更新コストが下がる。

2. **AI 生成ツールには「世界観全体」を先に渡す** — 個別指示を細切れに与えると部分最適になる。設計判断の集約版（ブランドブリーフ等）を最初に渡し、AI が世界観を理解した上で細部を調整する順番にすると、生成結果の一貫性が上がる。

3. **参考画像は「他にもありそう」リスクを生む** — 既存の良い事例を参考としてアップロードすると、AI はそれに似たものを生成しがち。独自性を立ち上げたい場合、テキスト指示のみで生成させる方が独自の視覚言語が出る余地が残る。

## 関連エピソード

- [EP-071](EP-071-logo-decision-plan-b-prime.md) — D0 ロゴ確定（本エピソードの起点）
- [EP-073](EP-073-design-concept-plan-w.md) — デザインコンセプト案W 確定（D1 完了直後に評価・選定）
- [EP-028](EP-028-amplify-preview-over-storybook.md) — Storybook 不採用・Amplify Preview 採用（中間ツールを増やさない方針の前段）
