/* =========================================================================
   メーカー共通・PDF 書き出し（jsPDF ＋ ページ SVG → 300dpi PNG 焼き込み）
   window.print() はスマホで使いものにならないため、ファイルとして
   ダウンロードさせる（コンビニ印刷・プリンタアプリにもそのまま渡せる）。
   ファイル名は tenzu_*_yyyymmddhhmm.pdf — 上書き事故防止のタイムスタンプ命名。
   ========================================================================= */

import { PAPER, type PaperKey } from "../../products/print";
import { loadLogo, svgToPng, type LogoInfo } from "./page-svg";

export async function exportPdf(opts: {
  paper: typeof PAPER[PaperKey];
  pageCount: number;
  buildPage: (pageIndex: number, logo: LogoInfo | null) => string;
  filename: (stamp: string) => string;
}): Promise<void> {
  const { paper } = opts;
  const { jsPDF } = await import("jspdf");
  const logo = await loadLogo();
  const orientation = paper.landscape ? "landscape" : "portrait";
  const format: [number, number] = [Math.min(paper.w, paper.h), Math.max(paper.w, paper.h)];
  const doc = new jsPDF({ orientation, unit: "mm", format });
  for (let pi = 0; pi < opts.pageCount; pi++) {
    if (pi > 0) doc.addPage(format, orientation);
    const svg = opts.buildPage(pi, logo);
    const png = await svgToPng(svg, paper.w, paper.h);
    doc.addImage(png, "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
  }
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}`;
  doc.save(opts.filename(stamp));
}
