import { NextResponse } from "next/server";
import { getHealthScoreForMonth } from "@/lib/health/composeScore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month");

  const { score } = await getHealthScoreForMonth(requestedMonth);
  if (!score) {
    return NextResponse.json({ score: null, message: "No health entries logged yet." });
  }

  return NextResponse.json({ score });
}
