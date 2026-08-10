import fs from "fs";

const cat = fs.readFileSync("app/catalog.tsx", "utf8");
const dat = fs.readFileSync("app/products/data.ts", "utf8");
const extra = JSON.parse(fs.readFileSync("app/products/catalog-extra.json", "utf8"));

/* --- notes（タスク別・配列 index = Lv-1 を保つ。空は Lv 欠番） --- */
const notes = {};
const nre = /slug:\s*"(\w+)",[\s\S]{0,200}?notes:\s*\[([\s\S]*?)\]/g;
let m;
while ((m = nre.exec(cat))) {
  notes[m[1]] = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]); // filter しない
}

/* --- blurbs（タスク別・Lv つき） --- */
const blurbs = {};
const bre = /\bv\(\s*"([a-z]+)-lv(\d)-vol(\d+)"\s*,\s*\d\s*,\s*\d+\s*,\s*"[^"]*"\s*,\s*"([^"]*)"/g;
while ((m = bre.exec(dat)))
  (blurbs[m[1]] = blurbs[m[1]] || []).push({ sku: `${m[1]}-lv${m[2]}-vol${m[3]}`, lv: +m[2], t: m[4] });
(extra.vols || []).forEach((v) => {
  const task = v.sku.split("-")[0];
  (blurbs[task] = blurbs[task] || []).push({ sku: v.sku, lv: v.lv, t: v.blurb });
});
(extra.patches || []).forEach((p) => {
  if (!p.blurb) return;
  const hit = (blurbs[p.sku.split("-")[0]] || []).find((x) => x.sku === p.sku);
  if (hit) hit.t = p.blurb;
});

const HIDDEN = new Set(["scale", "shrink"]);
const tasks = Object.keys(blurbs).filter((t) => !HIDDEN.has(t));
const STOP = /^[0-9×・。、\s]+$/;

const longestShared = (a, b) => {
  let best = "";
  for (let s = 0; s < a.length; s++)
    for (let e = s + 6; e <= a.length; e++) {
      const sub = a.slice(s, e);
      if (STOP.test(sub)) continue;
      if (b.includes(sub) && sub.length > best.length) best = sub;
    }
  return best;
};

let bad = 0;

/* ① タスク横断の完全一致 */
const exact = (label, pairs) => {
  const by = {};
  pairs.forEach(([k, v]) => (by[v] = by[v] || []).push(k));
  const d = Object.entries(by).filter(([, v]) => v.length > 1);
  console.log(`■ ${label}: ${d.length ? "" : "なし"}`);
  d.forEach(([k, v]) => console.log(`   「${k}」→ ${v.join(", ")}`));
  return d.length;
};
bad += exact(
  "notes の完全一致（全タスク横断）",
  tasks.flatMap((t) => notes[t].map((n, i) => (n ? [`${t}-Lv${i + 1}`, n] : null)).filter(Boolean)),
);
bad += exact("リード文の完全一致（全タスク横断）", tasks.flatMap((t) => blurbs[t].map((b) => [b.sku, b.t])));

/* ② 同じ Lv の note とリード文が隣り合って同じ語を言っていないか（本命）
   note が商品一覧に描画されるのは「その Lv に複数巻あるとき」だけ（TaskListPage）。
   1 巻しかない Lv の note は非表示なので隣接しない＝対象外。 */
console.log("\n■ 同一 Lv の note ↔ リード文で共有する語句（6字以上・画面上で隣接）:");
let n2 = 0, skipped = 0;
for (const t of tasks)
  for (const b of blurbs[t]) {
    const note = notes[t]?.[b.lv - 1];
    if (!note) continue;
    const volsInLv = blurbs[t].filter((x) => x.lv === b.lv).length;
    const sh = longestShared(note, b.t);
    if (!sh) continue;
    if (volsInLv <= 1) { skipped++; continue; } // note は非表示
    console.log(`   [${t} Lv${b.lv}] 「${sh}」`);
    console.log(`        note : ${note}`);
    console.log(`        blurb: ${b.t}`);
    n2++;
  }
if (!n2) console.log("   なし");
console.log(`   （1 巻のみ＝note 非表示のため対象外にしたもの: ${skipped} 件）`);
bad += n2;

console.log(`\n判定: ${bad === 0 ? "OK（隣接重複ゼロ）" : bad + " 件"}`);
console.log("※ 同 Lv の Vol.1/Vol.2 が特徴を共有するのは設計どおりのため対象外。");
