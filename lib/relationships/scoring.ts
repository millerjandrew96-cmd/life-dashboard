import type { Tier } from "@/lib/finance/types";
import { gradeFor } from "@/lib/grade";
import { actionItemsSuggestion, communicationSuggestion, financeSuggestion, intimacySuggestion } from "./suggestions";
import type { RelationshipActionItem, RelationshipCategoryBreakdown, RelationshipEntry, RelationshipScore } from "./types";

/** Four equally-weighted inputs per the spec (25 each). */
export const WEIGHTS = {
  FINANCE: 25,
  COMMUNICATION: 25,
  INTIMACY: 25,
  ACTION_ITEMS: 25,
} as const;

const FOUR_TIER_FRACTIONS: Record<Tier, number> = { red: 0, yellow: 0.5, green: 0.85, gold: 1 };

/** The spec gives no thresholds for the 0-5 Breanne ratings — a judgment call, kept
 * consistent with the tiered-fraction convention used everywhere else in the app rather
 * than a plain linear scale. */
export function ratingTier(rating: number): Tier {
  if (rating >= 4.5) return "gold";
  if (rating >= 3.5) return "green";
  if (rating >= 2) return "yellow";
  return "red";
}

/** Percentage-based per the spec, specifically because item count varies month to month. */
export function actionItemTier(pct: number): Tier {
  if (pct >= 100) return "gold";
  if (pct >= 66) return "green";
  if (pct >= 33) return "yellow";
  return "red";
}

export function financeFractionTier(financeScore: number): Tier {
  if (financeScore >= 90) return "gold";
  if (financeScore >= 70) return "green";
  if (financeScore >= 50) return "yellow";
  return "red";
}

export function computeRelationshipScore(args: {
  month: string;
  entry: RelationshipEntry | null;
  financeScore: number | null;
  actionItemsDueThisMonth: RelationshipActionItem[];
}): RelationshipScore {
  const { month, entry, financeScore, actionItemsDueThisMonth } = args;

  const financeTier = financeScore !== null ? financeFractionTier(financeScore) : null;
  const finance: RelationshipCategoryBreakdown = {
    key: "finance",
    label: "Finance",
    tier: financeTier,
    // Direct proportion of the Finance pillar's own /100 score, not a re-tiered fraction —
    // Finance is "auto-pulled... reused, not re-entered" per the spec, so its own score
    // carries through directly rather than being bucketed a second time.
    pointsEarned: financeScore !== null ? WEIGHTS.FINANCE * (financeScore / 100) : 0,
    maxPoints: WEIGHTS.FINANCE,
    weight: WEIGHTS.FINANCE,
    rawValue: financeScore !== null ? `${financeScore}/100 (from Finance pillar)` : "no Finance data for this month",
    suggestion: financeSuggestion(financeScore),
  };

  const commTier = entry ? ratingTier(entry.communication_rating) : null;
  const communication: RelationshipCategoryBreakdown = {
    key: "communication",
    label: "Communication",
    tier: commTier,
    pointsEarned: commTier ? WEIGHTS.COMMUNICATION * FOUR_TIER_FRACTIONS[commTier] : 0,
    maxPoints: WEIGHTS.COMMUNICATION,
    weight: WEIGHTS.COMMUNICATION,
    rawValue: entry ? `${entry.communication_rating}/5` : "no evaluation logged this month",
    suggestion: communicationSuggestion(commTier),
  };

  const intimacyTier = entry ? ratingTier(entry.intimacy_rating) : null;
  const intimacy: RelationshipCategoryBreakdown = {
    key: "intimacy",
    label: "Intimacy",
    tier: intimacyTier,
    pointsEarned: intimacyTier ? WEIGHTS.INTIMACY * FOUR_TIER_FRACTIONS[intimacyTier] : 0,
    maxPoints: WEIGHTS.INTIMACY,
    weight: WEIGHTS.INTIMACY,
    rawValue: entry ? `${entry.intimacy_rating}/5` : "no evaluation logged this month",
    suggestion: intimacySuggestion(intimacyTier),
  };

  const totalDue = actionItemsDueThisMonth.length;
  const doneCount = actionItemsDueThisMonth.filter((i) => i.done).length;
  const pct = totalDue > 0 ? (doneCount / totalDue) * 100 : null;
  const actionTier = pct !== null ? actionItemTier(pct) : null;
  const actionItems: RelationshipCategoryBreakdown = {
    key: "action_items",
    label: "Action Item Completion",
    tier: actionTier,
    pointsEarned: actionTier ? WEIGHTS.ACTION_ITEMS * FOUR_TIER_FRACTIONS[actionTier] : 0,
    maxPoints: WEIGHTS.ACTION_ITEMS,
    weight: WEIGHTS.ACTION_ITEMS,
    rawValue: totalDue > 0 ? `${doneCount}/${totalDue} done (${Math.round(pct ?? 0)}%)` : "no action items due this month",
    suggestion: actionItemsSuggestion(actionTier, totalDue - doneCount),
  };

  const categories = [finance, communication, intimacy, actionItems];
  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.pointsEarned, 0));

  const suggestions = categories.map((c) => c.suggestion).filter((s): s is string => !!s);

  return {
    month,
    totalScore,
    grade: gradeFor(totalScore),
    categories,
    actionItemsDueThisMonth,
    suggestions,
  };
}
