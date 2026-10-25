import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { BOOK, BOOK_FILES, BOOK_VOLUMES } from "../app/book/hajimete/catalog";
import { PUBLISHED } from "../app/products/problems/published";
import { toRenderProblems } from "../app/products/problems/render";

// npx tsx scripts/check-book-http.ts (BOOK_TEST_URL defaults to http://localhost:3000; the dev code comes from setup-book.ts)
const base = process.env.BOOK_TEST_URL ?? "http://localhost:3000";
const api = `${base}/api/book/${BOOK.slug}`;
const { code } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, `../.local/book-${BOOK.slug}.json`), "utf8"));
const docs = path.resolve(import.meta.dirname, "../../docs/drafts/kdp/series-1-hajimete");
const benefits = JSON.parse(fs.readFileSync(path.join(docs, "benefits-manifest.json"), "utf8"));
const book = JSON.parse(fs.readFileSync(path.join(docs, "manifest.json"), "utf8"));
async function unlock(value: unknown, origin = base, ip = "book-http-check") {
  return fetch(`${api}/unlock`, { method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ code: value }) });
}
/** What the print settings should receive: the book's problems, in the book's order, rebuilt from the book manifest. */
function expectedVolume(sku: string) {
  const qs: { sku: string; sourceId: string }[] = book.questions.filter((q: { sku: string }) => q.sku === sku);
  const file: string = book.sources.find((s: { sku: string }) => s.sku === sku).file;
  const set = PUBLISHED[path.basename(file, ".json")];
  return toRenderProblems({ ...set, problems: qs.map((q) => set.problems.find((p) => p.id === q.sourceId)!) });
}
async function main() {
  assert.equal((await fetch(`${api}/files/all`)).status, 401);
  assert.equal((await fetch(`${api}/volumes/copy-lv1-vol1`)).status, 401);
  assert.equal((await unlock(code, "https://unrelated.example")).status, 403);
  assert.equal((await unlock("wrong")).status, 400);
  const res = await unlock(code); assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie")!.split(";")[0]; assert.ok(cookie.startsWith(`tenzu_book_${BOOK.slug}=`));
  assert.ok(!res.headers.get("set-cookie")!.includes("tenzu_session="));
  for (const entry of BOOK_VOLUMES) {
    const response = await fetch(`${api}/volumes/${entry.sku}`, { headers: { cookie } });
    assert.equal(response.status, 200, entry.sku);
    assert.ok(response.headers.get("cache-control")!.includes("no-store"));
    assert.ok(response.headers.get("x-robots-tag")!.includes("noindex"));
    const body = await response.json();
    assert.equal(body.from, entry.from); assert.equal(body.to, entry.to);
    assert.deepEqual(body.problems, expectedVolume(entry.sku), entry.sku);
  }
  // Volumes outside the book stay locked even with a valid book session.
  for (const sku of ["copy-lv5-vol1", "mirror-lv2-vol1", "not-a-book-volume"]) assert.equal((await fetch(`${api}/volumes/${sku}`, { headers: { cookie } })).status, 404, sku);
  assert.equal((await fetch(`${api}/volumes/copy-lv1-vol1`, { headers: { cookie: cookie + "tampered" } })).status, 401);
  for (const file of BOOK_FILES) {
    const download = await fetch(`${api}/files/${file.id}`, { headers: { cookie } });
    assert.equal(download.status, 200, file.id); assert.equal(download.headers.get("content-type"), "application/pdf");
    assert.ok(download.headers.get("cache-control")!.includes("no-store"));
    const bytes = Buffer.from(await download.arrayBuffer()); assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), benefits.files[file.id].sha256, file.id);
  }
  assert.equal((await fetch(`${api}/files/not-a-book-file`, { headers: { cookie } })).status, 404);
  assert.equal((await fetch(`${api}/files/all`, { headers: { cookie: cookie + "tampered" } })).status, 401);
  for (let i = 0; i < 5; i++) assert.equal((await unlock("wrong", base, "book-http-rate-check")).status, 400);
  assert.equal((await unlock(code, base, "book-http-rate-check")).status, 429);
  for (const route of [BOOK.href, "/products", "/maker", "/makers", "/level-guide"]) assert.equal((await fetch(base + route)).status, 200, route);
  console.log(`PASS: ${BOOK_VOLUMES.length} volumes match the book's problems and order; outside-book volumes stay locked; ${BOOK_FILES.length} downloads match their hashes; origin, unauthorized, tamper, unknown-file, throttle and page checks.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
