import type { Tier } from "@/lib/finance/types";

/**
 * One week of manually-entered funnel activity. `week` is the primary key, ISO format "YYYY-Www".
 * Business registrations are logged weekly like everything else; the dashboard displays them
 * summed to a monthly figure (and the tier is evaluated on that monthly sum) per the spec.
 */
export interface BusinessWeekEntry {
  week: string;
  contacts: number;
  quality_invites: number;
  customer_registrations: number;
  plans: number;
  follow_ups: number;
  business_registrations: number;
  notes: string | null;
  updated_at?: string;
}

export type BusinessWeekEntryInput = Omit<BusinessWeekEntry, "updated_at">;

export interface BusinessCategoryBreakdown {
  key: string;
  label: string;
  /** Representative tier for the blended (averaged-across-weeks) value; null if no data this month. */
  tier: Tier | null;
  pointsEarned: number;
  maxPoints: number;
  weight: number;
  rawValue: string;
  suggestion: string | null;
}

export interface RegistrationPacing {
  registrationsSoFar: number;
  projected: number;
  projectedTier: Tier;
  message: string;
}

export interface ContactsGap {
  contactsNeeded: number;
  effectiveRatio: number;
  nextRegistrationTarget: number;
  contactsLoggedThisMonth: number;
}

export interface BusinessScore {
  month: string;
  totalScore: number;
  categories: BusinessCategoryBreakdown[];
  weeksLoggedThisMonth: string[];
  pacing: RegistrationPacing;
  gap: ContactsGap;
  suggestions: string[];
}
