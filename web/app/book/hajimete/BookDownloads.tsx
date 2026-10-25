"use client";

import { useState, type FormEvent } from "react";
import { trackBookEvent } from "../../analytics";
import { saveFile } from "../../lib/save-file";
import BookPrintCustomizer from "./BookPrintCustomizer";
import BookPattern from "./BookPattern";
import { BOOK } from "./catalog";

type FileItem = { id: string; label: string; detail: string; bytes: number; ready: boolean };
/** Shown as the two large buttons; the per-task files sit in the disclosure. */
const PRIMARY = ["all", "sheets"];
export default function BookDownloads({ authorized, files }: { authorized: boolean; files: FileItem[] }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function unlock(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy("unlock");
    try {
      const res = await fetch("/api/book/hajimete/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      trackBookEvent("book_unlock");
      window.location.reload();
    } catch { setError("通信できませんでした。接続を確認してもう一度お試しください。"); }
    finally { setBusy(null); }
  }
  async function download(file: FileItem) {
    setBusy(file.id); setError("");
    try {
      const res = await fetch(`/api/book/hajimete/files/${file.id}`);
      if (!res.ok) {
        if (res.status === 401) { window.location.reload(); return; }
        const data = await res.json(); setError(data.error); return;
      }
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "tenzu-hajimete.pdf";
      await saveFile(blob, filename);
      trackBookEvent("book_pdf_download", file.id);
    } catch { setError("PDFを取得できませんでした。通信状態を確認して再度お試しください。"); }
    finally { setBusy(null); }
  }
  return <section className="book-panel" id="receive" aria-labelledby="receive-title">
    <h2 id="receive-title" className="book-sr-only">購入者特典のPDFを受け取る</h2>
    {!authorized ? <form onSubmit={unlock} className="book-unlock">
      <label htmlFor="book-code">本書{BOOK.codePage}ページにある受取コード</label>
      <p id="code-help" className="book-small">「この本の144問を、わが子に合う一枚に。」のページの下にあります。全角・半角、大文字・小文字で入力できます。</p>
      <div className="book-code-row"><input id="book-code" name="code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={100} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby={`code-help${error ? " book-error" : ""}`} aria-invalid={Boolean(error)} />
      <button type="submit" disabled={busy !== null}>{busy === "unlock" ? "確認しています…" : "PDFを受け取る"}</button></div>
      <p className="book-small">別の端末や、しばらく経ってからの再取得も、同じコードでどうぞ。</p>
    </form> : <>
      <p className="book-confirmed">コードを確認しました</p>
      <div className="book-primary-files" id="book-batch-files">{files.filter((f) => PRIMARY.includes(f.id)).map((f) => <FileButton key={f.id} file={f} busy={busy} download={download} primary />)}</div>
      <details className="book-task-files book-disclosure"><summary>「たす」「うつす」だけのPDFを選ぶ</summary><div className="book-file-grid">{files.filter((f) => !PRIMARY.includes(f.id)).map((f) => <FileButton key={f.id} file={f} busy={busy} download={download} />)}</div></details>
      <BookPrintCustomizer />
    </>}
    {error && <p id="book-error" role="alert" className="book-error">{error}</p>}
  </section>;
}
function FileButton({ file, busy, download, primary = false }: { file: FileItem; busy: string | null; download: (file: FileItem) => void; primary?: boolean }) {
  if (primary) return <button className={`book-download-option${file.id === "all" ? " book-download-option--questions" : ""}`} type="button" disabled={busy !== null || !file.ready} onClick={() => download(file)} aria-label={`${file.label}をダウンロード`}>
    <BookPattern kind={file.id === "all" ? "problem" : "answer"} />
    <span className="book-download-title">{file.id === "all" ? "問題PDF" : "じぶんでつくろう"}</span>
    <span className="book-download-meta">{file.id === "all" ? "144問 ／ A4・白黒 ／ 本と同じ番号" : "親子で出し合う、空いた盤面"}</span>
    <span className="book-download-meta">{file.bytes ? `${(file.bytes / 1024 / 1024).toFixed(1)} MB` : "準備中"}</span>
    <span className="book-download-action">{busy === file.id ? "取得しています…" : file.id === "all" ? "まとめて保存" : "シートを保存"}<span aria-hidden="true">↓</span></span>
  </button>;
  return <div className="book-file"><h3>{file.label}</h3><p>{file.detail}</p><p className="book-small">PDF · A4縦 · {file.bytes ? `${(file.bytes / 1024 / 1024).toFixed(1)} MB` : "準備中"}</p><button type="button" disabled={busy !== null || !file.ready} onClick={() => download(file)}>{busy === file.id ? "取得しています…" : "PDFをダウンロード"}</button></div>;
}
