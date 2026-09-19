/* 描き順アニメの書き出し（2026-09-19 新設・A-1 試作）
   （npx tsx scripts/export-stroke-anim.ts <sku>:<問題index> [...] [--out <dir>] [--fps 30] [--gif]）

   published 済みの実問題を、辺の順に 1 本ずつ引いていく縦型動画（1080×1920）にする。
   素材は問題データそのもの＝撮影ゼロ・AI 生成映像なし（ピンと同じ原則）。
   用途は IG リール／Pinterest のアイデアピン。

   紙面と同じ「みほん → かく」の構成にしてある。子どもが画面で解く画は出さない
   （「作るのは画面、練習は紙」＝ノースクリーン軸と矛盾するため）。

   例）npx tsx scripts/export-stroke-anim.ts copy-lv3-vol1:2 \
         --out ../docs/drafts/sns/video/2026-09-19 --gif                      */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import { volBySku } from "../app/products/data";
import { metricsLabel } from "../app/products/problems/schema";
import type { Problem } from "../app/products/problems/schema";
import { gridGroup, text, INK, MUTED, ACCENT } from "../app/atelier/pins/pin-render";

const W = 1080, H = 1920;

/* ---- 尺（フレーム数・fps 基準） ----
   HOLD_IN で点だけを見せて「これから書く」を作り、1 本ずつ引いて、
   HOLD_OUT で完成形を見せてからループへ戻す。 */
const HOLD_IN = 18, DRAW = 10, GAP = 3, HOLD_OUT = 50;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes("--" + name);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const fps = Number(opt("fps", "30"));
const outDir = path.resolve(process.cwd(), opt("out", "../docs/drafts/sns/video"));
const specs = args.filter((a) => a.includes(":") && !a.startsWith("--"));

if (specs.length === 0) {
  console.error("使い方: npx tsx scripts/export-stroke-anim.ts <sku>:<問題index> [...] [--out <dir>] [--fps 30] [--gif]");
  process.exit(1);
}

function gn(p: Problem): number {
  return p.grid.type === "square" ? p.grid.n : 0;
}

/* count 本を引き終えて、次の 1 本が t（0..1）まで進んだ状態の辺リスト。
   終点を線形補間するだけなので、格子の描画は pin-render のものをそのまま使える。 */
function partialEdges(edges: Problem["edges"], count: number, t: number): Problem["edges"] {
  const out = edges.slice(0, count) as Problem["edges"];
  if (count < edges.length && t > 0) {
    const [a, b] = edges[count];
    const tip: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return [...out, [a, tip]] as Problem["edges"];
  }
  return out;
}

/* 下向きの矢印（みほん → かく）。pin-render の arrow は横向き専用なのでここで作る。 */
function arrowDown(cx: number, y1: number, y2: number): string {
  const headH = 26, headW = 22;
  const tip = y2, base = y2 - headH;
  return (
    `<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${base}" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>` +
    `<polygon points="${cx},${tip} ${cx - headW / 2},${base} ${cx + headW / 2},${base}" fill="${ACCENT}"/>`
  );
}

function frameSvg(
  taskName: string, ageLabel: string, p: Problem, drawn: Problem["edges"],
): string {
  const n = gn(p);
  const S = 470, ox = (W - S) / 2;
  const oyModel = 300, oyDraw = 1010;
  const body =
    text(W / 2, 150, `${taskName}・${n}×${n}・${ageLabel}`, 40, MUTED) +
    text(W / 2, 226, metricsLabel(p.metrics, p.grid), 30, MUTED) +
    text(W / 2, 292, "みほん", 34, MUTED) +
    gridGroup(n, p.edges, ox, oyModel, S) +
    arrowDown(W / 2, oyModel + S + 40, oyModel + S + 130) +
    text(W / 2, 1002, "かく", 34, MUTED) +
    gridGroup(n, drawn, ox, oyDraw, S) +
    `<line x1="90" y1="1600" x2="${W - 90}" y2="1600" stroke="#E5E8EC" stroke-width="2"/>` +
    text(W / 2, 1690, "見て、考えて、書く。", 64, INK, "middle", 700) +
    text(W / 2, 1758, "作るのは画面、練習は紙。", 38, MUTED) +
    text(W / 2, 1852, "点描写プリントの専門店　TENZU", 34, MUTED);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>` + body + `</svg>`
  );
}

function run(cmd: string, a: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const ps = spawn(cmd, a, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    ps.stderr.on("data", (d) => { err += String(d); });
    ps.on("error", rej);
    ps.on("close", (code) => (code === 0 ? res() : rej(new Error(`${cmd} 失敗 (${code})\n${err.slice(-1200)}`))));
  });
}

async function build(sku: string, index: number): Promise<void> {
  const set = PUBLISHED[sku];
  const hit = volBySku(sku);
  if (!set) throw new Error(`published にない SKU: ${sku}`);
  if (!hit) throw new Error(`data.ts にない SKU: ${sku}`);
  const p = set.problems[index];
  if (!p) throw new Error(`${sku} に問題 index ${index} がない（0〜${set.problems.length - 1}）`);
  if (gn(p) === 0) throw new Error(`${sku} は正方格子ではないので対象外`);

  const { task, vol } = hit;
  const base = `anim_${sku}_${String(index).padStart(2, "0")}`;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tenzu-anim-"));

  // フレーム列を組む（点だけ → 1 本ずつ → 完成形を保持）
  const states: Problem["edges"][] = [];
  for (let i = 0; i < HOLD_IN; i++) states.push(partialEdges(p.edges, 0, 0));
  for (let e = 0; e < p.edges.length; e++) {
    for (let f = 1; f <= DRAW; f++) states.push(partialEdges(p.edges, e, f / DRAW));
    for (let f = 0; f < GAP; f++) states.push(partialEdges(p.edges, e + 1, 0));
  }
  for (let i = 0; i < HOLD_OUT; i++) states.push(p.edges);

  for (let i = 0; i < states.length; i++) {
    const svg = frameSvg(task.name, vol.ageLabel, p, states[i]);
    await sharp(Buffer.from(svg)).png().toFile(path.join(tmp, `f_${String(i).padStart(4, "0")}.png`));
  }

  await fs.mkdir(outDir, { recursive: true });
  const mp4 = path.join(outDir, `${base}.mp4`);
  await run("ffmpeg", [
    "-y", "-framerate", String(fps), "-i", path.join(tmp, "f_%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", mp4,
  ]);

  if (flag("gif")) {
    const pal = path.join(tmp, "pal.png");
    await run("ffmpeg", ["-y", "-i", mp4, "-vf", "fps=15,scale=540:-1:flags=lanczos,palettegen", pal]);
    await run("ffmpeg", [
      "-y", "-i", mp4, "-i", pal,
      "-lavfi", "fps=15,scale=540:-1:flags=lanczos[x];[x][1:v]paletteuse", path.join(outDir, `${base}.gif`),
    ]);
  }

  await fs.rm(tmp, { recursive: true, force: true });
  const sec = (states.length / fps).toFixed(1);
  console.log(`${sku}:${index}  ${task.name}・${p.edges.length}本  → ${base}.mp4  ${states.length}f / ${sec}秒`);
}

(async () => {
  for (const spec of specs) {
    const [sku, idx] = spec.split(":");
    await build(sku, Number(idx));
  }
  console.log(`\n→ ${path.resolve(outDir)}`);
})().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
