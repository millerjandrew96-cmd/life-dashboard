import type { Tier } from "@/lib/finance/types";

/**
 * One monthly marriage evaluation. `month` is the primary key, "YYYY-MM".
 * Ratings are 0-5, set by Breanne during the evaluation. Each rated category carries its
 * own free-text "going well" / "needs improvement" notes, captured every month as a running log.
 */
export interface RelationshipEntry {
  month: string;
  communication_rating: number;
  communication_going_well: string | null;
  communication_improve: string | null;
  intimacy_rating: number;
  intimacy_going_well: string | null;
  intimacy_improve: string | null;
  notes: string | null;
  updated_at?: string;
}

export type RelationshipEntryInput = Omit<RelationshipEntry, "updated_at">;

/**
 * An action item from an evaluation (will, insurance, etc.). `due_month` is explicit rather
 * than rigidly "always the next month" — the default when creating one during an evaluation
 * is next month, but an item can be given more runway.
 */
export interface RelationshipActionItem {
  id: string;
  description: string;
  due_month: string;
  done: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RelationshipActionItemInput = Pick<RelationshipActionItem, "description" | "due_month" | "done" | "notes">;

export interface RelationshipCategoryBreakdown {
  key: string;
  label: string;
  tier: Tier | null;
  pointsEarned: number;
  maxPoints: number;
  weight: number;
  rawValue: string;
  suggestion: string | null;
}

export interface RelationshipScore {
  month: string;
  totalScore: number;
  grade: string;
  categories: RelationshipCategoryBreakdown[];
  actionItemsDueThisMonth: RelationshipActionItem[];
  suggestions: string[];
}
