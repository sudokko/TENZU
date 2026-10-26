"use client";

import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { trackBookEvent } from "../../analytics";
import { saveFile } from "../../lib/save-file";
import BookPrintCustomizer from "./BookPrintCustomizer";
import BookPattern from "./BookPattern";
import { BOOK } from "./catalog";

type FileItem = { id: string; label: string; detail: string; bytes: number; ready: boolean };
/** Shown as the two large buttons; the per-task files sit in the disclosure. */
const PRIMARY = ["all", "sheets"];
/** The printed code HJ1-XXXX-XXXX in three boxes, so nobody wonders whether to type the hyphens. */
const CODE_PARTS = [{ size: 3, hint: "HJ1" }, { size: 4, hint: "XXXX" }, { size: 4, hint: "XXXX" }];
/** Letters and digits only, half-width capitals: the hyphens are drawn between the boxes. */
const codeChars = (s: string) => s.normalize("NFKC").toUpperCase().replace(/[^0-9A-Z]/g, "");
export default function BookDownloads({ authorized, files }: { authorized: boolean; files: FileItem[] }) {
  const [parts, setParts] = useState(["", "", ""]);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  /** Fills boxes from `from` onward, so a whole pasted or typed code spreads over the remaining boxes. */
  function fill(from: number, raw: string) {
    let rest = codeChars(raw);
    const next = [...parts];
    let at = from;
    next[at] = "";
    while (at < CODE_PARTS.length) {
      next[at] = rest.slice(0, CODE_PARTS[at].size); rest = rest.slice(CODE_PARTS[at].size);
      if (!rest || at === CODE_PARTS.length - 1) break;
      at++;
    }
    // Move on only when typing filled the box, not when a full box is being corrected.
    const grew = next.join("").length > parts.join("").length;
    setParts(next);
    const full = grew && next[at].length === CODE_PARTS[at].size && at < CODE_PARTS.length - 1;
    boxes.current[full ? at + 1 : at]?.focus();
  }
  function paste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = codeChars(e.clipboardData.getData("text"));
    // A whole code pasted into any box starts from the first box.
    fill(text.startsWith("HJ") ? 0 : i, text);
  }
  function back(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !parts[i] && i > 0) boxes.current[i - 1]?.focus();
  }
  async function unlock(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy("unlock");
    try {
      const code = parts.join("-");
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
      <p id="code-help" className="book-small">「この本の144問を、わが子に合う一枚に。」のページの下にあります。ハイフン（-）は入力しなくて大丈夫です。3つの枠に分けて入れてください。まとめて貼り付けても入ります。全角・半角、大文字・小文字どちらでもかまいません。</p>
      <div className="book-code-row">
        <div className="book-code-boxes" role="group" aria-label="受取コード">
          {CODE_PARTS.map((p, i) => <span key={i} className="book-code-part">
            {i > 0 && <span className="book-code-dash" aria-hidden="true">-</span>}
            <input id={i === 0 ? "book-code" : undefined} ref={(el) => { boxes.current[i] = el; }} name={`code${i + 1}`} value={parts[i]}
              onChange={(e) => { if (!(e.nativeEvent as InputEvent).isComposing) fill(i, e.target.value); else setParts(parts.map((v, j) => j === i ? e.target.value : v)); }}
              onCompositionEnd={(e) => fill(i, e.currentTarget.value)} onPaste={(e) => paste(i, e)} onKeyDown={(e) => back(i, e)}
              required size={p.size} placeholder={p.hint} autoCapitalize="characters" autoComplete="off" spellCheck={false}
              aria-label={`受取コード ${i + 1}つ目（${p.size}文字）`} aria-describedby={`code-help${error ? " book-error" : ""}`} aria-invalid={Boolean(error)} />
          </span>)}
        </div>
        <button type="submit" disabled={busy !== null}>{busy === "unlock" ? "確認しています…" : "PDFを受け取る"}</button>
      </div>
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
