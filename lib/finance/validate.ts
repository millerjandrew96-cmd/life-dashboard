import type { FinanceEntryInput } from "./types";

const NUMERIC_FIELDS = [
  "savings_balance",
  "savings_growth",
  "retirement_balance",
  "loan1_balance",
  "loan2_balance",
  "monthly_debt_payment",
  "credit_card_balance",
  "checking_in",
  "checking_out",
  "credit_card_spend",
] as const;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ValidationError extends Error {}

/** Validates and coerces an arbitrary JSON body into a well-formed FinanceEntryInput. */
export function parseFinanceEntryInput(body: unknown): FinanceEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;

  if (typeof b.month !== "string" || !MONTH_RE.test(b.month)) {
    throw new ValidationError('"month" must be formatted "YYYY-MM".');
  }

  const result: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const value = b[field];
    const num = typeof value === "number" ? value : Number(value ?? 0);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      throw new ValidationError(`"${field}" must be a number.`);
    }
    result[field] = num;
  }

  const notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;

  return {
    month: b.month,
    savings_balance: result.savings_balance,
    savings_growth: result.savings_growth,
    retirement_balance: result.retirement_balance,
    loan1_balance: result.loan1_balance,
    loan2_balance: result.loan2_balance,
    monthly_debt_payment: result.monthly_debt_payment,
    credit_card_balance: result.credit_card_balance,
    checking_in: result.checking_in,
    checking_out: result.checking_out,
    credit_card_spend: result.credit_card_spend,
    notes,
  };
}
