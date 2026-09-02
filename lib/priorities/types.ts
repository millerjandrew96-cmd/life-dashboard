/**
 * A free-text priority for a given month, independent of any single pillar —
 * shown on the home screen below the four pillar tiles.
 */
export interface Priority {
  id: string;
  month: string;
  description: string;
  done: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PriorityInput = Pick<Priority, "month" | "description" | "done" | "notes">;
