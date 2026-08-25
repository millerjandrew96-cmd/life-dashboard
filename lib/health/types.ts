import type { Tier } from "@/lib/finance/types";

export type Intensity = "low" | "medium" | "high";

/**
 * One calendar day of manually-entered health data. `date` is the primary key, "YYYY-MM-DD".
 * Every metric is independently nullable — steps, nutrition, and weight are logged (or not)
 * on their own schedule, and "not logged" must stay distinguishable from "logged as 0".
 */
export interface HealthDailyEntry {
  date: string;
  steps: number | null;
  protein_g: number | null;
  calories: number | null;
  weight_lbs: number | null;
  notes: string | null;
  updated_at?: string;
}

export type HealthDailyEntryInput = Omit<HealthDailyEntry, "updated_at">;

/** Workouts are tracked weekly: a frequency count plus one perceived-intensity label for the week. */
export interface HealthWeekEntry {
  week: string;
  workouts: number;
  intensity: Intensity;
  notes: string | null;
  updated_at?: string;
}

export type HealthWeekEntryInput = Omit<HealthWeekEntry, "updated_at">;

export interface HealthCategoryBreakdown {
  key: string;
  label: string;
  tier: Tier | null;
  pointsEarned: number;
  maxPoints: number;
  weight: number;
  rawValue: string;
  suggestion: string | null;
}

/** Weight is shown for context (like Finance's retirement balance) but never folded into the 100-point score. */
export interface WeightStatus {
  currentMonthAvg: number | null;
  previousMonthAvg: number | null;
  changeVsLastMonth: number | null;
  direction: "loss" | "gain" | "flat" | null;
  tier: Tier | null;
}

export interface HealthScore {
  month: string;
  totalScore: number;
  categories: HealthCategoryBreakdown[];
  weight: WeightStatus;
  suggestions: string[];
}
