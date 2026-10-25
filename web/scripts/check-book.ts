import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BOOK, BOOK_VOLUMES } from "../app/book/hajimete/catalog";
import { PUBLISHED } from "../app/products/problems/published";
import { toRenderProblems, resultEdgesOf, composeTriple } from "../app/products/problems/render";
import { validateProblemSet, type EdgeT, type Pt } from "../app/products/problems/schema";
import { hashBookCode, acceptsBookCode, signBookSession, readBookSession, BOOK_TTL, BOOK_CODE_ENV, recordBookFailure, bookRetryAfter, clearBookFailures } from "../app/lib/book-auth";

// 描画コードと別に、座標変換と辺集合の関係で全問を確認する。
const key = ([a, b]: EdgeT) => [a.join(","), b.join(",")].sort().join(":");
const keys = (edges: EdgeT[]) => [...new Set(edges.map(key))].sort();
function transform(edges: EdgeT[], fn: (p: Pt) => Pt): EdgeT[] { return edges.map(([a, b]) => [fn(a), fn(b)]); }
const rows: object[] = [];
const seen = new Set<string>();
let number = 0;
// A volume not yet published is checked through its stand-in, exactly as the book and the reader PDFs draw it.
const planned = BOOK_VOLUMES.filter((v) => !PUBLISHED[v.sku] && v.standIn).map((v) => v.sku);
for (const { sku, standIn } of BOOK_VOLUMES) {
  const set = PUBLISHED[sku] ?? (standIn ? PUBLISHED[standIn] : undefined); assert.ok(set, sku); assert.equal(set.problems.length, 12);
  assert.deepEqual(validateProblemSet(set), [], sku);
  const rendered = toRenderProblems(set);
  for (const [i, p] of set.problems.entries()) {
    number++;
    // A stand-in repeats a published volume on purpose; only real volumes must be unique.
    if (!planned.includes(sku)) { assert.ok(!seen.has(p.id), `Duplicate ${p.id}`); seen.add(p.id); }
    if (p.grid.type === "solid") {
      assert.equal(p.grid.cols, 9); assert.equal(p.grid.rows, 9); assert.ok(p.solidEdges?.length);
      for (const e of p.solidEdges!) { assert.equal(e.style, "solid"); for (const v of [e.a, e.b]) assert.ok(v.c >= 0 && v.c <= 8 && v.r >= 0 && v.r <= 8); }
    } else {
      const n = p.grid.n, pb = rendered[i]; let expected = p.edges;
      if (p.answer?.mode === "derived") {
        const t = p.answer.transform;
        if (t.type === "mirror") expected = transform(p.edges, ([x,y]) => t.axis === "v" ? [n-1-x,y] : t.axis === "h" ? [x,n-1-y] : t.axis === "d1" ? [y,x] : [n-1-y,n-1-x]);
        if (t.type === "rotate") expected = transform(p.edges, ([x,y]) => t.deg === 90 ? [n-1-y,x] : t.deg === -90 ? [y,n-1-x] : [n-1-x,n-1-y]);
        if (t.type === "translate") expected = transform(p.edges, ([x,y]) => [x+t.dc,y+t.dr]);
      }
      if (p.answer?.mode === "explicit") {
        const reference = new Set(keys(p.edges));
        if (set.task === "fill" || set.task === "overlay" || set.task === "decompose") {
          assert.ok(p.answer.edges.length > 0 && p.answer.edges.length < p.edges.length, `Partial set ${p.id}`);
          for (const e of p.answer.edges) assert.ok(reference.has(key(e)), `Subset ${p.id}`);
        }
        if (set.task === "decompose") { const remove = new Set(keys(p.answer.edges)); expected = p.edges.filter((e) => !remove.has(key(e))); }
        if (set.task === "fold") {
          const reflected = transform(p.edges, ([x,y]) => [n-1-x,y]);
          expected = [...reflected, ...(p.inputB ?? [])];
          assert.deepEqual(keys(expected), keys(p.answer.edges), `Fold operation ${p.id}`);
        }
        const triple = composeTriple(pb, "horizontal");
        if (triple && set.task === "overlay") assert.deepEqual(keys([...triple.a, ...triple.b]), keys(expected));
      }
      assert.deepEqual(keys(resultEdgesOf(pb)), keys(expected), `Answer ${p.id}`);
      for (const edge of expected) for (const [x,y] of edge) assert.ok(x >= 0 && x < n && y >= 0 && y < n, `Answer bounds ${p.id}`);
    }
    rows.push({ sku, sourceId: p.id, task: set.task, standIn: planned.includes(sku), pass: true });
  }
}
assert.equal(number, BOOK.total); assert.equal(BOOK_VOLUMES.length, 12);
const previousSecret = process.env.AUTH_SECRET, previousHash = process.env[BOOK_CODE_ENV];
process.env.AUTH_SECRET = "test-key-only-do-not-use-in-production";
process.env[BOOK_CODE_ENV] = hashBookCode("test-book-abcdef");
assert.ok(acceptsBookCode("ＴＥＳＴ ＢＯＯＫ ＡＢＣＤＥＦ")); assert.ok(!acceptsBookCode("wrong")); assert.ok(!acceptsBookCode(null));
const now = Date.now(), token = signBookSession(now);
assert.ok(readBookSession(token, now)); assert.ok(!readBookSession(token + "x", now));
assert.ok(!readBookSession(token, now + BOOK_TTL * 1000));
const forgedOtherType = Buffer.from(JSON.stringify({ typ:"s", owned:["copy"], exp:Math.floor(now/1000)+1000 })).toString("base64url");
assert.ok(!readBookSession(`${forgedOtherType}.${token.split(".")[1]}`, now));
// A session signed for another book (the frozen 216 version) must not open this one.
const otherBook = Buffer.from(JSON.stringify({ book: 216, exp: Math.floor(now/1000)+1000 })).toString("base64url");
assert.ok(!readBookSession(`${otherBook}.${token.split(".")[1]}`, now));
process.env[BOOK_CODE_ENV] = ""; assert.ok(!readBookSession(token, now));
for(let i=0;i<5;i++) recordBookFailure("test", now);
assert.ok(bookRetryAfter("test", now) > 0); assert.equal(bookRetryAfter("test", now + 15*60*1000), 0); clearBookFailures("test");
if(previousSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET=previousSecret;
if(previousHash === undefined) delete process.env[BOOK_CODE_ENV]; else process.env[BOOK_CODE_ENV]=previousHash;
const out = path.resolve(import.meta.dirname, "../../docs/drafts/kdp/series-1-hajimete");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "problem-audit.json"), JSON.stringify({ count: number, passed: true, planned, authChecks: "pass", rows }, null, 2) + "\n");
console.log(`PASS: ${number} source problems${planned.length ? ` (stand-ins for ${planned.join(", ")})` : ""}, independent answer relations, code normalization, tamper/expiry/isolation/fail-closed, attempt limits.`);
