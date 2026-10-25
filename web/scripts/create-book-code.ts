/** npx tsx scripts/create-book-code.ts [--print 1]
 * The receiving code printed in the book (engineering/book-release.md). Format: HJ<printing>-XXXX-XXXX.
 * The code itself is written only to web/.local (Git-ignored); the console shows only the SHA-256 for Amplify. */
import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { hashBookCode, normalizeBookCode, BOOK_CODE_ENV } from "../app/lib/book-auth";
import { BOOK } from "../app/book/hajimete/catalog";

// No 0/O, 1/I/L, 2/Z, 5/S, 8/B or Q: the code is read off paper and typed on a phone.
const ALPHABET = "34679ACDEFGHJKMNPRTUVWXY";
const flag = process.argv.indexOf("--print");
const printing = flag < 0 ? 1 : Number(process.argv[flag + 1]);
if (!Number.isInteger(printing) || printing < 1 || printing > 9) throw new Error("--print takes the printing number 1–9");

const file = path.resolve(import.meta.dirname, `../.local/book-${BOOK.slug}-print${printing}.json`);
if (fs.existsSync(file)) throw new Error(`A code for printing ${printing} already exists; it is printed in books, so it is never replaced`);
const random = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const code = `HJ${printing}-${random(4)}-${random(4)}`;
const hash = hashBookCode(code);
// The reader may type it in full-width, lower case or without hyphens; all must land on the same hash.
for (const variant of [code.toLowerCase(), code.replaceAll("-", ""), code.normalize("NFKC").replace(/[A-Z0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))])
  if (hashBookCode(variant) !== hash || normalizeBookCode(variant) !== normalizeBookCode(code)) throw new Error("Code normalization failed");

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ book: BOOK.slug, printing, code, sha256: hash, createdAt: new Date().toISOString() }, null, 2) + "\n", { mode: 0o600 });
console.log(`Printing ${printing} code saved to ${path.relative(process.cwd(), file)} (not shown here).`);
console.log(`${BOOK_CODE_ENV} for Amplify (append with a comma if earlier printings exist):`);
console.log(hash);
