import type { Tier } from "./types";

type Category = "savings" | "debt_payment" | "debt_balance" | "income" | "credit_card";

const MESSAGES: Record<Category, Partial<Record<Tier, string>>> = {
  savings: {
    red: "Savings growth is under $1,000/mo. Set an automatic transfer so at least $1,000 moves to savings every month.",
    yellow: "You're saving $1,000–1,500/mo. Push toward $1,500+ to hit green — trim one recurring expense or add a side-income deposit.",
    green: "Solid savings pace. $2,500+/mo gets you to gold — worth targeting if a bonus or extra income shows up.",
  },
  debt_payment: {
    red: "Monthly debt payment is under $400. Increase it to $400+/mo to flip this to green and cut payoff time.",
  },
  debt_balance: {
    red: "Combined loan balance is above $20k. Prioritize extra principal payments — even small amounts here move the tier fastest.",
    yellow: "Combined loan balance is $5k–20k. Getting under $5k earns a much bigger jump than the last one did.",
  },
  income: {
    red: "Net cash flow is negative this month (checking in minus checking out minus CC spend). Find the leak before it compounds — check for spending creep or a missed bill.",
  },
  credit_card: {
    red: "Credit card balance is above $500. Pause discretionary CC spend and pay it down below $200 for green.",
    yellow: "Credit card balance is $200–500. One or two focused payments gets you under $200.",
  },
};

export function suggestionFor(category: Category, tier: Tier | null): string | null {
  if (!tier) return null;
  return MESSAGES[category][tier] ?? null;
}
