import { monthOfDay, previousMonthKey } from "./day";
import { computeHealthScore } from "./scoring";
import { listHealthDailyEntries, listHealthWeekEntries } from "./store";
import { monthOfWeek } from "@/lib/business/week";
import { currentMonthKey } from "@/lib/finance/month";
import type { HealthDailyEntry, HealthScore, HealthWeekEntry } from "./types";

/** Shared by the score API route and the server-rendered page so the month-selection logic lives in one place. */
export async function getHealthScoreForMonth(
  requestedMonth: string | null,
): Promise<{ month: string; score: HealthScore | null; dailyEntries: HealthDailyEntry[]; weekEntries: HealthWeekEntry[] }> {
  const [dailyEntries, weekEntries] = await Promise.all([listHealthDailyEntries(), listHealthWeekEntries()]);

  const months = new Set([...dailyEntries.map((d) => monthOfDay(d.date)), ...weekEntries.map((w) => monthOfWeek(w.week))]);
  const latest = [...months].sort().at(-1) ?? null;
  const month = requestedMonth ?? latest ?? currentMonthKey();

  const dailyEntriesInMonth = dailyEntries.filter((d) => monthOfDay(d.date) === month);
  const weekEntriesInMonth = weekEntries.filter((w) => monthOfWeek(w.week) === month);
  const dailyEntriesInPreviousMonth = dailyEntries.filter((d) => monthOfDay(d.date) === previousMonthKey(month));

  if (dailyEntriesInMonth.length === 0 && weekEntriesInMonth.length === 0) {
    return { month, score: null, dailyEntries, weekEntries };
  }

  const score = computeHealthScore({ month, dailyEntriesInMonth, weekEntriesInMonth, dailyEntriesInPreviousMonth });

  return { month, score, dailyEntries, weekEntries };
}
