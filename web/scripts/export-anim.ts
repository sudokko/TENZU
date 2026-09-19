/* SNS 動画の書き出し（2026-09-19 新設・A 案＝撮影ゼロ・実問題データから生成）

   npx tsx scripts/export-anim.ts <type> [引数] [--out <dir>] [--fps 30] [--gif]

     stroke <sku>:<問題index>   A-1 描き順（辺を 1 本ずつ引く）
     ladder <タスクslug>        A-2 難易度ラダー（Lv.1→Lv.5 を 1 段ずつ）
     tasks                      A-3 9タスク早回し（「写すだけじゃない」）
     format <sku>               A-4 刷り分け（A4 大きく1問 ↔ A3 ぎっしり12問）

   縦型 1080×1920。MP4（IG リール）と GIF（Pinterest アイデアピン）。
   素材は published の実問題そのもの＝AI 生成映像は使わない（ピンと同じ原則）。
   子どもが画面で解く画は出さない（「作るのは画面、練習は紙」と矛盾するため）。

   例）npx tsx scripts/export-anim.ts ladder copy --out ../docs/drafts/sns/video/2026-09-19 --gif */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { PUBLISHED } from "../app/products/problems/published";
import { LAUNCH_TASKS, LEVEL_NAMES, volBySku, taskBySlug, type Vol } from "../app/products/data";
import { metricsLabel } from "../app/products/problems/schema";
import type { Problem, SolidGrid, SquareGrid } from "../app/products/problems/schema";
import { TASK_DESC } from "../app/products/task-desc";
import type { MakerKey } from "../app/products/capabilities";
import { lattice, text, INK, MUTED, ACCENT } from "../app/atelier/pins/pin-render";

const W = 1080, H = 1920;
const PAPER_EDGE = "#E5E8EC";

const args = process.argv.slice(2);
const type = args[0];
const rest = args.slice(1);
const flag = (n: string) => args.includes("--" + n);
const opt = (n: string, d: string) => {
  const i = args.indexOf("--" + n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const fps = Number(opt("fps", "30"));
const outDir = path.resolve(process.cwd(), opt("out", "../docs/drafts/sns/video"));
const positional = rest.filter((a) => !a.startsWith("--") && rest[rest.indexOf(a) - 1] !== "--out" && rest[rest.indexOf(a) - 1] !== "--fps");

/* ---------- 図形の共通表現（square と solid を 1 本にそろえる） ---------- */

type Seg = { a: [number, number]; b: [number, number]; dashed?: boolean };

/* 問題を「n×n 格子 ＋ 線分の列」に開く。solid は solidEdges（隠れ線 style 付き）が実体。 */
function figureOf(p: Problem): { n: number; segs: Seg[] } {
  if (p.grid.type === "square") {
    const n = (p.grid as SquareGrid).n;
    return { n, segs: p.edges.map((e) => ({ a: [e[0][0], e[0][1]], b: [e[1][0], e[1][1]] })) };
  }
  const g = p.grid as SolidGrid;
  const segs = (p.solidEdges ?? []).map((e) => ({
    a: [e.a.c, e.a.r] as [number, number],
    b: [e.b.c, e.b.r] as [number, number],
    dashed: e.style === "dashed",
  }));
  return { n: Math.max(g.cols, g.rows), segs };
}

/* 格子の点と線分を描く。座標系は pin-render の lattice を共有（重複実装を作らない）。 */
function drawFigure(
  n: number, segs: Seg[], ox: number, oy: number, size: number,
  o: { opacity?: number; dots?: boolean } = {},
): string {
  const { X, Y, dotR, ew } = lattice(n, ox, oy, size);
  let s = "";
  if (o.dots !== false)
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        s += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${INK}"/>`;
  for (const e of segs) {
    const dash = e.dashed ? ` stroke-dasharray="${(ew * 2.2).toFixed(1)} ${(ew * 1.8).toFixed(1)}"` : "";
    s += `<line x1="${X(e.a[0]).toFixed(1)}" y1="${Y(e.a[1]).toFixed(1)}" x2="${X(e.b[0]).toFixed(1)}" y2="${Y(e.b[1]).toFixed(1)}" stroke="${INK}" stroke-width="${ew.toFixed(1)}" stroke-linecap="round"${dash}/>`;
  }
  const op = o.opacity ?? 1;
  return op >= 1 ? s : `<g opacity="${op.toFixed(3)}">${s}</g>`;
}

/* 1 行に収まらない説明文を素朴に折る（句点優先・なければ字数）。 */
function wrapJa(s: string, perLine: number): string[] {
  if (s.length <= perLine) return [s];
  const parts = s.split(/(?<=。)/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const part of parts) {
    if ((cur + part).length <= perLine) { cur += part; continue; }
    if (cur) lines.push(cur);
    cur = part;
    while (cur.length > perLine) { lines.push(cur.slice(0, perLine)); cur = cur.slice(perLine); }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function svg(inner: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>` + inner + `</svg>`
  );
}

/* 全テンプレ共通の足元（コアタグライン＋業態識別句） */
function footer(sub?: string): string {
  return (
    `<line x1="90" y1="1686" x2="${W - 90}" y2="1686" stroke="${PAPER_EDGE}" stroke-width="2"/>` +
    (sub ? text(W / 2, 1640, sub, 34, MUTED) : "") +
    text(W / 2, 1782, "見て、考えて、書く。", 62, INK, "middle", 700) +
    text(W / 2, 1856, "点描写プリントの専門店　TENZU", 32, MUTED)
  );
}

/* 進み具合のレール（到達した分だけ差し色＝design rev.5 の accent 規則に沿う） */
function rail(cx: number, y: number, total: number, doneIdx: number, labels?: string[]): string {
  const gap = 150, w = gap * (total - 1), x0 = cx - w / 2;
  let s = `<line x1="${x0}" y1="${y}" x2="${x0 + w}" y2="${y}" stroke="${PAPER_EDGE}" stroke-width="5" stroke-linecap="round"/>`;
  if (doneIdx > 0)
    s += `<line x1="${x0}" y1="${y}" x2="${x0 + gap * doneIdx}" y2="${y}" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < total; i++) {
    const x = x0 + gap * i, on = i <= doneIdx;
    s += `<circle cx="${x}" cy="${y}" r="${on ? 15 : 10}" fill="${on ? ACCENT : PAPER_EDGE}"/>`;
    if (labels?.[i]) s += text(x, y + 56, labels[i], 28, on ? INK : MUTED, "middle", on ? 700 : 400);
  }
  return s;
}

/* ---------- A-1 描き順 ---------- */

function cutStroke(segs: Seg[], count: number, t: number): Seg[] {
  const out = segs.slice(0, count);
  if (count < segs.length && t > 0) {
    const e = segs[count];
    out.push({ ...e, b: [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t] });
  }
  return out;
}

function framesStroke(sku: string, index: number): { name: string; frames: string[] } {
  const set = PUBLISHED[sku], hit = volBySku(sku);
  if (!set || !hit) throw new Error(`published / data.ts にない SKU: ${sku}`);
  const p = set.problems[index];
  if (!p) throw new Error(`${sku} に問題 index ${index} がない（0〜${set.problems.length - 1}）`);
  const { n, segs } = figureOf(p);
  const { task, vol } = hit;
  const S = 470, ox = (W - S) / 2, oyM = 300, oyD = 1010;

  const frame = (drawn: Seg[]) =>
    svg(
      text(W / 2, 150, `${task.name}・${vol.grid}・${vol.ageLabel}`, 40, MUTED) +
      text(W / 2, 226, metricsLabel(p.metrics, p.grid), 30, MUTED) +
      text(W / 2, 292, "みほん", 34, MUTED) +
      drawFigure(n, segs, ox, oyM, S) +
      `<line x1="${W / 2}" y1="${oyM + S + 40}" x2="${W / 2}" y2="${oyM + S + 104}" stroke="${ACCENT}" stroke-width="7" stroke-linecap="round"/>` +
      `<polygon points="${W / 2},${oyM + S + 130} ${W / 2 - 11},${oyM + S + 104} ${W / 2 + 11},${oyM + S + 104}" fill="${ACCENT}"/>` +
      text(W / 2, 1002, "かく", 34, MUTED) +
      drawFigure(n, drawn, ox, oyD, S) +
      footer(),
    );

  const frames: string[] = [];
  const HOLD_IN = 15, DRAW = 8, GAP = 2, HOLD_OUT = 42;
  for (let i = 0; i < HOLD_IN; i++) frames.push(frame([]));
  for (let e = 0; e < segs.length; e++) {
    for (let f = 1; f <= DRAW; f++) frames.push(frame(cutStroke(segs, e, f / DRAW)));
    for (let f = 0; f < GAP; f++) frames.push(frame(cutStroke(segs, e + 1, 0)));
  }
  for (let i = 0; i < HOLD_OUT; i++) frames.push(frame(segs));
  return { name: `anim_stroke_${sku}_${String(index).padStart(2, "0")}`, frames };
}

/* ---------- A-2 難易度ラダー ---------- */

const diffOf = (p: Problem) => (p.difficulty as { value?: number } | undefined)?.value ?? 0;

/* 同じタスクの published 巻から Lv ごとに 1 巻。**各 Lv の最後の巻**（＝その Lv で
   いちばん盤面が大きい巻）の中央値の問題を取る。
   最初の巻を取ると copy は 3,3,4,4,6 と並び、Lv.3→Lv.4 が同じ 4×4 で
   「レベルが上がると変わる」が絵に出ない（pin-render の buildP2Ladder が
   同じ罠を回避している）。最後の巻なら 3,3,5,5,8 で、同じ盤面のまま
   難易度だけ上がる段（Lv.3→Lv.4）も含めて正しく見える。 */
function ladderSteps(slug: string): { vol: Vol; p: Problem }[] {
  const byLv = new Map<number, { vol: Vol; p: Problem }>();
  Object.keys(PUBLISHED)
    .filter((s) => s.startsWith(slug + "-"))
    .map((s) => ({ s, hit: volBySku(s), set: PUBLISHED[s] }))
    .filter((x) => !!x.hit)
    .sort((a, b) => a.hit!.vol.lv - b.hit!.vol.lv || a.hit!.vol.volNo - b.hit!.vol.volNo)
    .forEach((x) => {
      const sorted = [...x.set.problems].sort((a, b) => diffOf(a) - diffOf(b));
      byLv.set(x.hit!.vol.lv, { vol: x.hit!.vol, p: sorted[Math.floor(sorted.length / 2)] });
    });
  return [...byLv.values()];
}

function framesLadder(slug: string): { name: string; frames: string[] } {
  const task = taskBySlug(slug);
  if (!task) throw new Error(`そんなタスクはない: ${slug}`);
  const steps = ladderSteps(slug);
  if (steps.length < 2) throw new Error(`${slug} は published の Lv が足りない`);

  const S = 720, ox = (W - S) / 2, oy = 320;
  const frame = (i: number, fade: number) => {
    const st = steps[i], prev = steps[i - 1];
    const f = figureOf(st.p);
    let fig = "";
    if (prev && fade < 1) {
      const pf = figureOf(prev.p);
      fig += drawFigure(pf.n, pf.segs, ox, oy, S, { opacity: 1 - fade });
    }
    fig += drawFigure(f.n, f.segs, ox, oy, S, { opacity: fade });
    return svg(
      text(W / 2, 148, "レベルが上がると、こう変わる。", 56, INK, "middle", 700) +
      text(W / 2, 214, `${task.name}・むずかしさは自由に調整`, 34, MUTED) +
      fig +
      text(W / 2, 1160, `${LEVEL_NAMES[st.vol.lv - 1]}　${st.vol.grid}`, 62, INK, "middle", 700) +
      text(W / 2, 1222, st.vol.ageLabel, 38, MUTED) +
      text(W / 2, 1282, metricsLabel(st.p.metrics, st.p.grid), 28, MUTED) +
      /* 難易度スコアは公開値（/products/design「設計台帳」で全巻ぶん公開している）。
         盤面が同じまま上がる段があるので、数字を出さないと階段に見えない。 */
      text(W / 2, 1352, `むずかしさ ${diffOf(st.p).toFixed(1)}`, 40, ACCENT, "middle", 700) +
      rail(W / 2, 1446, steps.length, i, steps.map((s) => `Lv.${s.vol.lv}`)) +
      footer("盤面だけじゃなく、線の向きと画数で上がります。"),
    );
  };

  const frames: string[] = [];
  const FADE = 8, HOLD = 36;
  steps.forEach((_, i) => {
    for (let f = 1; f <= FADE; f++) frames.push(frame(i, f / FADE));
    for (let f = 0; f < HOLD; f++) frames.push(frame(i, 1));
  });
  for (let f = 0; f < 18; f++) frames.push(frame(steps.length - 1, 1));
  return { name: `anim_ladder_${slug}`, frames };
}

/* ---------- A-3 9タスク早回し ---------- */

const GROUP_NAMES = ["見て写す", "かたちを動かす", "重ねる・分ける"];

function framesTasks(): { name: string; frames: string[] } {
  /* 各タスクの代表 1 問。絵として読めるモチーフ入りを優先し、中位の巻から拾う。 */
  const picks = LAUNCH_TASKS.map((t) => {
    const skus = Object.keys(PUBLISHED)
      .filter((s) => s.startsWith(t.slug + "-"))
      .map((s) => ({ s, hit: volBySku(s), set: PUBLISHED[s] }))
      .filter((x) => !!x.hit)
      .sort((a, b) => a.hit!.vol.lv - b.hit!.vol.lv);
    const pickFrom = skus[Math.min(1, skus.length - 1)];
    const withMotif = pickFrom.set.problems.find((p) => p.gen?.motif);
    return { task: t, vol: pickFrom.hit!.vol, p: withMotif ?? pickFrom.set.problems[0] };
  });

  const S = 660, ox = (W - S) / 2, oy = 300;
  const frame = (i: number, fade: number) => {
    const it = picks[i], prev = picks[i - 1];
    const f = figureOf(it.p);
    let fig = "";
    if (prev && fade < 1) {
      const pf = figureOf(prev.p);
      fig += drawFigure(pf.n, pf.segs, ox, oy, S, { opacity: 1 - fade });
    }
    fig += drawFigure(f.n, f.segs, ox, oy, S, { opacity: fade });
    const desc = wrapJa(TASK_DESC[it.task.slug as MakerKey], 24);
    return svg(
      text(W / 2, 148, "点描写は、写すだけじゃない。", 56, INK, "middle", 700) +
      text(W / 2, 214, `9 種類のタスク・${GROUP_NAMES[it.task.groupIdx]}`, 34, MUTED) +
      fig +
      text(W / 2, 1090, it.task.name, 76, INK, "middle", 700) +
      desc.map((l, k) => text(W / 2, 1168 + k * 48, l, 34, MUTED)).join("") +
      rail(W / 2, 1340, picks.length, i) +
      text(W / 2, 1436, `${i + 1} / ${picks.length}`, 32, MUTED) +
      footer(),
    );
  };

  const frames: string[] = [];
  const FADE = 6, HOLD = 30;
  picks.forEach((_, i) => {
    for (let f = 1; f <= FADE; f++) frames.push(frame(i, f / FADE));
    for (let f = 0; f < HOLD; f++) frames.push(frame(i, 1));
  });
  for (let f = 0; f < 24; f++) frames.push(frame(picks.length - 1, 1));
  return { name: "anim_tasks_9", frames };
}

/* ---------- A-4 刷り分け ---------- */

function framesFormat(sku: string): { name: string; frames: string[] } {
  const set = PUBLISHED[sku], hit = volBySku(sku);
  if (!set || !hit) throw new Error(`published / data.ts にない SKU: ${sku}`);
  const { task, vol } = hit;
  const twelve = set.problems.slice(0, 12);
  const one = twelve[0];

  const CX = W / 2, CY = 880;
  const A4 = { w: 690, h: 976 };            // 縦・1:1.414
  const A3 = { w: 940, h: 664 };            // 横・1.414:1
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const frame = (t: number) => {
    const e = ease(t);
    const pw = lerp(A4.w, A3.w, e), ph = lerp(A4.h, A3.h, e);
    const px = CX - pw / 2, py = CY - ph / 2;
    const paper =
      `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" ` +
      `fill="#FFFFFF" stroke="${PAPER_EDGE}" stroke-width="3" rx="4"/>`;

    // A4＝大きく 1 問（中央）／A3＝ぎっしり 12 問（4 列 × 3 行）。入れ替えはクロスフェード。
    const f1 = figureOf(one);
    const big = drawFigure(f1.n, f1.segs, CX - Math.min(pw, ph) * 0.62 / 2, CY - Math.min(pw, ph) * 0.62 / 2, Math.min(pw, ph) * 0.62, { opacity: 1 - e });
    let grid = "";
    if (e > 0) {
      const cols = 4, rows = 3, cw = pw / cols, ch = ph / rows, cell = Math.min(cw, ch) * 0.82;
      twelve.forEach((p, i) => {
        const f = figureOf(p);
        const cx = px + cw * (i % cols) + cw / 2, cy = py + ch * Math.floor(i / cols) + ch / 2;
        grid += drawFigure(f.n, f.segs, cx - cell / 2, cy - cell / 2, cell, { opacity: e });
      });
    }
    const label = e < 0.5 ? "A4・大きく 1 問" : "A3・ぎっしり 12 問";
    return svg(
      text(W / 2, 148, "同じ1巻を、その日の子に合わせて。", 52, INK, "middle", 700) +
      text(W / 2, 214, `${task.name} ${LEVEL_NAMES[vol.lv - 1]}・用紙も向きも1枚の問数も選べます`, 32, MUTED) +
      paper + big + grid +
      text(W / 2, 1480, label, 52, INK, "middle", 700) +
      footer(),
    );
  };

  const frames: string[] = [];
  const HOLD_A = 48, MORPH = 22, HOLD_B = 62;
  for (let i = 0; i < HOLD_A; i++) frames.push(frame(0));
  for (let i = 1; i <= MORPH; i++) frames.push(frame(i / MORPH));
  for (let i = 0; i < HOLD_B; i++) frames.push(frame(1));
  for (let i = 1; i <= MORPH; i++) frames.push(frame(1 - i / MORPH));
  return { name: `anim_format_${sku}`, frames };
}

/* ---------- 書き出し ---------- */

function run(cmd: string, a: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const ps = spawn(cmd, a, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    ps.stderr.on("data", (d) => { err += String(d); });
    ps.on("error", rej);
    ps.on("close", (c) => (c === 0 ? res() : rej(new Error(`${cmd} 失敗 (${c})\n${err.slice(-1200)}`))));
  });
}

async function render(name: string, frames: string[]): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tenzu-anim-"));
  for (let i = 0; i < frames.length; i++)
    await sharp(Buffer.from(frames[i])).png().toFile(path.join(tmp, `f_${String(i).padStart(4, "0")}.png`));

  await fs.mkdir(outDir, { recursive: true });
  const mp4 = path.join(outDir, `${name}.mp4`);
  await run("ffmpeg", [
    "-y", "-framerate", String(fps), "-i", path.join(tmp, "f_%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", mp4,
  ]);
  if (flag("gif")) {
    const pal = path.join(tmp, "pal.png");
    await run("ffmpeg", ["-y", "-i", mp4, "-vf", "fps=15,scale=540:-1:flags=lanczos,palettegen", pal]);
    await run("ffmpeg", ["-y", "-i", mp4, "-i", pal,
      "-lavfi", "fps=15,scale=540:-1:flags=lanczos[x];[x][1:v]paletteuse", path.join(outDir, `${name}.gif`)]);
  }
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`${name}  ${frames.length}f / ${(frames.length / fps).toFixed(1)}秒`);
}

(async () => {
  let built: { name: string; frames: string[] };
  if (type === "stroke") {
    const [sku, idx] = (positional[0] ?? "").split(":");
    built = framesStroke(sku, Number(idx));
  } else if (type === "ladder") {
    built = framesLadder(positional[0]);
  } else if (type === "tasks") {
    built = framesTasks();
  } else if (type === "format") {
    built = framesFormat(positional[0]);
  } else {
    console.error("使い方: npx tsx scripts/export-anim.ts <stroke|ladder|tasks|format> [引数] [--out <dir>] [--fps 30] [--gif]");
    process.exit(1);
  }
  await render(built.name, built.frames);
  console.log(`\n→ ${path.resolve(outDir)}`);
})().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
