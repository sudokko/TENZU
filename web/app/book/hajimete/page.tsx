import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import SiteHeader from "../../SiteHeader";
import { SiteFooter } from "../../catalog";
import { BOOK_COOKIE, readBookSession } from "../../lib/book-auth";
import { bookFiles } from "../../lib/book-files";
import { BOOK, BOOK_NEXT, BOOK_VOLUMES } from "./catalog";
import { volBySku } from "../../products/data";
import BookDownloads from "./BookDownloads";
import BookNextLink from "./BookNextLink";
import BookPattern from "./BookPattern";
import BookSurveyBand from "./BookSurveyBand";
import { SURVEY_COOKIE } from "../../lib/survey-store";
import "../../products/product.css";
import "./book.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${BOOK.title} 購入者特典のPDF受け取り`,
  description: `TENZUの書籍『${BOOK.title}』をお持ちの方へ。本と同じ${BOOK.total}問を、A4でくり返し印刷できます。受取コードでダウンロード。メール登録不要。`,
  alternates: { canonical: BOOK.href },
};

/** A shelf link that names the task, its level and board, and says it is not in the book. */
function NextItem({ sku, child, name, group }: { sku: string; child: string; name: string; group: "tasks" | "more" }) {
  const hit = volBySku(sku);
  if (!hit) return null;
  return <BookNextLink href={`/products/${sku}`} sku={sku} group={group}>
    <span className="book-next-name">{child}</span>
    <span className="book-next-kind">{name}・Lv.{hit.vol.lv}・{hit.vol.grid}</span>
    <span className="book-next-cta">見本と中身を見る <span aria-hidden="true">→</span></span>
  </BookNextLink>;
}

export default async function BookPage() {
  const jar = await cookies();
  const authorized = readBookSession(jar.get(BOOK_COOKIE)?.value);
  const files = await bookFiles();
  return <><SiteHeader /><main className="book-wrap">
    <section className="book-usage-intro" id="usage" aria-labelledby="book-page-title">
      <p className="book-eyebrow">『{BOOK.title}』購入者特典</p>
      <h1 id="book-page-title">ご家庭で、<br className="book-mobile-break" />くり返しどうぞ。</h1>
      <p className="book-intro-lead">本と同じ{BOOK.total}問を、いつでも。大きく印刷したい日も、1問だけの日も。</p>
      <p className="book-small">追加料金なし・期限なし・メール登録不要</p>
    </section>
    <BookDownloads authorized={authorized} files={files} />
    {authorized && <BookSurveyBand answered={jar.has(SURVEY_COOKIE)} />}
    <section className="book-section book-next" id="next" aria-labelledby="book-next-title">
      <p className="book-eyebrow">本の先にある7つの課題</p>
      <h2 id="book-next-title">写せたら、<br className="book-mobile-break" />次は形を変えて描く。</h2>
      <p className="book-small">鏡にうつす・回す・重ねるなど、この本に入っていない7つの課題です。平面の課題は3×3から、立体はLv.3・9×9から始まります。</p>
      <div className="book-next-grid">{BOOK_NEXT.tasks.map((t) => <NextItem key={t.sku} {...t} group="tasks" />)}</div>
      <p className="book-small book-next-guide">どれから始めるか迷ったら、<Link href="/level-guide">レベル選びガイド</Link>へ。</p>
    </section>
    <section className="book-section book-next" id="more" aria-labelledby="book-more-title">
      <p className="book-eyebrow">うつす・たすの続き</p>
      <h2 id="book-more-title">点を増やして、<br className="book-mobile-break" />もう一歩。</h2>
      <p className="book-small">本の最後は5×5でした。Lv.5は6×6から8×8の点で、この本の続きに取り組めます。</p>
      <div className="book-next-grid">{BOOK_NEXT.more.map((t) => <NextItem key={t.sku} {...t} group="more" />)}</div>
      <p className="book-small">どの巻も1巻12問のPDFで、1巻から買えます。定期購入ではありません。買ったあとも印刷設定を変えて、PDFを作り直せます。</p>
    </section>
    <section className="book-section book-maker" id="makers" aria-labelledby="book-maker-title">
      <h2 id="book-maker-title">自分で問題を作る</h2>
      <div className="book-maker-board">
        <figure><BookPattern kind="maker" label="点をつないで家の形を作る例" /><figcaption>点をつなぐ → 紙にする</figcaption></figure>
        <p>好きな形や、<br />迷った形に似た問題を、<br />そのままPDFへ。</p>
      </div>
      <div className="book-maker-actions"><Link className="book-maker-primary" href="/maker">無料の模写メーカーを試す →</Link><Link className="book-maker-more" href="/makers">メーカーの種類を見る →</Link></div>
      <p className="book-small">模写メーカーは4×4まで、問題を作るのもPDF保存も無料です。模写の5×5以上と、ほかのメーカーのPDF保存は、メーカーごとの買い切りです。ほかのメーカーも、買う前に画面で問題を作って試せます。</p>
    </section>
    <section className="book-section book-help" aria-label="利用条件とサポート">
      <details className="book-disclosure"><summary>ご家庭で使うときのお願い</summary><p>本書をご購入の方は、購入者ご本人と同じご家庭のお子さん・きょうだいの練習用に、何度でも保存・印刷できます。PDFや受取コードの転載・再配布・販売はできません。</p><p>教室・塾・施設などで複数の家庭へ配布して使いたい場合は、<Link href="/contact">お問い合わせ</Link>ください。</p></details>
      <details className="book-disclosure"><summary>保存・コードで困ったとき</summary><p>受取コードは本書{BOOK.codePage}ページにあります。全角でも入力できます。保存先はブラウザのダウンロード一覧や端末の「ファイル」から確認できます。通信状態を確かめ、もう一度お試しください。別の端末でも同じコードで受け取れます。</p><p>コードが見当たらない、以前の版の案内と異なるなど、お困りの場合は書籍名と状況を<Link href="/contact">お問い合わせ</Link>からお知らせください。注文情報の送信は不要です。</p></details>
      <details className="book-disclosure"><summary>この本に入っている巻（買い直す必要はありません）</summary><p>本のLv.・Vol.は、TENZUのWebのプリントと同じです。次の12巻の問題は、この特典で何度でも印刷できます。</p>
        <ul className="book-volume-list">{BOOK_VOLUMES.map((v) => <li key={v.sku}>{v.from}〜{v.to}ばん：{v.label}・{v.grid}</li>)}</ul></details>
      <details className="book-disclosure"><summary>PDFの更新・訂正について</summary><p>特典PDF 第{BOOK.edition}版 · 更新日 {BOOK.updatedAt}。問題の訂正があったときは、ここでお知らせします。受取先の変更があっても、このURLから案内します。</p></details>
    </section>
  </main><SiteFooter /></>;
}
