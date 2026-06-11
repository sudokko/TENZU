"use client";

/* =========================================================================
   商品ページ レイアウトプレビュー＋PDF 生成（decisions §3.48・B案）
   - 紙サイズ（A4/B4/A3 × 縦横）× 1ページ問数を選ぶと、12 問の紙面割付が
     その場で変わる連動プレビュー。レイアウトエンジンは products/print.ts（SSOT）
   - 「サンプル PDF を保存」＝クライアントサイドで本物の PDF を生成して即 DL
     （pdf-lib・ベクターのみ）。購入後のダウンロードページと同一パイプラインの実証
   - 図柄はプレビュー用サンプル（SKU slug から決定的に生成）。製品の実問題
     データ入稿後に差し替える
   ========================================================================= */

import { useMemo, useState } from "react";
import {
  PAPER, PAPER_KEYS, COUNT_OPTIONS, paperMax, paneSize, gridFor, blockArrowPoints,
  KGAP, type PaperKey, type LayoutPerPage,
} from "./print";

const INK = "#3A424E";
const QUESTIONS = 12;
const MARGIN_MM = 14;

type SampleProblem = { points: [number, number][] };

/* ---- SKU slug から決定的にサンプル 12 問を生成（seeded LCG） ---- */
function seededRng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function sampleProblems(sku: string, n: number): SampleProblem[] {
  const rnd = seededRng(sku);
  const out: SampleProblem[] = [];
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
    out.push({ points: pts });
  }
  return out;
}

/* ---- ペア（みほん→うつす）の幾何（mm）。プレビュー SVG と PDF が共用 ---- */
type PairGeom = {
  pane: number; gap: number;
  ox: number; oy: number;          // みほんペイン左上（セル内中央寄せ済み）
  dot: (pane: number, i: number, n: number) => number; // ペイン内ドット位置
};

function pairGeom(cellW: number, cellH: number): PairGeom {
  const pane = paneSize(cellW, cellH, "horizontal");
  const gap = pane * KGAP;
  const blockW = pane * 2 + gap;
  return {
    pane, gap,
    ox: (cellW - blockW) / 2,
    oy: (cellH - pane) / 2,
    dot: (p, i, n) => p * (0.1 + (0.8 * i) / Math.max(1, n - 1)),
  };
}

/* ===================== プレビュー（SVG） ===================== */
function PreviewPage({
  paperKey, problems, n, perPage, pageNo, pageCount,
}: {
  paperKey: PaperKey; problems: SampleProblem[]; n: number;
  perPage: number; pageNo: number; pageCount: number;
}) {
  const paper = PAPER[paperKey];
  const { cols, rows } = gridFor(Math.min(perPage, problems.length) || 1, "horizontal", paper.w, paper.h, MARGIN_MM);
  const cellW = (paper.w - MARGIN_MM * 2) / cols;
  const cellH = (paper.h - MARGIN_MM * 2) / rows;
  const g = pairGeom(cellW, cellH);
  const dotR = Math.max(0.5, g.pane * 0.016);
  const lw = Math.max(0.3, g.pane * 0.012);
  // ページ幅を実寸比でスケール（A3 長辺 420mm 基準・maker と同じ思想）
  const widthPct = (Math.max(paper.w, paper.h) / 420) * 100 * (paper.w / Math.max(paper.w, paper.h));

  return (
    <div className="spv-page" style={{ width: `${widthPct}%` }}>
      <svg viewBox={`0 0 ${paper.w} ${paper.h}`} role="img"
        aria-label={`${paper.label}・${perPage}問/ページ のプレビュー ${pageNo}/${pageCount}`}>
        <rect x={0} y={0} width={paper.w} height={paper.h} fill="#FFFFFF" />
        {problems.map((pb, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = MARGIN_MM + col * cellW + g.ox;
          const cy = MARGIN_MM + row * cellH + g.oy;
          const dots: React.ReactNode[] = [];
          for (const side of [0, 1] as const) {
            const sx = cx + side * (g.pane + g.gap);
            for (let r = 0; r < n; r++)
              for (let c = 0; c < n; c++)
                dots.push(<circle key={`${i}-${side}-${r}-${c}`}
                  cx={sx + g.dot(g.pane, c, n)} cy={cy + g.dot(g.pane, r, n)} r={dotR} fill={INK} />);
          }
          const path = pb.points
            .map(([c, r]) => `${cx + g.dot(g.pane, c, n)},${cy + g.dot(g.pane, r, n)}`)
            .join(" ");
          const aSize = g.gap * 0.62;
          const ah = aSize * 0.55;
          return (
            <g key={i}>
              {dots}
              <polygon points={path} fill="none" stroke={INK} strokeWidth={lw}
                strokeLinejoin="round" strokeLinecap="round" />
              <g transform={`translate(${cx + g.pane + (g.gap - aSize) / 2},${cy + g.pane / 2 - ah / 2})`}>
                <polygon points={blockArrowPoints(aSize, ah, "right")} fill="#FFFFFF" stroke={INK}
                  strokeWidth={0.25} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            </g>
          );
        })}
        <text x={paper.w - MARGIN_MM} y={paper.h - 5} textAnchor="end"
          fontSize={3} fill="#9AA0AA" fontFamily="monospace">{`P ${pageNo} / ${pageCount}`}</text>
      </svg>
      <span className="spv-page-badge">{paper.label} · {paper.w}×{paper.h}mm</span>
    </div>
  );
}

/* ===================== PDF 生成（pdf-lib） ===================== */
const MM2PT = 72 / 25.4;

async function downloadPdf(
  sku: string, paperKey: PaperKey, perPage: number, problems: SampleProblem[], n: number,
) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const paper = PAPER[paperKey];
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const ink = rgb(0x3a / 255, 0x42 / 255, 0x4e / 255);
  const gray = rgb(0.6, 0.63, 0.67);

  // フッターロゴ（取得失敗時はテキストのみで続行）
  let logo: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const buf = await fetch("/assets/logo-horizontal.png").then((r) => r.arrayBuffer());
    logo = await doc.embedPng(buf);
  } catch { /* logo optional */ }

  const pageCount = Math.ceil(problems.length / perPage);
  const W = paper.w * MM2PT;
  const H = paper.h * MM2PT;
  const margin = MARGIN_MM * MM2PT;

  for (let pg = 0; pg < pageCount; pg++) {
    const page = doc.addPage([W, H]);
    const batch = problems.slice(pg * perPage, (pg + 1) * perPage);
    const { cols, rows } = gridFor(Math.min(perPage, batch.length) || 1, "horizontal", paper.w, paper.h, MARGIN_MM);
    const cellW = (W - margin * 2) / cols;
    const cellH = (H - margin * 2) / rows;
    const g = pairGeom(cellW, cellH);
    const dotR = Math.max(1.4, g.pane * 0.016);
    const lw = Math.max(0.8, g.pane * 0.012);

    batch.forEach((pb, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = margin + col * cellW + g.ox;
      const cyTop = margin + row * cellH + g.oy; // 上起点（mm 系と同じ向き）
      const Y = (yTop: number) => H - yTop;      // PDF は y 上向き → 反転

      for (const side of [0, 1] as const) {
        const sx = cx + side * (g.pane + g.gap);
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++)
            page.drawCircle({
              x: sx + g.dot(g.pane, c, n), y: Y(cyTop + g.dot(g.pane, r, n)), size: dotR, color: ink,
            });
      }
      const pts = pb.points.map(([c, r]) => ({
        x: cx + g.dot(g.pane, c, n), y: Y(cyTop + g.dot(g.pane, r, n)),
      }));
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        page.drawLine({ start: a, end: b, thickness: lw, color: ink, lineCap: 1 });
      }
      // 矢印（みほん→うつす）
      const aSize = g.gap * 0.62;
      const ah = aSize * 0.55;
      const axTop = cx + g.pane + (g.gap - aSize) / 2;
      const ayTop = cyTop + g.pane / 2 - ah / 2;
      const arrow = blockArrowPoints(aSize, ah, "right")
        .split(" ")
        .map((pair) => pair.split(",").map(Number) as [number, number]);
      const path = arrow
        .map(([px, py], k) => `${k === 0 ? "M" : "L"}${axTop + px},${ayTop + py}`)
        .join(" ") + " Z";
      // drawSvgPath は与えた (x,y) を SVG 原点（y 下向き）として描く
      page.drawSvgPath(path, {
        x: 0, y: H, color: rgb(1, 1, 1), borderColor: ink, borderWidth: 0.7,
      });
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
  a.download = `${sku}_${paperKey}_${perPage}q.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== 本体 ===================== */
export default function SkuPrintPreview({ sku, grid }: { sku: string; grid: string }) {
  const n = useMemo(() => {
    const m = grid.match(/^(\d+)×\d+$/);
    return m ? Math.min(7, Math.max(3, Number(m[1]))) : 4;
  }, [grid]);

  const [paperKey, setPaperKey] = useState<PaperKey>("A4-P");
  const [perPage, setPerPage] = useState<LayoutPerPage>(6);
  const [busy, setBusy] = useState(false);

  const problems = useMemo(() => sampleProblems(sku, n), [sku, n]);

  const selectPaper = (k: PaperKey) => {
    setPaperKey(k);
    setPerPage((v) => (v > paperMax(k) ? paperMax(k) : v));
  };

  const pageCount = Math.ceil(QUESTIONS / perPage);
  const pages = Array.from({ length: pageCount }, (_, pg) =>
    problems.slice(pg * perPage, (pg + 1) * perPage));

  return (
    <div className="spv">
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
      </div>

      <div className="spv-pages">
        {pages.map((batch, pg) => (
          <PreviewPage key={`${paperKey}-${perPage}-${pg}`}
            paperKey={paperKey} problems={batch} n={n}
            perPage={perPage} pageNo={pg + 1} pageCount={pageCount} />
        ))}
      </div>

      <button type="button" className="btn-medium spv-dl" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await downloadPdf(sku, paperKey, perPage, problems, n); }
          finally { setBusy(false); }
        }}>
        {busy ? "生成中…" : `この設定でサンプル PDF を保存（${pageCount} 枚）`}
      </button>

      <p className="spv-note">
        図柄はプレビュー用のサンプルです。用紙と問題数は<b>購入後もいつでも変更</b>して、PDF を作り直せます。
      </p>
    </div>
  );
}
