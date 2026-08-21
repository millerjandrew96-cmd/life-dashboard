import { NextResponse } from "next/server";
import { listFinanceEntries, upsertFinanceEntry } from "@/lib/finance/store";
import { parseFinanceEntryInput, ValidationError } from "@/lib/finance/validate";

export async function GET() {
  const entries = await listFinanceEntries();
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
    const input = parseFinanceEntryInput(body);
    const entry = await upsertFinanceEntry(input);
    return NextResponse.json({ entry }, { status: 200 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to save finance entry." }, { status: 500 });
  }
}
