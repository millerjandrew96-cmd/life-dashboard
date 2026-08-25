export interface RelationshipChatParseResult {
  ratings: { communication_rating?: number; intimacy_rating?: number };
  newActionItem: string | null;
  matchedText: Partial<Record<"communication_rating" | "intimacy_rating" | "newActionItem", string>>;
  empty: boolean;
}

const RATING = String.raw`(\d(?:\.\d)?)`;

const COMMUNICATION_PATTERNS = [
  new RegExp(String.raw`communication\D{0,10}${RATING}`, "i"),
  new RegExp(String.raw`${RATING}\D{0,5}(?:for|on)\s*communication`, "i"),
];
const INTIMACY_PATTERNS = [
  new RegExp(String.raw`intimacy\D{0,10}${RATING}`, "i"),
  new RegExp(String.raw`${RATING}\D{0,5}(?:for|on)\s*intimacy`, "i"),
];
const ACTION_ITEM_PATTERNS = [/(?:add|new)\s*(?:action item|task)s?[:\-]?\s*(.+)/i];

/**
 * Heuristic keyword/regex extraction — not an LLM call. Only ever proposes a draft for the
 * user to review and apply; never writes data directly.
 */
export function parseRelationshipsChat(message: string): RelationshipChatParseResult {
  const ratings: RelationshipChatParseResult["ratings"] = {};
  const matchedText: RelationshipChatParseResult["matchedText"] = {};
  let newActionItem: string | null = null;

  for (const pattern of COMMUNICATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      ratings.communication_rating = Number(match[1]);
      matchedText.communication_rating = match[0].trim();
      break;
    }
  }

  for (const pattern of INTIMACY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      ratings.intimacy_rating = Number(match[1]);
      matchedText.intimacy_rating = match[0].trim();
      break;
    }
  }

  for (const pattern of ACTION_ITEM_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      newActionItem = match[1].trim().replace(/[.\s]+$/, "");
      matchedText.newActionItem = match[0].trim();
      break;
    }
  }

  return {
    ratings,
    newActionItem,
    matchedText,
    empty: Object.keys(ratings).length === 0 && !newActionItem,
  };
}
