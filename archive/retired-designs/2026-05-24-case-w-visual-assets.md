# 退避メモ: 案W ビジュアル資産（旧 visual-identity.md + 旧ロゴ SVG 4本 + brand-spec.md）

- **退避日**: 2026-05-24
- **退避場所**: [2026-05-24-case-w-visual-assets/](2026-05-24-case-w-visual-assets/)（ディレクトリ集約退避・SVG が複数あるため）
- **退避ファイル**:
  - `visual-identity.md`（案W「ミニマルD2C × 図形ラボ × 親向けガイド」前提の実装ルール）
  - `brand-spec.md`（4ドット symbol の機械可読仕様）
  - `tenzu-symbol.svg`（4ドット正方形シンボル）
  - `tenzu-wordmark.svg`
  - `tenzu-lockup-horizontal.svg`
  - `tenzu-lockup-vertical.svg`

## 退避理由

ブランドが案H'' で 5 Pillar（P1 体系／P2 解像度／P3 発見／P4 言語化／**P5 継続（新設）**）に再構築された結果、旧ビジュアル資産は以下の点で不整合：

1. **旧 visual-identity.md §4 ロゴ方針が案F キーフレーズ（戻れる／ピンポイント／解像度）の視覚化のまま**。案H'' Pillar 5 本柱と未整合
2. **旧 §6 スパイス「図形ラボ」風トーンが残存**。案W コンセプトの残骸で、新コンセプト「書店 × 研究室 × 親の手元」3軸に未対応
3. **P5 継続（親が子に寄り添える設計）の視覚翻訳がゼロ**。旧資産は P1/P2/P4 寄りで、親の手元の温度を表現する仕様を持たない
4. **旧 brand-spec.md §6 メタファー「Dots / Paper / Figures」は維持可能だが、§1 Colors の navy `#3F475F` がブランド定義 `#2B3D5A` と乖離**（過去の試行案がリポジトリに残っていた）

## 継承検討対象（白紙だが意味論は強い）

旧 4 ドット symbol は **「点描写の起点」という意味論** を 1 象徴に圧縮しており、新ロゴ設計でも継承検討の余地が大きい。新ロゴ叩き台を起こす際は、旧 symbol を「比較対象」として参照する形で扱う。

## 後継

- 新 [design/visual-identity.md](../../design/visual-identity.md)（案H'' 5 Pillar・3軸コンセプト「書店 × 研究室 × 親の手元」対応版）
- 新ロゴ SVG は次セッション以降で `design/brand-assets/` に再構築

## 関連

- ブランド SSOT: [foundation/brand.md](../../foundation/brand.md) §7 Pillars / §12 Tagline 3 段運用
- 案 H'' 確定: [decisions.md §3.31](../../decisions.md)
- 「街の選書本屋」コンセプト撤回: 本退避以前にすでに撤回済（design/README.md §1 NG 方向性に明記）
