import { NextResponse } from "next/server";
import { deleteBusinessWeekEntry, listBusinessWeekEntries } from "@/lib/business/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/business/week-entries/[week]">) {
  const { week } = await ctx.params;
  const entries = await listBusinessWeekEntries();
  const entry = entries.find((e) => e.week === week);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${week}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/business/week-entries/[week]">) {
  const { week } = await ctx.params;
  await deleteBusinessWeekEntry(week);
  return NextResponse.json({ ok: true });
}
