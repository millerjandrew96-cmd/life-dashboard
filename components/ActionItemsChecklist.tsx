"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMonthLabel } from "@/lib/finance/month";
import type { RelationshipActionItem } from "@/lib/relationships/types";

/**
 * Relationships action items checklist — used on both the Relationships page (for whatever
 * month is being viewed) and the home screen (for the current month), against the same
 * relationship_action_items records. Adding, checking off, or removing from either place
 * shows up in both, since there's only one underlying list.
 */
export function ActionItemsChecklist({
  month,
  items,
  defaultDueMonth,
  heading,
}: {
  month: string;
  items: RelationshipActionItem[];
  /** Due month pre-filled for a newly-added item. Defaults to `month` itself. */
  defaultDueMonth?: string;
  heading?: string;
}) {
  const router = useRouter();

  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemDueMonth, setNewItemDueMonth] = useState(defaultDueMonth ?? month);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemDescription.trim()) return;
    setItemSaving(true);
    setItemError(null);
    try {
      const res = await fetch("/api/relationships/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newItemDescription, due_month: newItemDueMonth, done: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add item.");
      }
      setNewItemDescription("");
      router.refresh();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setItemSaving(false);
    }
  }

  async function toggleDone(item: RelationshipActionItem) {
    setTogglingId(item.id);
    try {
      await fetch(`/api/relationships/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !item.done }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function remove(item: RelationshipActionItem) {
    await fetch(`/api/relationships/action-items/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{heading ?? `Action items due — ${formatMonthLabel(month)}`}</h2>
      {items.length > 0 ? (
        <ul className="mb-4 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                disabled={togglingId === item.id}
                onChange={() => toggleDone(item)}
                className="h-4 w-4"
              />
              <span className={`flex-1 ${item.done ? "text-black/40 line-through dark:text-white/40" : ""}`}>{item.description}</span>
              <button
                type="button"
                onClick={() => remove(item)}
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-black/50 dark:text-white/50">No action items due this month.</p>
      )}
      <form onSubmit={handleAddItem} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[14rem]">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">New action item</label>
          <input
            type="text"
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="e.g. renew life insurance policy"
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Due by</label>
          <input
            type="month"
            value={newItemDueMonth}
            onChange={(e) => setNewItemDueMonth(e.target.value)}
            className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
        <button
          type="submit"
          disabled={itemSaving || !newItemDescription.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {itemSaving ? "Adding…" : "Add"}
        </button>
      </form>
      {itemError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{itemError}</p>}
    </section>
  );
}
