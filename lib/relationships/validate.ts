import type { RelationshipActionItemInput, RelationshipEntryInput } from "./types";

export class ValidationError extends Error {}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function notesOf(b: Record<string, unknown>, field: string): string | null {
  const v = b[field];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function toRating(value: unknown, field: string): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(num) || !Number.isFinite(num) || num < 0 || num > 5) {
    throw new ValidationError(`"${field}" must be a number between 0 and 5.`);
  }
  return num;
}

export function parseRelationshipEntryInput(body: unknown): RelationshipEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.month !== "string" || !MONTH_RE.test(b.month)) {
    throw new ValidationError('"month" must be formatted "YYYY-MM".');
  }

  return {
    month: b.month,
    communication_rating: toRating(b.communication_rating, "communication_rating"),
    communication_going_well: notesOf(b, "communication_going_well"),
    communication_improve: notesOf(b, "communication_improve"),
    intimacy_rating: toRating(b.intimacy_rating, "intimacy_rating"),
    intimacy_going_well: notesOf(b, "intimacy_going_well"),
    intimacy_improve: notesOf(b, "intimacy_improve"),
    notes: notesOf(b, "notes"),
  };
}

export function parseRelationshipActionItemInput(body: unknown): RelationshipActionItemInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.description !== "string" || !b.description.trim()) {
    throw new ValidationError('"description" is required.');
  }
  if (typeof b.due_month !== "string" || !MONTH_RE.test(b.due_month)) {
    throw new ValidationError('"due_month" must be formatted "YYYY-MM".');
  }

  return {
    description: b.description.trim(),
    due_month: b.due_month,
    done: b.done === true,
    notes: notesOf(b, "notes"),
  };
}
