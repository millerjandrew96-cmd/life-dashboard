import { NextResponse } from "next/server";
import { deleteRelationshipActionItem, updateRelationshipActionItem } from "@/lib/relationships/store";

export async function PATCH(request: Request, ctx: RouteContext<"/api/relationships/action-items/[id]">) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof b.done === "boolean") patch.done = b.done;
  if (typeof b.description === "string" && b.description.trim()) patch.description = b.description.trim();
  if (typeof b.due_month === "string") patch.due_month = b.due_month;
  if (typeof b.notes === "string") patch.notes = b.notes.trim() || null;

  try {
    const item = await updateRelationshipActionItem(id, patch);
    return NextResponse.json({ item });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update action item." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/relationships/action-items/[id]">) {
  const { id } = await ctx.params;
  await deleteRelationshipActionItem(id);
  return NextResponse.json({ ok: true });
}
