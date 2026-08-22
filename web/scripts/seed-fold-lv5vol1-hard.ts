/* fold-lv5-vol1（折り重ね Lv.5・6×6）へ D40〜60 のモチーフを投入するバッチ
   （npx tsx scripts/seed-fold-lv5vol1-hard.ts [--preview <html>] [--png <png>] [--write]）

   目的（2026-08-10）: オーナー評「折り重ね Lv.5 が全体的にイマイチ」。既存の
   自動生成候補（pending 29 問）を全削除したうえで、採用済み 5 問（D 26.6〜40.8）
   より上の帯＝**D 40〜60** を手設計で埋める。カテゴリ指定＝飲み物3・ロボット3・
   図形5・動物のシルエット3・家3・車3・果物3 の計 23 問。

   巻ゲート（ladder.json fold-lv5-vol1）:
     6×6・slopes any・requireNon45・絡み [3,10]・線 [4,8]/図
   完成図 F の導出ゲート（gen/fold.ts）: 非45° ≤3・交差 ≤12・成分 ≤2・ヒゲ ≤4・閉路 ≥1

   D 40〜60 を出す配合（この巻の実測）:
     D ＝ 折り係数×E(P) ＋ E(Q) ＋ 2×絡み ＋ もつれ ＋ ばらけ ＋ 盤面項(=6)
     盤面いっぱいに広げれば G は 6 で固定。残り 34〜54 を
     「非45°を 1〜2 本（1本 4〜5 点）」「絡み 4〜8（1つ 2 点）」
     「分岐（1 か所 1.5 点）」の 3 つで作る。線を増やすより非45°と絡みが効く。

   ★ 手設計は P（折ったあとの姿＝完成図の中で問題1が担う側）と Q で書く。
     問題1 は mirrorEdges(P, n, "v") で焼かれる。**P を左右対称にしないこと**
     （motif-craft §6.5・折る意味が消えて出題が退化する）。
   検証エラーが 1 つでもあれば --write は中断する。 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, mirrorEdges, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics, interCrossings } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem, foldFactor, foldInvariance } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { FOLD_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "fold-lv5-vol1";
const D_LO = 40;
const D_HI = 60;          // 両端とも含む（40 ≤ D ≤ 60）
const CROSS_HI = 12;      // 6×6 の F 交差上限（gen/overlay.ts copyParamsFor）
const NON45_CAP_F = 3;
const DANGLING_MAX_F = 4;
const DANGLING_MAX_PART = 2;

type Seed = {
  label: string; category: string;
  pathsP: string[];  // P＝折ったあとの姿（左右対称にしない）
  pathsQ: string[];  // Q＝問題2（=inputB）。--search で自動選定した結果をここへ焼き戻す
};

/* ---- Q（背景パターン）の候補ライブラリ ----
   手で Q を書くと、P ごとに「辺かぶり・絡み不足・D 不足」を人力で潰すことになり
   何周しても収束しない（実際 2 周した）。Q は**組み合わせで作れる**——わく＋内側の
   線だから、素直に列挙して P ごとに合うものを選ばせる。
   選定は checkSeed（本物のゲート）を通したうえで D が窓に入るものだけ。
   同じ Q に集中しないよう、使用回数の少ないものを優先する（--search）。 */
function qLibrary(): { key: string; paths: string[] }[] {
  const out: { key: string; paths: string[] }[] = [];
  /* わく＝盤面いっぱいのふち、は使わない。2 つの理由で絵を殺す:
     ①P を c1..4 の内側へ押し込むので、主役が小さな多角形になって名前を失う
     ②どの問題でも同じ青いわくが出るので、巻ぜんぶが同じ絵に見える（実測 J=0.86）
     かわりに**盤面の一部を占める「場面の部品」**（あしば・さく・たな・トンネル）に
     する。採用済みの m08 くるま（あしば）・m09 さかな（あみ）と同じ作り＝
     主役は盤面を広く使い、背景はその横／上にいる。 */
  const RECTS: Record<string, [number, number, number, number]> = {
    ひだりのあしば: [0, 2, 0, 5], みぎのあしば: [3, 5, 0, 5],
    うえのたな: [0, 5, 0, 2], したのたな: [0, 5, 3, 5],
    ひだりのとう: [0, 1, 0, 5], みぎのとう: [4, 5, 0, 5],
    みぎうえのまど: [3, 5, 0, 2], ひだりうえのまど: [0, 2, 0, 2],
    ひだりしたのまど: [0, 2, 3, 5], みぎしたのまど: [3, 5, 3, 5],
    まんなかのやぐら: [1, 4, 0, 5], よこながのたな: [0, 5, 1, 4],
  };
  /* 内側の線は、その部品の中を走る桟（はしごの段・あしばのすじかい）。
     ★ 盤面いっぱいに引かず、**その部品の枠の中だけ**に引く。理由は 2 つ:
       ①端が必ず枠の辺に乗るのでヒゲが増えない
       ②盤面を横断しないので、主役（P）の辺と重なる「辺かぶり」が激減する。
         盤面いっぱいの桟でやると、たてよこの辺を持つ絵（コップ・バス・ロボ）は
         どの Q とも辺かぶりして 1 つも通らなかった（実測 9/23 が該当なし）。 */
  const interiorsFor = (c0: number, c1: number, r0: number, r1: number) => {
    const out2: { key: string; paths: string[] }[] = [];
    void c0; void c1; void r0; void r1;
    /* 桟は盤面を横断させる。枠の中だけに閉じる案も試したが、候補が痩せて
       通過が 15→9 に落ちた（辺かぶりは減るが、絡みと D が足りなくなる）。
       横断させたうえで、辺かぶりする組み合わせは探索がはじく方が実測で強い。 */
    for (let r = 1; r <= 4; r++) out2.push({ key: `h${r}`, paths: [`0,${r} 5,${r}`] });
    for (let c = 1; c <= 4; c++) out2.push({ key: `v${c}`, paths: [`${c},0 ${c},5`] });
    return out2;
  };
  /* 内側の線は 1〜3 本。3 本まで許すのは D と絡みのため——2 本止まりだと
     この帯（40〜60）に届かない P が多く、探索が「該当なし」だらけになる。 */
  for (const [fk, [c0, c1, r0, r1]] of Object.entries(RECTS)) {
    const frame = [`${c0},${r0} ${c1},${r0}`, `${c1},${r0} ${c1},${r1}`,
      `${c0},${r1} ${c1},${r1}`, `${c0},${r0} ${c0},${r1}`];
    const ins = interiorsFor(c0, c1, r0, r1);
    const combos: { key: string; paths: string[] }[][] = [];
    for (let i = 0; i < ins.length; i++) {
      combos.push([ins[i]]);
      for (let j = i + 1; j < ins.length; j++) {
        combos.push([ins[i], ins[j]]);
        for (let k = j + 1; k < ins.length; k++) combos.push([ins[i], ins[j], ins[k]]);
      }
    }
    for (const picks of combos) {
      out.push({
        key: `${fk}+${picks.map((p) => p.key).join("+")}`,
        paths: [...frame, ...picks.flatMap((p) => p.paths)],
      });
    }
  }
  return out;
}

/* 設計の骨格（この巻で D40〜60 を出すための配合）
   P＝主役。**盤面の左右どちらかへ寄せる**（中央対称だと折り退化 r が跳ね上がる）。
     閉じた形＋非45° を 1〜2 本（1 本 4〜5 点＝E の最大レバー）。
   Q＝背景パターン。**わく（盤面のふち）＋内側の線**が効く——内側の線の端が
     ふちに乗るのでヒゲが 0 になり、かつ Q 自身の交差・分岐が「もつれ」を稼ぐ。
     もつれは実測でこの帯の 1/4〜1/3 を占める（分岐 1 か所 1.5・交差 1 か所 2）。
   絡みは Q の内側の線が P の閉じた形を貫くたびに増える（1 つ 2 点）。 */
const SEEDS: Seed[] = [
  /* P の設計則（2026-08-10・絵を優先へ方針転換したあと）
     ①**まず名前の言える形に描く**。左右対称でよい——対称を崩すために
       かたむけると、シルエットが壊れて「いびつな多角形」になる（1 周目の失敗）。
       折る意味の減衰は D の折り係数が引き受ける。
     ②非45° を 1〜3 本入れる（requireNon45）。かた・やね・フロントガラス・
       すぼまりなど、**その物にもともとある斜め**を使えば絵をこわさない。
     ③盤面を広く使う。c1..4 に押し込むと主役が小さくなって名前を失う。
     Q（背景）は --search がライブラリから選ぶので手で書かない。 */

  /* ===== 飲み物 ×3 ===== */
  {
    label: "のみもの（ストローのグラス）", category: "のみもの",
    // まっすぐなグラス＋のみものの線＋ななめのストロー
    pathsP: ["1,1 4,1", "1,1 2,5", "4,1 3,5", "2,5 3,5", "1,2 4,2", "3,1 5,0"],
    pathsQ: [],
  },
  {
    label: "のみもの（とってのマグ）", category: "のみもの",
    // マグ＋右のとって（とってがあるので左右非対称）
    pathsP: ["1,1 4,1", "1,1 2,4", "4,1 3,4", "2,4 3,4", "4,2 5,1", "5,1 5,3", "5,3 4,3"],
    pathsQ: [],
  },
  {
    label: "のみもの（ジュースのびん）", category: "のみもの",
    // くび・かた（ななめ）・どうのびん
    pathsP: ["2,0 3,0", "2,0 2,1", "3,0 3,1", "2,1 1,3", "3,1 4,3", "1,3 2,5", "4,3 3,5", "2,5 3,5"],
    pathsQ: [],
  },

  /* ===== ロボット ×3 ===== */
  {
    label: "ロボット（はこロボ）", category: "ロボット",
    // あたま・どう・2ほんのあし＋ななめのうで
    pathsP: ["1,1 4,1", "1,1 1,3", "4,1 4,3", "1,3 4,3", "2,3 2,5", "3,3 3,5", "2,1 2,0", "4,2 5,0"],
    pathsQ: [],
  },
  {
    label: "ロボット（アームロボ）", category: "ロボット",
    // どう＋あし＋ななめにのびるアーム
    pathsP: ["1,2 4,2", "1,2 1,4", "4,2 4,4", "1,4 4,4", "2,4 2,5", "3,4 3,5", "2,2 2,1", "1,2 0,0"],
    pathsQ: [],
  },
  {
    label: "ロボット（キャタピラロボ）", category: "ロボット",
    // 上はんしん＋台形のキャタピラ
    pathsP: ["1,1 4,1", "1,1 1,3", "4,1 4,3", "1,3 4,3", "0,5 2,3", "0,5 5,5", "5,5 4,3", "2,1 2,0"],
    pathsQ: [],
  },

  /* ===== 図形 ×5 ===== */
  {
    label: "かたち（ろっかっけい）", category: "かたち",
    pathsP: ["1,1 4,1", "4,1 5,3", "5,3 3,5", "3,5 1,5", "1,5 0,3", "0,3 1,1"],
    pathsQ: [],
  },
  {
    label: "かたち（ごかっけい）", category: "かたち",
    pathsP: ["2,0 4,1", "4,1 4,4", "4,4 1,5", "1,5 0,2", "0,2 2,0"],
    pathsQ: [],
  },
  {
    label: "かたち（やじるし）", category: "かたち",
    // 右をむいた矢印（先が非45°）
    pathsP: ["0,2 3,2", "3,2 3,0", "3,0 5,3", "5,3 3,5", "3,5 3,4", "3,4 0,4", "0,4 0,2"],
    pathsQ: [],
  },
  {
    label: "かたち（いえがた）", category: "かたち",
    // 五角形（やねが非45°）
    pathsP: ["0,2 2,0", "2,0 5,2", "5,2 5,5", "5,5 0,5", "0,5 0,2"],
    pathsQ: [],
  },
  {
    label: "かたち（はちかっけい）", category: "かたち",
    // 角を落とした八角形
    pathsP: ["1,0 4,0", "4,0 5,1", "5,1 5,4", "5,4 4,5", "4,5 1,5", "1,5 0,3", "0,3 0,2", "0,2 1,0"],
    pathsQ: [],
  },

  /* ===== 動物のシルエット ×3 ===== */
  {
    label: "どうぶつ（いぬ）", category: "どうぶつ",
    // からだ・4ほんのあし・あたま・しっぽ
    pathsP: ["1,2 4,2", "1,2 1,4", "4,2 4,4", "1,4 4,4", "4,2 5,0", "1,2 0,1", "2,4 2,5", "4,4 4,5"],
    pathsQ: [],
  },
  {
    label: "どうぶつ（とり）", category: "どうぶつ",
    // つばさをひろげたとり
    pathsP: ["0,1 2,3", "2,3 3,3", "3,3 5,1", "5,1 4,4", "4,4 1,4", "1,4 0,1", "2,3 2,5"],
    pathsQ: [],
  },
  {
    label: "どうぶつ（くじら）", category: "どうぶつ",
    // まるいからだ＋おびれ＋しおふき
    pathsP: ["0,3 2,1", "2,1 4,1", "4,1 5,3", "5,3 4,5", "4,5 1,5", "1,5 0,3", "3,1 3,0"],
    pathsQ: [],
  },

  /* ===== 家 ×3 ===== */
  {
    label: "いえ（とんがりやねのいえ）", category: "いえ",
    // やねが非45°・とびら・まど
    pathsP: ["0,3 2,0", "2,0 5,3", "0,3 0,5", "5,3 5,5", "0,5 5,5", "2,5 2,4", "2,4 3,4", "3,4 3,5"],
    pathsQ: [],
  },
  {
    label: "いえ（えんとつのいえ）", category: "いえ",
    // 三角やね＋右のえんとつ
    pathsP: ["0,3 2,1", "2,1 5,3", "0,3 0,5", "5,3 5,5", "0,5 5,5", "1,2 1,0", "2,5 2,4"],
    pathsQ: [],
  },
  {
    label: "いえ（かたながれやねのいえ）", category: "いえ",
    // 片ながれのやね（左右非対称）＋まど
    pathsP: ["0,4 4,1", "4,1 4,5", "0,4 0,5", "0,5 4,5", "1,5 1,4", "1,4 2,4", "2,4 2,5"],
    pathsQ: [],
  },

  /* ===== 車 ×3 ===== */
  {
    label: "くるま（トラック）", category: "くるま",
    // にだい＋うんてんせき（まえがななめ）＋タイヤ
    pathsP: ["0,1 3,1", "0,1 0,4", "3,1 3,2", "3,2 4,2", "4,2 5,4", "0,4 5,4", "1,4 1,5", "4,4 4,5"],
    pathsQ: [],
  },
  {
    label: "くるま（じょうようしゃ）", category: "くるま",
    // ボンネットとルーフ（フロントガラスがななめ）＋タイヤ
    pathsP: ["0,3 1,3", "1,3 2,1", "2,1 4,1", "4,1 5,3", "0,3 5,3", "1,3 1,4", "4,3 4,4"],
    pathsQ: [],
  },
  {
    label: "くるま（バス）", category: "くるま",
    // ながいしゃたい＋まど＋タイヤ
    pathsP: ["0,1 4,1", "4,1 5,3", "0,1 0,4", "5,3 5,4", "0,4 5,4", "1,1 1,2", "1,4 1,5", "4,4 4,5"],
    pathsQ: [],
  },

  /* ===== 果物 ×3 ===== */
  {
    label: "くだもの（りんご）", category: "くだもの",
    // まるいみ＋へた＋は
    pathsP: ["1,3 2,1", "2,1 3,1", "3,1 4,3", "4,3 3,5", "3,5 2,5", "2,5 1,4", "1,4 1,3", "2,1 2,0"],
    pathsQ: [],
  },
  {
    label: "くだもの（なし）", category: "くだもの",
    // 上がほそく下がふくらむみ＋え
    pathsP: ["2,1 3,1", "3,1 4,3", "4,3 4,4", "4,4 1,4", "1,4 1,3", "1,3 2,1", "2,1 2,0"],
    pathsQ: [],
  },
  {
    label: "くだもの（さくらんぼ）", category: "くだもの",
    // ふたつのみ＋えだ
    pathsP: ["1,3 2,2", "2,2 3,3", "3,3 2,4", "2,4 1,3", "3,3 5,4", "5,4 4,2", "4,2 3,3", "2,2 2,0"],
    pathsQ: [],
  },
];

/* ---- ヘルパ（seed-fold-motifs.ts と同じ） ---- */
function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

function componentsOf(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const pk = (p: [number, number]) => `${p[0]},${p[1]}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const e of edges) {
    const a = pk(e[0]), b = pk(e[1]);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const roots = new Set<string>();
  for (const k of parent.keys()) roots.add(find(k));
  return roots.size;
}

function checkSeed(
  P: EdgeT[], Q: EdgeT[], F: EdgeT[],
  mP: ProblemMetrics, mQ: ProblemMetrics, mF: ProblemMetrics, D: number,
): string[] {
  const p = FOLD_LADDER[SKU];
  const errs: string[] = [];
  if (!p) return [`FOLD_LADDER に ${SKU} が無い`];
  const n = p.grid;

  for (const [name, part, m] of [["P", P, mP], ["Q", Q, mQ]] as const) {
    if (m.lines < p.lines[0] || m.lines > p.lines[1])
      errs.push(`図${name}: 線 ${m.lines} 本が窓 [${p.lines[0]}, ${p.lines[1]}] の外`);
    if (componentsOf(part) !== 1) errs.push(`図${name}: かたちが ${componentsOf(part)} つ（カードは 1 つながり）`);
  }

  const pKeys = new Set(P.map(edgeKey));
  for (const e of Q) if (pKeys.has(edgeKey(e))) errs.push(`P・Q が辺を共有: ${edgeKey(e)}`);

  const b = bounds(F);
  if (b.cMin < 0 || b.rMin < 0 || b.cMax > n - 1 || b.rMax > n - 1) errs.push(`盤面外（grid ${n}）`);
  if (b.cMax - b.cMin < n - 2 || b.rMax - b.rMin < n - 2)
    errs.push(`ひろがり不足 span ${b.cMax - b.cMin}×${b.rMax - b.rMin}（bbox ≥ ${n - 2}）`);
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本が上限 ${NON45_CAP_F} 超`);
  if (p.requireNon45 && mF.non45 < 1) errs.push("非45° が 1 本もない（requireNon45）");
  if (mF.crossings > CROSS_HI) errs.push(`交差 ${mF.crossings} か所が上限 ${CROSS_HI} 超`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)} 本が上限 ${DANGLING_MAX_F} 超`);
  if (closedLoops(F, mF.components) < 1) errs.push("閉路なし（閉じた骨格が必要）");

  const inter = interCrossings(P, Q);
  if (inter < p.entangle[0] || inter > p.entangle[1])
    errs.push(`絡み ${inter} が窓 [${p.entangle[0]}, ${p.entangle[1]}] の外`);
  const comps = componentsOf(F);
  if (comps > 2) errs.push(`完成図が ${comps} つに分かれている（≤2）`);
  if (inter === 0 && comps !== 1) errs.push("絡み 0 なのに P と Q が接していない（離れ小島）");

  if (D < D_LO) errs.push(`D=${D} が下限 ${D_LO} 未満`);
  if (D > D_HI) errs.push(`D=${D} が上限 ${D_HI} 超`);
  return errs;
}

/* 1 案（P と Q の組）をゲートに通す。--search と本検証の両方がここを使う＝
   「探索は通ったのに本番で落ちる」を作らない。dedupe だけは呼び出し側の責任。 */
function evalPair(pathsP: string[], pathsQ: string[], n: (typeof FOLD_LADDER)[string]["grid"]) {
  const P = normalizeEdges(parsePaths(pathsP));
  const Q = normalizeEdges(parsePaths(pathsQ));
  const F = normalizeEdges([...P, ...Q]);
  const P1 = mirrorEdges(P, n, "v");
  const mP = computeMetrics(P, n);
  const mQ = computeMetrics(Q, n);
  const mF = computeMetrics(F, n);
  const probe: Problem = {
    id: `${SKU}-probe`, grid: { type: "square", n }, edges: P1, inputB: Q,
    metrics: mF, answer: { mode: "explicit", edges: F }, gen: { kind: "manual" },
  };
  const d = taskDifficulty("fold", probe);
  const r = foldInvariance(P1, n);
  const errs = [
    ...checkSeed(P, Q, F, mP, mQ, mF, d.value),
    ...validateProblem(probe),
    ...validateProblem({ ...probe, id: `${SKU}-probeF`, edges: F }),
  ];
  /* 折り退化 r は**落とさず通す**（2026-08-10 オーナー判断＝絵を優先）。
     コップ・いえ・りんご・くるまは本来どれも左右対称で、対称を崩すと
     シルエットが壊れて「名前の言えない多角形」になる（1 周目の実測）。
     r を厳しく縛ると絵が死ぬので、折る意味の減衰は D 側の折り係数
     （1−0.4r）に任せ、最終判断はオーナーの検品に委ねる。
     他巻の採用実績も r=1.00 を含む（fold-lv2 はな／lv3 いえ・かさ／lv4 ぞう）。 */
  return { P, Q, F, P1, mF, D: d.value, parts: d.parts, inter: interCrossings(P, Q), r, kf: foldFactor(r), errs, probe };
}

/* ---- SVG 3 ペイン（問題1 →おる 問題2 ＝ F）---- */
function svgTriple(P1: EdgeT[], Q: EdgeT[], P: EdgeT[], n: number): string {
  const cell = 24, pad = 12, size = (n - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < n; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.2" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  const board = (body: string) =>
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + body + "</svg>";
  const pane1 = board(P1.map((e) => line(e, "#2b2925", 2.4)).join(""));
  const pane2 = board(Q.map((e) => line(e, "#1a56a8", 2.4)).join(""));
  const paneF = board(
    P.map((e) => line(e, "#2b2925", 2.2)).join("") + Q.map((e) => line(e, "#1a56a8", 2.2)).join(""));
  return `<div class="pair">${pane1}<span class="op">→おる</span>${pane2}<span class="op">＝</span>${paneF}</div>`;
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

async function main() {
  const write = process.argv.includes("--write");
  const pvIdx = process.argv.indexOf("--preview");
  const previewPath = pvIdx >= 0 ? process.argv[pvIdx + 1] : null;
  const n = FOLD_LADDER[SKU].grid;

  /* ---- かぶり台帳 ---- */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!sku.startsWith("overlay-") && !sku.startsWith("decompose-") && !sku.startsWith("fold-")) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      const F = sku.startsWith("fold-") && p.answer?.mode === "explicit" ? p.answer.edges : p.edges;
      known.set(shapeSignature(F), `published:${p.id}`);
    }
  }
  const allCandFiles = (await fs.readdir(CAND_DIR)).filter((f) => f.endsWith(".json"));
  const liveSame: EdgeT[][] = [];
  for (const f of allCandFiles.filter((x) => x.startsWith("overlay-") || x.startsWith("decompose-") || x.startsWith("fold-"))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.grid.type !== "square") continue;
      const F = file.sku.startsWith("fold-") && c.answer?.mode === "explicit" ? c.answer.edges : c.edges;
      known.set(shapeSignature(F), `candidates:${c.id}(${c.status})`);
      if (file.sku === SKU && c.status !== "rejected") liveSame.push(F);
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }

  /* ---- 検証 ---- */
  type Row = {
    seed: Seed; P: EdgeT[]; Q: EdgeT[]; P1: EdgeT[]; F: EdgeT[];
    m: ProblemMetrics; D: number; inter: number; kf: number;
    parts: Record<string, number>; errs: string[]; warns: string[];
  };
  const rows: Row[] = [];
  const seenSelf = new Map<string, string>();

  /* ---- Q の自動選定（--search）----
     P（主役）は手設計のまま、Q（背景パターン）だけライブラリから選ぶ。ゲートは
     本検証と同じ evalPair を使う。同じ Q に集中しないよう使用回数の少ないものを
     優先し、同点なら D が帯の中央（50）に近いものを採る。 */
  const searching = process.argv.includes("--search");
  if (searching) {
    const lib = qLibrary();
    const used = new Map<string, number>();
    for (const seed of SEEDS) {
      const cands = lib
        .map((q) => ({ q, ev: evalPair(seed.pathsP, q.paths, n) }))
        .filter((x) => x.ev.errs.length === 0);
      if (cands.length === 0) {
        /* どの Q でも通らない＝P 側の問題。P 単体の素性と、ライブラリ全体で
           いちばん多く出た阻害理由を出す＝P を直す手がかりにする。 */
        const all = lib.map((q) => evalPair(seed.pathsP, q.paths, n));
        const tally = new Map<string, number>();
        for (const ev of all) {
          for (const e of ev.errs) {
            const kind = e.replace(/[\d.]+/g, "N").replace(/: .*$/, "");
            tally.set(kind, (tally.get(kind) ?? 0) + 1);
          }
        }
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const mp = computeMetrics(normalizeEdges(parsePaths(seed.pathsP)), n);
        const rP = foldInvariance(mirrorEdges(normalizeEdges(parsePaths(seed.pathsP)), n, "v"), n);
        const bestD = Math.max(...all.map((a) => a.D));
        console.log(`  探索: ${seed.label} → 該当なし`
          + `｜P: 線${mp.lines} 非45°${mp.non45} r=${rP.toFixed(2)} 最良D=${bestD}`
          + `｜主因 ${top.map(([k, v]) => `${k}(${v})`).join(" / ")}`);
        continue;
      }
      cands.sort((a, b) =>
        (used.get(a.q.key) ?? 0) - (used.get(b.q.key) ?? 0)
        || Math.abs(a.ev.D - 50) - Math.abs(b.ev.D - 50));
      const best = cands[0];
      used.set(best.q.key, (used.get(best.q.key) ?? 0) + 1);
      seed.pathsQ = best.q.paths;
      console.log(`  探索: ${seed.label} → ${best.q.key}（D=${best.ev.D}・絡み${best.ev.inter}・候補${cands.length}）`);
    }
    console.log("");
  }

  for (const seed of SEEDS) {
    const warns: string[] = [];
    const ev = evalPair(seed.pathsP, seed.pathsQ, n);
    const { P, Q, F, P1, mF, D, inter, kf, r } = ev;
    const errs = [...ev.errs];
    const d = { parts: ev.parts };
    if (r > 0 && r <= 0.34) warns.push(`折り係数 ${kf}（r=${r.toFixed(2)}・採用実績の範囲内）`);
    for (const [name, part] of [["P", P], ["Q", Q]] as const) {
      const hige = danglingCount(part as EdgeT[]);
      if (hige > DANGLING_MAX_PART) warns.push(`図${name} 単体のヒゲ ${hige} 本（目視で散らばりを確認）`);
    }

    const sig = shapeSignature(F);
    const dup = known.get(sig);
    if (dup) errs.push(`形かぶり → ${dup}`);
    const selfDup = seenSelf.get(sig);
    if (selfDup) errs.push(`バッチ内かぶり → ${selfDup}`);
    seenSelf.set(sig, seed.label);
    for (const other of liveSame) {
      const j = jaccard(other, F);
      if (j > 0.6) warns.push(`同巻の既存候補と類似 J=${j.toFixed(2)}`);
    }
    for (const r of rows) {
      const j = jaccard(r.F, F);
      if (j > 0.6) warns.push(`バッチ内で類似 J=${j.toFixed(2)}（${r.seed.label}）`);
    }

    rows.push({ seed, P, Q, P1, F, m: mF, D, inter, kf, parts: d.parts, errs, warns });
  }

  /* ---- レポート ---- */
  let failed = 0;
  console.log(`===== ${SKU}（D ${D_LO}〜${D_HI}）=====`);
  for (const r of rows) {
    const status = r.errs.length === 0 ? "OK " : "NG ";
    if (r.errs.length > 0) failed++;
    const mP = computeMetrics(r.P, n), mQ = computeMetrics(r.Q, n);
    console.log(
      `${status}${r.seed.label}`
      + `  P:線${mP.lines}/E${r.parts.A ?? "-"} Q:線${mQ.lines}/E${r.parts.B ?? "-"}`
      + ` 絡み${r.inter} もつれ${r.parts["もつれ"] ?? 0} 交差${r.m.crossings} 非45°${r.m.non45}`
      + ` ヒゲ${danglingCount(r.F)} D=${r.D}`,
    );
    for (const e of r.errs) console.log(`   ✗ ${e}`);
    for (const w of r.warns) console.log(`   ⚠ ${w}`);
  }
  const ds = rows.map((r) => r.D);
  console.log(`\n${rows.length - failed}/${rows.length} 通過${failed ? `（NG ${failed}）` : ""}`
    + `  D=${Math.min(...ds)}〜${Math.max(...ds)}`);

  /* ---- プレビュー HTML ---- */
  if (previewPath) {
    const cards = rows.map((r, i) => {
      const badge = r.errs.length === 0 ? "#2e7d32" : "#c62828";
      const notes = [...r.errs.map((e) => `✗ ${e}`), ...r.warns.map((w) => `⚠ ${w}`)].join("<br>");
      return `<div class="card">
  <div class="head"><b>#${i + 1} ${r.seed.label}</b><span class="cat">${r.seed.category}</span></div>
  ${svgTriple(r.P1, r.Q, r.P, n)}
  <div class="meta">D=${r.D}・絡み${r.inter}・交差${r.m.crossings}・非45° ${r.m.non45}</div>
  <div class="note" style="color:${badge}">${notes || "OK"}</div>
</div>`;
    }).join("\n");
    await fs.writeFile(previewPath, `<!doctype html><meta charset="utf-8"><title>fold Lv.5 モチーフ</title>
<style>
body{font-family:sans-serif;background:#faf8f4;margin:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.cat{font-size:12px;color:#888;white-space:nowrap}
.pair{display:flex;gap:6px;justify-content:center;align-items:center;margin:6px 0}
.op{font-size:13px;color:#666;white-space:nowrap}
.meta{font-size:12px;color:#444;margin-top:6px}
.note{font-size:12px;margin-top:4px}
svg{background:#fffdf9;border:1px dashed #eee}
</style>
<h1>fold-lv5-vol1 モチーフ（${rows.length}問・D${D_LO}〜${D_HI}）</h1>
<p style="font-size:13px;color:#666">問題1（黒）→おる 問題2（青）＝ 完成図</p><div class="grid">${cards}</div>`, "utf8");
    console.log(`preview → ${previewPath}`);
  }

  /* ---- コンタクトシート PNG（--png <path>） ---- */
  const pngIdx = process.argv.indexOf("--png");
  if (pngIdx >= 0) {
    const pngPath = process.argv[pngIdx + 1];
    const cols = 2;
    const board = (n - 1) * 24 + 24;
    const cellW = 3 * board + 150, cellH = board + 44;
    const rowsN = Math.ceil(rows.length / cols);
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const inner = svgTriple(r.P1, r.Q, r.P, n).replace(/<div class="pair">/, "").replace(/<\/div>$/, "");
      const svgs = inner.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 34)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("")
        + `<text x="${board + 3}" y="${board / 2 + 5}" font-size="12" font-family="sans-serif">→おる</text>`
        + `<text x="${2 * board + 40}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">＝</text>`;
      return `<g transform="translate(${x},${y})">
<text x="8" y="18" font-size="14" font-family="sans-serif">#${i + 1} ${r.seed.label}  D=${r.D} 絡み${r.inter}${r.errs.length ? "  ✗NG" : ""}</text>
<g transform="translate(8,26)">${g}</g>
</g>`;
    }).join("\n");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rowsN * cellH}" viewBox="0 0 ${cols * cellW} ${rowsN * cellH}"><rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 110 }).png().toFile(pngPath);
    console.log(`png → ${pngPath}`);
  }

  /* ---- 書き込み ---- */
  if (!write) return;
  /* 部分投入（2026-08-10 オーナー判断）: 通過ぶんだけ先に入れて検品を回し、
     採否の傾向を見てから残りを作る。NG は**黙って落とさず**名前を出す。 */
  const okRows = rows.filter((r) => r.errs.length === 0);
  if (okRows.length === 0) {
    console.error("通過が 0 件のため中断");
    process.exitCode = 1;
    return;
  }
  if (failed > 0) {
    console.log(`\n※ NG ${failed} 問は投入しない: ${rows.filter((r) => r.errs.length > 0).map((r) => r.seed.label).join("・")}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${SKU}.json`), "utf8"))) as CandidateFile;
  let maxM = file.candidates.reduce((mx, c) => {
    const k = parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(mx, k);
  }, 0);
  for (const r of okRows) {
    const base: Problem = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "square", n },
      edges: r.P1,
      inputB: r.Q,
      answer: { mode: "explicit", edges: r.F },
      metrics: r.m,
      provenance: { source: "blank", createdAt: today, label: r.seed.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("fold", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.seed.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log(`書き込み完了 → ${SKU}.json（${okRows.length} 問）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
