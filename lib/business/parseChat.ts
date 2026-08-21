export type WeeklyField = "contacts" | "quality_invites" | "customer_registrations" | "plans" | "follow_ups" | "business_registrations";

export interface BusinessChatParseResult {
  patch: Partial<Record<WeeklyField, number>>;
  matchedText: Partial<Record<WeeklyField, string>>;
  empty: boolean;
}

const NUM = String.raw`(\d+)`;

interface FieldRule {
  field: WeeklyField;
  patterns: RegExp[];
}

// Matches both orders — "6 contacts" and "contacts: 6" — since natural phrasing puts the
// number first ("did 6 contacts and 2 QIs this week"). More specific phrasings (e.g.
// "customer registrations") are listed before the generic "registrations" fallback so
// "2 customer registrations, 1 business registration" disambiguates correctly.
const RULES: FieldRule[] = [
  {
    field: "contacts",
    patterns: [new RegExp(String.raw`${NUM}\s*contacts?`, "i"), new RegExp(String.raw`contacts?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "quality_invites",
    patterns: [
      new RegExp(String.raw`${NUM}\s*(?:qis?|quality invites?|overviews?)`, "i"),
      new RegExp(String.raw`(?:qis?|quality invites?|overviews?)\D{0,5}${NUM}`, "i"),
    ],
  },
  {
    field: "customer_registrations",
    patterns: [
      new RegExp(String.raw`${NUM}\s*customer\s*(?:sign[\s-]?ups?|reg(?:istration)?s?)`, "i"),
      new RegExp(String.raw`customer\s*(?:sign[\s-]?ups?|reg(?:istration)?s?)\D{0,5}${NUM}`, "i"),
    ],
  },
  {
    field: "plans",
    patterns: [new RegExp(String.raw`${NUM}\s*plans?`, "i"), new RegExp(String.raw`plans?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "follow_ups",
    patterns: [new RegExp(String.raw`${NUM}\s*follow[\s-]?ups?`, "i"), new RegExp(String.raw`follow[\s-]?ups?\D{0,5}${NUM}`, "i")],
  },
  {
    field: "business_registrations",
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
 * user to review and apply; never writes data directly. All fields are weekly (business
 * registrations included — the monthly figure shown on the dashboard is a sum of weeks).
 */
export function parseBusinessChat(message: string): BusinessChatParseResult {
  const patch: BusinessChatParseResult["patch"] = {};
  const matchedText: BusinessChatParseResult["matchedText"] = {};

  for (const rule of RULES) {
    if (patch[rule.field] !== undefined) continue;
    for (const pattern of rule.patterns) {
      const match = message.match(pattern);
      if (match) {
        patch[rule.field] = Number(match[1]);
        matchedText[rule.field] = match[0].trim();
        break;
      }
    }
  }

  return { patch, matchedText, empty: Object.keys(patch).length === 0 };
}
