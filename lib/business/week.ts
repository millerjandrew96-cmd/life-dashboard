/** ISO week key, e.g. "2026-W34". Weeks run Monday–Sunday. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** The Monday (UTC midnight) of a given ISO week key. */
export function isoWeekToMonday(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dow + 1);
  return monday;
}

export function currentWeekKey(date: Date = new Date()): string {
  return isoWeekKey(date);
}

export function weekLabel(weekKey: string): string {
  const monday = isoWeekToMonday(weekKey);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `Week of ${fmt(monday)} – ${fmt(sunday)}`;
}

/**
 * Which calendar month a week counts toward, for rolling weekly funnel data into a
 * monthly score. A week is attributed to the month containing its Monday.
 */
export function monthOfWeek(weekKey: string): string {
  const monday = isoWeekToMonday(weekKey);
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function weekKeyFromDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return isoWeekKey(new Date(Date.UTC(y, m - 1, d)));
}

/** "YYYY-MM-DD" for the Monday of a week key, for use as an <input type="date"> value. */
export function mondayDateString(weekKey: string): string {
  const monday = isoWeekToMonday(weekKey);
  return monday.toISOString().slice(0, 10);
}
