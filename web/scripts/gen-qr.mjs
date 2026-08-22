/* =========================================================================
   PDF 広告フッターの QR を SVG パスとして焼き込む（ビルド時・一度きり）
   QR の中身は https://tenzu.jp の固定 1 本なので、実行時にライブラリを積む
   必要がない。モジュール行列 → 横方向にランレングス結合した path データへ
   変換し、TS 定数として app/maker/core/qr-tenzu.ts へ書き出す。
   ベクタのまま PDF へ入るため 300dpi 焼き込みでもエッジが甘くならない。

   使い方: node scripts/gen-qr.mjs   （URL を変えたときだけ再実行してコミット）
   ========================================================================= */
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TEXT = "https://tenzu.jp";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "maker", "core", "qr-tenzu.ts");

// クワイエットゾーンは path に含めない。用紙側の白（URL との間隔・ページ余白）が
// その役目を果たすため、シンボル自体を最大寸で描いて 1 モジュールの実寸を稼ぐ。
const qr = QRCode.create(TEXT, { errorCorrectionLevel: "M" });
const size = qr.modules.size;
const bits = qr.modules.data;

// 暗モジュールを行ごとに水平結合して path 化（rect を並べるより 3〜4 割短い）
let d = "";
for (let r = 0; r < size; r++) {
  let c = 0;
  while (c < size) {
    if (!bits[r * size + c]) { c++; continue; }
    let run = 1;
    while (c + run < size && bits[r * size + c + run]) run++;
    d += `M${c} ${r}h${run}v1h-${run}z`;
    c += run;
  }
}

// 自己検証: path を行列へ逆変換し、ライブラリの行列と全モジュール一致するか確かめる。
// ここが通らないまま書き出すと「読めない QR」が PDF に焼かれて気づけないため必須。
{
  const back = new Uint8Array(size * size);
  const re = /M(\d+) (\d+)h(\d+)v1h-\3z/g;
  let m, consumed = 0;
  while ((m = re.exec(d)) !== null) {
    const c = +m[1], r = +m[2], run = +m[3];
    for (let i = 0; i < run; i++) back[r * size + c + i] = 1;
    consumed += m[0].length;
  }
  if (consumed !== d.length) throw new Error(`path に未消化の断片: ${consumed}/${d.length}`);
  let diff = 0;
  for (let i = 0; i < size * size; i++) if ((bits[i] & 1) !== back[i]) diff++;
  if (diff) throw new Error(`path が行列と不一致: ${diff} モジュール`);

  let art = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) art += back[r * size + c] ? "██" : "  ";
    art += "\n";
  }
  console.log(art);
}

const ts = `/* =========================================================================
   PDF 広告フッターの QR（https://tenzu.jp）— 自動生成・手で編集しない
   生成: node scripts/gen-qr.mjs（qrcode / 誤り訂正レベル M / クワイエットゾーンなし）
   座標系はモジュール単位（0..${size}）。描画側で一辺 mm に scale して使う。
   ========================================================================= */

export const QR_URL = ${JSON.stringify(TEXT)};

// 一辺のモジュール数（クワイエットゾーンを含まない素のシンボル）
export const QR_MODULES = ${size};

// 暗モジュールの塗り path（fill-rule 不問・重なりなし）
export const QR_PATH = ${JSON.stringify(d)};
`;

writeFileSync(OUT, ts, "utf8");
console.log(`generated ${OUT}\n  text=${TEXT}  modules=${size}x${size}  path=${d.length} chars`);
