# 旧 market/gtm.md 一枚運用（2026-05-21 退避）

## 撤回内容

`market/gtm.md`（310行・8節構成）を解体し、F/M/A/P/C/D/E/L 8段階構成へ責務分配。本ファイルは退避時点のスナップショット＋経緯記録。

## 撤回理由

1. **責務分離違反**: 「市場分析」（外を読む・立ち位置を決める）と「獲得施策」（認知を取って CV へ渡す）が同一ファイルに同居。Market → Market / Acquisition 分割（decisions.md §3.26）後の SSOT 原則と矛盾
2. **案F 反映漏れ**: アプリは Phase 3 後の運営判断による別個投入に降格（decisions.md §3.21）／DM 4→3通再設計／「自己診断ツール」→「レベル選びガイド」リネーム／処方箋・特効薬 NG 等、案F確定後の前提変更が反映されていなかった
3. **SaaS 用語「GTM」の汎用性過多**: ファイル名としては「集客チャネル」「CV 導線」を直接表す `channels.md` `funnel.md` の方が責務直結

## 移植マップ

| 旧 gtm.md 節 | 新移植先 |
|---|---|
| §1 集客チャネル | `acquisition/channels.md` §1・§6 |
| §2 ブロガーDM戦略 | `acquisition/channels.md` §2・§3・§4 |
| §3 点描写作成アプリ戦略 | [retired-designs/2026-05-21-app-as-dm-hook.md](../retired-designs/2026-05-21-app-as-dm-hook.md) へ完全退避（前提崩壊のため acquisition/ には移植せず） |
| §4 広告運用方針 | `acquisition/channels.md` §5 |
| §5 SEO キーワード戦略 | `acquisition/funnel.md` §2／`market/positioning.md` §2 |
| §6 連載構造 | `acquisition/funnel.md` §4 末尾（content/pillars.md 等が SSOT のため方針のみ） |
| §7 購入導線・メアド・アカウント | `acquisition/funnel.md` §3〜§6 |
| §8 学習リソース | `acquisition/channels.md` 附録 |

## 関連

- 領域分割の判断ログ: [decisions.md §3.26](../../decisions.md)
- 解体作業の判断ログ: [decisions.md §3.27](../../decisions.md)
- 後継ファイル: [acquisition/channels.md](../../acquisition/channels.md) / [acquisition/funnel.md](../../acquisition/funnel.md)
- 関連退避: [retired-designs/2026-05-21-app-as-dm-hook.md](../retired-designs/2026-05-21-app-as-dm-hook.md)

## 退避時点の全文スナップショット

退避時点の `market/gtm.md` 全文は git 履歴に残るため本ファイルでは省略。`git log --all -- market/gtm.md` で参照可能。
