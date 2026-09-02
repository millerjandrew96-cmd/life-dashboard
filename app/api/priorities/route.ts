import { NextResponse } from "next/server";
import { createPriority, listPriorities } from "@/lib/priorities/store";
import { parsePriorityInput, ValidationError } from "@/lib/priorities/validate";

export async function GET() {
  const priorities = await listPriorities();
  return NextResponse.json({ priorities });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const input = parsePriorityInput(body);
    const priority = await createPriority(input);
    return NextResponse.json({ priority }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create priority." }, { status: 500 });
  }
}
