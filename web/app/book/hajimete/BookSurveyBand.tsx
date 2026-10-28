"use client";

/* 受取ページのアンケートの帯（kdp-paperback §2.4）。初めて PDF を保存した日より後に、また来た人にだけ出す
   （1回目は印刷したいだけなので声をかけない）。答えた人・閉じた人には出さない。モーダルにはしない（decisions §3）。 */

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { trackBookEvent } from "../../analytics";
import { BOOK } from "./catalog";

/** 初めて特典 PDF を保存した日（端末の日付 YYYY-MM-DD）。BookDownloads が保存のたびに、無ければ書く。 */
const FIRST_SAVE_KEY = "tenzu_book_first_save";
const CLOSED_KEY = "tenzu_book_survey_band";
const CHANGED = "tenzu-book-survey-band";
const today = () => new Date().toLocaleDateString("sv-SE");

export function noteBookSave() {
  try { if (!localStorage.getItem(FIRST_SAVE_KEY)) localStorage.setItem(FIRST_SAVE_KEY, today()); } catch { /* 保存できない端末では帯を出さないだけ */ }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGED, onChange); window.removeEventListener("storage", onChange); };
}
function due() {
  try {
    const first = localStorage.getItem(FIRST_SAVE_KEY);
    return Boolean(first && first < today() && !localStorage.getItem(CLOSED_KEY));
  } catch { return false; /* localStorage が使えなければ出さない */ }
}
function close() {
  try { localStorage.setItem(CLOSED_KEY, today()); } catch { /* 閉じられない端末でも、この画面では消す */ }
  window.dispatchEvent(new Event(CHANGED));
}

export default function BookSurveyBand({ answered }: { answered: boolean }) {
  const show = useSyncExternalStore(subscribe, due, () => false);
  if (answered || !show) return null;
  return <aside className="book-survey-band" aria-label="アンケートのお願い">
    <p><strong>使ってみて、いかがですか。</strong>7つの質問・2分ほど。答えてくださった方に ¥100 OFF クーポンをお渡しします。</p>
    <div className="book-survey-band-actions">
      <Link href={`${BOOK.href}/bookenq?from=band`} onClick={() => trackBookEvent("book_survey_open", "band")}>アンケートに答える →</Link>
      <button type="button" onClick={close}>閉じる</button>
    </div>
  </aside>;
}
