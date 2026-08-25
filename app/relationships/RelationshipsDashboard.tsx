"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TierBadge } from "@/components/TierBadge";
import { addMonths, formatMonthLabel } from "@/lib/finance/month";
import type { RelationshipChatParseResult } from "@/lib/relationships/parseChat";
import type { RelationshipActionItem, RelationshipEntry, RelationshipScore } from "@/lib/relationships/types";

type EvalFormState = {
  month: string;
  communication_rating: string;
  communication_going_well: string;
  communication_improve: string;
  intimacy_rating: string;
  intimacy_going_well: string;
  intimacy_improve: string;
  notes: string;
};

function emptyEvalForm(month: string, existing: RelationshipEntry | null): EvalFormState {
  return {
    month,
    communication_rating: String(existing?.communication_rating ?? 3),
    communication_going_well: existing?.communication_going_well ?? "",
    communication_improve: existing?.communication_improve ?? "",
    intimacy_rating: String(existing?.intimacy_rating ?? 3),
    intimacy_going_well: existing?.intimacy_going_well ?? "",
    intimacy_improve: existing?.intimacy_improve ?? "",
    notes: existing?.notes ?? "",
  };
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (grade.startsWith("B")) return "text-green-600 dark:text-green-400";
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function RelationshipsDashboard({
  selectedMonth,
  score,
  entries,
  actionItems,
}: {
  selectedMonth: string;
  score: RelationshipScore | null;
  entries: RelationshipEntry[];
  actionItems: RelationshipActionItem[];
}) {
  const router = useRouter();

  const existingEntry = entries.find((e) => e.month === selectedMonth) ?? null;
  const [evalForm, setEvalForm] = useState<EvalFormState>(() => emptyEvalForm(selectedMonth, existingEntry));
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemDueMonth, setNewItemDueMonth] = useState(() => addMonths(selectedMonth, 1));
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chatResult, setChatResult] = useState<RelationshipChatParseResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.month.localeCompare(a.month)), [entries]);
  const allMonths = useMemo(() => {
    const set = new Set([...entries.map((e) => e.month), ...actionItems.map((i) => i.due_month)]);
    return [...set].sort().reverse();
  }, [entries, actionItems]);

  const itemsDueThisMonth = useMemo(() => actionItems.filter((i) => i.due_month === selectedMonth), [actionItems, selectedMonth]);

  async function handleEvalSave(e: React.FormEvent) {
    e.preventDefault();
    setEvalSaving(true);
    setEvalError(null);
    try {
      const res = await fetch("/api/relationships/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: evalForm.month,
          communication_rating: Number(evalForm.communication_rating),
          communication_going_well: evalForm.communication_going_well,
          communication_improve: evalForm.communication_improve,
          intimacy_rating: Number(evalForm.intimacy_rating),
          intimacy_going_well: evalForm.intimacy_going_well,
          intimacy_improve: evalForm.intimacy_improve,
          notes: evalForm.notes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save.");
      }
      router.push(`/relationships?month=${evalForm.month}`);
      router.refresh();
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setEvalSaving(false);
    }
  }

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

  async function handleParseChat() {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/relationships/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });
      setChatResult((await res.json()) as RelationshipChatParseResult);
    } finally {
      setChatLoading(false);
    }
  }

  function applyRatings() {
    if (!chatResult) return;
    setEvalForm((f) => ({
      ...f,
      communication_rating: chatResult.ratings.communication_rating !== undefined ? String(chatResult.ratings.communication_rating) : f.communication_rating,
      intimacy_rating: chatResult.ratings.intimacy_rating !== undefined ? String(chatResult.ratings.intimacy_rating) : f.intimacy_rating,
    }));
    setChatResult((r) => (r ? { ...r, ratings: {} } : r));
  }

  async function addChatActionItem() {
    if (!chatResult?.newActionItem) return;
    setNewItemDescription(chatResult.newActionItem);
    setChatResult((r) => (r ? { ...r, newActionItem: null } : r));
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80">
        ← Home
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Relationships</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{formatMonthLabel(selectedMonth)}</p>
      </div>

      {score ? (
        <>
          <section className="mb-8 flex items-center gap-6">
            <div className={`text-6xl font-black ${gradeColor(score.grade)}`}>{score.grade}</div>
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">{score.totalScore} / 100</p>
              <p className="text-xs text-black/40 dark:text-white/40">Finance + Communication + Intimacy + Action items, 25 each</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Score breakdown</h2>
            <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-black/5 text-left dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Raw value</th>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 text-right font-medium">Weight</th>
                    <th className="px-4 py-2 text-right font-medium">Points earned</th>
                  </tr>
                </thead>
                <tbody>
                  {score.categories.map((c) => (
                    <tr key={c.key} className="border-t border-black/10 dark:border-white/10">
                      <td className="px-4 py-2 font-medium">{c.label}</td>
                      <td className="px-4 py-2 text-black/70 dark:text-white/70">{c.rawValue}</td>
                      <td className="px-4 py-2">
                        <TierBadge tier={c.tier} />
                      </td>
                      <td className="px-4 py-2 text-right text-black/60 dark:text-white/60">{c.weight}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {c.pointsEarned.toFixed(1)} / {c.maxPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black/20 dark:border-white/20">
                    <td className="px-4 py-2 font-bold" colSpan={4}>
                      Total
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{score.totalScore} / 100</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {score.suggestions.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Areas to improve</h2>
              <ul className="space-y-2">
                {score.suggestions.map((s, i) => (
                  <li key={i} className="rounded-lg border border-black/10 px-4 py-2 text-sm dark:border-white/10">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">No evaluations logged yet — log this month&apos;s below.</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Action items due — {formatMonthLabel(selectedMonth)}</h2>
        {itemsDueThisMonth.length > 0 ? (
          <ul className="mb-4 divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {itemsDueThisMonth.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={togglingId === item.id}
                  onChange={() => toggleDone(item)}
                  className="h-4 w-4"
                />
                <span className={item.done ? "text-black/40 line-through dark:text-white/40" : ""}>{item.description}</span>
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

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log with chat</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">
          e.g. &ldquo;communication was a 4, intimacy a 3&rdquo; or &ldquo;add action item: renew life insurance&rdquo;. Review
          before applying — this is a simple keyword parser, not AI.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParseChat()}
            placeholder="Type a natural-language update…"
          />
          <button
            type="button"
            onClick={handleParseChat}
            disabled={chatLoading || !chatMessage.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {chatLoading ? "Parsing…" : "Parse"}
          </button>
        </div>
        {chatResult && (
          <div className="mt-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
            {chatResult.empty ? (
              <p className="text-black/50 dark:text-white/50">Didn&apos;t recognize any fields in that message.</p>
            ) : (
              <div className="space-y-3">
                {Object.keys(chatResult.ratings).length > 0 && (
                  <div>
                    <ul className="mb-2 space-y-1">
                      {Object.entries(chatResult.ratings).map(([field, value]) => (
                        <li key={field}>
                          <span className="font-medium">{field}</span>: {value}{" "}
                          <span className="text-black/40 dark:text-white/40">
                            (&ldquo;{chatResult.matchedText[field as "communication_rating" | "intimacy_rating"]}&rdquo;)
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={applyRatings}
                      className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/20"
                    >
                      Apply ratings to evaluation form
                    </button>
                  </div>
                )}
                {chatResult.newActionItem && (
                  <div>
                    <p className="mb-2">
                      New action item: <span className="font-medium">{chatResult.newActionItem}</span>
                    </p>
                    <button
                      type="button"
                      onClick={addChatActionItem}
                      className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/20"
                    >
                      Fill into &ldquo;add action item&rdquo; form above
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log this month&apos;s evaluation</h2>
        <form onSubmit={handleEvalSave} className="space-y-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Month</label>
            <input
              type="month"
              value={evalForm.month}
              onChange={(e) => setEvalForm((f) => ({ ...f, month: e.target.value }))}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">Communication</h3>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Rating (0-5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step="0.5"
                value={evalForm.communication_rating}
                onChange={(e) => setEvalForm((f) => ({ ...f, communication_rating: e.target.value }))}
                className="mb-2 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">What&apos;s going well</label>
              <textarea
                value={evalForm.communication_going_well}
                onChange={(e) => setEvalForm((f) => ({ ...f, communication_going_well: e.target.value }))}
                rows={2}
                className="mb-2 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">What needs improvement</label>
              <textarea
                value={evalForm.communication_improve}
                onChange={(e) => setEvalForm((f) => ({ ...f, communication_improve: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">Intimacy</h3>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Rating (0-5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step="0.5"
                value={evalForm.intimacy_rating}
                onChange={(e) => setEvalForm((f) => ({ ...f, intimacy_rating: e.target.value }))}
                className="mb-2 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">What&apos;s going well</label>
              <textarea
                value={evalForm.intimacy_going_well}
                onChange={(e) => setEvalForm((f) => ({ ...f, intimacy_going_well: e.target.value }))}
                rows={2}
                className="mb-2 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">What needs improvement</label>
              <textarea
                value={evalForm.intimacy_improve}
                onChange={(e) => setEvalForm((f) => ({ ...f, intimacy_improve: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">General notes</label>
            <textarea
              value={evalForm.notes}
              onChange={(e) => setEvalForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>

          {evalError && <p className="text-sm text-red-600 dark:text-red-400">{evalError}</p>}

          <button
            type="submit"
            disabled={evalSaving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {evalSaving ? "Saving…" : "Save evaluation"}
          </button>
        </form>
      </section>

      {sortedEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Running notes log</h2>
          <div className="space-y-3">
            {sortedEntries.map((e) => (
              <div key={e.month} className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
                <p className="mb-2 font-semibold">{formatMonthLabel(e.month)}</p>
                <p className="mb-1">
                  <span className="font-medium">Communication ({e.communication_rating}/5):</span>{" "}
                  {e.communication_going_well && <span className="text-black/70 dark:text-white/70">{e.communication_going_well}</span>}
                  {e.communication_improve && <span className="text-black/50 dark:text-white/50"> — improve: {e.communication_improve}</span>}
                </p>
                <p>
                  <span className="font-medium">Intimacy ({e.intimacy_rating}/5):</span>{" "}
                  {e.intimacy_going_well && <span className="text-black/70 dark:text-white/70">{e.intimacy_going_well}</span>}
                  {e.intimacy_improve && <span className="text-black/50 dark:text-white/50"> — improve: {e.intimacy_improve}</span>}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {allMonths.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">History</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {allMonths.map((m) => (
              <li key={m}>
                <Link
                  href={`/relationships?month=${m}`}
                  className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
                    m === selectedMonth ? "bg-black/5 dark:bg-white/5" : ""
                  }`}
                >
                  <span>{formatMonthLabel(m)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
