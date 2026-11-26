import { NextResponse } from "next/server";
import { deleteFinanceEntry, getFinanceEntry } from "@/lib/finance/store";
import { requireWriteSecret } from "@/lib/requireWriteSecret";

export async function GET(_req: Request, ctx: RouteContext<"/api/finance/entries/[month]">) {
  const { month } = await ctx.params;
  const entry = await getFinanceEntry(month);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${month}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/entries/[month]">) {
  const denied = requireWriteSecret(_req);
  if (denied) return denied;
  const { month } = await ctx.params;
  await deleteFinanceEntry(month);
  return NextResponse.json({ ok: true });
}
