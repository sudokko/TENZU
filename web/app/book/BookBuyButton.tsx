"use client";
import { trackBookEvent } from "../analytics";
import { BOOK } from "./hajimete/catalog";

/** Amazon への購入ボタン。発売前（amazonUrl が空）は押せない「近日発売」を出す。place はどのボタンかを計測で分けるため。 */
export default function BookBuyButton({ place, withPrice }: { place: "hero" | "middle" | "bottom"; withPrice?: boolean }) {
  const price = withPrice ? <span className="booklp-buy-price">¥{BOOK.price.toLocaleString("ja-JP")}</span> : null;
  if (!BOOK.amazonUrl) return <span className="booklp-buy booklp-buy--soon" aria-disabled="true">Amazonで近日発売{price}</span>;
  return <a className="booklp-buy" href={BOOK.amazonUrl} target="_blank" rel="noopener"
    onClick={() => trackBookEvent("book_amazon_click", place)}>Amazonで購入する{price}</a>;
}
