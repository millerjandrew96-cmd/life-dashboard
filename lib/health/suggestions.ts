import type { Tier } from "@/lib/finance/types";
import type { WeightStatus } from "./types";

function pick(messages: Partial<Record<Tier, string>>, tier: Tier | null): string | null {
  if (!tier) return null;
  return messages[tier] ?? null;
}

export function stepsSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Average under 4,000 steps/day. A short daily walk goes a long way toward yellow (4,000+).",
      yellow: "4,000-6,000 steps/day. Push to 6,000+ for green.",
      green: "Solid step average. 10,000+/day gets you to gold.",
    },
    tier,
  );
}

export function workoutsSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Under 2 workouts/wk on average. Even 2/wk moves you to yellow.",
      yellow: "2 workouts/wk. 3-4/wk reaches green — or raise intensity for a bonus.",
      green: "Good workout consistency. 5+/wk (or higher intensity) gets you to gold.",
    },
    tier,
  );
}

export function proteinSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Protein averaging under 150g/day.",
      yellow: "Protein at 150-200g/day. 200g+ reaches green.",
      green: "Good protein intake. 230g+ gets you to gold.",
    },
    tier,
  );
}

export function caloriesSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Calories are running well outside the 1,800-2,200 sweet spot.",
      yellow: "Calories are close to the 1,800-2,200 sweet spot but not quite there.",
    },
    tier,
  );
}

export function weightSuggestion(w: WeightStatus): string | null {
  if (w.direction === "gain") {
    return `Weight is up ${Math.abs(w.changeVsLastMonth ?? 0).toFixed(1)} lbs vs last month.`;
  }
  return null;
}
