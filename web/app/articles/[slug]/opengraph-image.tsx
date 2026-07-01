/* =========================================================================
   記事の OG 画像（1200×630）
   - 一次: frontmatter `eyecatch`（Gemini 手動生成・public 配下）があればそれを返す。
   - 二次: 未指定なら動的生成（純白＋ロゴ＋H1）。design/visual-identity 準拠
     （bg=#FFFFFF・accent=#2C6E7F・ink=#1A1F2A・見出しは Klee One）。
   - 日本語グリフは Google Fonts(Klee One) を text サブセットで取得。取得失敗時は
     日本語描画を避けてブランドのみのラテン表示に退避し、ビルドを壊さない。
   - この file convention が og:image/twitter:image を自動供給する（generateMetadata より優先）。
   ========================================================================= */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadArticle } from "../articles-data";

// 親 [slug] の generateStaticParams でビルド時に prerender（移植性: リクエスト時に頼らない）。
// フォント取得の fetch はビルド時に走る。失敗しても下でラテン表示に退避するので壊れない。
export const dynamic = "force-static";

export const alt = "TENZU の記事";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#FFFFFF";
const INK = "#1A1F2A";
const ACCENT = "#2C6E7F";
const SUB = "#5B6472";

async function loadKleeOne(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Klee+One:wght@600&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    // node の既定 UA には ttf が返る（satori は woff2 非対応）。
    const m = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

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
  const { frontmatter: fm } = await loadArticle(slug);

  // 一次: 手動 eyecatch をそのまま配信。
  if (fm.eyecatch) {
    const rel = fm.eyecatch.replace(/^\//, "");
    const abs = join(process.cwd(), "public", rel);
    if (existsSync(abs)) {
      const buf = await readFile(abs);
      const type = /\.jpe?g$/i.test(rel) ? "image/jpeg" : "image/png";
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": type } });
    }
  }

  // 二次: 動的生成。
  const title = fm.title_main ?? fm.title;
  const kicker = fm.kicker ?? fm.series ?? "TENZU";
  const logo = await loadLogo();
  const klee = await loadKleeOne(title + kicker);

  const brandRow = (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} height={48} alt="TENZU" />
      ) : (
        <div style={{ display: "flex", fontSize: 36, color: INK, fontWeight: 700 }}>TENZU</div>
      )}
    </div>
  );

  // フォント取得に失敗したら日本語を描かず、ブランドのみで安全に生成。
  if (!klee) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            background: BG,
            borderTop: `10px solid ${ACCENT}`,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} height={64} alt="TENZU" />
          ) : (
            <div style={{ display: "flex", fontSize: 72, color: INK, fontWeight: 700 }}>TENZU</div>
          )}
          <div style={{ display: "flex", fontSize: 28, color: SUB }}>tenzu.jp</div>
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          borderTop: `10px solid ${ACCENT}`,
          padding: 80,
          fontFamily: "Klee One",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: ACCENT, letterSpacing: 2 }}>
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            lineHeight: 1.32,
            color: INK,
            fontWeight: 600,
            maxWidth: 960,
          }}
        >
          {title}
        </div>
        {brandRow}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Klee One", data: klee, style: "normal", weight: 600 }],
    },
  );
}
