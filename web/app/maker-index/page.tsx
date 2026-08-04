import type { Metadata } from "next";
import "../maker/maker.css";

/* 内部用ツール: 作問メーカーへのリンク集。検索/シェアに乗せない（noindex）。 */
export const metadata: Metadata = {
  title: "メーカー一覧（内部用）",
  description: "内部の作問メーカーへのリンク集。",
  robots: { index: false, follow: false },
};

type Item = { href: string; name: string; desc: string };
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "模写（公開）",
    items: [
      { href: "/maker", name: "模写メーカー", desc: "模写（公開版・無料 4×4／¥980 で 5×5〜8×8）" },
    ],
  },
  {
    title: "試作（内部検証）",
    items: [
      { href: "/maker-copy-trial", name: "図形模写トライアル", desc: "「背景の点をとる」の初期検証用（本番の全メーカー＋商品PDFへ反映済み）" },
    ],
  },
  {
    title: "向き",
    items: [
      { href: "/maker-mirror", name: "鏡メーカー", desc: "線対称（左右／上下反転・軸は並び連動）" },
      { href: "/maker-rotate", name: "回転メーカー", desc: "回転（角度はサイドで指定）" },
    ],
  },
  {
    title: "重ね（2 図形）",
    items: [
      { href: "/maker-overlay", name: "重ねメーカー", desc: "図形A ＋ 図形B ＝ 重ねたかたち" },
      { href: "/maker-decompose", name: "分解メーカー", desc: "正解の図 − 引くもの ＝ のこり" },
      { href: "/maker-fold", name: "折り重ねメーカー", desc: "問題1を折り返して問題2に重ねる" },
    ],
  },
  {
    title: "変形",
    items: [
      { href: "/maker-scale", name: "拡大メーカー", desc: "整数倍（×2／×3）" },
      { href: "/maker-shrink", name: "縮小メーカー", desc: "分数倍（1/2／1/3）" },
      { href: "/maker-translate", name: "移動メーカー", desc: "起点★→移動先●へ移動" },
    ],
  },
  {
    title: "欠け補完",
    items: [
      { href: "/maker-fill", name: "欠け補完メーカー", desc: "完成図から線を抜く（F／R モード）" },
    ],
  },
];

export default function MakerIndexPage() {
  return (
    <>
      <header className="maker-header">
        <div className="logo-cluster">
          <img className="logo-img" src="/assets/logo-horizontal.png" alt="TENZU" />
          <div className="app-name">メーカー一覧（内部用）</div>
        </div>
      </header>
      <main className="mi-wrap">
        <p className="mi-intro">
          内部の作問メーカー一覧。カードのリンクから直接ひらけます（このページは noindex）。
        </p>
        {GROUPS.map((g) => (
          <section key={g.title} className="mi-group">
            <h2>{g.title}</h2>
            <div className="mi-list">
              {g.items.map((m) => (
                <a key={m.href} href={m.href} className="mi-card">
                  <span className="mi-name">{m.name}</span>
                  <span className="mi-desc">{m.desc}</span>
                  <span className="mi-url">{m.href}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
