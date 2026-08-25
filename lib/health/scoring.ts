import type { Tier } from "@/lib/finance/types";
import { currentDayKey, dayOfMonthNumber, daysInMonth, monthOfDay } from "./day";
import { caloriesSuggestion, proteinSuggestion, stepsSuggestion, weightSuggestion, workoutsSuggestion } from "./suggestions";
import type { HealthCategoryBreakdown, HealthDailyEntry, HealthScore, HealthWeekEntry, Intensity, WeightStatus } from "./types";

/**
 * Weight per category (sums to 100). The spec doesn't assign explicit weights across
 * Steps/Workouts/Nutrition (unlike Finance/Business, which do) — this is a judgment call,
 * split roughly evenly with Nutrition a touch lighter since its own internal structure
 * (logging + protein + calories) already spreads credit three ways.
 */
export const WEIGHTS = {
  STEPS: 35,
  WORKOUTS: 35,
  NUTRITION: 30,
} as const;

/** Within Nutrition: "just logging = baseline ~5%" per spec; the remaining 95% is split
 * evenly between protein and calories since the spec doesn't weight one over the other. */
const NUTRITION_LOGGING_SHARE = 0.05;
const NUTRITION_PROTEIN_SHARE = 0.475;
const NUTRITION_CALORIES_SHARE = 0.475;

/** Bonus multiplier so intensity can let fewer, harder sessions rival more, easier ones —
 * tuned so 3 green-tier sessions at "high" intensity (0.85 * 1.3 = 1.105, capped at 1) just
 * reaches the same 1.0 fraction as 5 gold-tier sessions at "low" intensity. A judgment call:
 * the spec asks for this behavior but doesn't give numbers. */
const INTENSITY_MULTIPLIER: Record<Intensity, number> = { low: 1, medium: 1.15, high: 1.3 };
const INTENSITY_NUMERIC: Record<Intensity, number> = { low: 1, medium: 2, high: 3 };

const FOUR_TIER_FRACTIONS: Record<Tier, number> = { red: 0, yellow: 0.5, green: 0.85, gold: 1 };

export function stepsTier(avgPerDay: number): Tier {
  if (avgPerDay >= 10000) return "gold";
  if (avgPerDay >= 6000) return "green";
  if (avgPerDay >= 4000) return "yellow";
  return "red";
}

export function workoutFrequencyTier(n: number): Tier {
  if (n >= 5) return "gold";
  if (n >= 3) return "green";
  if (n === 2) return "yellow";
  return "red";
}

export function proteinTier(avgPerDay: number): Tier {
  if (avgPerDay >= 230) return "gold";
  if (avgPerDay >= 200) return "green";
  if (avgPerDay >= 150) return "yellow";
  return "red";
}

/** A sweet-spot curve, not monotonic: both too little and too much are penalized. No gold tier. */
export function caloriesTier(avgPerDay: number): Tier {
  if (avgPerDay >= 1800 && avgPerDay <= 2200) return "green";
  if (avgPerDay >= 1500 && avgPerDay <= 2500) return "yellow";
  return "red";
}

/** No gold tier — "adjustable later" per spec. */
export function weightTier(current: number): Tier {
  if (current < 230) return "green";
  if (current <= 240) return "yellow";
  return "red";
}

export function intensityLabel(avgNumeric: number): string {
  if (avgNumeric >= 2.6) return "high";
  if (avgNumeric >= 2.2) return "mod-high";
  if (avgNumeric >= 1.8) return "moderate";
  if (avgNumeric >= 1.4) return "low-mod";
  return "low";
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeWorkouts(weeks: HealthWeekEntry[]): { fraction: number; tier: Tier | null; avgPerWeek: number | null; avgIntensity: string | null } {
  if (weeks.length === 0) return { fraction: 0, tier: null, avgPerWeek: null, avgIntensity: null };
  const weekFractions = weeks.map((w) => Math.min(1, FOUR_TIER_FRACTIONS[workoutFrequencyTier(w.workouts)] * INTENSITY_MULTIPLIER[w.intensity]));
  const fraction = average(weekFractions) ?? 0;
  const avgPerWeek = average(weeks.map((w) => w.workouts));
  const avgIntensityNumeric = average(weeks.map((w) => INTENSITY_NUMERIC[w.intensity])) ?? 1;
  return { fraction, tier: blendedTierLabel(fraction), avgPerWeek, avgIntensity: intensityLabel(avgIntensityNumeric) };
}

function blendedTierLabel(fraction: number): Tier {
  if (fraction >= 1) return "gold";
  if (fraction >= 0.85) return "green";
  if (fraction >= 0.5) return "yellow";
  return "red";
}

function computeSteps(days: HealthDailyEntry[]): { fraction: number; tier: Tier | null; avgPerDay: number | null; daysLogged: number } {
  const values = days.map((d) => d.steps).filter((v): v is number => v !== null);
  const avgPerDay = average(values);
  if (avgPerDay === null) return { fraction: 0, tier: null, avgPerDay: null, daysLogged: 0 };
  return { fraction: FOUR_TIER_FRACTIONS[stepsTier(avgPerDay)], tier: stepsTier(avgPerDay), avgPerDay, daysLogged: values.length };
}

function computeNutrition(
  days: HealthDailyEntry[],
  month: string,
  now: Date,
): {
  fraction: number;
  tier: Tier | null;
  proteinAvg: number | null;
  caloriesAvg: number | null;
  daysLogged: number;
  daysApplicable: number;
} {
  const isCurrentMonth = monthOfDay(currentDayKey(now)) === month;
  const daysApplicable = isCurrentMonth ? dayOfMonthNumber(currentDayKey(now)) : daysInMonth(month);

  const proteinValues = days.map((d) => d.protein_g).filter((v): v is number => v !== null);
  const caloriesValues = days.map((d) => d.calories).filter((v): v is number => v !== null);
  const loggedDays = new Set(days.filter((d) => d.protein_g !== null || d.calories !== null).map((d) => d.date));

  const proteinAvg = average(proteinValues);
  const caloriesAvg = average(caloriesValues);

  if (loggedDays.size === 0) {
    return { fraction: 0, tier: null, proteinAvg: null, caloriesAvg: null, daysLogged: 0, daysApplicable };
  }

  const loggingFraction = Math.min(1, loggedDays.size / Math.max(1, daysApplicable));
  const proteinFraction = proteinAvg !== null ? FOUR_TIER_FRACTIONS[proteinTier(proteinAvg)] : 0;
  const caloriesFraction = caloriesAvg !== null ? FOUR_TIER_FRACTIONS[caloriesTier(caloriesAvg)] : 0;

  const fraction = NUTRITION_LOGGING_SHARE * loggingFraction + NUTRITION_PROTEIN_SHARE * proteinFraction + NUTRITION_CALORIES_SHARE * caloriesFraction;

  return { fraction, tier: blendedTierLabel(fraction), proteinAvg, caloriesAvg, daysLogged: loggedDays.size, daysApplicable };
}

function computeWeightStatus(daysInMonthList: HealthDailyEntry[], daysInPrevMonthList: HealthDailyEntry[]): WeightStatus {
  const currentMonthAvg = average(daysInMonthList.map((d) => d.weight_lbs).filter((v): v is number => v !== null));
  const previousMonthAvg = average(daysInPrevMonthList.map((d) => d.weight_lbs).filter((v): v is number => v !== null));

  const changeVsLastMonth = currentMonthAvg !== null && previousMonthAvg !== null ? currentMonthAvg - previousMonthAvg : null;
  const direction = changeVsLastMonth === null ? null : changeVsLastMonth < 0 ? "loss" : changeVsLastMonth > 0 ? "gain" : "flat";
  const tier = currentMonthAvg !== null ? weightTier(currentMonthAvg) : null;

  return { currentMonthAvg, previousMonthAvg, changeVsLastMonth, direction, tier };
}

export function computeHealthScore(args: {
  month: string;
  dailyEntriesInMonth: HealthDailyEntry[];
  weekEntriesInMonth: HealthWeekEntry[];
  dailyEntriesInPreviousMonth: HealthDailyEntry[];
  now?: Date;
}): HealthScore {
  const { month, dailyEntriesInMonth, weekEntriesInMonth, dailyEntriesInPreviousMonth, now = new Date() } = args;

  const steps = computeSteps(dailyEntriesInMonth);
  const workouts = computeWorkouts(weekEntriesInMonth);
  const nutrition = computeNutrition(dailyEntriesInMonth, month, now);

  const categories: HealthCategoryBreakdown[] = [
    {
      key: "steps",
      label: "Steps",
      tier: steps.tier,
      pointsEarned: WEIGHTS.STEPS * steps.fraction,
      maxPoints: WEIGHTS.STEPS,
      weight: WEIGHTS.STEPS,
      rawValue: steps.avgPerDay !== null ? `${Math.round(steps.avgPerDay).toLocaleString()}/day avg over ${steps.daysLogged} day(s)` : "no days logged",
      suggestion: stepsSuggestion(steps.tier),
    },
    {
      key: "workouts",
      label: "Workouts",
      tier: workouts.tier,
      pointsEarned: WEIGHTS.WORKOUTS * workouts.fraction,
      maxPoints: WEIGHTS.WORKOUTS,
      weight: WEIGHTS.WORKOUTS,
      rawValue:
        workouts.avgPerWeek !== null ? `${workouts.avgPerWeek.toFixed(1)}/wk avg, ${workouts.avgIntensity} intensity` : "no weeks logged",
      suggestion: workoutsSuggestion(workouts.tier),
    },
    {
      key: "nutrition",
      label: "Nutrition",
      tier: nutrition.tier,
      pointsEarned: WEIGHTS.NUTRITION * nutrition.fraction,
      maxPoints: WEIGHTS.NUTRITION,
      weight: WEIGHTS.NUTRITION,
      rawValue:
        nutrition.daysLogged > 0
          ? `${nutrition.proteinAvg !== null ? Math.round(nutrition.proteinAvg) + "g protein" : "no protein logged"}, ${
              nutrition.caloriesAvg !== null ? Math.round(nutrition.caloriesAvg) + " cal" : "no calories logged"
            } avg/day, ${nutrition.daysLogged}/${nutrition.daysApplicable} days logged`
          : "no days logged",
      suggestion: nutritionSuggestion(nutrition),
    },
  ];

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.pointsEarned, 0));
  const weight = computeWeightStatus(dailyEntriesInMonth, dailyEntriesInPreviousMonth);

  const suggestions = [...categories.map((c) => c.suggestion).filter((s): s is string => !!s), weightSuggestion(weight)].filter(
    (s): s is string => !!s,
  );

  return { month, totalScore, categories, weight, suggestions };
}

function nutritionSuggestion(n: ReturnType<typeof computeNutrition>): string | null {
  if (n.daysLogged === 0) return "No nutrition logged yet this month. Even logging without hitting targets earns partial credit.";
  const parts: string[] = [];
  if (n.proteinAvg !== null) {
    const s = proteinSuggestion(proteinTier(n.proteinAvg));
    if (s) parts.push(s);
  }
  if (n.caloriesAvg !== null) {
    const s = caloriesSuggestion(caloriesTier(n.caloriesAvg));
    if (s) parts.push(s);
  }
  return parts.length ? parts.join(" ") : null;
}
