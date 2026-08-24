/* =========================================================================
   商品／タスクページの OG・商品構造化データ用画像（1200×630）。
   SKU ごとの識別情報と点格子をコードで描き、商品ページの Product.image からも
   同じ公開 URL を参照する。外部フォントに依存せず、ビルド時に静的生成できる。
   ========================================================================= */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { QUESTIONS_PER_VOL, SKU_ALIASES, taskBySlug, volBySku } from "../data";

export const dynamic = "force-static";

export const alt = "TENZU 点図形（点描写）プリント";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#FFFFFF";
const INK = "#1A1F2A";
const ACCENT = "#2C6E7F";
const SUB = "#5B6472";

async function loadLogo(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", "assets", "logo-horizontal.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolvedSlug = SKU_ALIASES[slug] ?? slug;
  const hit = volBySku(resolvedSlug);
  const task = hit?.task ?? taskBySlug(slug);
  const logo = await loadLogo();

  const code = (task?.slug ?? "TENZU").toUpperCase();
  const primary = hit
    ? `LV.${hit.vol.lv} / VOL.${hit.vol.volNo}`
    : "POINT DRAWING PRINTS";
  const secondary = hit
    ? `${hit.vol.grid.replaceAll("×", "x")} / ${QUESTIONS_PER_VOL} PROBLEMS`
    : `${task?.vols.length ?? 0} VOLUMES / 5 LEVELS`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: BG,
          borderTop: `10px solid ${ACCENT}`,
          padding: "70px 78px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} height={54} alt="TENZU" style={{ alignSelf: "flex-start" }} />
          ) : (
            <div style={{ display: "flex", color: INK, fontSize: 54, fontWeight: 700 }}>TENZU</div>
          )}
          <div style={{ display: "flex", marginTop: 78, color: ACCENT, fontSize: 30, letterSpacing: 4 }}>
            {code}
          </div>
          <div style={{ display: "flex", marginTop: 18, color: INK, fontSize: 68, fontWeight: 700 }}>
            {primary}
          </div>
          <div style={{ display: "flex", marginTop: 24, color: SUB, fontSize: 30, letterSpacing: 2 }}>
            {secondary}
          </div>
          {hit && (
            <div style={{ display: "flex", marginTop: 46, color: INK, fontSize: 28 }}>
              DIGITAL PDF · JPY 200
            </div>
          )}
        </div>

        <div
          style={{
            width: 370,
            height: 430,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#F7FAFB",
            border: "2px solid #D8E5E8",
            borderRadius: 28,
          }}
        >
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} style={{ display: "flex", gap: 48, margin: 19 }}>
              {[0, 1, 2, 3, 4].map((col) => (
                <div
                  key={col}
                  style={{
                    width: 11,
                    height: 11,
                    display: "flex",
                    borderRadius: 99,
                    background: row === col || row + col === 4 ? ACCENT : "#A9BDC2",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
