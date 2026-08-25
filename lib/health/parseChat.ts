import type { Intensity } from "./types";

export type DailyField = "steps" | "protein_g" | "calories" | "weight_lbs";
type MatchKey = DailyField | "workouts" | "intensity";

export interface HealthChatParseResult {
  daily: Partial<Record<DailyField, number>>;
  weekly: { workouts?: number; intensity?: Intensity };
  matchedText: Partial<Record<MatchKey, string>>;
  empty: boolean;
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;

interface DailyRule {
  field: DailyField;
  patterns: RegExp[];
}

// More specific phrasings first so e.g. "2100 calories" isn't mistaken for steps.
const DAILY_RULES: DailyRule[] = [
  {
    field: "steps",
    patterns: [new RegExp(String.raw`${NUM}\s*steps`, "i"), new RegExp(String.raw`steps\D{0,5}${NUM}`, "i")],
  },
  {
    field: "protein_g",
    patterns: [
      new RegExp(String.raw`${NUM}\s*g(?:rams?)?\s*(?:of\s*)?protein`, "i"),
      new RegExp(String.raw`protein\D{0,5}${NUM}`, "i"),
    ],
  },
  {
    field: "calories",
    patterns: [new RegExp(String.raw`${NUM}\s*cal(?:ories)?`, "i"), new RegExp(String.raw`calories\D{0,5}${NUM}`, "i")],
  },
  {
    field: "weight_lbs",
    patterns: [
      new RegExp(String.raw`weigh(?:ed|s|ing)?\D{0,5}${NUM}`, "i"),
      new RegExp(String.raw`${NUM}\s*(?:lbs?|pounds?)\b`, "i"),
    ],
  },
];

const WORKOUTS_PATTERNS = [new RegExp(String.raw`${NUM}\s*workouts?`, "i"), new RegExp(String.raw`worked out\D{0,10}${NUM}\s*times?`, "i")];
const INTENSITY_PATTERNS = [
  new RegExp(String.raw`(low|medium|high)\s*intensity`, "i"),
  new RegExp(String.raw`intensity\D{0,5}(low|medium|high)`, "i"),
];

/**
 * Heuristic keyword/regex extraction — not an LLM call. Only ever proposes a draft for the
 * user to review and apply; never writes data directly. Splits into a daily-cadence patch
 * (steps, nutrition, weight) and a weekly-cadence patch (workouts + intensity) since the
 * spec tracks those on different schedules.
 */
export function parseHealthChat(message: string): HealthChatParseResult {
  const daily: HealthChatParseResult["daily"] = {};
  const weekly: HealthChatParseResult["weekly"] = {};
  const matchedText: HealthChatParseResult["matchedText"] = {};

  for (const rule of DAILY_RULES) {
    for (const pattern of rule.patterns) {
      const match = message.match(pattern);
      if (match) {
        daily[rule.field] = Number(match[1]);
        matchedText[rule.field] = match[0].trim();
        break;
      }
    }
  }

  for (const pattern of WORKOUTS_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      weekly.workouts = Number(match[1]);
      matchedText.workouts = match[0].trim();
      break;
    }
  }

  for (const pattern of INTENSITY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      weekly.intensity = match[1].toLowerCase() as Intensity;
      matchedText.intensity = match[0].trim();
      break;
    }
  }

  return { daily, weekly, matchedText, empty: Object.keys(daily).length === 0 && Object.keys(weekly).length === 0 };
}
