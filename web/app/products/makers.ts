/* =========================================================================
   メーカー・カタログ SSOT（メーカーのメタ。実装は 10・ローンチ公開は 8）
   ハブ（/makers）・各メーカーの MakerGate（introbar）・導線が共用。
   価格・所有判定は capabilities.ts（買い切り ¥980・owned モデル）が一次ソース。
   ここは表示名・説明・グループ・ルートだけを持つ純データ（React 非依存）。
   公開リストは LAUNCH_HIDDEN（capabilities.ts）を除いた集合＝VISIBLE_MAKERS / makersInGroup。
   ========================================================================= */
import { isLaunchHidden, type MakerKey } from "./capabilities";

export type MakerGroupKey = "見て写す" | "かたちを動かす" | "重ねる・分ける";

export type MakerMeta = {
  key: MakerKey;
  href: string;       // ツールのルート
  name: string;       // 公開名（カード見出し）
  short: string;      // 短名（バッジ・introbar 用）
  desc: string;       // 1 行説明（公開コピー・親向け）
  group: MakerGroupKey;
};

export const MAKERS: MakerMeta[] = [
  { key: "copy",      href: "/maker",           name: "模写メーカー",         short: "模写",     desc: "見本のとおりに、点をつないで写す。",       group: "見て写す" },
  { key: "fill",      href: "/maker-fill",      name: "欠け補完メーカー",     short: "欠け補完", desc: "足りない辺を補って、形を閉じる。",       group: "見て写す" },
  { key: "mirror",    href: "/maker-mirror",    name: "鏡メーカー",           short: "鏡",       desc: "鏡の反対側に映る形を描く。",             group: "かたちを動かす" },
  { key: "translate", href: "/maker-translate", name: "平行移動メーカー",     short: "平行移動", desc: "形を変えずに、ずらして写す。",           group: "かたちを動かす" },
  { key: "rotate",    href: "/maker-rotate",    name: "回転メーカー",         short: "回転",     desc: "回した形を思いうかべて描く。",           group: "かたちを動かす" },
  { key: "scale",     href: "/maker-scale",     name: "拡大メーカー",         short: "拡大",     desc: "比をそろえて、大きく写す（×2・×3）。",   group: "かたちを動かす" },
  { key: "shrink",    href: "/maker-shrink",    name: "縮小メーカー",         short: "縮小",     desc: "比をそろえて、小さく写す（1/2・1/3）。", group: "かたちを動かす" },
  { key: "overlay",   href: "/maker-overlay",   name: "重ねメーカー",         short: "重ね",     desc: "2 つの形を重ねたところを描く。",         group: "重ねる・分ける" },
  { key: "decompose", href: "/maker-decompose", name: "分解メーカー",         short: "分解",     desc: "重なった形から、片方を取り出す。",       group: "重ねる・分ける" },
  { key: "fold",      href: "/maker-fold",      name: "折り重ねメーカー",     short: "折り重ね", desc: "折り返して重ねた形を描く。",             group: "重ねる・分ける" },
];

/* グループ表示順＝TOP カタログ (catalog GROUPS) と同一: 見て写す → かたちを動かす → 重ねる・分ける。
   ローンチ公開後の「かたちを動かす」は鏡・平行移動・回転。拡大・縮小は LAUNCH_HIDDEN。 */
export const MAKER_GROUPS: { key: MakerGroupKey; title: string; sub: string }[] = [
  { key: "見て写す",       title: "見て写す",       sub: "形をそのまま読み取る、いちばんの基礎。" },
  { key: "かたちを動かす", title: "かたちを動かす", sub: "向きや位置を変えて、頭の中で形をとらえる力。鏡・平行移動・回転。" },
  { key: "重ねる・分ける", title: "重ねる・分ける", sub: "複数の形を組み立てたり、分けたりして読みとく力。" },
];

/* ローンチ公開メーカー（LAUNCH_HIDDEN を除外）。表示・件数表記はこの集合が基準。 */
export const VISIBLE_MAKERS: MakerMeta[] = MAKERS.filter((m) => !isLaunchHidden(m.key));

export function makerByKey(key: MakerKey): MakerMeta | undefined {
  return MAKERS.find((m) => m.key === key);
}
export function makersInGroup(group: MakerGroupKey): MakerMeta[] {
  return VISIBLE_MAKERS.filter((m) => m.group === group);
}
