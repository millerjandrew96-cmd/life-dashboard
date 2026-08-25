import { HealthDashboard } from "./HealthDashboard";
import { getHealthScoreForMonth } from "@/lib/health/composeScore";

export default async function HealthPage({ searchParams }: PageProps<"/health">) {
  const params = await searchParams;
  const requestedMonth = typeof params.month === "string" ? params.month : null;

  const { month, score, dailyEntries, weekEntries } = await getHealthScoreForMonth(requestedMonth);

  return <HealthDashboard key={month} selectedMonth={month} score={score} dailyEntries={dailyEntries} weekEntries={weekEntries} />;
}
