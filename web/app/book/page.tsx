import type { Metadata } from "next";
import { BOOK } from "./hajimete/catalog";
import BookLanding, { LevelSteps, PrintTiles } from "./BookLanding";

export const metadata: Metadata = {
  title: `${BOOK.title}｜${BOOK.subtitle}`,
  description: `TENZUの本『${BOOK.title}』。たす（欠け補完）・うつす（模写）の${BOOK.total}問を、3×3から5×5まで6つの段階に。同じ${BOOK.total}問を何度でも印刷できる特典PDFつき。`,
  alternates: { canonical: BOOK.lpHref },
  // 発売前は検索に出さない（amazonUrl が入ったら index）
  robots: BOOK.amazonUrl ? undefined : { index: false, follow: true },
};

export default function BookLandingPage() {
  return <BookLanding><LevelSteps /><PrintTiles /></BookLanding>;
}
