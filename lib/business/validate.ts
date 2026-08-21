import type { BusinessMonthEntryInput, BusinessWeekEntryInput } from "./types";

export class ValidationError extends Error {}

const WEEK_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const WEEKLY_FIELDS = ["contacts", "quality_invites", "customer_registrations", "plans", "follow_ups"] as const;

function toNonNegativeInt(value: unknown, field: string): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
    throw new ValidationError(`"${field}" must be a non-negative number.`);
  }
  return num;
}

function notesOf(b: Record<string, unknown>): string | null {
  return typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
}

export function parseBusinessWeekEntryInput(body: unknown): BusinessWeekEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.week !== "string" || !WEEK_RE.test(b.week)) {
    throw new ValidationError('"week" must be formatted "YYYY-Www" (ISO week).');
  }

  const result: Record<string, number> = {};
  for (const field of WEEKLY_FIELDS) result[field] = toNonNegativeInt(b[field], field);

  return {
    week: b.week,
    contacts: result.contacts,
    quality_invites: result.quality_invites,
    customer_registrations: result.customer_registrations,
    plans: result.plans,
    follow_ups: result.follow_ups,
    notes: notesOf(b),
  };
}

export function parseBusinessMonthEntryInput(body: unknown): BusinessMonthEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.month !== "string" || !MONTH_RE.test(b.month)) {
    throw new ValidationError('"month" must be formatted "YYYY-MM".');
  }

  return {
    month: b.month,
    business_registrations: toNonNegativeInt(b.business_registrations, "business_registrations"),
    notes: notesOf(b),
  };
}
