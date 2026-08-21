import type { Tier } from "@/lib/finance/types";

function pick(messages: Partial<Record<Tier, string>>, tier: Tier | null): string | null {
  if (!tier) return null;
  return messages[tier] ?? null;
}

export function contactsSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Contacts are under 2/wk. This is the single biggest lever — aim for at least 2-4/wk to reach yellow.",
      yellow: "2-4 contacts/wk. Push to 5+/wk for green — block time on the calendar for outreach.",
      green: "Solid contact volume. 8+/wk gets you to gold.",
    },
    tier,
  );
}

export function registrationSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "No business registrations yet this month. Revisit warm quality invites and follow-ups from recent weeks.",
      green: "On pace this month. 5+ registrations gets you to gold.",
    },
    tier,
  );
}

export function qiSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Quality invites/overviews under 2/wk. These are your warmest leads toward a registration — prioritize booking them.",
      yellow: "2/wk on quality invites. 3+/wk reaches green.",
      green: "Good QI volume. 5+/wk gets you to gold.",
    },
    tier,
  );
}

export function customerRegSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Customer registrations under 2/wk. Even without a business decision, customers build momentum and referrals.",
      yellow: "2/wk on customer registrations. 3+/wk reaches green.",
      green: "Good customer registration pace. 5+/wk gets you to gold.",
    },
    tier,
  );
}

export function plansSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Plans under 2/wk. Plans are how contacts become quality invites — worth scheduling more.",
      yellow: "2/wk on plans. 3+/wk reaches green.",
      green: "Good plan volume. 5+/wk gets you to gold.",
    },
    tier,
  );
}

export function followUpsSuggestion(tier: Tier | null): string | null {
  return pick(
    {
      red: "Follow-ups under 2/wk. Most registrations come from the follow-up, not the first conversation.",
      yellow: "2/wk on follow-ups. 3+/wk reaches green.",
      green: "Good follow-up pace. 5+/wk gets you to gold.",
    },
    tier,
  );
}

const RATIO_LABEL: Record<"contacts" | "quality_invites", string> = {
  contacts: "Contacts-to-registration",
  quality_invites: "Quality-invite-to-registration",
};

/**
 * Flags when the trailing 8-week ratio is running worse (higher) than baseline — i.e. it's
 * taking more effort per registration than the target pace. Silent when there's not enough
 * data yet, or the ratio is at or better than baseline.
 */
export function ratioHealthSuggestion(kind: "contacts" | "quality_invites", trailingRatio: number | null, baseline: number): string | null {
  if (trailingRatio === null || trailingRatio <= baseline) return null;
  return `${RATIO_LABEL[kind]} ratio is trending ${trailingRatio.toFixed(1)}:1 over the trailing 8 weeks, above the ${baseline}:1 baseline — efficiency is slipping.`;
}
