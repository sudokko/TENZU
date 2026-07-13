/* 画像のクライアント縮小（アップロード前）。
   カードのサムネは 64px 表示なので長辺 512px あれば十分（Retina ×2 でも余裕）。
   webp q0.85 を優先し、toBlob が webp を返せないブラウザでは jpeg q0.85 に
   フォールバックする（jpeg は透過を持てないため白を敷く）。 */

const MAX_EDGE = 512;

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas が使えません");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const toBlob = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    const webp = await toBlob("image/webp", 0.85);
    if (webp && webp.type === "image/webp") return webp;

    // jpeg フォールバック: 透過部が黒くならないよう背面に白を敷く
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    const jpeg = await toBlob("image/jpeg", 0.85);
    if (jpeg) return jpeg;

    throw new Error("画像の変換に失敗しました");
  } finally {
    bitmap.close();
  }
}
