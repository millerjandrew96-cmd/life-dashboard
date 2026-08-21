import { NextResponse } from "next/server";
import { getBusinessScoreForMonth } from "@/lib/business/composeScore";
import { currentWeekKey } from "@/lib/business/week";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month");

  const { score } = await getBusinessScoreForMonth(requestedMonth);
  if (!score) {
    return NextResponse.json({ score: null, message: "No business entries logged yet." });
  }

  return NextResponse.json({ score, currentWeek: currentWeekKey() });
}
