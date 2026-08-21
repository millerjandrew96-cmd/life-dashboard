import type { CategoryBreakdown, FinanceEntry, FinanceScore, Tier } from "./types";
import { suggestionFor } from "./suggestions";

/**
 * Category weights (sum to 100). Debt paydown splits internally into
 * payment amount (2/3) and remaining-balance tier (1/3), per spec.
 */
export const WEIGHTS = {
  SAVINGS: 35,
  DEBT_PAYDOWN: 35,
  INCOME: 15,
  CREDIT_CARD: 15,
} as const;

const DEBT_PAYMENT_WEIGHT = (WEIGHTS.DEBT_PAYDOWN * 2) / 3;
const DEBT_BALANCE_WEIGHT = WEIGHTS.DEBT_PAYDOWN / 3;

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function tierPoints(tier: Tier | null, weight: number, fractions: Partial<Record<Tier, number>>) {
  if (!tier) return 0;
  return weight * (fractions[tier] ?? 0);
}

// ---- Individual tier classifiers, each mirroring the spec's thresholds exactly ----

export function savingsTier(growth: number): Tier {
  if (growth >= 2500) return "gold";
  if (growth >= 1500) return "green";
  if (growth >= 1000) return "yellow";
  return "red";
}

/** Debt payment amount is a binary red/green tier (no yellow/gold). */
export function debtPaymentTier(monthlyPayment: number): "red" | "green" {
  return monthlyPayment >= 400 ? "green" : "red";
}

export function debtBalanceTier(combinedLoanBalance: number): "red" | "yellow" | "green" {
  if (combinedLoanBalance < 5000) return "green";
  if (combinedLoanBalance <= 20000) return "yellow";
  return "red";
}

export function creditCardTier(balance: number): "red" | "yellow" | "green" {
  if (balance < 200) return "green";
  if (balance <= 500) return "yellow";
  return "red";
}

/** Income has no middle tier: positive net cash flow is green, negative is red. */
export function incomeTier(netCashFlow: number): "red" | "green" {
  return netCashFlow >= 0 ? "green" : "red";
}

export function computeFinanceScore(entry: FinanceEntry): FinanceScore {
  const combinedLoanBalance = entry.loan1_balance + entry.loan2_balance;
  const netCashFlow = entry.checking_in - entry.checking_out - entry.credit_card_spend;
  const netWorth =
    entry.savings_balance + entry.retirement_balance - combinedLoanBalance - entry.credit_card_balance;

  const sTier = savingsTier(entry.savings_growth);
  const savings: CategoryBreakdown = {
    key: "savings",
    label: "Savings",
    tier: sTier,
    // Steep top end rewards consistency: red=0, yellow halfway, green most of the
    // way there, gold is the only tier that earns full category weight.
    pointsEarned: tierPoints(sTier, WEIGHTS.SAVINGS, { red: 0, yellow: 0.5, green: 0.85, gold: 1 }),
    maxPoints: WEIGHTS.SAVINGS,
    weight: WEIGHTS.SAVINGS,
    rawValue: `${money(entry.savings_growth)} saved this month`,
    suggestion: suggestionFor("savings", sTier),
  };

  const dpTier = debtPaymentTier(entry.monthly_debt_payment);
  const debtPayment: CategoryBreakdown = {
    key: "debt_payment",
    label: "Debt Paydown — Monthly Payment",
    tier: dpTier,
    pointsEarned: tierPoints(dpTier, DEBT_PAYMENT_WEIGHT, { red: 0, green: 1 }),
    maxPoints: DEBT_PAYMENT_WEIGHT,
    weight: DEBT_PAYMENT_WEIGHT,
    rawValue: `${money(entry.monthly_debt_payment)}/mo paid`,
    suggestion: suggestionFor("debt_payment", dpTier),
  };

  const dbTier = debtBalanceTier(combinedLoanBalance);
  const debtBalance: CategoryBreakdown = {
    key: "debt_balance",
    label: "Debt Paydown — Remaining Balance",
    tier: dbTier,
    // Non-linear per spec: red -> yellow is a moderate jump, yellow -> green is bigger.
    pointsEarned: tierPoints(dbTier, DEBT_BALANCE_WEIGHT, { red: 0, yellow: 0.35, green: 1 }),
    maxPoints: DEBT_BALANCE_WEIGHT,
    weight: DEBT_BALANCE_WEIGHT,
    rawValue: `${money(combinedLoanBalance)} combined loan balance`,
    suggestion: suggestionFor("debt_balance", dbTier),
  };

  const iTier = incomeTier(netCashFlow);
  const income: CategoryBreakdown = {
    key: "income",
    label: "Income (Net Cash Flow)",
    tier: iTier,
    pointsEarned: tierPoints(iTier, WEIGHTS.INCOME, { red: 0, green: 1 }),
    maxPoints: WEIGHTS.INCOME,
    weight: WEIGHTS.INCOME,
    rawValue: `${money(netCashFlow)} net (checking in − checking out − CC spend)`,
    suggestion: suggestionFor("income", iTier),
  };

  const ccTier = creditCardTier(entry.credit_card_balance);
  const creditCard: CategoryBreakdown = {
    key: "credit_card",
    label: "Credit Card Balance",
    tier: ccTier,
    pointsEarned: tierPoints(ccTier, WEIGHTS.CREDIT_CARD, { red: 0, yellow: 0.5, green: 1 }),
    maxPoints: WEIGHTS.CREDIT_CARD,
    weight: WEIGHTS.CREDIT_CARD,
    rawValue: `${money(entry.credit_card_balance)} balance`,
    suggestion: suggestionFor("credit_card", ccTier),
  };

  const categories = [savings, debtPayment, debtBalance, income, creditCard];
  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.pointsEarned, 0));

  return {
    month: entry.month,
    totalScore,
    categories,
    combinedLoanBalance,
    netCashFlow,
    netWorth,
    retirementBalance: entry.retirement_balance,
    savingsBalance: entry.savings_balance,
    suggestions: categories.map((c) => c.suggestion).filter((s): s is string => !!s),
  };
}
