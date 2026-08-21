import type { Tier } from "@/lib/finance/types";

const STYLES: Record<Tier, string> = {
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  gold: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200",
};

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLES[tier]}`}>
      {tier}
    </span>
  );
}
