import { computeBusinessScore } from "./scoring";
import { getBusinessMonthEntry, listBusinessMonthEntries, listBusinessWeekEntries } from "./store";
import { monthOfWeek } from "./week";
import type { BusinessMonthEntry, BusinessScore, BusinessWeekEntry } from "./types";

/** Shared by the score API route and the server-rendered page so the trailing-window logic lives in one place. */
export async function getBusinessScoreForMonth(
  requestedMonth: string | null,
): Promise<{ month: string | null; score: BusinessScore | null; weekEntries: BusinessWeekEntry[]; monthEntries: BusinessMonthEntry[] }> {
  const [weekEntries, monthEntries] = await Promise.all([listBusinessWeekEntries(), listBusinessMonthEntries()]);

  const month = requestedMonth ?? latestMonth(weekEntries.map((w) => monthOfWeek(w.week)).concat(monthEntries.map((m) => m.month)));
  if (!month) {
    return { month: null, score: null, weekEntries, monthEntries };
  }

  const weeksInMonth = weekEntries.filter((w) => monthOfWeek(w.week) === month);
  const registrationEntry = await getBusinessMonthEntry(month);
  const trailingWeeks = [...weekEntries].sort((a, b) => b.week.localeCompare(a.week)).slice(0, 8);

  const score = computeBusinessScore({
    month,
    weeksInMonth,
    registrationEntry,
    trailingWeeks,
    trailingMonthEntries: monthEntries,
  });

  return { month, score, weekEntries, monthEntries };
}

function latestMonth(months: string[]): string | null {
  if (months.length === 0) return null;
  return months.sort().at(-1) ?? null;
}
