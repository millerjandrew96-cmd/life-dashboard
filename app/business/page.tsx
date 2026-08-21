import { BusinessDashboard } from "./BusinessDashboard";
import { getBusinessScoreForMonth } from "@/lib/business/composeScore";
import { currentMonthKey } from "@/lib/finance/month";

export default async function BusinessPage({ searchParams }: PageProps<"/business">) {
  const params = await searchParams;
  const requestedMonth = typeof params.month === "string" ? params.month : null;

  const { month, score, weekEntries, monthEntries } = await getBusinessScoreForMonth(requestedMonth);
  const selectedMonth = month ?? currentMonthKey();

  return (
    <BusinessDashboard
      key={selectedMonth}
      selectedMonth={selectedMonth}
      score={score}
      weekEntries={weekEntries}
      monthEntries={monthEntries}
    />
  );
}
