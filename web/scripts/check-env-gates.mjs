#!/usr/bin/env node
/* =========================================================================
   開店ゲート G4 チェック（decisions §3.93）
   本番と staging のインデックス可否を「両方向」で自動確認する:
     - 本番 (tenzu.jp)      … robots が index,follow ／ canonical が本番ホスト
     - staging (amplifyapp) … robots が noindex（＝SITE_URL を入れ忘れていない事故と、
                              staging に本番 env を入れてしまう事故の両方を検出）
   使い方: node web/scripts/check-env-gates.mjs
     URL を変えるとき: --prod=https://... --staging=https://...
   exit 0 = 全ゲート通過 / exit 1 = どれか NG
   ========================================================================= */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a, true];
  }),
);
const PROD = (args.prod ?? "https://tenzu.jp").replace(/\/$/, "");
const STAGING = (
  args.staging ?? "https://deploy-amplify.d2tis39f9o19v5.amplifyapp.com"
).replace(/\/$/, "");

let failed = false;
const report = (label, cond, detail) => {
  console.log(`${cond ? "  OK " : "✗ NG "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed = true;
};

async function inspect(url) {
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  const robots =
    html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "(meta なし)";
  const canonical =
    html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "(canonical なし)";
  return { status: res.status, robots, canonical };
}

console.log(`本番   : ${PROD}`);
try {
  const p = await inspect(PROD);
  report("本番が応答（200）", p.status === 200, `HTTP ${p.status}`);
  report("本番 robots が index,follow", /index,\s*follow/.test(p.robots), p.robots);
  report("本番 canonical が本番ホスト", p.canonical.startsWith(PROD), p.canonical);
} catch (e) {
  report("本番へ到達", false, String(e?.cause ?? e));
}

console.log(`staging: ${STAGING}`);
try {
  const s = await inspect(STAGING);
  report("staging が応答（200）", s.status === 200, `HTTP ${s.status}`);
  report("staging robots が noindex", /noindex/.test(s.robots), s.robots);
} catch (e) {
  report("staging へ到達", false, String(e?.cause ?? e));
}

console.log(failed ? "\n→ G4 未通過。SITE_URL のブランチ別設定を確認（decisions §3.93）" : "\n→ G4 全ゲート通過");
/* process.exit() は Windows で undici の後始末と衝突する（libuv assertion）ため exitCode で */
process.exitCode = failed ? 1 : 0;
