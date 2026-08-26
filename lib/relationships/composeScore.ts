import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import { currentMonthKey } from "@/lib/finance/month";
import { computeRelationshipScore } from "./scoring";
import { getRelationshipEntry, listRelationshipActionItems, listRelationshipEntries } from "./store";
import type { RelationshipActionItem, RelationshipEntry, RelationshipScore } from "./types";

/** Shared by the score API route and the server-rendered page. Pulls the Finance score for
 * the same month directly from the Finance pillar — "auto-pulled... reused, not re-entered". */
export async function getRelationshipScoreForMonth(requestedMonth: string | null): Promise<{
  month: string;
  score: RelationshipScore | null;
  entries: RelationshipEntry[];
  actionItems: RelationshipActionItem[];
}> {
  const [entries, actionItems] = await Promise.all([listRelationshipEntries(), listRelationshipActionItems()]);

  // Only evaluation months count as "latest" — an action item's due_month can legitimately
  // sit in the future and must never pull the default view ahead of the last real evaluation.
  const latestEvaluatedMonth = entries.map((e) => e.month).sort().at(-1) ?? null;
  const month = requestedMonth ?? latestEvaluatedMonth ?? currentMonthKey();

  if (entries.length === 0 && actionItems.length === 0) {
    return { month, score: null, entries, actionItems };
  }

  const entry = await getRelationshipEntry(month);
  const actionItemsDueThisMonth = actionItems.filter((i) => i.due_month === month);

  const financeEntries = await listFinanceEntries();
  const financeEntryForMonth = financeEntries.find((e) => e.month === month) ?? null;
  const financeScore = financeEntryForMonth ? computeFinanceScore(financeEntryForMonth).totalScore : null;

  const score = computeRelationshipScore({ month, entry, financeScore, actionItemsDueThisMonth });

  return { month, score, entries, actionItems };
}
