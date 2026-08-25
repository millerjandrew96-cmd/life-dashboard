import type { Tier } from "@/lib/finance/types";

function pick(messages: Partial<Record<Tier, string>>, tier: Tier | null): string | null {
  if (!tier) return null;
  return messages[tier] ?? null;
}

export function financeSuggestion(financeScore: number | null): string | null {
  if (financeScore === null) return "No Finance data for this month yet — log this month's finances to feed into this score.";
  if (financeScore < 50) return "Finance score is dragging the relationship grade down — worth a joint look at the budget this month.";
  return null;
}

export function communicationSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Communication rated low this month. Check the notes from the evaluation for what specifically needs to change.",
      yellow: "Communication is middling. Small, consistent check-ins tend to move this one more than big gestures.",
    },
    tier,
  );
}

export function intimacySuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Intimacy rated low this month. Worth naming directly in the next evaluation rather than letting it ride.",
      yellow: "Intimacy is middling. Revisit what's changed since the last time this was rated higher.",
    },
    tier,
  );
}

export function actionItemsSuggestion(tier: Tier | null, openCount: number): string | null {
  if (tier === null) return null;
  if (tier === "gold") return null;
  return `${openCount} action item${openCount === 1 ? "" : "s"} still open this month — these were agreed on in a past evaluation.`;
}
