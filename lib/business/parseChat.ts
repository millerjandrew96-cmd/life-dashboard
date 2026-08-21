export type WeeklyField = "contacts" | "quality_invites" | "customer_registrations" | "plans" | "follow_ups";
export type MonthlyField = "business_registrations";
type Field = WeeklyField | MonthlyField;

export interface BusinessChatParseResult {
  weekly: Partial<Record<WeeklyField, number>>;
  monthly: Partial<Record<MonthlyField, number>>;
  matchedText: Partial<Record<Field, string>>;
  empty: boolean;
}

const NUM = String.raw`(\d+)`;

interface FieldRule {
  field: Field;
  cadence: "weekly" | "monthly";
  patterns: RegExp[];
}

// Matches both orders — "6 contacts" and "contacts: 6" — since natural phrasing puts the
// number first ("did 6 contacts and 2 QIs this week"). More specific phrasings (e.g.
// "customer registrations") are listed before the generic "registrations" fallback.
const RULES: FieldRule[] = [
  {
    field: "contacts",
    cadence: "weekly",
    patterns: [new RegExp(String.raw`${NUM}\s*contacts?`, "i"), new RegExp(String.raw`contacts?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "quality_invites",
    cadence: "weekly",
    patterns: [
      new RegExp(String.raw`${NUM}\s*(?:qis?|quality invites?|overviews?)`, "i"),
      new RegExp(String.raw`(?:qis?|quality invites?|overviews?)\D{0,5}${NUM}`, "i"),
    ],
  },
  {
    field: "customer_registrations",
    cadence: "weekly",
    patterns: [
      new RegExp(String.raw`${NUM}\s*customer\s*(?:sign[\s-]?ups?|reg(?:istration)?s?)`, "i"),
      new RegExp(String.raw`customer\s*(?:sign[\s-]?ups?|reg(?:istration)?s?)\D{0,5}${NUM}`, "i"),
    ],
  },
  {
    field: "plans",
    cadence: "weekly",
    patterns: [new RegExp(String.raw`${NUM}\s*plans?`, "i"), new RegExp(String.raw`plans?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "follow_ups",
    cadence: "weekly",
    patterns: [new RegExp(String.raw`${NUM}\s*follow[\s-]?ups?`, "i"), new RegExp(String.raw`follow[\s-]?ups?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "business_registrations",
    cadence: "monthly",
    patterns: [
      new RegExp(String.raw`${NUM}\s*(?:business\s*reg(?:istration)?s?|new\s*(?:ibos?|business\s*builders?))`, "i"),
      new RegExp(String.raw`(?:business\s*reg(?:istration)?s?)\D{0,5}${NUM}`, "i"),
      new RegExp(String.raw`${NUM}\s*reg(?:istration)?s?\b`, "i"),
      new RegExp(String.raw`\breg(?:istration)?s?\D{0,5}${NUM}`, "i"),
    ],
  },
];

/**
 * Heuristic keyword/regex extraction — not an LLM call. Only ever proposes a draft for the
 * user to review and apply; never writes data directly. Splits results into a weekly-cadence
 * patch (funnel activity) and a monthly-cadence patch (business registrations) since they
 * save to different records.
 */
export function parseBusinessChat(message: string): BusinessChatParseResult {
  const weekly: BusinessChatParseResult["weekly"] = {};
  const monthly: BusinessChatParseResult["monthly"] = {};
  const matchedText: BusinessChatParseResult["matchedText"] = {};

  for (const rule of RULES) {
    if (matchedText[rule.field] !== undefined) continue;
    for (const pattern of rule.patterns) {
      const match = message.match(pattern);
      if (match) {
        const value = Number(match[1]);
        if (rule.cadence === "weekly") weekly[rule.field as WeeklyField] = value;
        else monthly[rule.field as MonthlyField] = value;
        matchedText[rule.field] = match[0].trim();
        break;
      }
    }
  }

  return { weekly, monthly, matchedText, empty: Object.keys(matchedText).length === 0 };
}
