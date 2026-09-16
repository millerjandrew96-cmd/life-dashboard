import type { Tier } from "@/lib/finance/types";

const STYLES: Record<Tier, string> = {
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  gold: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200",
};

// Plain (non-badge) text color per tier — for coloring a value by tier without a pill,
// e.g. "points earned" in the mobile score-breakdown cards.
export const TIER_TEXT_COLOR: Record<Tier, string> = {
  red: "text-red-600 dark:text-red-400",
  yellow: "text-amber-600 dark:text-amber-400",
  green: "text-emerald-600 dark:text-emerald-400",
  gold: "text-yellow-600 dark:text-yellow-400",
};

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[tier]}`}>
      {tier}
    </span>
  );
}
