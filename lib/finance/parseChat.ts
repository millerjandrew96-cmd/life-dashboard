import type { FinanceEntryInput } from "./types";

export type ChatParseField = Exclude<keyof FinanceEntryInput, "month" | "notes">;

export interface ChatParseResult {
  patch: Partial<Record<ChatParseField, number>>;
  /** The exact snippet of text that produced each parsed field, for user review. */
  matchedText: Partial<Record<ChatParseField, string>>;
  /** True if nothing in the message matched a known field. */
  empty: boolean;
}

const AMOUNT = String.raw`\$?\s?(-?[\d,]+(?:\.\d+)?)\s?(k)?`;

function toNumber(raw: string, kSuffix: string | undefined): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  return kSuffix ? n * 1000 : n;
}

interface FieldRule {
  field: ChatParseField;
  patterns: RegExp[];
}

// Order matters: more specific phrasings are listed before generic ones for the same
// underlying account, so e.g. "saved $1,200" (growth) is tried before a bare "savings" match.
const RULES: FieldRule[] = [
  {
    field: "savings_growth",
    patterns: [
      new RegExp(String.raw`(?:saved|put (?:in|into) savings|added to savings|savings? grew by|savings? growth(?: of)?)\D{0,12}${AMOUNT}`, "i"),
      new RegExp(String.raw`${AMOUNT}\D{0,12}(?:into savings|to savings)`, "i"),
    ],
  },
  {
    field: "savings_balance",
    patterns: [new RegExp(String.raw`savings(?: account)? balance(?: is| at|:)?\D{0,8}${AMOUNT}`, "i")],
  },
  {
    field: "retirement_balance",
    patterns: [new RegExp(String.raw`retirement(?: account)?(?: balance| is at| is|:)?\D{0,8}${AMOUNT}`, "i")],
  },
  {
    field: "monthly_debt_payment",
    patterns: [
      new RegExp(String.raw`(?:paid|payment(?: of)?)\D{0,10}${AMOUNT}\D{0,20}(?:loan|debt|loans)`, "i"),
      new RegExp(String.raw`(?:loan|debt) payment(?: is| was|:)?\D{0,8}${AMOUNT}`, "i"),
    ],
  },
  {
    field: "loan1_balance",
    patterns: [new RegExp(String.raw`loan\s*(?:1|one)(?: balance| is at| is|:)?\D{0,8}${AMOUNT}`, "i")],
  },
  {
    field: "loan2_balance",
    patterns: [new RegExp(String.raw`loan\s*(?:2|two)(?: balance| is at| is|:)?\D{0,8}${AMOUNT}`, "i")],
  },
  {
    field: "credit_card_spend",
    patterns: [
      new RegExp(String.raw`(?:spent|charged)\D{0,10}${AMOUNT}\D{0,20}(?:credit card|cc)`, "i"),
      new RegExp(String.raw`credit card spend(?: is| was|:)?\D{0,8}${AMOUNT}`, "i"),
    ],
  },
  {
    field: "credit_card_balance",
    patterns: [new RegExp(String.raw`(?:credit card|cc)(?: balance| is at| is|:)?\D{0,8}${AMOUNT}`, "i")],
  },
  {
    field: "checking_in",
    patterns: [new RegExp(String.raw`(?:checking in|deposits?(?: of)?|income(?: of)?)\D{0,10}${AMOUNT}`, "i")],
  },
  {
    field: "checking_out",
    patterns: [new RegExp(String.raw`(?:checking out|checking spend|spent from checking)\D{0,10}${AMOUNT}`, "i")],
  },
];

/**
 * Heuristic keyword/regex extraction — not an LLM call. It only ever proposes a draft
 * patch for the user to review and edit before saving; it never writes data directly.
 */
export function parseFinanceChat(message: string): ChatParseResult {
  const patch: ChatParseResult["patch"] = {};
  const matchedText: ChatParseResult["matchedText"] = {};

  for (const rule of RULES) {
    if (patch[rule.field] !== undefined) continue;
    for (const pattern of rule.patterns) {
      const match = message.match(pattern);
      if (match) {
        patch[rule.field] = toNumber(match[1], match[2]);
        matchedText[rule.field] = match[0].trim();
        break;
      }
    }
  }

  return { patch, matchedText, empty: Object.keys(patch).length === 0 };
}
