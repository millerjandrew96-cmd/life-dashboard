import { NextResponse } from "next/server";
import { deleteHealthDailyEntry, listHealthDailyEntries } from "@/lib/health/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/health/daily-entries/[date]">) {
  const { date } = await ctx.params;
  const entries = await listHealthDailyEntries();
  const entry = entries.find((e) => e.date === date);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${date}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/health/daily-entries/[date]">) {
  const { date } = await ctx.params;
  await deleteHealthDailyEntry(date);
  return NextResponse.json({ ok: true });
}
