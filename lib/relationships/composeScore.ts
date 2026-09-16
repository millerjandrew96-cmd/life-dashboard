import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import type { FinanceEntry } from "@/lib/finance/types";
import { currentMonthKey } from "@/lib/finance/month";
import { computeRelationshipScore } from "./scoring";
import { listRelationshipActionItems, listRelationshipEntries } from "./store";
import type { RelationshipActionItem, RelationshipEntry, RelationshipScore } from "./types";

/**
 * Shared by the score API route and the server-rendered page. Pulls the Finance score for
 * the same month directly from the Finance pillar — "auto-pulled... reused, not re-entered".
 *
 * `financeEntries` is optional: pass it in when the caller (e.g. the home page) has already
 * fetched the full Finance list for its own tile, so this doesn't re-query Supabase for data
 * the caller already has in memory.
 */
export async function getRelationshipScoreForMonth(
  requestedMonth: string | null,
  financeEntries?: FinanceEntry[],
): Promise<{
  month: string;
  score: RelationshipScore | null;
  entries: RelationshipEntry[];
  actionItems: RelationshipActionItem[];
}> {
  const [entries, actionItems, resolvedFinanceEntries] = await Promise.all([
    listRelationshipEntries(),
    listRelationshipActionItems(),
    financeEntries ? Promise.resolve(financeEntries) : listFinanceEntries(),
  ]);

  // Only evaluation months count as "latest" — an action item's due_month can legitimately
  // sit in the future and must never pull the default view ahead of the last real evaluation.
  const latestEvaluatedMonth = entries.map((e) => e.month).sort().at(-1) ?? null;
  const month = requestedMonth ?? latestEvaluatedMonth ?? currentMonthKey();

  if (entries.length === 0 && actionItems.length === 0) {
    return { month, score: null, entries, actionItems };
  }

  // Already have every month's entry from the list above — no need to re-query for one.
  const entry = entries.find((e) => e.month === month) ?? null;
  const actionItemsDueThisMonth = actionItems.filter((i) => i.due_month === month);

  const financeEntryForMonth = resolvedFinanceEntries.find((e) => e.month === month) ?? null;
  const financeScore = financeEntryForMonth ? computeFinanceScore(financeEntryForMonth).totalScore : null;

  const score = computeRelationshipScore({ month, entry, financeScore, actionItemsDueThisMonth });

  return { month, score, entries, actionItems };
}
