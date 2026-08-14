/* fold-lv5-vol1 へ「complex な模写 → 分解」でモチーフを作るバッチ
   （npx tsx scripts/seed-fold-lv5vol1-split.ts [--png <png>] [--limit N] [--write]）

   ■ なぜ作り直したか（2026-08-10・オーナー評）
   前バッチは P（主役）と Q（背景）を**別々に設計**して重ねた。結果:
     ・重ねる図形（Q）がどれも似た長方形＋桟になった
     ・「なぜその模様なのか」の法則性がない
   fold のデータモデルは **完成図 F ＝ P ∪ Q** なのだから、F を先に決めるのが素直。
   ここでは「6×6 の complex な模写を 1 枚描く」→「P と Q への分け方を全列挙して
   ゲートに通す」の順で作る。2 枚は"たまたま重なった別物"ではなく、
   **1 枚の模様を割った半身**になる＝法則性が F 側から自動的に効く。

   ■ 手順
   1. FIGURES に F を書く（織り・星形・格子・入れ子など、規則のある模様）
   2. mergedSegments(F) を P/Q に 2 分割する組み合わせを全列挙
      （|P|,|Q| とも 4〜8 本＝巻ゲート。連結性で早期に枝刈り）
   3. checkSeed（FOLD_LADDER ＋ gen/fold.ts 導出ゲート）＋ D 窓 40〜60 で濾す
   4. 残ったものを「2 枚それぞれが読めるか」で採点し、図ごとに best を 1 つ採る
   5. --png でコンタクトシート → 目視 → --write で status=pending 投入

   ■ 巻ゲート: 6×6・slopes any・requireNon45・絡み [3,10]・線 [4,8]/図
   ■ F 側: 非45° ≤3・交差 ≤12・成分 ≤2・ヒゲ ≤4・閉路 ≥1 */
import { promises as fs } from "fs";
import path from "path";
import {
  edgeKey, mirrorEdges, normalizeEdges, validateProblem,
  type CandidateFile, type EdgeT, type Problem, type ProblemMetrics,
} from "../app/products/problems/schema";
import { computeMetrics, interCrossings, mergedSegments } from "../app/products/problems/gen/metrics";
import { taskDifficulty, migrateProblem, foldFactor, foldInvariance } from "../app/products/problems/gen/difficulty";
import { shapeSignature, publishedCopySignatures } from "../app/products/problems/gen/dedupe";
import { FOLD_LADDER } from "../app/products/problems/gen/ladder";
import { parsePaths } from "../app/products/problems/gen/motif-shapes";
import { allVariants } from "../app/products/problems/gen/copy";
import { microShapes } from "../app/products/problems/gen/translate";
import { closedLoops, danglingCount, jaccard } from "../app/products/problems/gen/filters";
import { PUBLISHED } from "../app/products/problems/published";

const SKU = "fold-lv5-vol1";
const N = 6;
const D_LO = 40;
const D_HI = 60;
const CROSS_HI = 12;
const NON45_CAP_F = 3;
const DANGLING_MAX_F = 4;

/* ---- F（完成図）＝ 6×6 の complex な模写 ----
   狙いは「規則のある模様」。織り・星形・入れ子・格子・回転対称——どれも
   模写 Lv.5 の語彙で、分けたときに両半身が意味を持ちやすい。
   非45° は F 全体で 1〜3 本（requireNon45／上限3）。 */
type Figure = { label: string; category: string; paths: string[] };

/* F の設計則（2026-08-10・第3版＝数値仕様から逆算して組む）
   ■ 第1版（帯）＝問題1が全部同じ絵／第2版（ずらし配置）＝絡み不足／
     第2.5版（同心・8本）＝D不足。3 回とも「絵を先に決めて数字を後追い」した。
     今回は逆に、**D の式から必要量を割り出してから形を当てる**。

     D ＝ 折り係数×E(問題1) ＋ E(問題2) ＋ 2×絡み ＋ もつれ ＋ 盤面項(6)
     目標 45〜52 の配合:
       かたむいた層 E ≒ 17（非45° 3 本＝5 点×3 ＋ 45°と直交で 2 点）
       直交層 E ≒ 6（6 本）
       絡み 6〜8 → 12〜16
       もつれ 8（しきり 2 本が交差して +2、端の T 字合流 4 か所で +6）
       盤面 6
     ＝ 17＋6＋14＋8＋6 ＝ 51 … 8 本構成では E も もつれ も足りなかった理由がこれ。

   ■ 形の作り方
   ・かたむいた層＝**5 辺**（4 辺の四角だと非45°が必ず 4 本になって上限3超で死ぬ。
     1 辺を「直交＋45°」の 2 辺に割ると、ちょうど 3 本に収まる）
   ・直交層＝**閉じた形＋しきり**。しきりが T 字合流と交差を作る＝もつれの源。
   ・2 層は**同心**。かたむいた層の頂点が四方へ出っぱり、辺が直交層の辺を
     内側で横切る＝絡みが 6〜8 立つ。
   ・かたむいた層は 4 方位（そのまま／左右反転／上下反転／180°）で向きを変え、
     直交層は ますめ・かぎ形・かいだん形 で silhouette を変える。 */
const FIGURES: Figure[] = [
  {
    label: "かさなり（ごへんとますめ）", category: "かさなり",
    paths: ["2,0 5,2", "5,2 3,5", "3,5 2,5", "2,5 0,2", "0,2 2,0",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "1,2 4,2", "2,1 2,4"],
  },
  {
    label: "かさなり（ごへんとかぎ）", category: "かさなり",
    paths: ["2,0 5,2", "5,2 3,5", "3,5 2,5", "2,5 0,2", "0,2 2,0",
      "1,1 4,1", "4,1 4,3", "4,3 3,3", "3,3 3,4", "3,4 1,4", "1,4 1,1", "2,1 2,3"],
  },
  {
    label: "かさなり（ごへんとかいだん）", category: "かさなり",
    paths: ["2,0 5,2", "5,2 3,5", "3,5 2,5", "2,5 0,2", "0,2 2,0",
      "1,2 2,2", "2,2 2,1", "2,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,2", "1,3 4,3"],
  },
  {
    label: "かさなり（さかさのごへんとますめ）", category: "かさなり",
    paths: ["2,5 5,3", "5,3 3,0", "3,0 2,0", "2,0 0,3", "0,3 2,5",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "1,3 4,3", "3,1 3,4"],
  },
  {
    label: "かさなり（さかさのごへんとしきり）", category: "かさなり",
    paths: ["2,5 5,3", "5,3 3,0", "3,0 2,0", "2,0 0,3", "0,3 2,5",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "1,2 4,2", "1,3 4,3"],
  },
  {
    label: "かさなり（うらのごへんとますめ）", category: "かさなり",
    paths: ["3,0 0,2", "0,2 2,5", "2,5 3,5", "3,5 5,2", "5,2 3,0",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "1,2 4,2", "3,1 3,4"],
  },
  {
    label: "かさなり（うらのごへんとかぎ）", category: "かさなり",
    paths: ["3,0 0,2", "0,2 2,5", "2,5 3,5", "3,5 5,2", "5,2 3,0",
      "1,1 4,1", "4,1 4,3", "4,3 3,3", "3,3 3,4", "3,4 1,4", "1,4 1,1", "1,2 3,2"],
  },
  {
    label: "かさなり（まわしたごへんとますめ）", category: "かさなり",
    paths: ["3,5 0,3", "0,3 2,0", "2,0 3,0", "3,0 5,3", "5,3 3,5",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "1,2 4,2", "2,1 2,4"],
  },
  {
    label: "かさなり（まわしたごへんとかいだん）", category: "かさなり",
    paths: ["3,5 0,3", "0,3 2,0", "2,0 3,0", "3,0 5,3", "5,3 3,5",
      "1,2 2,2", "2,2 2,1", "2,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,2", "1,3 4,3"],
  },
  {
    label: "かさなり（まわしたごへんとたてしきり）", category: "かさなり",
    paths: ["3,5 0,3", "0,3 2,0", "2,0 3,0", "3,0 5,3", "5,3 3,5",
      "1,1 4,1", "4,1 4,4", "4,4 1,4", "1,4 1,1", "2,1 2,4", "3,1 3,4"],
  },
];

/* ---- 分割の列挙 ----
   F の「見た目の線分」を P と Q に振り分ける。|P|,|Q| とも 4〜8 本。
   組み合わせは 2^k だが、k は 6〜13 なので全列挙で足りる（最大 8192）。 */
function* splits(segCount: number) {
  for (let mask = 1; mask < (1 << segCount) - 1; mask++) {
    const q = [];
    for (let i = 0; i < segCount; i++) if (mask & (1 << i)) q.push(i);
    const pCount = segCount - q.length;
    if (q.length < 4 || q.length > 8 || pCount < 4 || pCount > 8) continue;
    yield q;
  }
}

function componentsOf(edges: EdgeT[]): number {
  if (edges.length === 0) return 0;
  const pk = (p: [number, number]) => `${p[0]},${p[1]}`;
  const parent = new Map<string, string>();
  const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; return r; };
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

function bounds(edges: EdgeT[]) {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const e of edges) for (const p of e) {
    cMin = Math.min(cMin, p[0]); cMax = Math.max(cMax, p[0]);
    rMin = Math.min(rMin, p[1]); rMax = Math.max(rMax, p[1]);
  }
  return { cMin, cMax, rMin, rMax };
}

function evalSplit(P: EdgeT[], Q: EdgeT[], F: EdgeT[]) {
  const errs: string[] = [];
  const lad = FOLD_LADDER[SKU];
  const mP = computeMetrics(P, N), mQ = computeMetrics(Q, N), mF = computeMetrics(F, N);
  for (const [name, part, m] of [["P", P, mP], ["Q", Q, mQ]] as const) {
    if (m.lines < lad.lines[0] || m.lines > lad.lines[1]) errs.push(`図${name}の線 ${m.lines}`);
    if (componentsOf(part) !== 1) errs.push(`図${name}が ${componentsOf(part)} つに分かれる`);
  }
  const b = bounds(F);
  if (b.cMax - b.cMin < N - 2 || b.rMax - b.rMin < N - 2) errs.push("ひろがり不足");
  if (mF.non45 > NON45_CAP_F) errs.push(`非45° ${mF.non45} 本`);
  if (lad.requireNon45 && mF.non45 < 1) errs.push("非45° なし");
  if (mF.crossings > CROSS_HI) errs.push(`交差 ${mF.crossings}`);
  if (danglingCount(F) > DANGLING_MAX_F) errs.push(`ヒゲ ${danglingCount(F)}`);
  if (closedLoops(F, mF.components) < 1) errs.push("閉路なし");
  const inter = interCrossings(P, Q);
  if (inter < lad.entangle[0] || inter > lad.entangle[1]) errs.push(`絡み ${inter}`);
  if (componentsOf(F) > 2) errs.push("完成図が 3 つ以上");

  const P1 = mirrorEdges(P, N, "v");
  const probe: Problem = {
    id: `${SKU}-probe`, grid: { type: "square", n: N }, edges: P1, inputB: Q,
    metrics: mF, answer: { mode: "explicit", edges: F }, gen: { kind: "manual" },
  };
  const d = taskDifficulty("fold", probe);
  if (d.value < D_LO) errs.push(`D=${d.value} < ${D_LO}`);
  if (d.value > D_HI) errs.push(`D=${d.value} > ${D_HI}`);
  errs.push(...validateProblem(probe));
  const r = foldInvariance(P1, N);
  return { errs, D: d.value, parts: d.parts, inter, r, kf: foldFactor(r), P1, mF, mP, mQ };
}

/* 「2 枚それぞれが読めるか」の採点。数値ゲートは足切りなので、ここで
   絵として選ぶ——ヒゲが少なく（＝閉じた形に近い）、両半身の本数が偏らず、
   折り退化が小さいものを上に持ってくる。 */
function score(P: EdgeT[], Q: EdgeT[], ev: ReturnType<typeof evalSplit>) {
  const hige = danglingCount(P) + danglingCount(Q);
  const loops = closedLoops(P, componentsOf(P)) + closedLoops(Q, componentsOf(Q));
  const balance = Math.abs(ev.mP.lines - ev.mQ.lines);
  return loops * 4 - hige * 2 - balance - ev.r * 5 + Math.min(ev.inter, 6) * 0.5;
}

/* ---- SVG 3 ペイン ---- */
function svgTriple(P1: EdgeT[], Q: EdgeT[], P: EdgeT[]): string {
  const cell = 24, pad = 12, size = (N - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  const dots: string[] = [];
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++)
    dots.push(`<circle cx="${px(c)}" cy="${px(r)}" r="2.2" fill="#b9b3a8"/>`);
  const line = (e: EdgeT, color: string, w: number) =>
    `<line x1="${px(e[0][0])}" y1="${px(e[0][1])}" x2="${px(e[1][0])}" y2="${px(e[1][1])}"`
    + ` stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  const board = (body: string) =>
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    + dots.join("") + body + "</svg>";
  return board(P1.map((e) => line(e, "#2b2925", 2.4)).join(""))
    + board(Q.map((e) => line(e, "#1a56a8", 2.4)).join(""))
    + board(P.map((e) => line(e, "#2b2925", 2.2)).join("") + Q.map((e) => line(e, "#1a56a8", 2.2)).join(""));
}

const CAND_DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");

async function main() {
  const write = process.argv.includes("--write");
  const pngIdx = process.argv.indexOf("--png");

  /* かぶり台帳 */
  const known = new Map<string, string>();
  for (const sig of publishedCopySignatures()) known.set(sig, "published:copy");
  for (const [sku, set] of Object.entries(PUBLISHED)) {
    if (!/^(overlay|decompose|fold)-/.test(sku)) continue;
    for (const p of set.problems) {
      if (p.grid.type !== "square") continue;
      known.set(shapeSignature(sku.startsWith("fold-") && p.answer?.mode === "explicit" ? p.answer.edges : p.edges), `published:${p.id}`);
    }
  }
  for (const f of (await fs.readdir(CAND_DIR)).filter((x) => /^(overlay|decompose|fold)-/.test(x))) {
    const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, f), "utf8"))) as CandidateFile;
    for (const c of file.candidates) {
      if (c.grid.type !== "square") continue;
      known.set(shapeSignature(file.sku.startsWith("fold-") && c.answer?.mode === "explicit" ? c.answer.edges : c.edges), `candidates:${c.id}`);
    }
  }
  for (const v of [...allVariants(), ...microShapes()]) {
    const sig = shapeSignature(v.edges);
    if (!known.has(sig)) known.set(sig, `library:${v.key}`);
  }

  type Row = { fig: Figure; P: EdgeT[]; Q: EdgeT[]; P1: EdgeT[]; F: EdgeT[]; ev: ReturnType<typeof evalSplit>; sc: number };
  const rows: Row[] = [];

  for (const fig of FIGURES) {
    const F = normalizeEdges(parsePaths(fig.paths));
    const segs = mergedSegments(F);
    const dup = known.get(shapeSignature(F));
    if (dup) { console.log(`SKIP ${fig.label}: 完成図が形かぶり → ${dup}`); continue; }
    const segEdges: EdgeT[][] = segs.map((s) => {
      const dc = s.b[0] - s.a[0], dr = s.b[1] - s.a[1];
      const g = Math.max(1, gcd(Math.abs(dc), Math.abs(dr)));
      const out: EdgeT[] = [];
      for (let i = 0; i < g; i++) {
        out.push([[s.a[0] + (dc / g) * i, s.a[1] + (dr / g) * i],
          [s.a[0] + (dc / g) * (i + 1), s.a[1] + (dr / g) * (i + 1)]] as EdgeT);
      }
      return out;
    });
    let best: Row | null = null;
    let tried = 0, passed = 0, connOk = 0;
    const tally = new Map<string, number>();
    for (const qIdx of splits(segs.length)) {
      tried++;
      const qs = new Set(qIdx);
      const Q = normalizeEdges(qIdx.flatMap((i) => segEdges[i]));
      const P = normalizeEdges(segEdges.filter((_, i) => !qs.has(i)).flat());
      if (componentsOf(P) !== 1 || componentsOf(Q) !== 1) continue;   // 早期枝刈り
      connOk++;
      const ev = evalSplit(P, Q, F);
      if (ev.errs.length > 0) {
        for (const e of ev.errs) {
          const k = e.replace(/[\d.]+/g, "N");
          tally.set(k, (tally.get(k) ?? 0) + 1);
        }
        continue;
      }
      passed++;
      /* バッチ内の重複ペナルティ。図ごとに独立で「いちばん良い分け方」を選ぶと、
         どの図でも同じ ますめ が問題2に選ばれて J=1.00（＝完全に同一）になる。
         オーナー評「重ねている図形がだいたい同じ」はここで起きていた。
         既に採った問題1・問題2 と似ているほど大きく減点し、別の分け方へ逃がす。 */
      let dup = 0;
      for (const r of rows) {
        dup = Math.max(dup, jaccard(r.Q, Q), jaccard(r.P, P), jaccard(r.Q, P), jaccard(r.P, Q));
      }
      const sc = score(P, Q, ev) - dup * 30;
      if (!best || sc > best.sc) best = { fig, P, Q, P1: ev.P1, F, ev, sc };
    }
    if (!best) {
      const mF = computeMetrics(F, N);
      const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([k, v]) => `${k}(${v})`).join(" / ");
      console.log(`NG   ${fig.label}: ${segs.length}本 試行${tried} 連結OK${connOk}`
        + `｜F: 非45°${mF.non45} 交差${mF.crossings} ヒゲ${danglingCount(F)}｜主因 ${top || "（連結する分け方が無い）"}`);
      continue;
    }
    console.log(`OK   ${fig.label}: 分け方 ${passed}/${tried} 通過 → 採用 P${best.ev.mP.lines}/Q${best.ev.mQ.lines}`
      + ` 絡み${best.ev.inter} D=${best.ev.D} r=${best.ev.r.toFixed(2)}`);
    rows.push(best);
  }
  console.log(`\n${rows.length}/${FIGURES.length} 図が成立  D=${rows.length ? Math.min(...rows.map((r) => r.ev.D)) : "-"}〜${rows.length ? Math.max(...rows.map((r) => r.ev.D)) : "-"}`);

  /* バッチ内の似すぎ検出（前バッチの反省＝背景が全部同じ問題） */
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const jq = jaccard(rows[i].Q, rows[j].Q);
    if (jq > 0.6) console.log(`⚠ 図${i + 1}と図${j + 1}の問題2が似ている J=${jq.toFixed(2)}`);
  }

  if (pngIdx >= 0) {
    const cols = 2, board = (N - 1) * 24 + 24;
    const cellW = 3 * board + 150, cellH = board + 44;
    const cells = rows.map((r, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const svgs = svgTriple(r.P1, r.Q, r.P).match(/<svg[\s\S]*?<\/svg>/g) ?? [];
      const g = svgs.map((s, k) =>
        `<g transform="translate(${k * (board + 34)},0)">${s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}`
        + `<rect x="0" y="0" width="${board}" height="${board}" fill="none" stroke="#e5e0d6"/></g>`).join("")
        + `<text x="${board + 3}" y="${board / 2 + 5}" font-size="12" font-family="sans-serif">→おる</text>`
        + `<text x="${2 * board + 40}" y="${board / 2 + 5}" font-size="15" font-family="sans-serif">＝</text>`;
      return `<g transform="translate(${x},${y})"><text x="8" y="18" font-size="14" font-family="sans-serif">#${i + 1} ${r.fig.label}  D=${r.ev.D} 絡み${r.ev.inter} r=${r.ev.r.toFixed(2)}</text><g transform="translate(8,26)">${g}</g></g>`;
    }).join("\n");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${Math.ceil(rows.length / cols) * cellH}" viewBox="0 0 ${cols * cellW} ${Math.ceil(rows.length / cols) * cellH}"><rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 110 }).png().toFile(process.argv[pngIdx + 1]);
    console.log(`png → ${process.argv[pngIdx + 1]}`);
  }

  if (!write || rows.length === 0) return;
  const today = new Date().toISOString().slice(0, 10);
  const file = JSON.parse(stripBom(await fs.readFile(path.join(CAND_DIR, `${SKU}.json`), "utf8"))) as CandidateFile;
  let maxM = file.candidates.reduce((mx, c) => Math.max(mx, parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10)), 0);
  for (const r of rows) {
    const base: Problem = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "square", n: N }, edges: r.P1, inputB: r.Q,
      answer: { mode: "explicit", edges: r.F }, metrics: r.ev.mF,
      provenance: { source: "blank", createdAt: today, label: r.fig.label },
      gen: { kind: "manual" },
    };
    const problem = migrateProblem("fold", base);
    file.candidates.push({ ...problem, status: "pending" });
    console.log(`write ${problem.id}  ${r.fig.label}`);
  }
  await fs.writeFile(path.join(CAND_DIR, `${SKU}.json`), JSON.stringify(file, null, 1), "utf8");
  console.log(`書き込み完了 → ${SKU}.json（${rows.length} 問）`);
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

main().catch((e) => { console.error(e); process.exit(1); });
