/* 立体 Lv.5 Vol.2 へ 三角錐・五角錐 を投入する
   （npx tsx scripts/seed-solid-lv5vol2-pyramids.ts [--png <png>] [--write]）

   ■ 経緯（2026-08-10・オーナー指示「四角錐しかない」）
   Vol.2 の錐は 四角錐（m01/m02/m03）だけ。三角錐と五角錐を 2 つずつ足す。

   ■ 隠れ線は推測しない——背面カリングで厳密に出す
   錐は**凸多面体**なので、面の法線が視線を向いているかどうかで可視が一意に決まる。
     ・投影（キャビネット図）: c = C0 + x + y,  r = R0 − (z + y)
       ＝ gen/solid.ts:769 の `sc2=x+y, su2=z+y` と同じ規約
     ・同じ画面点へ潰れる方向は (Δx,Δy,Δz)=(−1,+1,−1)＝視線。
       よって**手前向き** v = (1,−1,1)
     ・面が見える ⇔ 外向き法線 n に対して n·v > 0
     ・辺が見える ⇔ 隣接する 2 面のどちらかが見える。見えなければ点線
   この判定は既存の 四角錐 m01 の実データ（実線5本／点線3本）と**完全に一致**する
   ことを確認済み。だから幾何の推測ではなく、規約どおりの再現になっている。

   ■ 底面は地面（z=0）の凸多角形、頂点は (x,y,z)。9×9 に収まるよう中央へ寄せる。 */
import { promises as fs } from "fs";
import path from "path";
import type { CandidateFile, Problem, SolidEdge, SolidPoint } from "../app/products/problems/schema";
import { normalizeSolidEdges } from "../app/products/problems/schema";
import { computeSolidMetrics } from "../app/products/problems/gen/metrics";
import { taskDifficulty } from "../app/products/problems/gen/difficulty";

const SKU = "solid-lv5-vol2";
const N = 9;
const DIR = path.join(process.cwd(), "app", "products", "problems", "candidates");
const stripBom = (s: string) => s.replace(/^﻿/, "");
type Cand = Problem & { status: string };
type V3 = [number, number, number];

/* 底面（地面 z=0 の凸多角形・反時計回り）と頂点。単位は 1 マス。 */
type Pyramid = { label: string; base: [number, number][]; apex: V3 };

const PYRAMIDS: Pyramid[] = [
  {
    label: "三角錐（ひろい底）",
    base: [[0, 0], [5, 0], [2, 3]],
    apex: [2, 1, 5],
  },
  {
    /* もう 1 つの三角錐は**構えを変える**。上の「ひろい底」は奥に頂点が 1 つ来る
       構えで、隠れるのは奥へ向かう底辺 1 本だけ。こちらは奥に**辺**が来る構えに
       して、隠れ方そのものを別にする（同じ形の大小違いにしない）。 */
    label: "三角錐（おくが辺）",
    base: [[0, 2], [3, 0], [5, 2]],
    apex: [3, 1, 6],
  },
  {
    label: "五角錐（ごかくの底）",
    base: [[1, 0], [4, 0], [5, 2], [3, 4], [0, 2]],
    apex: [2, 2, 5],
  },
  {
    label: "五角錐（ほそながい底）",
    base: [[1, 0], [4, 0], [5, 3], [2, 4], [0, 2]],
    apex: [2, 2, 6],
  },
];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const TOWARD: V3 = [1, -1, 1];   // 手前向き（視線の逆）

/* 錐 → 画面上の辺（style つき）。C0/R0 は後で中央寄せするので仮置き。 */
function buildPyramid(p: Pyramid): { edges: SolidEdge[]; faces: number; hidden: number } {
  const n = p.base.length;
  const V: V3[] = [...p.base.map(([x, y]) => [x, y, 0] as V3), p.apex];
  const A = n;                                    // 頂点(apex)のインデックス

  /* 面: 底面（0..n-1）＋側面 n 枚（i, i+1, apex） */
  type Face = { vs: number[]; visible: boolean };
  const faces: Face[] = [];
  {
    // 底面は下向き＝外向き法線 (0,0,-1)
    faces.push({ vs: [...Array(n).keys()], visible: dot([0, 0, -1], TOWARD) > 0 });
  }
  for (let i = 0; i < n; i++) {
    const a = i, b = (i + 1) % n;
    // 外向き法線: 底面が反時計回りなら (Vb-Va)×(Vapex-Va) が外を向く
    const nrm = cross(sub(V[b], V[a]), sub(V[A], V[a]));
    faces.push({ vs: [a, b, A], visible: dot(nrm, TOWARD) > 0 });
  }

  /* 辺 → 隣接面。見える面が 1 つでもあれば実線、なければ点線 */
  const key = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("-");
  const adj = new Map<string, boolean>();     // key → いずれかの面が見えるか
  const mark = (a: number, b: number, vis: boolean) => {
    adj.set(key(a, b), (adj.get(key(a, b)) ?? false) || vis);
  };
  for (const f of faces) {
    for (let i = 0; i < f.vs.length; i++) mark(f.vs[i], f.vs[(i + 1) % f.vs.length], f.visible);
  }

  const proj = (v: V3): SolidPoint => ({ c: v[0] + v[1], r: -(v[2] + v[1]) });
  const edges: SolidEdge[] = [];
  let hidden = 0;
  for (const [k, vis] of adj) {
    const [a, b] = k.split("-").map(Number);
    if (!vis) hidden++;
    edges.push({ a: proj(V[a]), b: proj(V[b]), style: vis ? "solid" : "dashed" });
  }
  return { edges, faces: faces.length, hidden };
}

/* 9×9 の中央へ寄せる */
function fit(es: SolidEdge[]): SolidEdge[] | null {
  let cMin = Infinity, cMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const s of es) for (const p of [s.a, s.b]) {
    cMin = Math.min(cMin, p.c); cMax = Math.max(cMax, p.c);
    rMin = Math.min(rMin, p.r); rMax = Math.max(rMax, p.r);
  }
  const w = cMax - cMin + 1, h = rMax - rMin + 1;
  if (w > N || h > N) return null;
  const dc = Math.floor((N - w) / 2) - cMin, dr = Math.floor((N - h) / 2) - rMin;
  return es.map((s) => ({ ...s, a: { c: s.a.c + dc, r: s.a.r + dr }, b: { c: s.b.c + dc, r: s.b.r + dr } }));
}

function svg(es: SolidEdge[]): string {
  const cell = 26, pad = 14, size = (N - 1) * cell + pad * 2;
  const px = (v: number) => pad + v * cell;
  let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  for (let c = 0; c < N; c++) for (let r = 0; r < N; r++)
    s += `<circle cx="${px(c)}" cy="${px(r)}" r="2.2" fill="#b9b3a8"/>`;
  for (const e of es) {
    s += `<line x1="${px(e.a.c)}" y1="${px(e.a.r)}" x2="${px(e.b.c)}" y2="${px(e.b.r)}" stroke="#2b2925"`
      + ` stroke-width="${e.style === "dashed" ? 1.6 : 2.4}"${e.style === "dashed" ? ' stroke-dasharray="4 3"' : ""} stroke-linecap="round"/>`;
  }
  return `${s}</svg>`;
}

async function main() {
  const write = process.argv.includes("--write");
  const pngIdx = process.argv.indexOf("--png");
  const p2 = path.join(DIR, `${SKU}.json`);
  const file = JSON.parse(stripBom(await fs.readFile(p2, "utf8"))) as CandidateFile;
  const cands = file.candidates as Cand[];
  let maxM = cands.reduce((mx, c) => Math.max(mx, parseInt(c.id.match(/-m(\d+)$/)?.[1] ?? "0", 10)), 0);
  const today = new Date().toISOString().slice(0, 10);

  const made: Cand[] = [];
  for (const p of PYRAMIDS) {
    const built = buildPyramid(p);
    const es = fit(normalizeSolidEdges(built.edges));
    if (!es) { console.log(`NG ${p.label}: 9×9 に収まらない`); continue; }
    const metrics = computeSolidMetrics(es);
    const cand: Cand = {
      id: `${SKU}-m${String(++maxM).padStart(2, "0")}`,
      grid: { type: "solid", cols: N, rows: N }, edges: [], solidEdges: es, metrics,
      provenance: { source: "blank", createdAt: today, label: p.label },
      gen: { kind: "manual" }, status: "pending",
    };
    const d = taskDifficulty("solid", cand);
    cand.difficulty = { task: "solid", auto: d.value, value: d.value, parts: d.parts };
    made.push(cand);
    console.log(`OK ${p.label.padEnd(18)} 辺${es.length}本（実線${es.length - built.hidden}／点線${built.hidden}）`
      + ` D=${d.value} 隠れ辺${metrics.hiddenLines}`);
  }

  if (pngIdx >= 0) {
    const cols = 2, cell = (N - 1) * 26 + 28, cellH = cell + 30;
    const cells = made.map((c, i) => `<g transform="translate(${(i % cols) * cell},${Math.floor(i / cols) * cellH})">`
      + `<text x="6" y="16" font-size="13" font-family="sans-serif">${(c.provenance as { label?: string }).label} D=${c.difficulty!.value}</text>`
      + `<g transform="translate(0,22)">${svg(c.solidEdges!).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g></g>`).join("");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${Math.ceil(made.length / cols) * cellH}"><rect width="100%" height="100%" fill="#faf8f4"/>${cells}</svg>`;
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(sheet), { density: 130 }).png().toFile(process.argv[pngIdx + 1]);
    console.log(`png → ${process.argv[pngIdx + 1]}`);
  }

  if (!write || made.length === 0) { console.log("\n（--write なしのため保存していない）"); return; }
  await fs.writeFile(p2, JSON.stringify({ ...file, candidates: [...cands, ...made] }, null, 1), "utf8");
  console.log(`\n書き込み完了 → ${SKU}.json（${made.length} 問追加）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
