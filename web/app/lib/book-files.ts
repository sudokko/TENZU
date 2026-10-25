import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { BOOK, BOOK_FILES } from "../book/hajimete/catalog";

export const BOOK_FILES_DIR = path.join(process.cwd(), "private", `book-${BOOK.slug}`);
export async function bookFiles() {
  return Promise.all(BOOK_FILES.map(async (f) => {
    try {
      const info = await stat(path.join(BOOK_FILES_DIR, f.filename));
      return { ...f, bytes: info.size, ready: info.size > 0 };
    } catch { return { ...f, bytes: 0, ready: false }; }
  }));
}
export async function readBookFile(id: string) {
  const file = BOOK_FILES.find((f) => f.id === id);
  if (!file) return null;
  const data = await readFile(path.join(BOOK_FILES_DIR, file.filename));
  return { ...file, data };
}
