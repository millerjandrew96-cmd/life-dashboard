import { NextResponse } from "next/server";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { getFinanceEntry, listFinanceEntries } from "@/lib/finance/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month");

  const month = requestedMonth ?? (await latestMonth());
  if (!month) {
    return NextResponse.json({ score: null, message: "No finance entries logged yet." });
  }

  const entry = await getFinanceEntry(month);
  if (!entry) {
    return NextResponse.json({ error: `No entry for ${month}.` }, { status: 404 });
  }

  const score = computeFinanceScore(entry);
  return NextResponse.json({ score });
}

async function latestMonth(): Promise<string | null> {
  const entries = await listFinanceEntries();
  if (entries.length === 0) return null;
  return entries[entries.length - 1].month;
}
