"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BOOK_VOLUMES } from "./catalog";
import type { BookPrintVolume } from "../../lib/book-print";

/** Options grouped as the book is: one group per Lv・Vol, たす before うつす. */
const LEVELS = [...new Set(BOOK_VOLUMES.map((v) => `Lv.${v.lv} Vol.${v.vol}・${v.grid}`))];

// 本番の購入後画面と同じ設定・プレビュー・保存処理。必要なときだけ読み込む。
const SkuPrintPreview = dynamic(() => import("../../products/SkuPrintPreview"), {
  loading: () => <p role="status">詳細設定を準備しています…</p>,
});

export default function BookPrintCustomizer() {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState<string>(BOOK_VOLUMES[0].sku);
  const [volume, setVolume] = useState<BookPrintVolume | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [retry, setRetry] = useState(0);
  const selected = BOOK_VOLUMES.find((v) => v.sku === sku)!;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/book/hajimete/volumes/${encodeURIComponent(sku)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          if (!controller.signal.aborted) { setExpired(res.status === 401); setError(body.error || "問題を読み込めませんでした。"); }
          return;
        }
        if (!controller.signal.aborted) setVolume(body);
      })
      .catch(() => { if (!controller.signal.aborted) setError("通信できませんでした。接続を確認してもう一度お試しください。"); });
    return () => controller.abort();
  }, [open, sku, retry]);

  return <div className="book-customizer">
    <button className="book-customizer-toggle" type="button" aria-expanded={open} aria-controls="book-print-settings" onClick={() => { setVolume(null); setError(""); setExpired(false); setOpen((value) => !value); }}><span>自分に合う紙面にする<span className="book-customizer-caption">用紙・問題数・点の大きさなど</span></span><span className="book-customizer-mark" aria-hidden="true">{open ? "−" : "＋"}</span></button>
    {open && <div id="book-print-settings">
      <label htmlFor="book-print-volume">印刷する問題</label>
      <select id="book-print-volume" value={sku} onChange={(e) => { setVolume(null); setError(""); setExpired(false); setSku(e.target.value); }}>
        {LEVELS.map((level) => <optgroup key={level} label={level}>
          {BOOK_VOLUMES.filter((v) => `Lv.${v.lv} Vol.${v.vol}・${v.grid}` === level).map((v) => <option key={v.sku} value={v.sku}>{v.from}〜{v.to}ばん · {v.label}</option>)}
        </optgroup>)}
      </select>
      <p className="book-small">本の{selected.from}〜{selected.to}ばんと同じ12問です。図の大きさは用紙と問題数で変えられます。通し番号付きのPDFは、上の<a href="#book-batch-files">まとめて保存</a>からどうぞ。</p>
      {error ? <div><p role="alert" className="book-error">{error}</p><button type="button" onClick={() => { if (expired) window.location.reload(); else { setError(""); setRetry((value) => value + 1); } }}>{expired ? "受取コードを入力し直す" : "もう一度読み込む"}</button></div>
        : volume?.sku === sku ? <SkuPrintPreview key={sku} sku={volume.sku} grid={volume.grid} problems={volume.problems} solidProblems={volume.solidProblems} purchased />
          : <p role="status">問題を読み込んでいます…</p>}
    </div>}
  </div>;
}
