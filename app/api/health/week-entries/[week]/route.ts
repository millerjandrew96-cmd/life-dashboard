import { NextResponse } from "next/server";
import { deleteHealthWeekEntry, listHealthWeekEntries } from "@/lib/health/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/health/week-entries/[week]">) {
  const { week } = await ctx.params;
  const entries = await listHealthWeekEntries();
  const entry = entries.find((e) => e.week === week);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${week}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/health/week-entries/[week]">) {
  const { week } = await ctx.params;
  await deleteHealthWeekEntry(week);
  return NextResponse.json({ ok: true });
}
