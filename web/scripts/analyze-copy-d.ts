/* 校正式D（D = 6(n-2) + 1.0·lines + 1.5·crossings + 12·[非45°あり]）の実分布を
   現ライブラリで実測する使い捨て分析（npx tsx scripts/analyze-copy-d.ts）。
   - 各巻の現 eligibleVariants が D 空間のどこに乗るか（逆転・重なりの可視化）
   - 種類ゲート（grid/slopes/requireNon45/fullGrid）だけに緩めた供給ヘッドルーム
   ソースは一切変更しない。窓設計の根拠を取るためだけ。 */
import {
  COPY_LADDER, allVariants, eligibleVariants, type ShapeVariant, type CopyShapeParams,
} from "../app/products/problems/gen/copy";
import { computeMetrics } from "../app/products/problems/gen/metrics";
import { hasNon45 } from "../app/products/problems/gen/filters";

function dOf(v: ShapeVariant, n: number): number {
  const m = computeMetrics(v.edges, n);
  return 6 * (n - 2) + 1.0 * m.lines + 1.5 * m.crossings + 12 * (hasNon45(v.edges) ? 1 : 0);
}

function stats(xs: number[]) {
  if (xs.length === 0) return { n: 0, min: NaN, max: NaN, med: NaN, p25: NaN, p75: NaN };
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: s[0], max: s[s.length - 1], med: q(0.5), p25: q(0.25), p75: q(0.75) };
}

/* 種類ゲートのみ（D・band を無視）で variant を拾う＝新窓の供給ヘッドルーム */
function gateOnly(v: ShapeVariant, p: CopyShapeParams): boolean {
  const n = p.grid;
  if ((v.family === "sym" || v.family === "truchet" || v.family === "rand" || v.family === "blob" || v.family === "hybrid") && !p.fullGrid) return false;
  if (v.spanC > n - 1 || v.spanR > n - 1) return false;
  if (p.fullGrid) { if (!(v.spanC === n - 1 && v.spanR === n - 1)) return false; }
  else if (Math.max(v.spanC, v.spanR) < Math.min(n - 1, 2)) return false;
  const non45 = hasNon45(v.edges);
  if (p.slopes !== "any" && non45) return false;
  if (p.requireNon45 && !non45) return false;
  return true;
}

const all = allVariants();
console.log("=== 現 eligibleVariants（band 適用後）の D 分布 ===");
console.log("sku            grid n   Dmin  Dp25  Dmed  Dp75  Dmax  | board=6(n-2)");
for (const sku of Object.keys(COPY_LADDER)) {
  const p = COPY_LADDER[sku];
  const ds = eligibleVariants(sku).map((v) => dOf(v, p.grid));
  const s = stats(ds);
  console.log(
    `${sku.padEnd(14)} ${String(p.grid)}  ${String(s.n).padStart(3)}   ` +
    `${String(s.min).padStart(4)}  ${String(s.p25).padStart(4)}  ${String(s.med).padStart(4)}  ${String(s.p75).padStart(4)}  ${String(s.max).padStart(4)}  | ${6 * (p.grid - 2)}`,
  );
}

console.log("\n=== 種類ゲートのみ（band 撤廃時）の D 分布＝新窓の供給上限 ===");
console.log("sku            grid n   Dmin  Dp25  Dmed  Dp75  Dmax");
const gated: Record<string, number[]> = {};
for (const sku of Object.keys(COPY_LADDER)) {
  const p = COPY_LADDER[sku];
  const ds = all.filter((v) => gateOnly(v, p)).map((v) => dOf(v, p.grid));
  gated[sku] = ds;
  const s = stats(ds);
  console.log(
    `${sku.padEnd(14)} ${String(p.grid)}  ${String(s.n).padStart(3)}   ` +
    `${String(s.min).padStart(4)}  ${String(s.p25).padStart(4)}  ${String(s.med).padStart(4)}  ${String(s.p75).padStart(4)}  ${String(s.max).padStart(4)}`,
  );
}

/* 同 grid 兄弟の住み分け確認＝D ヒストグラム（整数 bin） */
console.log("\n=== 同 grid 兄弟の D ヒストグラム（種類ゲートのみ） ===");
function hist(ds: number[]) {
  const h: Record<number, number> = {};
  for (const d of ds) h[Math.round(d)] = (h[Math.round(d)] ?? 0) + 1;
  return Object.keys(h).map(Number).sort((a, b) => a - b).map((k) => `${k}:${h[k]}`).join(" ");
}
for (const pair of [["copy-lv2-vol2", "copy-lv3-vol1"], ["copy-lv3-vol2", "copy-lv4-vol1"]]) {
  for (const sku of pair) console.log(`  ${sku.padEnd(14)} ${hist(gated[sku])}`);
  console.log("");
}

/* =========================================================================
   提案: 種類ゲート（grid/slopes/fullGrid/crossMode/requireDiag45/requireNon45）
   ＋ D 窓。各巻で供給12以上＆中央値単調を検証する。
   ========================================================================= */
type CrossMode = "any" | "zero" | "some";
type Proposed = {
  grid: 3 | 4 | 5 | 6 | 7; slopes: "ortho" | "ortho45" | "any";
  fullGrid?: boolean; cross?: CrossMode; reqDiag45?: boolean; reqNon45?: boolean;
  D: [number, number];
};
const PROPOSED: Record<string, Proposed> = {
  "copy-lv1-vol1": { grid: 3, slopes: "ortho",                                  D: [8, 13] },
  "copy-lv2-vol1": { grid: 3, slopes: "ortho45", reqDiag45: true,               D: [8, 14] },
  "copy-lv2-vol2": { grid: 4, slopes: "ortho45", cross: "zero",                 D: [14, 19] },
  "copy-lv3-vol1": { grid: 4, slopes: "ortho45", fullGrid: true, cross: "some", D: [19, 27] },
  "copy-lv3-vol2": { grid: 5, slopes: "ortho45", fullGrid: true,                D: [25, 34] },
  "copy-lv4-vol1": { grid: 5, slopes: "any", fullGrid: true, reqNon45: true,    D: [35, 47] },
  "copy-lv4-vol2": { grid: 6, slopes: "any", fullGrid: true,                    D: [36, 50] },
  "copy-lv5-vol1": { grid: 7, slopes: "any", fullGrid: true,                    D: [44, 60] },
};

function passGate(v: ShapeVariant, p: Proposed): boolean {
  const n = p.grid;
  if ((v.family === "sym" || v.family === "truchet" || v.family === "rand" || v.family === "blob" || v.family === "hybrid") && !p.fullGrid) return false;
  if (v.spanC > n - 1 || v.spanR > n - 1) return false;
  if (p.fullGrid) { if (!(v.spanC === n - 1 && v.spanR === n - 1)) return false; }
  else if (Math.max(v.spanC, v.spanR) < Math.min(n - 1, 2)) return false;
  const m = computeMetrics(v.edges, n);
  const non45 = hasNon45(v.edges);
  if (p.slopes !== "any" && non45) return false;
  if (p.reqNon45 && !non45) return false;
  if (p.reqDiag45 && m.diagonals < 1) return false;
  if (p.cross === "zero" && m.crossings !== 0) return false;
  if (p.cross === "some" && m.crossings < 1) return false;
  return true;
}

console.log("=== 提案ゲート＋D窓 の供給＆単調性 ===");
console.log("sku            n  win        supply  Dmin  Dmed  Dmax  flags");
let prevMed = -Infinity;
for (const sku of Object.keys(PROPOSED)) {
  const p = PROPOSED[sku];
  const inWin = all.filter((v) => passGate(v, p)).map((v) => dOf(v, p.grid)).filter((d) => d >= p.D[0] && d <= p.D[1]);
  const s = stats(inWin);
  const flags: string[] = [];
  if (s.n < 12) flags.push("⚠供給<12");
  if (s.med < prevMed) flags.push("⚠中央値逆転");
  prevMed = s.med;
  console.log(
    `${sku.padEnd(14)} ${p.grid}  [${String(p.D[0]).padStart(2)},${String(p.D[1]).padStart(2)}]  ${String(s.n).padStart(5)}  ` +
    `${String(s.min).padStart(4)}  ${String(s.med).padStart(4)}  ${String(s.max).padStart(4)}  ${flags.join(" ")}`,
  );
}
