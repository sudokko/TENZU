import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "../SiteHeader";
import { PRICE } from "../products/data";
import { SiteFooter } from "../catalog";
import { BOOK } from "./hajimete/catalog";
import BookBuyButton from "./BookBuyButton";
import BookFigure from "./BookFigure";
import "./book-lp.css";

/** 6段階。各段階の「うつす」から1問（裏表紙の6段階と同じ問題）と、その段階で変えたもの。
 *  「新しいことは必ず1つずつ」とは書かない（Lv.3 Vol.1 は盤面と交わりが同時に変わる・kdp-paperback §2.1）。 */
export const LEVELS: { lv: string; grid: string; line: ReactNode; sku: string; id: string }[] = [
  { lv: "Lv.1", grid: "3×3", line: <>まずは、<b>たて・よこ</b>の線だけ。</>, sku: "copy-lv1-vol1", id: "copy-lv1-vol1-s1-24" },
  { lv: "Lv.2", grid: "3×3", line: <>同じ3×3のまま、<b>ななめ</b>を足す。</>, sku: "copy-lv2-vol1", id: "copy-lv2-vol1-s1-22" },
  { lv: "Lv.3 Vol.1", grid: "4×4", line: <>点を<b>4×4</b>に増やして、線を<b>交わらせる</b>。</>, sku: "copy-lv3-vol1", id: "copy-lv3-vol1-s1-02" },
  { lv: "Lv.3 Vol.2", grid: "4×4", line: <>慣れた4×4で、<b>45°でないななめ</b>。</>, sku: "copy-lv3-vol2", id: "copy-lv3-vol2-s1-15" },
  { lv: "Lv.4 Vol.1", grid: "5×5", line: <><b>5×5</b>に広げたら、線は45°までに戻す。</>, sku: "copy-lv4-vol1", id: "copy-lv4-vol1-motif-s1-77" },
  { lv: "Lv.4 Vol.2", grid: "5×5", line: <>最後に、5×5で<b>45°でないななめ</b>。</>, sku: "copy-lv4-vol2", id: "copy-lv4-vol2-s1-16" },
];

const FACTS = [
  { big: String(BOOK.total), unit: "問", note: "たす72・うつす72" },
  { big: "6", unit: "段階", note: "3×3から5×5まで" },
  { big: "B5", unit: "", note: "1ページ2問、大きな図" },
  { big: "PDF", unit: "", note: "全問を何度でも印刷" },
];

/** 特典PDFでできること。受取ページの設定は商品ページと同じ印刷画面（SkuPrintPreview）なので、
 *  print-settings-guide の内容がそのまま使える。数値はそちらと print.ts に合わせる。 */
export const PRINT_CAN: { icon: IconName; title: string; note: string }[] = [
  { icon: "paper", title: "用紙を選ぶ", note: "A4・B4・A3。縦も横も" },
  { icon: "count", title: "1枚の問題数", note: "1〜12問（A4は6問まで）" },
  { icon: "big", title: "盤面を大きく", note: "1問＋下に並べると、A4のまま約10cm" },
  { icon: "dots", title: "点の大きさ", note: "小・中・大の3段階" },
  { icon: "nodots", title: "背景の点をとる", note: "形だけを見て、白い紙に写す練習に" },
  { icon: "layout", title: "見本の並び", note: "横に並べる／下に並べる" },
  { icon: "name", title: "名前・日付の欄", note: "「がつ・にち・なまえ」を1行" },
  { icon: "volume", title: "12問ずつ刷る", note: "本の1巻ぶんずつ。まとめて144問も" },
  { icon: "board", title: "じぶんでつくろう", note: "親子で出し合う、空の盤面も" },
  { icon: "tablet", title: "タブレットに書く", note: "A4横・1問で、画面いっぱいに" },
];

export type IconName = "paper" | "count" | "big" | "dots" | "nodots" | "layout" | "name" | "volume" | "board" | "tablet";

/* 特典タイルの絵。設定の中身（紙・盤面・点）を小さく描き、言葉（A4・約10cm・小中大…）を絵の中に入れる。120×80 */
const INK = "#1A1F2A";
const CORAL = "#C93A2F";
const LIGHT = "#C9CED6";
const T = { fontFamily: "var(--font-tier3-sans)", fontSize: 12, fontWeight: 600, fill: INK } as const;
const TC = { ...T, fill: CORAL } as const;

const house = (x: number, y: number, s: number, color = INK) =>
  <path d={`M${x} ${y + s}V${y + s * 0.45}L${x + s / 2} ${y}L${x + s} ${y + s * 0.45}V${y + s}Z`} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />;
const dots3 = (x: number, y: number, s: number, r = 1.4) =>
  [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => <circle key={`${i}-${j}`} cx={x + i * s / 2} cy={y + j * s / 2} r={r} fill={INK} />));
const sheet = (x: number, y: number, w: number, h: number, extra?: ReactNode, stroke = INK) =>
  <g><rect x={x} y={y} width={w} height={h} rx={1.5} fill="#fff" stroke={stroke} strokeWidth={1.1} />{extra}</g>;
const arrow = (x: number, y: number) =>
  <path d={`M${x} ${y}h10M${x + 6} ${y - 4}l4 4-4 4`} fill="none" stroke={CORAL} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />;

/** 見本の並び（横と下を左右に並べる）だけ横長にする */
const WIDE: Partial<Record<IconName, number>> = { layout: 140 };

const ART: Record<IconName, ReactNode> = {
  paper: <>
    {sheet(14, 30, 21, 30)}{sheet(46, 22, 26, 38)}{sheet(83, 12, 30, 48, undefined, CORAL)}
    <text {...T} x={24.5} y={76} textAnchor="middle">A4</text><text {...T} x={59} y={76} textAnchor="middle">B4</text><text {...TC} x={98} y={76} textAnchor="middle">A3</text>
  </>,
  count: <>
    {sheet(18, 4, 34, 50, <>{house(23, 22, 10)}{dots3(38, 23, 8, 1)}</>)}
    {sheet(68, 4, 34, 50, <>{[0, 1, 2].flatMap((r) => [0, 1].map((c) => <g key={`${r}${c}`}>{house(71 + c * 16, 9 + r * 15, 5)}{dots3(78 + c * 16, 9.5 + r * 15, 4, 0.6)}</g>))}</>, CORAL)}
    <text {...T} x={35} y={72} textAnchor="middle">1問</text><text {...TC} x={85} y={72} textAnchor="middle">6問</text>
  </>,
  big: <>
    {dots3(36, 4, 48, 2.6)}
    <path d="M36 68H84M36 64V72M84 64V72" stroke={CORAL} strokeWidth={1.2} />
    <rect x={36} y={60} width={48} height={16} fill="#fff" /><text {...TC} x={60} y={73} textAnchor="middle">約10cm</text>
  </>,
  dots: <>
    {dots3(14, 12, 22, 1)}{dots3(49, 12, 22, 1.8)}{dots3(84, 12, 22, 2.8)}
    <text {...T} x={25} y={70} textAnchor="middle">小</text><text {...T} x={60} y={70} textAnchor="middle">中</text><text {...TC} x={95} y={70} textAnchor="middle">大</text>
  </>,
  nodots: <>
    {house(14, 14, 32)}{arrow(54, 34)}
    <rect x={72} y={8} width={38} height={44} rx={2} fill="none" stroke={LIGHT} strokeWidth={1} />{house(75, 14, 32, CORAL)}
    <text {...TC} x={91} y={72} textAnchor="middle">点なし</text>
  </>,
  layout: <>
    {house(8, 18, 26)}{dots3(44, 20, 22, 1.5)}
    <text {...T} x={37} y={74} textAnchor="middle">横</text>
    <path d="M80 8V72" stroke={LIGHT} strokeWidth={1} />
    {house(100, 4, 26)}{dots3(102, 38, 22, 1.5)}
    <text {...TC} x={113} y={74} textAnchor="middle">下</text>
  </>,
  name: <>
    {sheet(14, 6, 92, 62, <>
      <text {...TC} x={20} y={18} fontSize={9}>がつ　にち　なまえ</text>
      <path d="M18 21H102" stroke={CORAL} strokeWidth={0.8} />
      {house(30, 32, 20)}{arrow(58, 42)}{dots3(76, 32, 20, 1.3)}
    </>)}
  </>,
  volume: <>
    {sheet(40, 18, 44, 54)}{sheet(36, 13, 44, 54)}{sheet(32, 8, 44, 54, <text {...TC} x={54} y={42} textAnchor="middle" fontSize={16}>12</text>)}
    <text {...T} x={88} y={46}>問</text>
  </>,
  board: <>
    <rect x={30} y={10} width={44} height={44} rx={2} fill="#fff" stroke={LIGHT} />{dots3(38, 18, 28, 1.6)}
    <g transform="translate(66 46) rotate(-40)"><path d="M0 0L8 -3V3Z" fill="#E9D7B9" stroke={INK} strokeWidth={0.7} /><rect x={8} y={-3} width={34} height={6} fill={CORAL} stroke={INK} strokeWidth={0.7} /></g>
    <text {...T} x={52} y={72} textAnchor="middle">空の盤面</text>
  </>,
  tablet: <>
    <rect x={12} y={8} width={96} height={64} rx={7} fill={INK} /><rect x={17} y={13} width={86} height={54} rx={2} fill="#fff" />
    {house(26, 28, 22)}{arrow(54, 40)}{dots3(72, 29, 20, 1.3)}
  </>,
};

function PrintArt({ name }: { name: IconName }) {
  const w = WIDE[name] ?? 120;
  return <svg className={`booklp-art${WIDE[name] ? " booklp-art--wide" : ""}`} viewBox={`0 0 ${w} 80`} aria-hidden="true">{ART[name]}</svg>;
}

const FITS = ["点つなぎの次を探している", "点図形にはじめて取り組む", "紙とえんぴつで練習させたい"];

const FAQ = [
  { q: "何才から使えますか？", a: "4〜6才ごろが目安です。点から点へ線が引けるようになったら始めどきです。" },
  { q: "特典PDFはどう受け取りますか？", a: `本の${BOOK.codePage}ページにある受取コードを、TENZUのサイトで入力します。期限なし・メール登録なしです。` },
  { q: "答えのページはありますか？", a: "見本がそのまま答えです。描き終えたら、見本と見比べます。" },
];

function Check() {
  return <svg className="booklp-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
}

/** 6段階を縦に畳みかけ、6 × 24 = 144 で締める。 */
export function LevelSteps() {
  return <section className="booklp-levels" aria-labelledby="booklp-levels-title">
    <div className="booklp-head">
      <p className="booklp-eyebrow">はじめてのための設計</p>
      <h2 id="booklp-levels-title">むずかしさを、<br />6つに刻みました。</h2>
    </div>
    <ol className="booklp-steps">
      {LEVELS.map((l, i) => <li key={l.sku} className="booklp-step">
        <span className="booklp-step-no" aria-hidden="true">{i + 1}</span>
        <div className="booklp-step-fig"><BookFigure sku={l.sku} id={l.id} /></div>
        <div className="booklp-step-text">
          <span className="booklp-step-lv">{l.lv}・{l.grid}</span>
          <span className="booklp-step-line">{l.line}</span>
        </div>
      </li>)}
    </ol>
    <div className="booklp-sum">
      <p>しかも、どの段階も</p>
      <p className="booklp-sum-flow"><b>たす</b>12問<span aria-hidden="true">→</span><b>うつす</b>12問</p>
      <p className="booklp-sum-note">足りない線を書き足してから、形をまるごと写す。</p>
      <p className="booklp-sum-eq"><span>6段階</span>×<span>24問</span>=<b>{BOOK.total}問</b></p>
    </div>
  </section>;
}

/** 特典PDFでできることを2列のタイルで一気に見せる。 */
export function PrintTiles() {
  return <section className="booklp-pdf" aria-labelledby="booklp-pdf-title">
    <div className="booklp-head">
      <p className="booklp-eyebrow">購入者特典</p>
      <h2 id="booklp-pdf-title">特典PDFで、<br />ここまで変えて刷れます。</h2>
      <p className="booklp-lead">本と同じ{BOOK.total}問を、その子に合う紙面で。何度刷っても、追加料金はかかりません。</p>
    </div>
    <ul className="booklp-can">
      {PRINT_CAN.map((c) => <li key={c.title}>
        <PrintArt name={c.icon} />
        <span className="booklp-can-title">{c.title}</span>
        <span className="booklp-can-note">{c.note}</span>
      </li>)}
    </ul>
    <p className="booklp-pdf-foot">期限なし・メール登録なし。家のプリンターでも、スマホに保存してコンビニでも。</p>
    <BookBuyButton place="middle" withPrice />
  </section>;
}

/** 紹介ページの枠。表紙・特徴 → children（段階と特典PDF）→ 合う家庭・質問・購入。 */
export default function BookLanding({ children, banner }: { children: ReactNode; banner?: ReactNode }) {
  return <><SiteHeader />{banner}<main className="booklp">
    <section className="booklp-hero" aria-labelledby="booklp-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="booklp-cover" src={BOOK.cover} width={1075} height={1519} alt={`${BOOK.title}の表紙`} />
      <h1 id="booklp-title">{BOOK.title}</h1>
      <p className="booklp-sub">{BOOK.subtitle}</p>
      <p className="booklp-price">¥{BOOK.price.toLocaleString("ja-JP")}<span>税込</span></p>
      <BookBuyButton place="hero" />
    </section>

    <section className="booklp-facts" aria-label="この本の特徴">
      {FACTS.map((f) => <div key={f.big} className="booklp-fact">
        <span className="booklp-fact-big">{f.big}{f.unit && <small>{f.unit}</small>}</span>
        <span className="booklp-fact-note">{f.note}</span>
      </div>)}
    </section>

    {children}

    <section className="booklp-fits" aria-labelledby="booklp-fits-title">
      <h2 id="booklp-fits-title">こんなときに</h2>
      <ul>{FITS.map((t) => <li key={t}><Check />{t}</li>)}</ul>
    </section>

    <section className="booklp-faq" aria-labelledby="booklp-faq-title">
      <h2 id="booklp-faq-title">よくある質問</h2>
      {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
    </section>

    <section className="booklp-bottom" aria-label="購入">
      <BookBuyButton place="bottom" withPrice />
      <Link className="booklp-try" href="/products">本は買わずに、サイトで1巻（¥{PRICE}）から試す</Link>
      <p className="booklp-note">本をお持ちの方は <a href={BOOK.href}>特典PDFの受け取り</a> へ。</p>
    </section>
  </main><SiteFooter /></>;
}
