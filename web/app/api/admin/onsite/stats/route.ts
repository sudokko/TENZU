/* 日次カウンタの取得（管理用）。?from=YYYY-MM-DD&to=YYYY-MM-DD（既定: 直近 14 日・JST） */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../guard";
import { queryStats, jstToday } from "../../../../lib/onsite-store";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const g = requireAdmin(req);
  if (g) return g;

  const sp = req.nextUrl.searchParams;
  const today = jstToday();
  const defaultFrom = new Date(Date.parse(today) - 13 * 86400_000).toISOString().slice(0, 10);
  const fromParam = sp.get("from") ?? "";
  const toParam = sp.get("to") ?? "";
  const from = DATE_RE.test(fromParam) ? fromParam : defaultFrom;
  const to = DATE_RE.test(toParam) ? toParam : today;

  try {
    const rows = await queryStats(from, to);
    return NextResponse.json(
      { from, to, rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
