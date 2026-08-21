import type { Tier } from "@/lib/finance/types";
import {
  contactsSuggestion,
  followUpsSuggestion,
  plansSuggestion,
  qiSuggestion,
  customerRegSuggestion,
  registrationSuggestion,
  ratioHealthSuggestion,
} from "./suggestions";
import type { BusinessCategoryBreakdown, BusinessScore, BusinessWeekEntry, ContactsGap, RegistrationPacing } from "./types";

/** Weight per category (sums to 100). Contacts/Business Registrations share the top
 * tier weight; Quality Invites/Customer Registrations share the mid tier weight;
 * Plans/Follow Ups share the lower tier weight. */
export const WEIGHTS = {
  CONTACTS: 30,
  BUSINESS_REGISTRATIONS: 30,
  QUALITY_INVITES: 15,
  CUSTOMER_REGISTRATIONS: 15,
  PLANS: 5,
  FOLLOW_UPS: 5,
} as const;

export const BASELINE_CONTACTS_PER_REGISTRATION = 15;
export const BASELINE_QI_PER_REGISTRATION = 10;

const FOUR_TIER_FRACTIONS: Record<Tier, number> = { red: 0, yellow: 0.5, green: 0.85, gold: 1 };
const REGISTRATION_FRACTIONS: Record<Tier, number> = { red: 0, yellow: 0, green: 0.85, gold: 1 };

export function contactsTier(n: number): Tier {
  if (n >= 8) return "gold";
  if (n >= 5) return "green";
  if (n >= 2) return "yellow";
  return "red";
}

/** Shared thresholds for Quality Invites, Customer Registrations, Plans, and Follow Ups. */
export function midLowerTier(n: number): Tier {
  if (n >= 5) return "gold";
  if (n >= 3) return "green";
  if (n === 2) return "yellow";
  return "red";
}

/** Evaluated on the monthly sum of a weekly-logged field. No yellow tier. */
export function registrationTier(n: number): Tier {
  if (n >= 5) return "gold";
  if (n >= 1) return "green";
  return "red";
}

function blendedTierLabel(fraction: number, weeksCount: number): Tier | null {
  if (weeksCount === 0) return null;
  if (fraction >= 1) return "gold";
  if (fraction >= 0.85) return "green";
  if (fraction >= 0.5) return "yellow";
  return "red";
}

/** Averages a weekly category's per-week tier fraction across all weeks logged in the month. */
function rollupWeeklyCategory(weeks: BusinessWeekEntry[], field: keyof BusinessWeekEntry, classifier: (n: number) => Tier) {
  if (weeks.length === 0) {
    return { fraction: 0, avgPerWeek: 0, weeksCount: 0, tier: null as Tier | null };
  }
  const values = weeks.map((w) => Number(w[field]));
  const fractions = values.map((v) => FOUR_TIER_FRACTIONS[classifier(v)]);
  const fraction = fractions.reduce((a, b) => a + b, 0) / fractions.length;
  const avgPerWeek = values.reduce((a, b) => a + b, 0) / values.length;
  return { fraction, avgPerWeek, weeksCount: weeks.length, tier: blendedTierLabel(fraction, weeks.length) };
}

function sumField(weeks: BusinessWeekEntry[], field: keyof BusinessWeekEntry): number {
  return weeks.reduce((sum, w) => sum + Number(w[field]), 0);
}

function pacingExpectedFraction(day: number, daysInMonth: number, graceDays = 5): number {
  const grace = Math.min(graceDays, daysInMonth);
  if (day <= grace) {
    return (day / grace) * (grace / daysInMonth) * 0.5;
  }
  const baseline = (grace / daysInMonth) * 0.5;
  return baseline + (1 - baseline) * ((day - grace) / (daysInMonth - grace));
}

function computeRegistrationPacing(month: string, registrationsSoFar: number, now: Date): RegistrationPacing {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNum;
  const day = isCurrentMonth ? now.getDate() : daysInMonth; // a past/future month is treated as "complete" for projection

  const paceFraction = pacingExpectedFraction(day, daysInMonth);
  const projected = paceFraction > 0 ? registrationsSoFar / paceFraction : registrationsSoFar;
  const projectedTier = registrationTier(Math.round(projected));

  const message = isCurrentMonth
    ? `On track for ${Math.round(projected)} registration${Math.round(projected) === 1 ? "" : "s"} by month end (day ${day} of ${daysInMonth})`
    : `${registrationsSoFar} registration${registrationsSoFar === 1 ? "" : "s"} logged`;

  return { registrationsSoFar, projected: Math.round(projected * 10) / 10, projectedTier, message };
}

/**
 * Contacts needed to reach the next registration, using a trailing-8-week contacts:registration
 * ratio — both sums come straight off the same 8 weekly entries. The ratio is capped at the
 * baseline (15:1) — a hard floor so a slump never makes the ask stricter than baseline, while a
 * hot streak (a better, lower ratio) is reflected fairly.
 */
function computeContactsGap(registrationsThisMonth: number, contactsLoggedThisMonth: number, trailingWeeks: BusinessWeekEntry[]): ContactsGap {
  const trailingContacts = sumField(trailingWeeks, "contacts");
  const trailingRegistrations = sumField(trailingWeeks, "business_registrations");

  const trailingRatio = trailingRegistrations > 0 ? trailingContacts / trailingRegistrations : null;
  const effectiveRatio = trailingRatio !== null ? Math.min(trailingRatio, BASELINE_CONTACTS_PER_REGISTRATION) : BASELINE_CONTACTS_PER_REGISTRATION;

  const nextRegistrationTarget = registrationsThisMonth + 1;
  const contactsNeededTotal = Math.ceil(effectiveRatio * nextRegistrationTarget);
  const contactsNeeded = Math.max(0, contactsNeededTotal - contactsLoggedThisMonth);

  return { contactsNeeded, effectiveRatio, nextRegistrationTarget, contactsLoggedThisMonth };
}

export function computeBusinessScore(args: { month: string; weeksInMonth: BusinessWeekEntry[]; trailingWeeks: BusinessWeekEntry[]; now?: Date }): BusinessScore {
  const { month, weeksInMonth, trailingWeeks, now = new Date() } = args;

  const contacts = rollupWeeklyCategory(weeksInMonth, "contacts", contactsTier);
  const qi = rollupWeeklyCategory(weeksInMonth, "quality_invites", midLowerTier);
  const customerRegs = rollupWeeklyCategory(weeksInMonth, "customer_registrations", midLowerTier);
  const plans = rollupWeeklyCategory(weeksInMonth, "plans", midLowerTier);
  const followUps = rollupWeeklyCategory(weeksInMonth, "follow_ups", midLowerTier);

  const registrationsThisMonth = sumField(weeksInMonth, "business_registrations");
  const regTier = registrationTier(registrationsThisMonth);

  const categories: BusinessCategoryBreakdown[] = [
    {
      key: "contacts",
      label: "Contacts",
      tier: contacts.tier,
      pointsEarned: WEIGHTS.CONTACTS * contacts.fraction,
      maxPoints: WEIGHTS.CONTACTS,
      weight: WEIGHTS.CONTACTS,
      rawValue: contacts.weeksCount ? `${contacts.avgPerWeek.toFixed(1)}/wk avg over ${contacts.weeksCount} wk` : "no weeks logged",
      suggestion: contactsSuggestion(contacts.tier),
    },
    {
      key: "business_registrations",
      label: "Business Registrations",
      tier: regTier,
      pointsEarned: WEIGHTS.BUSINESS_REGISTRATIONS * REGISTRATION_FRACTIONS[regTier],
      maxPoints: WEIGHTS.BUSINESS_REGISTRATIONS,
      weight: WEIGHTS.BUSINESS_REGISTRATIONS,
      rawValue: `${registrationsThisMonth} this month`,
      suggestion: registrationSuggestion(regTier),
    },
    {
      key: "quality_invites",
      label: "Quality Invites / Overviews",
      tier: qi.tier,
      pointsEarned: WEIGHTS.QUALITY_INVITES * qi.fraction,
      maxPoints: WEIGHTS.QUALITY_INVITES,
      weight: WEIGHTS.QUALITY_INVITES,
      rawValue: qi.weeksCount ? `${qi.avgPerWeek.toFixed(1)}/wk avg over ${qi.weeksCount} wk` : "no weeks logged",
      suggestion: qiSuggestion(qi.tier),
    },
    {
      key: "customer_registrations",
      label: "Customer Registrations",
      tier: customerRegs.tier,
      pointsEarned: WEIGHTS.CUSTOMER_REGISTRATIONS * customerRegs.fraction,
      maxPoints: WEIGHTS.CUSTOMER_REGISTRATIONS,
      weight: WEIGHTS.CUSTOMER_REGISTRATIONS,
      rawValue: customerRegs.weeksCount ? `${customerRegs.avgPerWeek.toFixed(1)}/wk avg over ${customerRegs.weeksCount} wk` : "no weeks logged",
      suggestion: customerRegSuggestion(customerRegs.tier),
    },
    {
      key: "plans",
      label: "Plans",
      tier: plans.tier,
      pointsEarned: WEIGHTS.PLANS * plans.fraction,
      maxPoints: WEIGHTS.PLANS,
      weight: WEIGHTS.PLANS,
      rawValue: plans.weeksCount ? `${plans.avgPerWeek.toFixed(1)}/wk avg over ${plans.weeksCount} wk` : "no weeks logged",
      suggestion: plansSuggestion(plans.tier),
    },
    {
      key: "follow_ups",
      label: "Follow Ups",
      tier: followUps.tier,
      pointsEarned: WEIGHTS.FOLLOW_UPS * followUps.fraction,
      maxPoints: WEIGHTS.FOLLOW_UPS,
      weight: WEIGHTS.FOLLOW_UPS,
      rawValue: followUps.weeksCount ? `${followUps.avgPerWeek.toFixed(1)}/wk avg over ${followUps.weeksCount} wk` : "no weeks logged",
      suggestion: followUpsSuggestion(followUps.tier),
    },
  ];

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.pointsEarned, 0));

  const pacing = computeRegistrationPacing(month, registrationsThisMonth, now);
  const contactsLoggedThisMonth = sumField(weeksInMonth, "contacts");
  const gap = computeContactsGap(registrationsThisMonth, contactsLoggedThisMonth, trailingWeeks);

  const trailingContacts = sumField(trailingWeeks, "contacts");
  const trailingQi = sumField(trailingWeeks, "quality_invites");
  const trailingRegs = sumField(trailingWeeks, "business_registrations");

  const suggestions = [
    ...categories.map((c) => c.suggestion).filter((s): s is string => !!s),
    ratioHealthSuggestion("contacts", trailingRegs > 0 ? trailingContacts / trailingRegs : null, BASELINE_CONTACTS_PER_REGISTRATION),
    ratioHealthSuggestion("quality_invites", trailingRegs > 0 ? trailingQi / trailingRegs : null, BASELINE_QI_PER_REGISTRATION),
  ].filter((s): s is string => !!s);

  return {
    month,
    totalScore,
    categories,
    weeksLoggedThisMonth: weeksInMonth.map((w) => w.week),
    pacing,
    gap,
    suggestions,
  };
}
