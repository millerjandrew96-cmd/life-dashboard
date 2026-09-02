"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Priority } from "@/lib/priorities/types";

export function PrioritiesList({ month, priorities }: { month: string; priorities: Priority[] }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, description, done: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add priority.");
      }
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add priority.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(priority: Priority) {
    setTogglingId(priority.id);
    try {
      await fetch(`/api/priorities/${priority.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !priority.done }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function remove(priority: Priority) {
    await fetch(`/api/priorities/${priority.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">This month&apos;s priorities</h2>
      {priorities.length > 0 ? (
        <ul className="mb-4 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {priorities.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={p.done}
                disabled={togglingId === p.id}
                onChange={() => toggleDone(p)}
                className="h-4 w-4"
              />
              <span className={`flex-1 ${p.done ? "text-black/40 line-through dark:text-white/40" : ""}`}>{p.description}</span>
              <button
                type="button"
                onClick={() => remove(p)}
                className="text-xs text-black/40 underline underline-offset-2 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-black/50 dark:text-white/50">Nothing added yet — what do you want to get done this month?</p>
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a priority for this month…"
          className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
        <button
          type="submit"
          disabled={saving || !description.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
