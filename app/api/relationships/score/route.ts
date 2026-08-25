import { NextResponse } from "next/server";
import { getRelationshipScoreForMonth } from "@/lib/relationships/composeScore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedMonth = searchParams.get("month");

  const { score } = await getRelationshipScoreForMonth(requestedMonth);
  if (!score) {
    return NextResponse.json({ score: null, message: "No relationship evaluations logged yet." });
  }

  return NextResponse.json({ score });
}
