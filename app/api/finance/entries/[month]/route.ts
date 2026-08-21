import { NextResponse } from "next/server";
import { deleteFinanceEntry, getFinanceEntry } from "@/lib/finance/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/finance/entries/[month]">) {
  const { month } = await ctx.params;
  const entry = await getFinanceEntry(month);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${month}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/entries/[month]">) {
  const { month } = await ctx.params;
  await deleteFinanceEntry(month);
  return NextResponse.json({ ok: true });
}
