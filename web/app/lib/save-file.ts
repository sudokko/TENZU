/* ブラウザへ生成ファイル（PDF）を渡す共通処理。

   iOS Safari は blob: URL に対して <a download> を無視し、内蔵ビューアで開くだけで
   保存にならない（サーバーから Content-Disposition: attachment を送っても同じ）。
   そこで iOS でだけ共有シート（Web Share API）を使う＝ネイティブの「ファイルに保存」
   「プリント」「AirDrop」が出て、iPhone ではむしろ自然な導線になる。

   ⚠️ 共有シートを iOS 限定にしているのは意図的。Windows Chrome も navigator.share を
   持つため無条件で使うと、PC ユーザーの素直なダウンロードが OS の共有シートに化ける。

   iOS 以外（と共有に失敗した iOS）は従来のアンカー経路。その際:
     - アンカーを DOM へ挿入してから click する（Safari は DOM 外の要素の click を
       無視することがある）
     - revokeObjectURL は遅延させる（click 直後に破棄すると遷移開始前で競合する） */

export type SaveResult = "shared" | "downloaded";

export async function saveFile(blob: Blob, filename: string): Promise<SaveResult> {
  // 共有シートは iOS 限定。Android Chrome も Windows Chrome も <a download> が正しく
  // 効くうえ、そちらのほうが速い（Windows で share を使うと OS の共有シートが割り込む）。
  if (isIOS() && (await tryShare(blob, filename))) return "shared";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}

async function tryShare(blob: Blob, filename: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  let file: File;
  try {
    file = new File([blob], filename, { type: blob.type });
  } catch {
    return false; // File コンストラクタ非対応
  }
  if (typeof navigator.canShare !== "function" || !navigator.canShare({ files: [file] })) {
    return false;
  }
  try {
    await navigator.share({ files: [file] });
    return true;
  } catch (e) {
    // シートを閉じただけ（AbortError）＝ユーザーの意思。ダウンロードを重ねて出さない
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false; // 共有に失敗したときだけアンカー経路へ落とす
  }
}

/* iOS / iPadOS 判定（保存方法の案内文を出し分けるためだけに使う）。
   iPadOS 13+ は UA で Mac を名乗るため、タッチ点数も併せて見る。 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
