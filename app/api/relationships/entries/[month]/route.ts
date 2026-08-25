import { NextResponse } from "next/server";
import { deleteRelationshipEntry, getRelationshipEntry } from "@/lib/relationships/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/relationships/entries/[month]">) {
  const { month } = await ctx.params;
  const entry = await getRelationshipEntry(month);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${month}.` }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/relationships/entries/[month]">) {
  const { month } = await ctx.params;
  await deleteRelationshipEntry(month);
  return NextResponse.json({ ok: true });
}
