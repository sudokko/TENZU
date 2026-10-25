import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { hashBookCode, BOOK_CODE_ENV } from "../app/lib/book-auth";
import { BOOK } from "../app/book/hajimete/catalog";

// A local code for development only. The code printed in the book is decided by the owner and its hash is set in Amplify.
const root = path.resolve(import.meta.dirname, "..");
const folder = path.join(root, ".local");
fs.mkdirSync(folder, { recursive: true });
const file = path.join(folder, `book-${BOOK.slug}.json`);
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ code: `TENZU-DEV-${randomBytes(5).toString("hex").toUpperCase()}` }, null, 2) + "\n", { mode: 0o600 });
const { code } = JSON.parse(fs.readFileSync(file, "utf8"));
const envPath = path.join(root, ".env.local");
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const hash = hashBookCode(code);
const current = env.match(new RegExp(`^${BOOK_CODE_ENV}=(.*)$`, "m"))?.[1]?.trim();
if (current && current !== hash) throw new Error("Existing reader hash differs; refusing to replace it");
if (!current) env += `\n# 書籍『${BOOK.title}』の購入者特典・開発用（コード原文は .local/book-${BOOK.slug}.json）\n${BOOK_CODE_ENV}=${hash}\n`;
if (!/^AUTH_SECRET=.+$/m.test(env)) env += `AUTH_SECRET=${randomBytes(32).toString("hex")}\n`;
fs.writeFileSync(envPath, env, { mode: 0o600 });
console.log(`Book ${BOOK.slug} local code and runtime configuration ready (values withheld).`);
