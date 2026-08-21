import { computeBusinessScore } from "./scoring";
import { listBusinessWeekEntries } from "./store";
import { monthOfWeek } from "./week";
import type { BusinessScore, BusinessWeekEntry } from "./types";

/** Shared by the score API route and the server-rendered page so the trailing-window logic lives in one place. */
export async function getBusinessScoreForMonth(
  requestedMonth: string | null,
): Promise<{ month: string | null; score: BusinessScore | null; weekEntries: BusinessWeekEntry[] }> {
  const weekEntries = await listBusinessWeekEntries();

  const month = requestedMonth ?? latestMonth(weekEntries.map((w) => monthOfWeek(w.week)));
  if (!month) {
    return { month: null, score: null, weekEntries };
  }

  const weeksInMonth = weekEntries.filter((w) => monthOfWeek(w.week) === month);
  const trailingWeeks = [...weekEntries].sort((a, b) => b.week.localeCompare(a.week)).slice(0, 8);

  const score = computeBusinessScore({ month, weeksInMonth, trailingWeeks });

  return { month, score, weekEntries };
}

function latestMonth(months: string[]): string | null {
  if (months.length === 0) return null;
  return months.sort().at(-1) ?? null;
}
