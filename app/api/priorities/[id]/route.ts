import { NextResponse } from "next/server";
import { deletePriority, updatePriority } from "@/lib/priorities/store";

export async function PATCH(request: Request, ctx: RouteContext<"/api/priorities/[id]">) {
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
  if (typeof b.notes === "string") patch.notes = b.notes.trim() || null;

  try {
    const priority = await updatePriority(id, patch);
    return NextResponse.json({ priority });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update priority." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/priorities/[id]">) {
  const { id } = await ctx.params;
  await deletePriority(id);
  return NextResponse.json({ ok: true });
}
