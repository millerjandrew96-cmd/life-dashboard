import { NextResponse } from "next/server";
import { createRelationshipActionItem, listRelationshipActionItems } from "@/lib/relationships/store";
import { parseRelationshipActionItemInput, ValidationError } from "@/lib/relationships/validate";

export async function GET() {
  const items = await listRelationshipActionItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const input = parseRelationshipActionItemInput(body);
    const item = await createRelationshipActionItem(input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create action item." }, { status: 500 });
  }
}
