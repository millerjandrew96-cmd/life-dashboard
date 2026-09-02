import type { PriorityInput } from "./types";

export class ValidationError extends Error {}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parsePriorityInput(body: unknown): PriorityInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.description !== "string" || !b.description.trim()) {
    throw new ValidationError('"description" is required.');
  }
  if (typeof b.month !== "string" || !MONTH_RE.test(b.month)) {
    throw new ValidationError('"month" must be formatted "YYYY-MM".');
  }

  return {
    month: b.month,
    description: b.description.trim(),
    done: b.done === true,
    notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null,
  };
}
