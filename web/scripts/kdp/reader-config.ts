import fs from "node:fs";
import path from "node:path";

/** コード原文はGit除外のローカル設定だけで保持。WebへはSHA-256を設定する。 */
export function readerCode() {
  const file = path.resolve(import.meta.dirname, "../../.local/book-216.json");
  if (!fs.existsSync(file)) throw new Error("Run scripts/setup-book-216.ts before exporting the book");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (typeof data.code !== "string" || !/^TENZU-216-[A-F0-9]{10}$/.test(data.code)) throw new Error("Invalid local reader code");
  return data.code as string;
}
