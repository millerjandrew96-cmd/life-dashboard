import { NextResponse } from "next/server";
import { deleteBusinessMonthEntry, getBusinessMonthEntry } from "@/lib/business/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/business/month-entries/[month]">) {
  const { month } = await ctx.params;
  const entry = await getBusinessMonthEntry(month);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${month}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/business/month-entries/[month]">) {
  const { month } = await ctx.params;
  await deleteBusinessMonthEntry(month);
  return NextResponse.json({ ok: true });
}
