import type { HealthDailyEntryInput, HealthWeekEntryInput, Intensity } from "./types";

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const DAILY_NULLABLE_FIELDS = ["steps", "protein_g", "calories", "weight_lbs"] as const;

function notesOf(b: Record<string, unknown>): string | null {
  return typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
}

/** Distinguishes "not logged" (absent/null/empty-string) from "logged as 0". */
function toNullableNonNegativeNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
    throw new ValidationError(`"${field}" must be a non-negative number, or omitted if not logged.`);
  }
  return num;
}

export function parseHealthDailyEntryInput(body: unknown): HealthDailyEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.date !== "string" || !DATE_RE.test(b.date)) {
    throw new ValidationError('"date" must be formatted "YYYY-MM-DD".');
  }

  const result: Record<string, number | null> = {};
  for (const field of DAILY_NULLABLE_FIELDS) result[field] = toNullableNonNegativeNumber(b[field], field);

  return {
    date: b.date,
    steps: result.steps,
    protein_g: result.protein_g,
    calories: result.calories,
    weight_lbs: result.weight_lbs,
    notes: notesOf(b),
  };
}

export function parseHealthWeekEntryInput(body: unknown): HealthWeekEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.week !== "string" || !WEEK_RE.test(b.week)) {
    throw new ValidationError('"week" must be formatted "YYYY-Www" (ISO week).');
  }

  const workouts = typeof b.workouts === "number" ? b.workouts : Number(b.workouts ?? 0);
  if (Number.isNaN(workouts) || !Number.isFinite(workouts) || workouts < 0) {
    throw new ValidationError('"workouts" must be a non-negative number.');
  }

  const intensity = b.intensity;
  if (intensity !== "low" && intensity !== "medium" && intensity !== "high") {
    throw new ValidationError('"intensity" must be "low", "medium", or "high".');
  }

  return { week: b.week, workouts, intensity: intensity as Intensity, notes: notesOf(b) };
}
