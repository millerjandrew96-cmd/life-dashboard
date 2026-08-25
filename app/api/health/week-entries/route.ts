import { NextResponse } from "next/server";
import { listHealthWeekEntries, upsertHealthWeekEntry } from "@/lib/health/store";
import { parseHealthWeekEntryInput, ValidationError } from "@/lib/health/validate";

export async function GET() {
  const entries = await listHealthWeekEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const input = parseHealthWeekEntryInput(body);
    const entry = await upsertHealthWeekEntry(input);
    return NextResponse.json({ entry }, { status: 200 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to save week entry." }, { status: 500 });
  }
}
