/* =========================================================================
   模写（図形）幾何ライブラリ（手設計・パラメトリック）
   ランダムウォークでは「整った図形」にならないため、copy は motif（絵柄）と
   同じくライブラリ方式で作る。素材は抽象幾何＝
   - パラメトリック族（格子・対角枠・多角形・星・ダイヤ…をサイズ違いで量産）
   - 象徴的な一品物（砂時計・風車 など）
   - 高Lv は合成（compose）と密パターン（格子・入れ子・星）で線を埋める
   座標はローカル（r 下向き）。盤面内の配置は copy.ts が中央寄せで行う。
   各 family の metrics（線数・斜め・交差）は copy.ts の variantFits が実測判定して
   巻へ振り分けるので、ここでは「整った形を多様に量産」することに徹する。
   ========================================================================= */

import { parsePaths } from "./motif-shapes";
import type { EdgeT } from "../schema";
import { normalizeEdges } from "../schema";

export type RawShape = {
  key: string;
  name: string;
  paths: string[];
  mirrorable?: boolean;
};

/* ---- paths ヘルパ ---- */
const rect = (w: number, h: number, dc = 0, dr = 0): string =>
  `${dc},${dr} ${dc + w},${dr} ${dc + w},${dr + h} ${dc},${dr + h} ${dc},${dr}`;

/* ======================= 直交系 ======================= */

/* 格子（m×n セル）= (m+1)+(n+1) 線。交差 =(m-1)(n-1)。
   1×1＝わく / 1×k＝はしご(交差0) / 2×2＝田(交差1) / 3×3＝交差4 … 直交の主力 */
function rectGrids(): RawShape[] {
  const out: RawShape[] = [];
  for (let m = 1; m <= 6; m++) for (let n = 1; n <= 6; n++) {
    if (Math.abs(m - n) > 2) continue;
    const paths: string[] = [];
    for (let c = 0; c <= m; c++) paths.push(`${c},0 ${c},${n}`);
    for (let r = 0; r <= n; r++) paths.push(`0,${r} ${m},${r}`);
    const name = (m === 1 && n === 1) ? "わく" : (m === 1 || n === 1) ? "はしご" : "こうし";
    out.push({ key: `grid#${m}x${n}`, name, paths });
  }
  return out;
}

/* 格子＋対角線（交差と斜めを同時に供給）。中〜高Lv の主力。
   m×n 格子に対角を d 本。正方なら 45°・非正方なら非45°。線・交差・斜めが豊富 */
function gridDiags(): RawShape[] {
  const out: RawShape[] = [];
  for (let m = 1; m <= 6; m++) for (let n = 1; n <= 6; n++) {
    if (Math.abs(m - n) > 2) continue;
    if (m + n < 3) continue;
    const grid: string[] = [];
    for (let c = 0; c <= m; c++) grid.push(`${c},0 ${c},${n}`);
    for (let r = 0; r <= n; r++) grid.push(`0,${r} ${m},${r}`);
    const d1 = `0,0 ${m},${n}`, d2 = `${m},0 0,${n}`;
    const mir = m !== n;
    out.push({ key: `gd#${m}x${n}d1`, name: "こうしたいかく", paths: [...grid, d1], mirrorable: mir });
    out.push({ key: `gd#${m}x${n}d2`, name: "こうしばつ", paths: [...grid, d1, d2] });
  }
  return out;
}

/* 入れ子の枠 = 4k 線・直交 */
function nestedFrames(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 4; s <= 6; s++) for (let k = 2; k <= 3; k++) {
    if (s - 2 * (k - 1) < 2) continue;
    const paths: string[] = [];
    for (let i = 0; i < k; i++) paths.push(rect(s - 2 * i, s - 2 * i, i, i));
    out.push({ key: `nest#${s}x${k}`, name: "いれこわく", paths });
  }
  return out;
}

/* 十字（中心で交差）= 2 線・交差1 */
function crosses(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 2; s <= 6; s += 2) {
    const m = s / 2;
    out.push({ key: `cross#${s}`, name: "じゅうじ", paths: [`0,${m} ${s},${m}`, `${m},0 ${m},${s}`] });
  }
  return out;
}

/* 階段 = 2n 線・直交 */
function stairs(): RawShape[] {
  const out: RawShape[] = [];
  for (let n = 2; n <= 6; n++) {
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) { pts.push(`${i},${i}`); if (i < n) pts.push(`${i + 1},${i}`); }
    out.push({ key: `stairs#${n}`, name: "かいだん", paths: [pts.join(" ")], mirrorable: true });
  }
  return out;
}

/* 字形 H/U/T/L/E = 2〜4 線・直交 */
function letters(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 2; s <= 4; s++) {
    const m = Math.floor(s / 2);
    out.push({ key: `H#${s}`, name: "エイチがた", paths: [`0,0 0,${s}`, `${s},0 ${s},${s}`, `0,${m} ${s},${m}`] });
    out.push({ key: `U#${s}`, name: "ユーがた", paths: [`0,0 0,${s} ${s},${s} ${s},0`] });
    out.push({ key: `T#${s}`, name: "ティーがた", paths: [`0,0 ${s},0`, `${m},0 ${m},${s}`] });
    out.push({ key: `L#${s}`, name: "エルがた", paths: [`0,0 0,${s} ${s},${s}`], mirrorable: true });
    out.push({ key: `E#${s}`, name: "イーがた", paths: [`${s},0 0,0 0,${s} ${s},${s}`, `0,${m} ${s},${m}`], mirrorable: true });
  }
  return out;
}

/* プラス（凸型アウトライン）= 12 線・直交 */
function pluses(): RawShape[] {
  const out: RawShape[] = [];
  for (const a of [1, 2]) {
    const w = 3 * a;
    out.push({ key: `plus#${a}`, name: "プラス",
      paths: [`${a},0 ${2 * a},0 ${2 * a},${a} ${w},${a} ${w},${2 * a} ${2 * a},${2 * a} ` +
        `${2 * a},${w} ${a},${w} ${a},${2 * a} 0,${2 * a} 0,${a} ${a},${a} ${a},0`] });
  }
  return out;
}

/* ======================= 45°系 ======================= */

/* 対角枠（枠＋対角線 d 本）。d=1:+1線+1斜め, d=2:X で +2線+2斜め+交差1。
   正方なら 45°、非正方なら非45°（lv4 用素材にもなる） */
function diagRects(): RawShape[] {
  const out: RawShape[] = [];
  for (let w = 2; w <= 5; w++) for (let h = 2; h <= 5; h++) {
    if (Math.abs(w - h) > 2) continue;
    const d1 = `0,0 ${w},${h}`, d2 = `${w},0 0,${h}`;
    out.push({ key: `drect#${w}x${h}d1`, name: "わくたいかく", paths: [rect(w, h), d1], mirrorable: w !== h });
    out.push({ key: `drect#${w}x${h}d2`, name: "わくばつ", paths: [rect(w, h), d1, d2] });
  }
  return out;
}

/* 半対角枠（枠＋片側三角の対角）＝5線。屋根付き等 */
function triRects(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 2; s <= 4; s++)
    out.push({ key: `trect#${s}`, name: "わくさんかく", paths: [rect(s, s), `0,0 ${s},${s}`, `0,${s} ${s},0`], mirrorable: false });
  return out;
}

/* 三角（直角・二等辺）= 3 線 */
function triangles(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 2; s <= 5; s++)
    out.push({ key: `triR#${s}`, name: "さんかく", paths: [`0,0 0,${s} ${s},${s} 0,0`], mirrorable: true });
  for (let s = 1; s <= 3; s++)
    out.push({ key: `triI#${s}`, name: "やま", paths: [`0,${s} ${s},0 ${2 * s},${s} 0,${s}`] });
  return out;
}

/* シェブロン（V の積み重ね）= n 線・斜め・交差なし。45° */
function chevrons(): RawShape[] {
  const out: RawShape[] = [];
  for (let w = 2; w <= 4; w += 2) for (let k = 2; k <= 3; k++) {
    const paths: string[] = [];
    for (let i = 0; i < k; i++) paths.push(`0,${i + w / 2} ${w / 2},${i} ${w},${i + w / 2}`);
    if (w * (k - 1) / 2 + w / 2 > 6) continue;
    out.push({ key: `chev#${w}x${k}`, name: "やまがた", paths });
  }
  return out;
}

/* 三角の内部構造（高さ・中線・4分割）＝三角バリエーション */
function triParts(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [2, 3, 4]) {
    const h = Math.floor(s / 2);
    out.push({ key: `triH#${s}`, name: "さんかくたかさ", paths: [`0,0 ${s},0 ${s},${s} 0,0`, `${s},0 ${h},${h}`] });
    out.push({ key: `triV#${s}`, name: "さんかくちゅうせん", paths: [`0,${s} ${s},0 ${2 * s},${s} 0,${s}`, `${s},0 ${s},${s}`] });
  }
  for (const s of [2, 4]) {
    const a = s, b = 2 * s;
    out.push({ key: `triSub#${s}`, name: "さんかくぶんかつ",
      paths: [`${a},0 0,${b} ${b},${b} ${a},0`, `${a / 2},${a} ${3 * a / 2},${a} ${a},${b} ${a / 2},${a}`] });
  }
  return out;
}

/* 平行四辺形（基本1〜2個・角度水増ししない）＋対角つき。45°/非45° 各1 */
function parallelograms(): RawShape[] {
  const out: RawShape[] = [];
  const cfg: [number, number, number][] = [[3, 2, 1], [2, 3, 2]]; // 非45° と 45°寄り
  for (const [w, h, d] of cfg) {
    const poly = `${d},0 ${d + w},0 ${w},${h} 0,${h} ${d},0`;
    out.push({ key: `para#${w}x${h}x${d}`, name: "へいこうしへんけい", paths: [poly] });
    out.push({ key: `paraD#${w}x${h}x${d}`, name: "へいこうたいかく",
      paths: [poly, `${d},0 ${w},${h}`, `${d + w},0 0,${h}`] });
  }
  return out;
}

/* 台形（基本1〜2個）＋対角つき */
function trapezoids(): RawShape[] {
  const out: RawShape[] = [];
  const cfg: [number, number, number, number][] = [[2, 4, 2, 1], [1, 3, 3, 1]];
  for (const [tw, bw, h, off] of cfg) {
    const poly = `${off},0 ${off + tw},0 ${bw},${h} 0,${h} ${off},0`;
    out.push({ key: `trap#${tw}-${bw}-${h}`, name: "だいけい", paths: [poly] });
    out.push({ key: `trapD#${tw}-${bw}-${h}`, name: "だいけいたいかく",
      paths: [poly, `${off},0 ${bw},${h}`, `${off + tw},0 0,${h}`] });
  }
  return out;
}

/* 図形の種類を増やす（各1〜2個・回転水増しなし）。多様な幾何アウトライン */
const MORE: RawShape[] = [
  { key: "notch#1", name: "ノッチしかく", paths: ["0,0 4,0 4,4 2,4 2,2 0,2 0,0"] },
  { key: "notch#2", name: "といれ", paths: ["0,0 3,0 3,1 1,1 1,3 0,3 0,0"] },
  { key: "step#1", name: "だんつき", paths: ["0,0 2,0 2,1 3,1 3,2 4,2 4,3 0,3 0,0"] },
  { key: "step#2", name: "ピラミッドだん", paths: ["0,4 1,2 2,2 3,0 4,0 4,4 0,4"] },
  { key: "dart#1", name: "やじり", paths: ["2,0 4,4 2,3 0,4 2,0"] },
  { key: "rhomX#1", name: "ひしじゅうじ", paths: ["2,0 4,2 2,4 0,2 2,0", "2,0 2,4", "0,2 4,2"] },
  { key: "rhomSq#1", name: "ひしないしかく", paths: ["2,0 4,2 2,4 0,2 2,0", "1,1 3,1 3,3 1,3 1,1"] },
  { key: "hept#1", name: "ななかくけい", paths: ["1,0 3,0 4,2 3,4 1,4 0,2 0,1 1,0"] },
  { key: "twosq#1", name: "かさねしかく", paths: ["0,0 3,0 3,3 0,3 0,0", "1,1 4,1 4,4 1,4 1,1"] },
  { key: "twodia#1", name: "かさねひし", paths: ["2,0 4,2 2,4 0,2 2,0", "3,1 5,3 3,5 1,3 3,1"] },
  { key: "bigL#1", name: "おおエル", paths: ["0,0 0,4 4,4 4,3 1,3 1,0 0,0"] },
  { key: "bigT#1", name: "おおティー", paths: ["0,0 4,0 4,1 3,1 3,4 1,4 1,1 0,1 0,0"] },
  { key: "bigU#1", name: "おおユー", paths: ["0,0 1,0 1,3 3,3 3,0 4,0 4,4 0,4 0,0"] },
  { key: "zigC#1", name: "ジグザグわく", paths: ["0,1 1,0 2,1 3,0 4,1 4,2 0,2 0,1"] },
  { key: "diaInsq#1", name: "しかくないひし", paths: ["0,0 4,0 4,4 0,4 0,0", "2,0 4,2 2,4 0,2 2,0"] },
  { key: "winframe#1", name: "まどわく", paths: ["0,0 4,0 4,4 0,4 0,0", "2,0 2,4", "0,2 4,2"] },
  { key: "tri3#1", name: "さんだんさんかく", paths: ["3,0 0,3 6,3 3,0", "2,1 4,1", "1,2 5,2"] },
  /* 大盤面（lv4-vol2/lv5）向けの大きめ純幾何 */
  { key: "bigdiainsq#1", name: "おおしかくないひし", paths: ["0,0 6,0 6,6 0,6 0,0", "3,0 6,3 3,6 0,3 3,0"] },
  { key: "bigtwodia#1", name: "おおかさねひし", paths: ["2,0 4,2 2,4 0,2 2,0", "4,2 6,4 4,6 2,4 4,2", "2,4 4,6"] },
  { key: "bighex#1", name: "おおろくぼう", paths: ["3,0 6,4 0,4 3,0", "3,6 0,2 6,2 3,6"] },
  { key: "bigwinX#1", name: "おおまどばつ", paths: ["0,0 6,0 6,6 0,6 0,0", "0,0 6,6", "6,0 0,6", "3,0 3,6", "0,3 6,3"] },
];

/* 五芒星・星型多角形（外周格子点を飛ばし結び）。X 系キャップ対象 */
function pentagrams(): RawShape[] {
  return [
    { key: "penta#1", name: "ごぼうせい", paths: ["2,0 3,4 0,2 4,2 1,4 2,0"] },
    { key: "penta#2", name: "ごぼうせい", paths: ["3,0 4,5 0,2 6,2 2,5 3,0"] },
    /* 八芒星（小正方＋大ひし＝ラクシュミーの星） */
    { key: "penta#8a", name: "はちぼうせい", paths: ["1,1 3,1 3,3 1,3 1,1", "2,0 4,2 2,4 0,2 2,0"] },
    { key: "penta#8b", name: "はちぼうせい", paths: ["1,1 5,1 5,5 1,5 1,1", "3,0 6,3 3,6 0,3 3,0"] },
  ];
}

/* ダイヤ（45°の正方形）= 4 線・斜め */
function diamonds(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 1; s <= 3; s++)
    out.push({ key: `diamond#${s}`, name: "ひしがた", paths: [`${s},0 ${2 * s},${s} ${s},${2 * s} 0,${s} ${s},0`] });
  return out;
}


/* 矢印 = 3 線（軸＋斜め頭2）。横向き */
function arrows(): RawShape[] {
  const out: RawShape[] = [];
  for (let s = 1; s <= 3; s++)
    out.push({ key: `arrow#${s}`, name: "やじるし",
      paths: [`0,${s} ${2 * s},${s}`, `${s},0 ${2 * s},${s} ${s},${2 * s}`], mirrorable: true });
  return out;
}

/* 星（米印＝縦横＋2対角が中心を貫く）= 4 線・交差6。45 if 正方 */
function stars(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [2, 4]) {
    const m = s / 2;
    out.push({ key: `star#${s}`, name: "こめじるし",
      paths: [`0,${m} ${s},${m}`, `${m},0 ${m},${s}`, `0,0 ${s},${s}`, `${s},0 0,${s}`] });
  }
  return out;
}

/* 多角形（45 と非45）。五角形・六角形・八角形 */
function polygons(): RawShape[] {
  return [
    /* 六角形（45°系） */
    { key: "hex45#2", name: "ろっかくけい", paths: ["0,1 1,0 3,0 4,1 3,2 1,2 0,1"] },
    { key: "hex45#3", name: "ろっかくけい", paths: ["0,2 2,0 4,0 6,2 4,4 2,4 0,2"] },
    /* 八角形 */
    { key: "oct#3", name: "はちかくけい", paths: ["1,0 2,0 3,1 3,2 2,3 1,3 0,2 0,1 1,0"] },
    /* 五角形（家を縦長・非45°） */
    { key: "pent#1", name: "ごかくけい", paths: ["0,2 2,0 4,2 4,4 0,4 0,2"], mirrorable: false },
  ];
}

/* 非45°プリミティブ（ナイト傾き）= lv4-5 用 */
function skews(): RawShape[] {
  return [
    { key: "trap#1", name: "だいけい", paths: ["1,0 3,0 4,2 0,2 1,0"], mirrorable: true },
    { key: "trap#2", name: "だいけい", paths: ["1,0 4,0 5,3 0,3 1,0"], mirrorable: true },
    { key: "kite#1", name: "たこがた", paths: ["2,0 4,3 2,4 0,3 2,0"] },
    { key: "kite#2", name: "たこがた", paths: ["2,0 4,2 2,5 0,2 2,0"] },
    { key: "para#1", name: "へいこうしへんけい", paths: ["1,0 4,0 3,3 0,3 1,0"], mirrorable: true },
    { key: "para#2", name: "へいこうしへんけい", paths: ["2,0 5,0 3,4 0,4 2,0"], mirrorable: true },
    /* 凧＋対角（非45 ＋ 交差） */
    { key: "kiteX#1", name: "たこばつ", paths: ["2,0 4,2 2,4 0,2 2,0", "2,0 2,4", "0,2 4,2"] },
  ];
}

/* ---- 一品物（抽象・低Lv） ---- */
const SINGLES: RawShape[] = [
  { key: "hourglass#3", name: "すなどけい", paths: ["0,0 3,0", "0,3 3,3", "0,0 3,3", "3,0 0,3"] },
  { key: "bowtie#2", name: "ちょうネクタイ", paths: ["0,0 0,2 2,0 2,2 0,0"] },
];

/* 4×4・線5〜7本・交差ゼロの中図形（lv2-vol2 の帯＝grid4・ortho45・cross zero・
   D[2,7]＝この巻は D＝線数）。D5+（線5本〜）の候補が枯れていたので増補（2026-06-15・
   オーナー指示「D4以下は不採用・D5以上を増やせ」）。交差を作らない純アウトライン＋
   非交差の内部線＝家・六角・三角棚・日/目・S字・二重矢印・羽根矢印・斜めばしご等。
   いずれも span3 を含む＝grid3 には漏れない（grid4 専用）。 */
function mid4Cross0(): RawShape[] {
  return [
    { key: "house4#1", name: "おおいえ", paths: ["0,3 0,1 1,0 2,1 2,3 0,3"] },
    { key: "house4d#1", name: "いえとびら", paths: ["0,3 0,1 1,0 2,1 2,3 0,3", "1,2 1,3"] },
    { key: "house4w#1", name: "まどいえ", paths: ["0,3 0,1 2,1 2,3 0,3", "0,1 1,0 2,1", "1,2 1,3"] },
    { key: "hex4#1", name: "ろっかく", paths: ["0,1 1,0 2,0 3,1 2,2 1,2 0,1"] },
    { key: "trishelf4#1", name: "さんかくたな", paths: ["0,0 0,3 3,3 0,0", "0,1 1,1", "0,2 2,2"], mirrorable: true },
    { key: "tri3shelf4#1", name: "さんかくたな3", paths: ["0,0 0,3 3,3 0,0", "0,1 1,1", "0,2 2,2", "1,2 1,3"], mirrorable: true },
    { key: "nichi4#1", name: "にちがた", paths: ["0,0 3,0 3,3 0,3 0,0", "0,1 3,1"] },
    { key: "moku4#1", name: "もくがた", paths: ["0,0 3,0 3,3 0,3 0,0", "0,1 3,1", "0,2 3,2"] },
    { key: "zigS4#1", name: "エスじ", paths: ["0,0 3,0 3,1 0,1 0,2 3,2 3,3 0,3"], mirrorable: true },
    { key: "zig4#1", name: "ジグザグ", paths: ["0,0 3,0 3,1 0,1 0,2 3,2"], mirrorable: true },
    { key: "darrow4#1", name: "ふたやじるし", paths: ["1,0 1,3", "0,1 1,0 2,1", "0,2 1,1 2,2"] },
    { key: "cornd4#1", name: "すみせん", paths: ["0,0 3,0 3,3 0,3 0,0", "0,2 1,3"], mirrorable: true },
    { key: "feath4#1", name: "やじるしはね", paths: ["0,2 3,2", "2,1 3,2 2,3", "0,1 1,2 0,3"], mirrorable: true },
    { key: "kdiag4#1", name: "すみたいかく", paths: ["0,0 3,0 3,3 0,3 0,0", "0,0 1,1", "3,3 2,2"] },
    { key: "chevd4#1", name: "やまふた", paths: ["0,1 1,0 2,1 3,0", "0,3 1,2 2,3 3,2"], mirrorable: true },
    { key: "ladder4#1", name: "ななめばしご", paths: ["0,0 0,3", "3,0 3,3", "0,0 1,1", "0,1 1,2", "0,2 1,3"], mirrorable: true },
  ];
}

/* 4×4・線7〜8本・交差ゼロの密図形（lv2-vol2 を D8 まで引き上げ＝オーナー指示
   2026-06-15「難易度が微妙・D7/D8 を足せ」）。交差を作らずに線を稼ぐ＝枠＋複数の
   隅対角／目＋対角／三角の多段棚／両側斜めばしご／3段階段／入れ子枠。八角形は既存
   polygons() の oct#3 が窓拡張で解禁される。 */
function hard4Cross0(): RawShape[] {
  return [
    /* D7（線7本） */
    { key: "mokucorn4#1", name: "もくすみ", paths: ["0,0 3,0 3,3 0,3 0,0", "0,1 3,1", "0,2 3,2", "0,2 1,3"] },
    { key: "nichicorn4#1", name: "にちすみ", paths: ["0,0 3,0 3,3 0,3 0,0", "0,1 3,1", "0,2 1,3", "2,0 3,1"] },
    { key: "trishelf4b#1", name: "さんかくたな4", paths: ["0,0 0,3 3,3 0,0", "0,1 1,1", "0,2 2,2", "1,2 1,3", "2,2 2,3"] },
    { key: "trishelf4c#1", name: "さんかくたな5", paths: ["0,0 0,3 3,3 0,0", "0,1 1,1", "0,2 2,2", "1,2 1,3", "2,2 2,3", "0,3 1,3"] },
    { key: "framecorn3#1", name: "わくすみ3", paths: ["0,0 3,0 3,3 0,3 0,0", "0,0 1,1", "2,0 3,1", "0,2 1,3"] },
    { key: "house4full#1", name: "いえまど", paths: ["0,3 0,1 1,0 2,1 2,3 0,3", "1,2 1,3", "0,2 1,2"] },
    /* D8（線8本） */
    { key: "moku2d4#1", name: "もくすみ2", paths: ["0,0 3,0 3,3 0,3 0,0", "0,1 3,1", "0,2 3,2", "0,2 1,3", "2,0 3,1"] },
    { key: "framecorn4#1", name: "わくすみ4", paths: ["0,0 3,0 3,3 0,3 0,0", "0,0 1,1", "2,0 3,1", "0,2 1,3", "2,3 3,2"] },
    { key: "dladder4#1", name: "りょうばしご", paths: ["0,0 0,3", "3,0 3,3", "0,0 1,1", "0,1 1,2", "0,2 1,3", "2,0 3,1", "2,1 3,2", "2,2 3,3"] },
    { key: "step3blk4#1", name: "おおかいだん", paths: ["0,0 1,0 1,1 2,1 2,2 3,2 3,3 0,3 0,0"] },
    { key: "nestsq4#1", name: "いれこしかく", paths: ["0,0 3,0 3,3 0,3 0,0", "1,1 2,1 2,2 1,2 1,1"] },
    /* 枠を使わない別系統（類似カリング回避・多段矢印／縦サーペンタイン／多成分） */
    { key: "arrow3h4#1", name: "やじるし3だん", paths: ["1,0 1,3", "0,1 1,0 2,1", "0,2 1,1 2,2", "0,3 1,2 2,3"] },
    { key: "vserp4#1", name: "たてエス", paths: ["0,0 0,3 1,3 1,0 2,0 2,3 3,3 3,0"] },
    { key: "sqchev4#1", name: "しかくとやま", paths: ["0,0 1,0 1,1 0,1 0,0", "0,2 1,3 2,2 3,3"] },
    { key: "chevtri4#1", name: "やまだんとゆか", paths: ["0,1 1,0 2,1 3,0", "0,2 1,1 2,2 3,1", "0,3 3,3"] },
    { key: "twosq4#1", name: "ふたしかく", paths: ["0,0 1,0 1,1 0,1 0,0", "2,2 3,2 3,3 2,3 2,2"] },
    { key: "wmix4#1", name: "やまたに", paths: ["0,0 1,1 2,0 3,1", "0,3 1,2 2,3 3,2", "0,0 0,3", "3,1 3,3"] },
    { key: "earrow4#1", name: "やじるし4だん", paths: ["1,0 1,3", "0,1 1,0 2,1", "0,2 1,1 2,2", "0,3 1,2 2,3", "0,0 2,0"] },
  ];
}

/* 3×3・純直交の小図形（lv1-vol1 の帯＝grid3・斜めなしでも可・D[2,7]）。
   lv1 と lv2-vol1 は同じ grid3 だが lv2-vol1 は「斜め必須」＝斜めゼロの図形は
   lv1 にしか適合せず兄弟巻と衝突しない。lv1 候補が枯れたので増補（2026-06-15）。
   素朴な直交アウトライン＝四角・長方形・Z・凹・段・F・⊢・コ・平行線・ノッチ。 */
function smallOrtho3(): RawShape[] {
  return [
    { key: "square3#1", name: "しかく", paths: ["0,0 2,0 2,2 0,2 0,0"] },
    { key: "rectg3#1", name: "ながしかく", paths: ["0,0 2,0 2,1 0,1 0,0"], mirrorable: true },
    { key: "zigz3#1", name: "ジグザグ", paths: ["0,0 2,0 2,1 0,1 0,2 2,2"], mirrorable: true },
    { key: "toilet3#1", name: "といれ", paths: ["0,0 2,0 2,1 1,1 1,2 0,2 0,0"], mirrorable: true },
    { key: "step3#1", name: "だんつき", paths: ["0,0 1,0 1,1 2,1 2,2 0,2 0,0"], mirrorable: true },
    { key: "fgata3#1", name: "エフがた", paths: ["0,0 0,2", "0,0 2,0", "0,1 1,1"], mirrorable: true },
    { key: "tside3#1", name: "ティーよこ", paths: ["0,0 0,2", "0,1 2,1"], mirrorable: true },
    { key: "cgata3#1", name: "コのじ", paths: ["2,0 0,0 0,2 2,2"], mirrorable: true },
    { key: "parbar3#1", name: "へいこうせん", paths: ["0,0 2,0", "0,2 2,2"] },
    { key: "notchS3#1", name: "ノッチ", paths: ["0,0 2,0 2,2 1,2 1,1 0,1 0,0"], mirrorable: true },
  ];
}

/* 3×3・45°斜め入りの小図形（lv2-vol1 の帯＝grid3・45°必須・非45°なし・D[2,8]）。
   この帯に適合する静的図形が 12 種しか無く候補が枯れていたので増補（2026-06-15）。
   いずれも span2 の素朴な幾何＝旗・家・封筒・砂時計・上矢印・テント・菱＋線・
   菱十字・稲妻・ペナント・山折り・谷折り。角度は水増しせず「種類」で増やす。 */
function smallDiag3(): RawShape[] {
  return [
    { key: "flag3#1", name: "はた", paths: ["0,2 0,0 2,0 1,1 0,1"], mirrorable: true },
    { key: "house3#1", name: "いえ", paths: ["0,2 0,1 1,0 2,1 2,2 0,2"] },
    { key: "envel3#1", name: "ふうとう", paths: ["0,0 2,0 2,2 0,2 0,0", "0,0 1,1 2,0"] },
    { key: "hour3#1", name: "すなどけい", paths: ["0,0 2,0", "0,2 2,2", "0,0 2,2", "2,0 0,2"] },
    { key: "uarrow3#1", name: "うえやじるし", paths: ["1,0 1,2", "0,1 1,0 2,1"] },
    { key: "tent3#1", name: "テント", paths: ["0,2 1,1 2,2 0,2", "1,1 1,2"] },
    { key: "diaH3#1", name: "ひしよこ", paths: ["1,0 2,1 1,2 0,1 1,0", "0,1 2,1"] },
    { key: "diaX3#1", name: "ひしじゅうじ", paths: ["1,0 2,1 1,2 0,1 1,0", "1,0 1,2", "0,1 2,1"] },
    { key: "bolt3#1", name: "いなずま", paths: ["1,0 0,1 1,1 2,2"], mirrorable: true },
    { key: "penn3#1", name: "ペナント", paths: ["0,0 0,2", "0,0 1,1 0,1"], mirrorable: true },
    { key: "vee3#1", name: "やまおり", paths: ["0,2 1,1 2,2"] },
    { key: "valley3#1", name: "たにおり", paths: ["0,0 1,1 2,0"] },
  ];
}

/* ======================= Lv3+ 純幾何（単一の複雑図形） =======================
   オーナー指示 2026-06-14: 高Lv は「物の合成」ではなく純粋な幾何図形にする。
   正方形＋内接・対角・入れ子・星型多角形・格子＋対角 など、単一の連結した
   複雑図形で線数を稼ぐ（認識できる絵にはしない）。 */

/* 正方形＋内接ひし形（辺の中点を結ぶ）= 8 線・斜め4 */
function inscribed(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [2, 4, 6]) {
    const h = s / 2;
    out.push({ key: `insc#${s}`, name: "ないせつひし",
      paths: [rect(s, s), `${h},0 ${s},${h} ${h},${s} 0,${h} ${h},0`] });
  }
  return out;
}

/* マンダラ（正方形＋対角2＋内接ひし形）= 10 線・交差多。純幾何の複合 */
function mandalas(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [2, 4, 6]) {
    const h = s / 2;
    out.push({ key: `mand#${s}`, name: "まんだら",
      paths: [rect(s, s), `0,0 ${s},${s}`, `${s},0 0,${s}`,
        `${h},0 ${s},${h} ${h},${s} 0,${h} ${h},0`] });
  }
  return out;
}

/* 入れ子ひし形（同心）= 4k 線・斜め */
function nestedDiamonds(): RawShape[] {
  const out: RawShape[] = [];
  for (const k of [2, 3]) {
    const paths: string[] = [];
    for (let r = 1; r <= k; r++)
      paths.push(`${k},${k - r} ${k + r},${k} ${k},${k + r} ${k - r},${k} ${k},${k - r}`);
    out.push({ key: `ndia#${k}`, name: "いれこひし", paths });
  }
  return out;
}

/* 枠＋米（正方形＋縦横＋両対角が中心を貫く）= 8 線・高交差。純幾何 */
function starFrames(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [2, 4, 6]) {
    const h = s / 2;
    out.push({ key: `sframe#${s}`, name: "わくこめ",
      paths: [rect(s, s), `0,${h} ${s},${h}`, `${h},0 ${h},${s}`, `0,0 ${s},${s}`, `${s},0 0,${s}`] });
  }
  return out;
}

/* 同心多層（外枠＋内接ひし形＋内枠）= 12 線。大盤面の純幾何（lv4-5） */
function concentrics(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [4, 6]) {
    const h = s / 2;
    out.push({ key: `conc#${s}`, name: "どうしん",
      paths: [rect(s, s), `${h},0 ${s},${h} ${h},${s} 0,${h} ${h},0`, rect(s - 2, s - 2, 1, 1)] });
  }
  return out;
}

/* 大マンダラ（外枠＋対角＋内接ひし＋内ひし）= 14+ 線・高交差。7×7 の純幾何 */
function bigMandalas(): RawShape[] {
  const out: RawShape[] = [];
  for (const s of [4, 6]) {
    const h = s / 2;
    out.push({ key: `bmand#${s}`, name: "おおまんだら",
      paths: [rect(s, s), `0,0 ${s},${s}`, `${s},0 0,${s}`,
        `${h},0 ${s},${h} ${h},${s} 0,${h} ${h},0`,
        `${h},1 ${s - 1},${h} ${h},${s - 1} 1,${h} ${h},1`] });
  }
  return out;
}

/* ======================= 日本の格子模様（盤面いっぱい・Lv3+ 主力） =======================
   オーナー指示 2026-06-15: 幾何の枠組みを広く＝日本の伝統格子（麻の葉・菱・井桁・
   矢羽根…）を加える。いずれも盤面いっぱいに敷き詰まる純幾何パターン。 */
function lattices(): RawShape[] {
  const out: RawShape[] = [];
  const gridLines = (s: number, u: number): string[] => {
    const p: string[] = [];
    for (let c = 0; c <= s; c += u) p.push(`${c},0 ${c},${s}`);
    for (let r = 0; r <= s; r += u) p.push(`0,${r} ${s},${r}`);
    return p;
  };
  const cellDiags = (s: number, u: number, both: boolean): string[] => {
    const p: string[] = [];
    for (let i = 0; i + u <= s; i += u) for (let j = 0; j + u <= s; j += u) {
      p.push(`${i},${j} ${i + u},${j + u}`);
      if (both) p.push(`${i + u},${j} ${i},${j + u}`);
    }
    return p;
  };
  /* 麻の葉風（格子＋各セル両対角） */
  for (const [s, u] of [[4, 2], [5, 1], [6, 2], [6, 3], [4, 1]] as [number, number][])
    out.push({ key: `asanoha#${s}-${u}`, name: "あさのは", paths: [...gridLines(s, u), ...cellDiags(s, u, true)] });
  /* 菱格子（両対角のみ） */
  for (const [s, u] of [[4, 1], [4, 2], [5, 1], [6, 2], [6, 3]] as [number, number][])
    out.push({ key: `hishi#${s}-${u}`, name: "ひしこうし", paths: cellDiags(s, u, true) });
  /* 斜め格子（枠＋片対角） */
  for (const [s, u] of [[4, 1], [4, 2], [5, 1], [6, 2]] as [number, number][])
    out.push({ key: `naname#${s}-${u}`, name: "ななめこうし", paths: [rect(s, s), ...cellDiags(s, u, false)] });
  /* 井桁（#） */
  for (const s of [4, 5, 6])
    out.push({ key: `igeta#${s}`, name: "いげた", paths: [`1,0 1,${s}`, `${s - 1},0 ${s - 1},${s}`, `0,1 ${s},1`, `0,${s - 1} ${s},${s - 1}`] });
  /* 二重井桁（#を2重に） */
  for (const s of [5, 6])
    out.push({ key: `igeta2#${s}`, name: "にじゅういげた",
      paths: [`1,0 1,${s}`, `${s - 1},0 ${s - 1},${s}`, `0,1 ${s},1`, `0,${s - 1} ${s},${s - 1}`,
        `2,0 2,${s}`, `${s - 2},0 ${s - 2},${s}`, `0,2 ${s},2`, `0,${s - 2} ${s},${s - 2}`] });
  /* 矢羽根（シェブロン行） */
  for (const [s, u] of [[4, 2], [6, 3], [6, 2]] as [number, number][]) {
    const p: string[] = [];
    for (let r = 0; r + u <= s; r += u)
      for (let c = 0; c + 2 * u <= s; c += 2 * u) p.push(`${c},${r + u} ${c + u},${r} ${c + 2 * u},${r + u}`);
    out.push({ key: `yabane#${s}-${u}`, name: "やばね", paths: p });
  }
  return out;
}

/* 六芒星（三角2枚の重ね）= 6 線・交差6。純幾何 */
function hexagrams(): RawShape[] {
  return [
    { key: "hexg#4", name: "ろくぼうせい", paths: ["2,0 4,3 0,3 2,0", "2,4 0,1 4,1 2,4"] },
    { key: "hexg#6", name: "ろくぼうせい", paths: ["3,0 6,4 0,4 3,0", "3,6 0,2 6,2 3,6"] },
  ];
}

/* 非45°の純幾何（平行四辺形/台形＋対角）= 交差つき非45°。lv4-vol1 用 */
function skewDiags(): RawShape[] {
  return [
    { key: "paraX#1", name: "へいこうばつ", paths: ["1,0 4,0 3,3 0,3 1,0", "1,0 3,3", "4,0 0,3"] },
    { key: "paraX#2", name: "へいこうばつ", paths: ["2,0 5,0 3,4 0,4 2,0", "2,0 3,4", "5,0 0,4"] },
    { key: "trapX#1", name: "だいけいばつ", paths: ["1,0 3,0 4,3 0,3 1,0", "1,0 4,3", "3,0 0,3"] },
    { key: "trapX#2", name: "だいけいばつ", paths: ["1,0 4,0 5,4 0,4 1,0", "1,0 5,4", "4,0 0,4"] },
  ];
}

/* ---- 全 RawShape ---- */
export function allRawShapes(): RawShape[] {
  return [
    /* 低Lv（直交・単純45°）＝オーナー OK の素朴な形 */
    ...rectGrids(), ...nestedFrames(), ...crosses(), ...stairs(), ...letters(), ...pluses(),
    ...diagRects(), ...triRects(), ...triangles(), ...chevrons(),
    ...diamonds(), ...arrows(), ...stars(), ...polygons(), ...skews(),
    ...smallOrtho3(), ...smallDiag3(), ...mid4Cross0(), ...hard4Cross0(),
    /* 多様な幾何バリエーション（三角・平行四辺形・台形・星・その他多数） */
    ...triParts(), ...parallelograms(), ...trapezoids(), ...pentagrams(), ...MORE,
    /* Lv3+ 純幾何（単一の複雑図形＋日本の格子模様） */
    ...gridDiags(), ...nestedDiamonds(), ...inscribed(), ...mandalas(),
    ...starFrames(), ...hexagrams(), ...concentrics(), ...bigMandalas(), ...skewDiags(),
    ...lattices(),
    ...SINGLES,
  ];
}

export function shapeEdges(s: RawShape): EdgeT[] {
  return normalizeEdges(parsePaths(s.paths));
}
