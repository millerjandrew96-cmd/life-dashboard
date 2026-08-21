export type Tier = "red" | "yellow" | "green" | "gold";

/** One month of manually-entered finance inputs. `month` is the primary key, formatted "YYYY-MM". */
export interface FinanceEntry {
  month: string;
  /** Current total savings account balance (display only). */
  savings_balance: number;
  /** Dollars saved/grown this month — the scored savings input. */
  savings_growth: number;
  /** Current retirement account balance (display only, never scored). */
  retirement_balance: number;
  loan1_balance: number;
  loan2_balance: number;
  /** Combined monthly payment made across both loans this month. */
  monthly_debt_payment: number;
  credit_card_balance: number;
  /** Total deposits into checking this month. */
  checking_in: number;
  /** Total checking outflows this month, EXCLUDING transfers to savings. */
  checking_out: number;
  /** Total spend on the credit card this month. */
  credit_card_spend: number;
  notes: string | null;
  updated_at?: string;
}

export type FinanceEntryInput = Omit<FinanceEntry, "updated_at">;

export interface CategoryBreakdown {
  key: string;
  label: string;
  tier: Tier | null;
  /** Points earned toward the total 100-point score. */
  pointsEarned: number;
  /** Max points this category can contribute. */
  maxPoints: number;
  /** The weight (as shown to the user) this category represents. */
  weight: number;
  /** Raw value(s) that drove the tier, formatted for display. */
  rawValue: string;
  suggestion: string | null;
}

export interface FinanceScore {
  month: string;
  totalScore: number;
  categories: CategoryBreakdown[];
  combinedLoanBalance: number;
  netCashFlow: number;
  netWorth: number;
  retirementBalance: number;
  savingsBalance: number;
  suggestions: string[];
}
