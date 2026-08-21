import { FinanceDashboard } from "./FinanceDashboard";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import { currentMonthKey } from "@/lib/finance/month";

export default async function FinancePage({ searchParams }: PageProps<"/finance">) {
  const params = await searchParams;
  const entries = await listFinanceEntries();

  const requestedMonth = typeof params.month === "string" ? params.month : undefined;
  const selectedMonth = requestedMonth ?? entries[entries.length - 1]?.month ?? currentMonthKey();
  const selectedEntry = entries.find((e) => e.month === selectedMonth) ?? null;
  const score = selectedEntry ? computeFinanceScore(selectedEntry) : null;

  return (
    <FinanceDashboard
      key={selectedMonth}
      entries={entries}
      selectedMonth={selectedMonth}
      selectedEntry={selectedEntry}
      score={score}
    />
  );
}
