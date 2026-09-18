/* SNS ダッシュボード — 保存データの読み書き（サーバー専用）
   公開リポジトリに数字を入れないため、置き場所は web/.local/sns-dashboard/（.gitignore 済み）。
   環境変数 SNS_DASHBOARD_DIR で差し替えられる。 */
import { promises as fs } from "fs";
import path from "path";
import type { Snapshot } from "./defs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dataDir(): string {
  return process.env.SNS_DASHBOARD_DIR || path.join(process.cwd(), ".local", "sns-dashboard");
}

const fileOf = (date: string) => path.join(dataDir(), `${date}.json`);

/** 取得日の一覧（新しい順） */
export async function listSnapshotDates(): Promise<string[]> {
  try {
    const names = await fs.readdir(dataDir());
    return names
      .filter((n) => n.endsWith(".json") && DATE_RE.test(n.slice(0, -5)))
      .map((n) => n.slice(0, -5))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function readSnapshot(date: string): Promise<Snapshot | null> {
  if (!DATE_RE.test(date)) return null;
  try {
    return JSON.parse(await fs.readFile(fileOf(date), "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

export async function writeSnapshot(snap: Snapshot): Promise<string> {
  if (!DATE_RE.test(snap.date)) throw new Error(`取得日の形式が不正です: ${snap.date}`);
  await fs.mkdir(dataDir(), { recursive: true });
  const file = fileOf(snap.date);
  await fs.writeFile(file, JSON.stringify(snap, null, 2) + "\n", "utf8");
  return file;
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
