"use client";

/* =========================================================================
   商品ページ レイアウトプレビュー＋PDF 生成（decisions §3.48・B案）
   - 紙サイズ（A4/B4/A3 × 縦横）× 1ページ問数を選ぶと、12 問の紙面割付が
     その場で変わる連動プレビュー。レイアウトエンジンは products/print.ts（SSOT）
   - 「サンプル PDF を保存」＝クライアントサイドで本物の PDF を生成して即 DL
     （pdf-lib・ベクターのみ）。購入後のダウンロードページと同一パイプラインの実証
   - 図柄は published 問題データ（problems prop）があればそれを描画。
     未入稿 SKU は SKU slug から決定的に生成するサンプルへフォールバック
   ========================================================================= */

import { useMemo, useState } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor,
  KGAP, CELL_PAD, PRINT_INK, DOT_SCALE, NAME_BAND_MM, nameBandSvgString, dotRadius, edgeWidth,
  type PaperKey, type LayoutPerPage, type PairLayout, type DotSize,
} from "./print";
import { edgeKey, mirrorEdges, type EdgeT, type SolidEdge } from "./problems/schema";
import { buildSolidPageSvg, svgToPng, loadLogo } from "../maker-solid/solid-print";

const INK = "#3A424E";
const AXIS_INK = "#9AA0AA"; // 軸線（鏡タスク・薄い点線）
const QUESTIONS = 12;
const MARGIN_MM = 14;

/* 鏡タスクの軸種（schema.ts の TransformSpec.axis と同じ語彙） */
export type MirrorAxis = "v" | "h" | "d1" | "d2";

/* 描画単位は辺集合（本物の問題は閉多角形とは限らない）
   answerEdges: 欠け補完（fill）のとき、抜く線 R を指定する。みほんペインには edges（F）
   をすべて描き、かくマスペインには F∖R（欠け図 G）を事前印字する。
   mirrorAxis: 鏡タスクのとき、軸の種類。両ペインの中央に軸点線を描き、かくマスは空白。
   未指定（copy/motif/solid 等）はかくマスを白紙のまま。 */
export type RenderProblem = {
  n: number;
  edges: EdgeT[];
  answerEdges?: EdgeT[];
  mirrorAxis?: MirrorAxis;
};

/* fill 用: F から R を除いた G（欠け図）を返す。R 未指定なら null */
function gapEdgesOf(pb: RenderProblem): EdgeT[] | null {
  if (!pb.answerEdges || pb.answerEdges.length === 0) return null;
  const rSet = new Set(pb.answerEdges.map(edgeKey));
  return pb.edges.filter((e) => !rSet.has(edgeKey(e)));
}

/* ---- SKU slug から決定的にサンプル 12 問を生成（seeded LCG） ---- */
function seededRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function sampleProblems(sku: string, n: number): RenderProblem[] {
  const rnd = seededRng(sku);
  const out: RenderProblem[] = [];
  for (let q = 0; q < QUESTIONS; q++) {
    // 格子点から 5〜8 点を選び、重心まわりの角度順に並べて単純多角形にする
    const m = 5 + Math.floor(rnd() * 4);
    const used = new Set<string>();
    const pts: [number, number][] = [];
    let guard = 0;
    while (pts.length < m && guard++ < 60) {
      const c = Math.floor(rnd() * n);
      const r = Math.floor(rnd() * n);
      const k = `${c},${r}`;
      if (!used.has(k)) { used.add(k); pts.push([c, r]); }
    }
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    pts.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    // 閉多角形 → 辺集合へ（描画は edges 駆動に統一）
    const edges: EdgeT[] = pts.map((p, k) => [p, pts[(k + 1) % pts.length]]);
    out.push({ n, edges });
  }
  return out;
}

/* ---- ペア（みほん→うつす）の幾何（mm）。プレビュー SVG と PDF が共用。
   pair=horizontal は右隣・vertical は真下にうつす欄（maker と同じ二択） ---- */
type PairGeom = {
  pane: number; gap: number;
  ox: number; oy: number;          // みほんペイン左上（セル内中央寄せ済み）
  dx: number; dy: number;          // うつすペインへのオフセット
  dot: (pane: number, i: number, n: number) => number; // ペイン内ドット位置
};

function pairGeom(cellW: number, cellH: number, pair: PairLayout): PairGeom {
  const pane = paneSize(cellW, cellH, pair);
  const gap = pane * KGAP;
  const dot = (p: number, i: number, n: number) => p * (0.1 + (0.8 * i) / Math.max(1, n - 1));
  if (pair === "horizontal") {
    const blockW = pane * 2 + gap;
    return {
      pane, gap, dot,
      ox: (cellW - blockW) / 2, oy: (cellH - pane) / 2,
      dx: pane + gap, dy: 0,
    };
  }
  const blockH = pane * 2 + gap;
  return {
    pane, gap, dot,
    ox: (cellW - pane) / 2, oy: (cellH - blockH) / 2,
    dx: 0, dy: pane + gap,
  };
}

/* ならび選択チップのピクト（みほん■ → かくマス□）。文章より図で伝える。
   おためし点描写メーカーの同チップとも共用（export） */
export function PairChipIcon({ pair }: { pair: PairLayout }) {
  const pane = (x: number, y: number, filled: boolean) => (
    <g>
      <rect x={x} y={y} width={18} height={18} rx={2} fill="#FFFFFF"
        stroke={INK} strokeWidth={filled ? 1.2 : 0.9}
        strokeDasharray={filled ? undefined : "2.4 2"} />
      {filled
        ? <polyline points={`${x + 4},${y + 13} ${x + 4},${y + 5} ${x + 13},${y + 5} ${x + 13},${y + 13}`}
            fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        : <path d={`M${x + 11},${y + 5} l2.5,2.5 -6,6 -3,0.5 0.5,-3 z`} fill="#9AA0AA" />}
    </g>
  );
  if (pair === "horizontal") {
    return (
      <svg viewBox="0 0 50 20" width={50} height={20} aria-hidden>
        {pane(1, 1, true)}
        <path d="M21 10 L29 10 M26.5 7.5 L29 10 L26.5 12.5"
          fill="none" stroke={INK} strokeWidth={1.1}
          strokeLinecap="round" strokeLinejoin="round" />
        {pane(31, 1, false)}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 50" width={20} height={50} aria-hidden>
      {pane(1, 1, true)}
      <path d="M10 21 L10 29 M7.5 26.5 L10 29 L12.5 26.5"
        fill="none" stroke={INK} strokeWidth={1.1}
        strokeLinecap="round" strokeLinejoin="round" />
      {pane(1, 31, false)}
    </svg>
  );
}

/* 矢印（みほん→うつす・細線＋小さな矢じり）。(x,y)=線の始点・size=線長・向きは pair に追従 */
function arrowProps(g: PairGeom, cx: number, cy: number, pair: PairLayout) {
  const aSize = g.gap * 0.9;
  if (pair === "horizontal") {
    return {
      x: cx + g.pane + (g.gap - aSize) / 2, y: cy + g.pane / 2,
      size: aSize, dir: "right" as const,
    };
  }
  return {
    x: cx + g.pane / 2, y: cy + g.pane + (g.gap - aSize) / 2,
    size: aSize, dir: "down" as const,
  };
}

/* 細線矢印の SVG path（mm 座標・maker buildPageSvg と同形） */
function thinArrowPath(size: number, dir: "right" | "down"): string {
  const hd = size * 0.3;
  return dir === "right"
    ? `M0 0 L${size} 0 M${size - hd} ${-hd} L${size} 0 L${size - hd} ${hd}`
    : `M0 0 L0 ${size} M${-hd} ${size - hd} L0 ${size} L${hd} ${size - hd}`;
}

/* ===================== プレビュー（SVG） ===================== */
function PreviewPage({
  paperKey, problems, perPage, pageNo, pageCount, pair, nameField, dotSize, noDots = false,
}: {
  paperKey: PaperKey; problems: RenderProblem[];
  perPage: number; pageNo: number; pageCount: number; pair: PairLayout;
  nameField: boolean; dotSize: DotSize; noDots?: boolean;
}) {
  const paper = PAPER[paperKey];
  const nameH = nameField ? NAME_BAND_MM : 0;
  const { cols, rows } = gridFor(Math.min(perPage, problems.length) || 1, pair, paper.w, paper.h - nameH, MARGIN_MM);
  const cellW = (paper.w - MARGIN_MM * 2) / cols;
  const cellH = (paper.h - MARGIN_MM * 2 - nameH) / rows;
  const pad = Math.min(cellW, cellH) * CELL_PAD;
  const g = pairGeom(cellW - pad * 2, cellH - pad * 2, pair);
  const dotR = dotRadius(g.pane, DOT_SCALE[dotSize]);
  const lw = edgeWidth(g.pane);
  const frameSw = Math.max(0.25, lw * 0.55);
  // ページ幅を実寸比でスケール（A3 長辺 420mm 基準・maker と同じ思想）
  const widthPct = (Math.max(paper.w, paper.h) / 420) * 100 * (paper.w / Math.max(paper.w, paper.h));

  return (
    <div className="spv-page" style={{ width: `${widthPct}%` }}>
      <svg viewBox={`0 0 ${paper.w} ${paper.h}`} role="img"
        aria-label={`${paper.label}・${perPage}問/ページ のプレビュー ${pageNo}/${pageCount}`}>
        <rect x={0} y={0} width={paper.w} height={paper.h} fill="#FFFFFF" />
        {/* 名前・日付の記入欄（maker と同じ断片を共用） */}
        {nameField && (
          <g dangerouslySetInnerHTML={{ __html: nameBandSvgString(paper.w, MARGIN_MM) }} />
        )}
        {problems.map((pb, i) => {
          const n = pb.n;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = MARGIN_MM + col * cellW + pad + g.ox;
          const cy = MARGIN_MM + nameH + row * cellH + pad + g.oy;
          const dots: React.ReactNode[] = [];
          if (!noDots) {
            for (const side of [0, 1] as const) {
              const sx = cx + side * g.dx;
              const sy = cy + side * g.dy;
              for (let r = 0; r < n; r++)
                for (let c = 0; c < n; c++)
                  dots.push(<circle key={`${i}-${side}-${r}-${c}`}
                    cx={sx + g.dot(g.pane, c, n)} cy={sy + g.dot(g.pane, r, n)} r={dotR} fill={PRINT_INK} />);
            }
          }
          const arr = arrowProps(g, cx, cy, pair);
          const gap = gapEdgesOf(pb);
          // 点をとったとき、かくマスが空欄になる設問（模写・鏡・回転・移動）だけに薄い枠を添える。
          // 欠け補完（gap あり＝かくマスに欠け図がある）には付けない。
          const showFrame = noDots && !gap;
          const axisDash = Math.max(0.6, g.pane * 0.02).toFixed(2) + " " + Math.max(0.5, g.pane * 0.015).toFixed(2);
          return (
            <g key={i}>
              {dots}
              {showFrame && (
                <rect x={cx + g.dx + g.pane * 0.02} y={cy + g.dy + g.pane * 0.02}
                  width={g.pane * 0.96} height={g.pane * 0.96}
                  fill="none" stroke={AXIS_INK} strokeWidth={frameSw} />
              )}
              {/* 鏡面はペイン間の点線（下の矢印置換）一本のみ。ペイン内には軸線を引かない */}
              {pb.edges.map((e, k) => (
                <line key={k}
                  x1={cx + g.dot(g.pane, e[0][0], n)} y1={cy + g.dot(g.pane, e[0][1], n)}
                  x2={cx + g.dot(g.pane, e[1][0], n)} y2={cy + g.dot(g.pane, e[1][1], n)}
                  stroke={PRINT_INK} strokeWidth={lw} strokeLinecap="round" />
              ))}
              {gap && gap.map((e, k) => (
                <line key={`g${k}`}
                  x1={cx + g.dx + g.dot(g.pane, e[0][0], n)} y1={cy + g.dy + g.dot(g.pane, e[0][1], n)}
                  x2={cx + g.dx + g.dot(g.pane, e[1][0], n)} y2={cy + g.dy + g.dot(g.pane, e[1][1], n)}
                  stroke={PRINT_INK} strokeWidth={lw} strokeLinecap="round" />
              ))}
              {/* 鏡 SKU は矢印じゃなく薄い点線（鏡面演出）。それ以外は従来の細線矢印 */}
              {pb.mirrorAxis ? (
                pair === "horizontal"
                  ? <line x1={cx + g.pane + g.gap / 2} y1={cy - g.pane * 0.05}
                      x2={cx + g.pane + g.gap / 2} y2={cy + g.pane * 1.05}
                      stroke={AXIS_INK} strokeWidth={Math.max(0.3, lw * 0.7)}
                      strokeDasharray={axisDash} strokeLinecap="round" />
                  : <line x1={cx - g.pane * 0.05} y1={cy + g.pane + g.gap / 2}
                      x2={cx + g.pane * 1.05} y2={cy + g.pane + g.gap / 2}
                      stroke={AXIS_INK} strokeWidth={Math.max(0.3, lw * 0.7)}
                      strokeDasharray={axisDash} strokeLinecap="round" />
              ) : (
                <path d={thinArrowPath(arr.size, arr.dir)}
                  transform={`translate(${arr.x},${arr.y})`}
                  fill="none" stroke={PRINT_INK}
                  strokeWidth={Math.max(0.35, arr.size * 0.04)}
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
            </g>
          );
        })}
        <text x={paper.w - MARGIN_MM} y={paper.h - 5} textAnchor="end"
          fontSize={3} fill="#9AA0AA" fontFamily="monospace">{`P ${pageNo} / ${pageCount}`}</text>
      </svg>
    </div>
  );
}

/* ===================== PDF 生成（pdf-lib） =====================
   購入前ページからの導線は撤去済み（2026-06-11 オーナー指示）。
   購入後ダウンロードページが同じ関数で実問題 PDF を生成する予定のため export で温存 */
const MM2PT = 72 / 25.4;

/* 記名欄ストリップ（ページ上端〜帯下端）を 300dpi PNG にラスタライズ。
   日本語はフォント埋め込み回避中（Courier のみ）のため、帯だけ画像で貼る */
function nameBandPng(wMm: number): Promise<ArrayBuffer> {
  const stripMm = MARGIN_MM + NAME_BAND_MM;
  const PX = 300 / 25.4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wMm} ${stripMm}" width="${Math.round(wMm * PX)}" height="${Math.round(stripMm * PX)}">${nameBandSvgString(wMm, MARGIN_MM)}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(wMm * PX);
      canvas.height = Math.round(stripMm * PX);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? b.arrayBuffer().then(resolve, reject) : reject(new Error("toBlob failed")), "image/png");
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export async function downloadPdf(
  sku: string, paperKey: PaperKey, perPage: number, problems: RenderProblem[], pair: PairLayout,
  nameField = false, dotScale: number = DOT_SCALE.m, noDots = false,
) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const paper = PAPER[paperKey];
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const ink = rgb(0x77 / 255, 0x77 / 255, 0x77 / 255); // PRINT_INK
  const gray = rgb(0.6, 0.63, 0.67);
  const frameInk = rgb(0x9a / 255, 0xa0 / 255, 0xaa / 255); // AXIS_INK（枠）

  // フッターロゴ（取得失敗時はテキストのみで続行）
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const buf = await fetch("/assets/logo-horizontal.png").then((r) => r.arrayBuffer());
    logo = await doc.embedPng(buf);
  } catch { /* logo optional */ }

  // 記名欄ストリップ（ON 時のみ・全ページ共通で 1 回だけ作る）
  let band: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  if (nameField) {
    try {
      band = await doc.embedPng(await nameBandPng(paper.w));
    } catch { /* band optional — 失敗しても紙面生成は続行 */ }
  }

  const nameH = nameField ? NAME_BAND_MM : 0;
  const pageCount = Math.ceil(problems.length / perPage);
  const W = paper.w * MM2PT;
  const H = paper.h * MM2PT;
  const margin = MARGIN_MM * MM2PT;
  const nameHpt = nameH * MM2PT;

  for (let pg = 0; pg < pageCount; pg++) {
    const page = doc.addPage([W, H]);
    const batch = problems.slice(pg * perPage, (pg + 1) * perPage);
    const { cols, rows } = gridFor(Math.min(perPage, batch.length) || 1, pair, paper.w, paper.h - nameH, MARGIN_MM);
    const cellW = (W - margin * 2) / cols;
    const cellH = (H - margin * 2 - nameHpt) / rows;
    const pad = Math.min(cellW, cellH) * CELL_PAD;
    const g = pairGeom(cellW - pad * 2, cellH - pad * 2, pair);
    // 共通式は mm 基準なので pt⇄mm を介して同じ比率に揃える
    const dotR = dotRadius(g.pane / MM2PT, dotScale) * MM2PT;
    const lw = edgeWidth(g.pane / MM2PT) * MM2PT;

    if (band) {
      const stripPt = (MARGIN_MM + NAME_BAND_MM) * MM2PT;
      page.drawImage(band, { x: 0, y: H - stripPt, width: W, height: stripPt });
    }

    batch.forEach((pb, i) => {
      const n = pb.n;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = margin + col * cellW + pad + g.ox;
      const cyTop = margin + nameHpt + row * cellH + pad + g.oy; // 上起点（mm 系と同じ向き）
      const Y = (yTop: number) => H - yTop;                      // PDF は y 上向き → 反転

      if (!noDots) {
        for (const side of [0, 1] as const) {
          const sx = cx + side * g.dx;
          const syTop = cyTop + side * g.dy;
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              page.drawCircle({
                x: sx + g.dot(g.pane, c, n), y: Y(syTop + g.dot(g.pane, r, n)), size: dotR, color: ink,
              });
        }
      }
      // 点をとったとき、かくマスが空欄の設問（模写・鏡・回転・移動）にだけ薄い枠を添える。
      // 欠け補完（gapEdgesOf ≠ null）には付けない。
      if (noDots && !gapEdgesOf(pb)) {
        const fx = cx + g.dx + g.pane * 0.02;
        const fyTop = cyTop + g.dy + g.pane * 0.02;
        const fs2 = g.pane * 0.96;
        const fsw = Math.max(0.25 * MM2PT, lw * 0.55);
        // 4 辺を線分で（drawRectangle は塗り前提のため線分で枠を描く）
        page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop) }, thickness: fsw, color: frameInk });
        page.drawLine({ start: { x: fx, y: Y(fyTop + fs2) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
        page.drawLine({ start: { x: fx, y: Y(fyTop) }, end: { x: fx, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
        page.drawLine({ start: { x: fx + fs2, y: Y(fyTop) }, end: { x: fx + fs2, y: Y(fyTop + fs2) }, thickness: fsw, color: frameInk });
      }
      for (const e of pb.edges) {
        page.drawLine({
          start: { x: cx + g.dot(g.pane, e[0][0], n), y: Y(cyTop + g.dot(g.pane, e[0][1], n)) },
          end: { x: cx + g.dot(g.pane, e[1][0], n), y: Y(cyTop + g.dot(g.pane, e[1][1], n)) },
          thickness: lw, color: ink, lineCap: 1,
        });
      }
      // 欠け補完: かくマスペインに G=F∖R を事前印字
      const gap = gapEdgesOf(pb);
      if (gap) for (const e of gap) {
        page.drawLine({
          start: { x: cx + g.dx + g.dot(g.pane, e[0][0], n), y: Y(cyTop + g.dy + g.dot(g.pane, e[0][1], n)) },
          end:   { x: cx + g.dx + g.dot(g.pane, e[1][0], n), y: Y(cyTop + g.dy + g.dot(g.pane, e[1][1], n)) },
          thickness: lw, color: ink, lineCap: 1,
        });
      }
      if (pb.mirrorAxis) {
        // 鏡 SKU: みほん→解答 の境界は矢印じゃなく薄い点線（鏡面）
        const planeColor = rgb(0x9a / 255, 0xa0 / 255, 0xaa / 255);
        const planeDashStep = Math.max(0.4 * MM2PT, g.pane * 0.025);
        const planeW = Math.max(0.2 * MM2PT, lw * 0.7);
        const drawDashedPlane = (x1: number, y1Top: number, x2: number, y2Top: number) => {
          const dx = x2 - x1, dy = y2Top - y1Top;
          const len = Math.hypot(dx, dy);
          const ux = dx / len, uy = dy / len;
          let t = 0;
          while (t < len) {
            const t2 = Math.min(t + planeDashStep, len);
            page.drawLine({
              start: { x: x1 + ux * t, y: Y(y1Top + uy * t) },
              end:   { x: x1 + ux * t2, y: Y(y1Top + uy * t2) },
              thickness: planeW, color: planeColor, lineCap: 1,
            });
            t = t2 + planeDashStep * 0.7;
          }
        };
        if (pair === "horizontal") {
          const mx = cx + g.pane + g.gap / 2;
          drawDashedPlane(mx, cyTop - g.pane * 0.05, mx, cyTop + g.pane * 1.05);
        } else {
          const my = cyTop + g.pane + g.gap / 2;
          drawDashedPlane(cx - g.pane * 0.05, my, cx + g.pane * 1.05, my);
        }
      } else {
        // 矢印（みほん→うつす・細線＋小さな矢じり・向きは pair に追従）
        const arr = arrowProps(g, cx, cyTop, pair);
        const hd = arr.size * 0.3;
        const aw = Math.max(0.35 * MM2PT, arr.size * 0.04);
        const seg = (x1: number, y1: number, x2: number, y2: number) =>
          page.drawLine({
            start: { x: x1, y: Y(y1) }, end: { x: x2, y: Y(y2) },
            thickness: aw, color: ink, lineCap: 1,
          });
        if (arr.dir === "right") {
          seg(arr.x, arr.y, arr.x + arr.size, arr.y);
          seg(arr.x + arr.size - hd, arr.y - hd, arr.x + arr.size, arr.y);
          seg(arr.x + arr.size - hd, arr.y + hd, arr.x + arr.size, arr.y);
        } else {
          seg(arr.x, arr.y, arr.x, arr.y + arr.size);
          seg(arr.x - hd, arr.y + arr.size - hd, arr.x, arr.y + arr.size);
          seg(arr.x + hd, arr.y + arr.size - hd, arr.x, arr.y + arr.size);
        }
      }
    });

    // フッター: 左=ロゴ／右=ページ番号・SKU（欧文のみ・日本語フォント埋め込み回避）
    const footY = 6 * MM2PT;
    if (logo) {
      const lh = 5.5 * MM2PT;
      const lwid = (logo.width / logo.height) * lh;
      page.drawImage(logo, { x: margin, y: footY - lh / 2, width: lwid, height: lh });
    }
    page.drawText(`${sku}  ·  P ${pg + 1} / ${pageCount}`, {
      x: W - margin - font.widthOfTextAtSize(`${sku}  ·  P ${pg + 1} / ${pageCount}`, 8),
      y: footY - 3,
      size: 8, font, color: gray,
    });
  }

  const bytes = await doc.save();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // {sku}_{紙}_{N}q_{yyyymmddhhmm}.pdf — 再生成の上書き事故を防ぐタイムスタンプ付き
  const d = new Date();
  const p2 = (x: number) => String(x).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
  a.download = `${sku}_${paperKey}_${perPage}q_${stamp}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== 解答 PDF（鏡タスク・1問=1ページ） =====================
   maker-mirror と同じ2ペイン形式：みほんペイン（F）｜かくペイン（mirror(F)）を並べ、
   ペイン間に鏡面の点線を引く。軸 v=横並び／h=上下並び（軸は印刷時の並びに対応する
   代表値・decisions §3.59）。旧「F∪mirror(F) を1盤面合成」は全盤面 F では線が重なって
   読めないため廃止。ヘッダ・フッタはロゴ＋ {sku}・ANSWER・P n/m のみ。 */
export async function downloadAnswerPdf(
  sku: string, paperKey: PaperKey, problems: RenderProblem[], noDots = false,
) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const paper = PAPER[paperKey];
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const ink = rgb(0x77 / 255, 0x77 / 255, 0x77 / 255);
  const gray = rgb(0.6, 0.63, 0.67);
  const planeColor = rgb(0x9a / 255, 0xa0 / 255, 0xaa / 255);

  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const buf = await fetch("/assets/logo-horizontal.png").then((r) => r.arrayBuffer());
    logo = await doc.embedPng(buf);
  } catch { /* logo optional */ }

  // 鏡タスク以外は解答 PDF の対象外（answerEdges による fill 解答は将来扱う）
  const targets = problems.filter((p) => p.mirrorAxis);
  if (targets.length === 0) throw new Error("解答対象の問題が見つかりません（鏡軸が未設定）");

  const W = paper.w * MM2PT;
  const H = paper.h * MM2PT;
  const margin = MARGIN_MM * MM2PT;
  const footerH = 12 * MM2PT;     // 下端フッター帯
  const headerH = 14 * MM2PT;     // 上端「解答」タイトル帯

  targets.forEach((pb, pg) => {
    const page = doc.addPage([W, H]);
    const n = pb.n;
    const axis = pb.mirrorAxis!;
    const stack = axis === "h";           // h=上下並び／v・その他=横並び
    const usableW = W - margin * 2;
    const usableH = H - margin * 2 - footerH - headerH;
    // ペア（pane + gap + pane）が紙面に収まる最大ペイン
    const gapRatio = KGAP;
    const pane = stack
      ? Math.min(usableW, usableH / (2 + gapRatio))
      : Math.min(usableH, usableW / (2 + gapRatio));
    const gap = pane * gapRatio;
    const blockW = stack ? pane : pane * 2 + gap;
    const blockH = stack ? pane * 2 + gap : pane;
    const px = (W - blockW) / 2;
    const pyTop = margin + headerH + (usableH - blockH) / 2;
    const Y = (yTop: number) => H - yTop; // PDF y 上向き

    const dot = (i: number) => pane * (0.1 + (0.8 * i) / Math.max(1, n - 1));
    const dotR = dotRadius(pane / MM2PT, DOT_SCALE.m) * MM2PT;
    const lw = edgeWidth(pane / MM2PT) * MM2PT;

    // 1 ペイン描画（格子点＋辺）。noDots のときは格子点を省く（解答は線で埋まる）。
    const drawPane = (ox: number, oyTop: number, edges: EdgeT[]) => {
      if (!noDots) {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            page.drawCircle({ x: ox + dot(c), y: Y(oyTop + dot(r)), size: dotR, color: ink });
          }
        }
      }
      for (const e of edges) {
        page.drawLine({
          start: { x: ox + dot(e[0][0]), y: Y(oyTop + dot(e[0][1])) },
          end:   { x: ox + dot(e[1][0]), y: Y(oyTop + dot(e[1][1])) },
          thickness: lw, color: ink, lineCap: 1,
        });
      }
    };

    const R = mirrorEdges(pb.edges, n, axis);
    drawPane(px, pyTop, pb.edges);                                        // みほん＝F
    drawPane(px + (stack ? 0 : pane + gap), pyTop + (stack ? pane + gap : 0), R); // 解答＝mirror(F)

    // ペイン間の鏡面（点線）— maker と同じ見せ方
    const planeDashStep = Math.max(0.6 * MM2PT, pane * 0.02);
    const planeW = Math.max(0.25 * MM2PT, lw * 0.7);
    const drawDashedPlane = (x1: number, y1Top: number, x2: number, y2Top: number) => {
      const dx = x2 - x1, dy = y2Top - y1Top, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      let t = 0;
      while (t < len) {
        const t2 = Math.min(t + planeDashStep, len);
        page.drawLine({
          start: { x: x1 + ux * t, y: Y(y1Top + uy * t) },
          end:   { x: x1 + ux * t2, y: Y(y1Top + uy * t2) },
          thickness: planeW, color: planeColor, lineCap: 1,
        });
        t = t2 + planeDashStep * 0.65;
      }
    };
    if (stack) {
      const my = pyTop + pane + gap / 2;
      drawDashedPlane(px - pane * 0.05, my, px + pane * 1.05, my);
    } else {
      const mx = px + pane + gap / 2;
      drawDashedPlane(mx, pyTop - pane * 0.05, mx, pyTop + pane * 1.05);
    }

    // ヘッダタイトル「解答」（欧文のみで日本語埋め込み回避）
    const headText = `ANSWER  ·  P ${pg + 1} / ${targets.length}`;
    page.drawText(headText, {
      x: margin, y: H - margin - 5,
      size: 9, font, color: gray,
    });

    // フッタ: 左=ロゴ／右=SKU・ページ
    const footY = 6 * MM2PT;
    if (logo) {
      const lh = 5.5 * MM2PT;
      const lwid = (logo.width / logo.height) * lh;
      page.drawImage(logo, { x: margin, y: footY - lh / 2, width: lwid, height: lh });
    }
    const footText = `${sku}  ·  ANSWER  ·  P ${pg + 1} / ${targets.length}`;
    page.drawText(footText, {
      x: W - margin - font.widthOfTextAtSize(footText, 8),
      y: footY - 3, size: 8, font, color: gray,
    });
  });

  const bytes = await doc.save();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date();
  const p2 = (x: number) => String(x).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
  a.download = `${sku}_answer_${paperKey}_${stamp}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== 立体（solid）プレビュー＋PDF =====================
   矩形点格子・隠れ線（点線）は maker-solid の buildSolidPageSvg / svgToPng / loadLogo を
   そのまま流用（描画 SSOT を一元化）。square 経路（PreviewPage/downloadPdf）には触れない。 */
const SOLID_DOT_SCALE: Record<DotSize, number> = { s: 0.6, m: 1.0, l: 1.3 };

export type SolidRenderProblem = { cols: number; rows: number; edges: SolidEdge[] };

function SolidPrintPreview({
  sku, problems, buySlot, purchased = false, meate,
}: { sku: string; problems: SolidRenderProblem[]; buySlot?: React.ReactNode; purchased?: boolean; meate?: string }) {
  // 立体は横長が自然（既定 A4 横・2 問/ページ）。
  const [paperKey, setPaperKey] = useState<PaperKey>("A4-L");
  const [perPage, setPerPage] = useState<LayoutPerPage>(2);
  const [pair, setPair] = useState<PairLayout>("horizontal");
  const [dotSize, setDotSize] = useState<DotSize>("m");
  const [nameField, setNameField] = useState(false);
  const [noDots, setNoDots] = useState(false); // 背景の点をとる（白紙模写形式）
  const [downloading, setDownloading] = useState(false);
  const [foldOpen, setFoldOpen] = useState(purchased);

  const paper = PAPER[paperKey];
  const dotScale = SOLID_DOT_SCALE[dotSize];
  const effPerPage = Math.min(perPage, paperMax(paperKey));
  const pages = useMemo(() => {
    const ps: SolidRenderProblem[][] = [];
    for (let i = 0; i < problems.length; i += effPerPage) ps.push(problems.slice(i, i + effPerPage));
    return ps.length ? ps : [[]];
  }, [problems, effPerPage]);
  const pageCount = pages.length;

  const pageSvg = (page: SolidRenderProblem[], pageNo: number) =>
    buildSolidPageSvg({
      paper, problems: page, pageNo, pageCount, marginMm: MARGIN_MM,
      problemsPerPage: effPerPage, pairLayout: pair, nameField, dotScale, logo: null, noDots,
    });

  const selectPaper = (k: PaperKey) => {
    setPaperKey(k);
    setPerPage((v) => (v > paperMax(k) ? paperMax(k) : v));
  };

  async function doDownload() {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const logo = await loadLogo();
      const orientation = paper.landscape ? "landscape" : "portrait";
      const format: [number, number] = [Math.min(paper.w, paper.h), Math.max(paper.w, paper.h)];
      const doc = new jsPDF({ orientation, unit: "mm", format });
      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) doc.addPage(format, orientation);
        const svg = buildSolidPageSvg({
          paper, problems: pages[pi], pageNo: pi + 1, pageCount: pages.length,
          marginMm: MARGIN_MM, problemsPerPage: effPerPage, pairLayout: pair, nameField, dotScale, logo, noDots,
        });
        const png = await svgToPng(svg, paper.w, paper.h);
        doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
      }
      const d = new Date();
      const p2 = (x: number) => String(x).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
      doc.save(`${sku}_${paperKey}_${stamp}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="spv">
      <details className="spv-fold" open={foldOpen}
        onToggle={(e) => setFoldOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className="spv-fold-label">詳細設定<span className="spv-fold-chevron" aria-hidden="true" /></span>
          <span className="spv-fold-current">
            用紙: {paper.label} · 問数: {effPerPage}問/頁（{pageCount}枚） · 並び: {pair === "horizontal" ? "横" : "下"} · 点: {dotSize === "s" ? "小" : dotSize === "m" ? "中" : "大"} · 名前欄: {nameField ? "あり" : "なし"} · 背景の点: {noDots ? "なし" : "あり"}
          </span>
        </summary>
        <div className="spv-controls">
          <div className="spv-group">
            <p className="spv-label">用紙</p>
            <div className="spv-chips">
              {PAPER_KEYS.map((k) => (
                <button key={k} type="button" className={`spv-chip${k === paperKey ? " is-sel" : ""}`}
                  onClick={() => selectPaper(k)}>
                  <span className="spv-chip-main">{PAPER[k].label}</span>
                  <span className="spv-chip-sub">{PAPER[k].w}×{PAPER[k].h}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="spv-group">
            <p className="spv-label">みほんと書き込み欄の並び</p>
            <div className="spv-chips">
              {([["horizontal", "横に並べる"], ["vertical", "下に並べる"]] as [PairLayout, string][]).map(([k, label]) => (
                <button key={k} type="button" className={`spv-chip spv-chip--pair${k === pair ? " is-sel" : ""}`}
                  onClick={() => setPair(k)}>
                  <span className="spv-chip-ic"><PairChipIcon pair={k} /></span>
                  <span className="spv-chip-main">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="spv-group">
            <p className="spv-label">1 ページの問題数（全 {problems.length} 問）</p>
            <div className="spv-chips">
              {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => (
                <button key={v} type="button" className={`spv-chip${v === perPage ? " is-sel" : ""}`}
                  onClick={() => setPerPage(v)}>
                  <span className="spv-chip-main">{v} 問</span>
                </button>
              ))}
            </div>
          </div>
          <div className="spv-group">
            <p className="spv-label">点の大きさ</p>
            <div className="spv-chips">
              {(["s", "m", "l"] as const).map((k) => (
                <button key={k} type="button" className={`spv-chip${k === dotSize ? " is-sel" : ""}`}
                  onClick={() => setDotSize(k)}>
                  <span className="spv-chip-main">{k === "s" ? "小" : k === "m" ? "中" : "大"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="spv-group">
            <p className="spv-label">名前・日付の記入欄</p>
            <div className="spv-chips">
              <button type="button" className={`spv-chip${!nameField ? " is-sel" : ""}`}
                onClick={() => setNameField(false)}><span className="spv-chip-main">つけない</span></button>
              <button type="button" className={`spv-chip${nameField ? " is-sel" : ""}`}
                onClick={() => setNameField(true)}><span className="spv-chip-main">つける</span></button>
            </div>
          </div>
          <div className="spv-group">
            <p className="spv-label">背景の点</p>
            <div className="spv-chips">
              <button type="button" className={`spv-chip${!noDots ? " is-sel" : ""}`}
                onClick={() => setNoDots(false)}><span className="spv-chip-main">つける</span></button>
              <button type="button" className={`spv-chip${noDots ? " is-sel" : ""}`}
                onClick={() => setNoDots(true)}><span className="spv-chip-main">とる</span></button>
            </div>
            <p className="spv-dot-note">点を「とる」と、見本・書き込み欄の点が消え、書き込み欄には薄い枠だけが残ります（点線＝かくれた辺は残ります）。</p>
          </div>
        </div>
      </details>

      <div className="spv-main">
        <div className="spv-pages">
          {pages.map((page, pi) => (
            <div key={`${paperKey}-${pair}-${effPerPage}-${nameField}-${dotSize}-${pi}`}
              className="spv-page" style={{ width: `${(Math.max(paper.w, paper.h) / 420) * 100 * (paper.w / Math.max(paper.w, paper.h))}%` }}
              dangerouslySetInnerHTML={{ __html: pageSvg(page, pi + 1) }} />
          ))}
        </div>
        {purchased ? (
          <p className="spv-note">ご購入ありがとうございます。用紙・問題数・並びを選んで、下のボタンから PDF を保存してください。設定を変えて<b>何度でも</b>作り直せます。</p>
        ) : meate ? (
          <div className="spv-meate">
            <span className="spv-meate-label">この巻のめあて</span>
            <p className="spv-meate-text">{meate}</p>
          </div>
        ) : null}
      </div>

      {purchased && (
        <button type="button" className="spv-download" disabled={downloading} onClick={doDownload}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" />
          </svg>
          {downloading ? "PDF を作成中…" : "PDF をダウンロード"}
        </button>
      )}

      {buySlot && <div className="spv-buyslot">{buySlot}</div>}
    </div>
  );
}

/* ===================== 本体 =====================
   立体（solid）は専用プレビュー SolidPrintPreview へ、square は SquarePrintPreview へ振り分ける
   薄いディスパッチャ。フックの条件呼び出しを避けるため、分岐はここで完結させる。 */
export default function SkuPrintPreview(props: {
  sku: string; grid: string; problems?: RenderProblem[]; solidProblems?: SolidRenderProblem[];
  buySlot?: React.ReactNode; purchased?: boolean; meate?: string;
}) {
  if (props.solidProblems) {
    return <SolidPrintPreview sku={props.sku} problems={props.solidProblems}
      buySlot={props.buySlot} purchased={props.purchased} meate={props.meate} />;
  }
  return <SquarePrintPreview {...props} />;
}

function SquarePrintPreview({
  sku, grid, problems: realProblems, buySlot, purchased = false, meate,
}: { sku: string; grid: string; problems?: RenderProblem[]; buySlot?: React.ReactNode; purchased?: boolean; meate?: string }) {
  const n = useMemo(() => {
    const m = grid.match(/^(\d+)×\d+$/);
    return m ? Math.min(7, Math.max(3, Number(m[1]))) : 4;
  }, [grid]);

  /* 既定: A4 縦・横に並べる・3 問/ページ（2026-06-12 オーナー確定・今後もこれが基本） */
  const [paperKey, setPaperKey] = useState<PaperKey>("A4-P");
  const [perPage, setPerPage] = useState<LayoutPerPage>(3);
  const [pair, setPair] = useState<PairLayout>("horizontal");
  const [dotSize, setDotSize] = useState<DotSize>("m");
  const [nameField, setNameField] = useState(false);
  const [noDots, setNoDots] = useState(false); // 背景の点をとる（白紙模写形式）
  const [focusPg, setFocusPg] = useState(0);
  const [downloading, setDownloading] = useState(false);
  // 購入後（サンクス）は最初から開いた状態に。開閉自体は維持（onToggle で制御）
  const [foldOpen, setFoldOpen] = useState(purchased);

  const isReal = Boolean(realProblems && realProblems.length > 0);
  const problems = useMemo(
    () => (realProblems && realProblems.length > 0 ? realProblems : sampleProblems(sku, n)),
    [realProblems, sku, n],
  );

  const selectPaper = (k: PaperKey) => {
    setPaperKey(k);
    setPerPage((v) => (v > paperMax(k) ? paperMax(k) : v));
  };

  const pageCount = Math.ceil(QUESTIONS / perPage);
  const pages = Array.from({ length: pageCount }, (_, pg) =>
    problems.slice(pg * perPage, (pg + 1) * perPage));
  const focus = Math.min(focusPg, pageCount - 1); // 設定変更でページ数が減ったとき用

  // 今の用紙・問数・並びで実際に印刷される点の直径（mm）— PreviewPage と同じ計算
  const dotSampleDia = (k: DotSize): number => {
    const paper = PAPER[paperKey];
    const nameH = nameField ? NAME_BAND_MM : 0;
    const { cols, rows } = gridFor(perPage, pair, paper.w, paper.h - nameH, MARGIN_MM);
    const cellW = (paper.w - MARGIN_MM * 2) / cols;
    const cellH = (paper.h - MARGIN_MM * 2 - nameH) / rows;
    const pad = Math.min(cellW, cellH) * CELL_PAD;
    return dotRadius(paneSize(cellW - pad * 2, cellH - pad * 2, pair), DOT_SCALE[k]) * 2;
  };

  return (
    <div className="spv">
      <details className="spv-fold" open={foldOpen}
        onToggle={(e) => setFoldOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className="spv-fold-label">詳細設定<span className="spv-fold-chevron" aria-hidden="true" /></span>
          <span className="spv-fold-current">
            用紙: {PAPER[paperKey].label} · 問数: {perPage}問/頁（{pageCount}枚） · 並び: {pair === "horizontal" ? "横" : "下"} · 点: {dotSize === "s" ? "小" : dotSize === "m" ? "中" : "大"} · 名前欄: {nameField ? "あり" : "なし"} · 背景の点: {noDots ? "なし" : "あり"}
          </span>
        </summary>
      <div className="spv-controls">
        <div className="spv-group">
          <p className="spv-label">用紙</p>
          <div className="spv-chips">
            {PAPER_KEYS.map((k) => (
              <button key={k} type="button"
                className={`spv-chip${k === paperKey ? " is-sel" : ""}`}
                onClick={() => selectPaper(k)}>
                <span className="spv-chip-main">{PAPER[k].label}</span>
                <span className="spv-chip-sub">{PAPER[k].w}×{PAPER[k].h}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="spv-group">
          <p className="spv-label">みほんと書き込み欄の並び</p>
          <div className="spv-chips">
            {([
              ["horizontal", "横に並べる"],
              ["vertical", "下に並べる"],
            ] as [PairLayout, string][]).map(([k, label]) => (
              <button key={k} type="button"
                className={`spv-chip spv-chip--pair${k === pair ? " is-sel" : ""}`}
                onClick={() => setPair(k)}>
                <span className="spv-chip-ic"><PairChipIcon pair={k} /></span>
                <span className="spv-chip-main">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="spv-group">
          <p className="spv-label">1 ページの問題数（全 {QUESTIONS} 問）</p>
          <div className="spv-chips">
            {COUNT_OPTIONS.filter((v) => v <= paperMax(paperKey)).map((v) => (
              <button key={v} type="button"
                className={`spv-chip${v === perPage ? " is-sel" : ""}`}
                onClick={() => setPerPage(v)}>
                <span className="spv-chip-main">{v} 問</span>
                <span className="spv-chip-sub">{Math.ceil(QUESTIONS / v)} 枚</span>
              </button>
            ))}
          </div>
        </div>
        <div className="spv-group">
          <p className="spv-label">点の大きさ</p>
          <div className="spv-chips">
            {(["s", "m", "l"] as const).map((k) => (
              <button key={k} type="button"
                className={`spv-chip spv-chip--dot${k === dotSize ? " is-sel" : ""}`}
                onClick={() => setDotSize(k)}>
                <span className="spv-dot-sample"
                  style={{ width: `${dotSampleDia(k)}mm`, height: `${dotSampleDia(k)}mm` }} />
                <span className="spv-chip-main">{k === "s" ? "小" : k === "m" ? "中" : "大"}</span>
              </button>
            ))}
          </div>
          <p className="spv-dot-note">●は実際に印刷される点の大きさ（今の用紙・問数での目安）</p>
        </div>
        <div className="spv-group">
          <p className="spv-label">名前・日付の記入欄</p>
          <div className="spv-chips">
            <button type="button"
              className={`spv-chip${!nameField ? " is-sel" : ""}`}
              onClick={() => setNameField(false)}>
              <span className="spv-chip-main">つけない</span>
            </button>
            <button type="button"
              className={`spv-chip${nameField ? " is-sel" : ""}`}
              onClick={() => setNameField(true)}>
              <span className="spv-chip-main">つける</span>
            </button>
          </div>
        </div>
        <div className="spv-group">
          <p className="spv-label">背景の点</p>
          <div className="spv-chips">
            <button type="button"
              className={`spv-chip${!noDots ? " is-sel" : ""}`}
              onClick={() => setNoDots(false)}>
              <span className="spv-chip-main">つける</span>
            </button>
            <button type="button"
              className={`spv-chip${noDots ? " is-sel" : ""}`}
              onClick={() => setNoDots(true)}>
              <span className="spv-chip-main">とる</span>
            </button>
          </div>
          <p className="spv-dot-note">点を「とる」と、見本・書き込み欄の点が消え、書き込み欄には薄い枠だけが残ります（白紙模写）。</p>
        </div>
      </div>
      </details>

      <div className="spv-main">
      {/* 1 ページだけ大きく見せ、残りはサムネ。クリックで入れ替え */}
      <div className="spv-pages">
        <div className="spv-focus-no">P {focus + 1} / {pageCount}</div>
        <PreviewPage key={`${paperKey}-${perPage}-${pair}-${focus}`}
          paperKey={paperKey} problems={pages[focus]} pair={pair}
          perPage={perPage} pageNo={focus + 1} pageCount={pageCount}
          nameField={nameField} dotSize={dotSize} noDots={noDots} />
        {pageCount > 1 && (
          /* 選択中のページは上の大判だけに出す（同じページを二重に見せない） */
          <div className="spv-thumbs" role="tablist" aria-label="ページを選ぶ">
            {pages.map((batch, pg) => pg === focus ? null : (
              <button key={`${paperKey}-${perPage}-${pair}-t${pg}`} type="button"
                className="spv-thumb"
                onClick={() => setFocusPg(pg)} aria-label={`${pg + 1} ページ目を大きく表示`}>
                <PreviewPage paperKey={paperKey} problems={batch} pair={pair}
                  perPage={perPage} pageNo={pg + 1} pageCount={pageCount}
                  nameField={nameField} dotSize={dotSize} noDots={noDots} />
                <span className="spv-thumb-no">P{pg + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {purchased ? (
        <p className="spv-note">ご購入ありがとうございます。用紙・問題数・並びを選んで、下のボタンから PDF を保存してください。設定を変えて<b>何度でも</b>作り直せます。</p>
      ) : meate ? (
        <div className="spv-meate">
          <span className="spv-meate-label">この巻のめあて</span>
          <p className="spv-meate-text">{meate}</p>
        </div>
      ) : !isReal ? (
        <p className="spv-note">図柄はプレビュー用のサンプルです。用紙と問題数は<b>購入後もいつでも変更</b>して、PDF を作り直せます。</p>
      ) : null}
      </div>

      {/* 購入後 DL ボタン。spv 直下に出し、サンクスでは CSS order で
          プレビュー→設定→DL の順に並べ替える（商品ページは非表示で無影響） */}
      {purchased && (
        <button type="button" className="spv-download" disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadPdf(sku, paperKey, perPage, problems, pair, nameField, DOT_SCALE[dotSize], noDots);
            } finally {
              setDownloading(false);
            }
          }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" />
          </svg>
          {downloading ? "PDF を作成中…" : "PDF をダウンロード"}
        </button>
      )}
      {/* 解答 PDF（鏡タスクのみ・1問=1ページ・用紙MAX） */}
      {purchased && problems.some((p) => p.mirrorAxis) && (
        <button type="button" className="spv-download spv-download--answer" disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadAnswerPdf(sku, paperKey, problems, noDots);
            } finally {
              setDownloading(false);
            }
          }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" />
          </svg>
          {downloading ? "PDF を作成中…" : "解答 PDF をダウンロード"}
        </button>
      )}

      {buySlot && <div className="spv-buyslot">{buySlot}</div>}
    </div>
  );
}
