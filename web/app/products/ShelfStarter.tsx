/* =========================================================================
   /products 棚の 1 画面目：値段・紙面・最初の 1 冊
   広告（¥200 の広告文）から着地した人に、何がいくらでどんな紙で届くかを
   1 画面で見せ、最初の 1 冊の商品ページへ 1 タップで渡す。
   紙面は published の 1〜3 問目を、商品 PDF と同じ並び（みほん → 白紙の点）で
   縮小描画する＝published/{sku}.json を再発行すれば自動で追随する。
   ========================================================================= */

import { publishedSet } from "./problems/published";
import { PRICE, QUESTIONS_PER_VOL, volBySku } from "./data";
import type { EdgeT } from "./problems/schema";

/* 最初の 1 冊（模写 入門編 Vol.1＝TaskListPage の「★ いちばんやさしい巻」と同じ巻） */
const STARTER_SKU = "copy-lv1-vol1";

const INK = "#3A424E";
const DOT = "#A9AFB9";
const ARROW = "#9AA0AA";

/* A4 縦の縮小紙面（150 × 212 ≒ 1 : 1.414） */
const SHEET_W = 150;
const SHEET_H = 212;
const BOX = 40;          // 1 盤面の一辺
const LEFT_X = 22;       // みほん
const RIGHT_X = 88;      // 白紙の点
const ROW_Y = [30, 92, 154];

function Board({ x, y, n, edges }: { x: number; y: number; n: number; edges?: EdgeT[] }) {
  const p = (i: number) => (BOX * i) / Math.max(1, n - 1);
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      dots.push(<circle key={`${c}-${r}`} cx={x + p(c)} cy={y + p(r)} r={1.5} fill={DOT} />);
    }
  }
  return (
    <g>
      {dots}
      {edges?.map(([a, b], i) => (
        <line key={i} x1={x + p(a[0])} y1={y + p(a[1])} x2={x + p(b[0])} y2={y + p(b[1])}
          stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      ))}
    </g>
  );
}

function StarterSheet({ sku }: { sku: string }) {
  const problems = publishedSet(sku)?.problems.slice(0, ROW_Y.length) ?? [];
  return (
    <svg className="shelf-start-sheet" viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      role="img" aria-label="模写 入門編 Vol.1 の 1 ページ目（みほんを見て、右の点に同じ形を書く）">
      <rect x={0.5} y={0.5} width={SHEET_W - 1} height={SHEET_H - 1} fill="#FFFFFF" stroke="#D9D6CE" />
      {problems.map((pr, i) => {
        if (pr.grid.type !== "square") return null;
        const y = ROW_Y[i];
        const mid = y + BOX / 2;
        return (
          <g key={pr.id}>
            <Board x={LEFT_X} y={y} n={pr.grid.n} edges={pr.edges} />
            <line x1={LEFT_X + BOX + 7} y1={mid} x2={RIGHT_X - 9} y2={mid} stroke={ARROW} strokeWidth={1} />
            <path d={`M${RIGHT_X - 12},${mid - 3} L${RIGHT_X - 8},${mid} L${RIGHT_X - 12},${mid + 3}`}
              fill="none" stroke={ARROW} strokeWidth={1} />
            <Board x={RIGHT_X} y={y} n={pr.grid.n} />
          </g>
        );
      })}
    </svg>
  );
}

export default function ShelfStarter() {
  const hit = volBySku(STARTER_SKU);
  if (!hit || hit.vol.status !== "live") return null;
  return (
    <div className="shelf-start">
      <figure className="shelf-start-fig">
        <StarterSheet sku={STARTER_SKU} />
        <figcaption>模写 入門編 Vol.1 の 1 ページ目</figcaption>
      </figure>
      <div className="shelf-start-body">
        <p className="shelf-start-price">
          <b>1 冊 ¥{PRICE}</b><span>税込・{QUESTIONS_PER_VOL} 問</span>
        </p>
        <p className="shelf-start-how">
          PDF をダウンロードして、おうちのプリンタで印刷します。サブスクなし、1 冊から買えます。
          はじめての 1 冊なら、模写の入門編から。
        </p>
        <a className="btn-strong shelf-start-cta" href={`/products/${STARTER_SKU}`}>
          模写 入門編を見る →
        </a>
      </div>
    </div>
  );
}
