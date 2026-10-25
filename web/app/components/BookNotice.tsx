import Link from "next/link";
import "./book-notice.css";

export default function BookNotice() {
  return <aside className="book-notice" aria-label="TENZUの書籍と購入者特典"><p className="book-notice-label">TENZUの書籍</p><h2>たす・うつす144問を、一冊に。</h2><p>『はじめての点図形（点描写）』をお持ちの方は、本と同じ問題のプリントPDFを受け取れます。</p><Link href="/book/hajimete">本をお持ちの方へ · PDFを受け取る →</Link></aside>;
}
