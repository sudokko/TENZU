/* SNS アイコン — 各社の公式ブランドマークを、公式のカラーのまま描く。
   パスの出典は sns-icon-paths.ts（ファイル先頭に各社ブランドリソースの URL）。

   カラー方針（2026-08-26 オーナー判断）: サイトのトーンに合わせた単色化はしない。
   ブランドマークは各社の資産で、色を変えること自体を禁じている社もあるため
   （note は色変更・変形・装飾を明示的に禁止）。TENZU 風に寄せず原色で置く。 */

import { SNS_ICON_PATHS } from "./sns-icon-paths";
import type { SnsKey } from "../sns";

/* Instagram の公式グリフはグラデーション。同一ページに 2 つ出る場合（/sudo-craft は
   フッターと本文）に id が重複するが、参照先は同じ定義なので描画結果は変わらない。 */
const IG_WARM = "tenzu-ig-warm";
const IG_COOL = "tenzu-ig-cool";

export default function SnsIcon({ name, size = 16 }: { name: SnsKey; size?: number }) {
  const box = { width: size, height: size, "aria-hidden": true as const, focusable: "false" as const };

  if (name === "note") {
    /* note は「他の SNS アイコンと並列に並ぶ場合は square 版を使う」ルールがあるため
       シンボル単体ではなく公式配布の square（角丸白地＋黒の n）をそのまま使う。
       出典: note Visual Identity 配布物 app/icon.svg */
    return (
      <svg {...box} className="sns-icon sns-icon-note" viewBox="0 0 493 493">
        <rect x="1" y="1" width="490.2" height="490.2" rx="104" fill="white" stroke="#EBEBEB" strokeWidth="2" />
        <path d={SNS_ICON_PATHS.noteSquare} fill="#040000" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg {...box} className="sns-icon" viewBox="0 0 24 24">
        <defs>
          {/* 公式グリフのグラデーション（左下の暖色 → 右上の紫、左上に青のかぶり） */}
          <radialGradient id={IG_WARM} cx="26.5%" cy="107%" r="99%">
            <stop offset="0%" stopColor="#FFDD55" />
            <stop offset="10%" stopColor="#FFDD55" />
            <stop offset="50%" stopColor="#FF543E" />
            <stop offset="100%" stopColor="#C837AB" />
          </radialGradient>
          <radialGradient id={IG_COOL} cx="-16.8%" cy="7.2%" r="44.3%">
            <stop offset="0%" stopColor="#3771C8" />
            <stop offset="12.8%" stopColor="#3771C8" />
            <stop offset="100%" stopColor="#6600FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={SNS_ICON_PATHS.instagram} fill={`url(#${IG_WARM})`} />
        <path d={SNS_ICON_PATHS.instagram} fill={`url(#${IG_COOL})`} />
      </svg>
    );
  }

  /* 単色のマーク。色は各社のブランドカラー。 */
  const SOLID = {
    x: "#000000",
    ameba: "#2D8C3C",
    pinterest: "#BD081C",
  } as const;
  return (
    <svg {...box} className="sns-icon" viewBox="0 0 24 24">
      <path d={SNS_ICON_PATHS[name]} fill={SOLID[name]} />
    </svg>
  );
}
