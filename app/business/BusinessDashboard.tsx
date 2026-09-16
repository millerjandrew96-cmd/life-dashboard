"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreRing } from "@/components/ScoreRing";
import { CounterRing } from "@/components/CounterRing";
import { TierBadge, TIER_TEXT_COLOR } from "@/components/TierBadge";
import { LogRowCard } from "@/components/LogRowCard";
import { PageHeader } from "@/components/PageHeader";
import { formatMonthLabel } from "@/lib/finance/month";
import { currentWeekKey, mondayDateString, monthOfWeek, weekKeyFromDateString, weekLabel } from "@/lib/business/week";
import type { BusinessChatParseResult, WeeklyField } from "@/lib/business/parseChat";
import type { BusinessScore, BusinessWeekEntry } from "@/lib/business/types";

const WEEKLY_NUM_FIELDS = ["contacts", "quality_invites", "customer_registrations", "plans", "follow_ups", "business_registrations"] as const;
type WeeklyNumField = (typeof WEEKLY_NUM_FIELDS)[number];

const WEEKLY_FIELD_LABELS: Record<WeeklyNumField, string> = {
  contacts: "Contacts",
  quality_invites: "Quality invites / overviews",
  customer_registrations: "Customer registrations",
  plans: "Plans",
  follow_ups: "Follow ups",
  business_registrations: "Business registrations",
};

type WeekFormState = Record<WeeklyNumField, string> & { week: string; notes: string };

function emptyWeekForm(week: string, existing: BusinessWeekEntry | null): WeekFormState {
  const base = Object.fromEntries(WEEKLY_NUM_FIELDS.map((f) => [f, String(existing?.[f] ?? 0)])) as Record<WeeklyNumField, string>;
  return { ...base, week, notes: existing?.notes ?? "" };
}

export function BusinessDashboard({
  selectedMonth,
  score,
  weekEntries,
}: {
  selectedMonth: string;
  score: BusinessScore | null;
  weekEntries: BusinessWeekEntry[];
}) {
  const router = useRouter();

  const initialWeek = currentWeekKey();
  const [weekForm, setWeekForm] = useState<WeekFormState>(() =>
    emptyWeekForm(initialWeek, weekEntries.find((w) => w.week === initialWeek) ?? null),
  );
  const [weekSaving, setWeekSaving] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chatResult, setChatResult] = useState<BusinessChatParseResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedWeeks = useMemo(() => [...weekEntries].sort((a, b) => b.week.localeCompare(a.week)), [weekEntries]);

  const registrationsByMonth = useMemo(() => {
    const totals = new Map<string, number>();
    for (const w of weekEntries) {
      const month = monthOfWeek(w.week);
      totals.set(month, (totals.get(month) ?? 0) + w.business_registrations);
    }
    return [...totals.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [weekEntries]);

  const allMonths = useMemo(() => {
    const set = new Set(weekEntries.map((w) => monthOfWeek(w.week)));
    return [...set].sort().reverse();
  }, [weekEntries]);

  function loadWeekIntoForm(week: string) {
    const existing = weekEntries.find((w) => w.week === week) ?? null;
    setWeekForm(emptyWeekForm(week, existing));
    setWeekError(null);
  }

  async function handleWeekSave(e: React.FormEvent) {
    e.preventDefault();
    setWeekSaving(true);
    setWeekError(null);
    try {
      const payload = {
        week: weekForm.week,
        notes: weekForm.notes,
        ...Object.fromEntries(WEEKLY_NUM_FIELDS.map((f) => [f, Number(weekForm[f]) || 0])),
      };
      const res = await fetch("/api/business/week-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save.");
      }
      router.refresh();
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setWeekSaving(false);
    }
  }

  async function handleParseChat() {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/business/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });
      setChatResult((await res.json()) as BusinessChatParseResult);
    } finally {
      setChatLoading(false);
    }
  }

  function applyChatPatch() {
    if (!chatResult) return;
    setWeekForm((f) => {
      const next = { ...f };
      for (const [key, value] of Object.entries(chatResult.patch) as [WeeklyField, number][]) {
        next[key] = String(value);
      }
      return next;
    });
    setChatResult(null);
    setChatMessage("");
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <PageHeader
        title="Business"
        subtitle={formatMonthLabel(selectedMonth)}
        badge={score && <ScoreRing score={score.totalScore} size={40} />}
      />

      {score ? (
        <>
          <section className="mb-6 flex flex-wrap items-center gap-8">
            <ScoreRing score={score.totalScore} />
            <CounterRing value={score.gap.contactsNeeded} label="contacts needed for next registration" />
            <p className="max-w-xs text-sm text-black/60 dark:text-white/60">{score.pacing.message}</p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Score breakdown</h2>

            {/* Below sm: a five-column table doesn't fit a phone screen without horizontal
                scrolling, so each category becomes its own stacked row instead. */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 sm:hidden">
              {score.categories.map((c, i) => (
                <div
                  key={c.key}
                  className={`px-4 py-2.5 ${i > 0 ? "border-t border-black/10 dark:border-white/10" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <TierBadge tier={c.tier} />
                  </div>
                  <p className="mb-1.5 text-xs text-black/60 dark:text-white/60">{c.rawValue}</p>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-xs text-black/40 dark:text-white/40">Weight {c.weight}</span>
                    <span className={`font-semibold ${c.tier ? TIER_TEXT_COLOR[c.tier] : ""}`}>
                      {c.pointsEarned.toFixed(1)} / {c.maxPoints}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 border-black/20 px-4 py-2.5 font-bold dark:border-white/20">
                <span>Total</span>
                <span>{score.totalScore} / 100</span>
              </div>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-black/10 sm:block dark:border-white/10">
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
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">No entries logged yet for this month — log a week below.</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log with chat</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">
          e.g. &ldquo;did 6 contacts and 2 QIs this week, 3 plans, 1 follow up, 1 business registration&rdquo;. Review before
          applying — this is a simple keyword parser, not AI.
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
              <>
                <ul className="mb-3 space-y-1">
                  {(Object.entries(chatResult.patch) as [WeeklyField, number][]).map(([field, value]) => (
                    <li key={field}>
                      <span className="font-medium">{field}</span>: {value}{" "}
                      <span className="text-black/40 dark:text-white/40">(&ldquo;{chatResult.matchedText[field]}&rdquo;)</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={applyChatPatch}
                  className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/20"
                >
                  Apply to form below
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log a week</h2>
        <form onSubmit={handleWeekSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Any day in the week</label>
            <input
              type="date"
              value={mondayDateString(weekForm.week)}
              onChange={(e) => loadWeekIntoForm(weekKeyFromDateString(e.target.value))}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
            <span className="ml-2 text-xs text-black/50 dark:text-white/50">{weekLabel(weekForm.week)}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {WEEKLY_NUM_FIELDS.map((field) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">{WEEKLY_FIELD_LABELS[field]}</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={weekForm[field]}
                  onChange={(e) => setWeekForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
            <textarea
              value={weekForm.notes}
              onChange={(e) => setWeekForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>

          {weekError && <p className="text-sm text-red-600 dark:text-red-400">{weekError}</p>}

          <button
            type="submit"
            disabled={weekSaving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {weekSaving ? "Saving…" : "Save week"}
          </button>
        </form>
      </section>

      {sortedWeeks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Weekly log</h2>

          {/* Below sm: eight columns doesn't fit a phone screen without horizontal scrolling. */}
          <div className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10 sm:hidden">
            {sortedWeeks.map((w) => (
              <LogRowCard
                key={w.week}
                title={weekLabel(w.week)}
                onEdit={() => loadWeekIntoForm(w.week)}
                cols={3}
                stats={[
                  { label: "Contacts", value: String(w.contacts) },
                  { label: "QI", value: String(w.quality_invites) },
                  { label: "Cust. Regs", value: String(w.customer_registrations) },
                  { label: "Plans", value: String(w.plans) },
                  { label: "Follow Ups", value: String(w.follow_ups) },
                  { label: "Registrations", value: String(w.business_registrations) },
                ]}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-black/10 sm:block dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 text-right font-medium">Contacts</th>
                  <th className="px-3 py-2 text-right font-medium">QI</th>
                  <th className="px-3 py-2 text-right font-medium">Cust. Regs</th>
                  <th className="px-3 py-2 text-right font-medium">Plans</th>
                  <th className="px-3 py-2 text-right font-medium">Follow Ups</th>
                  <th className="px-3 py-2 text-right font-medium">Registrations</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedWeeks.map((w) => (
                  <tr key={w.week} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-3 py-2">{weekLabel(w.week)}</td>
                    <td className="px-3 py-2 text-right">{w.contacts}</td>
                    <td className="px-3 py-2 text-right">{w.quality_invites}</td>
                    <td className="px-3 py-2 text-right">{w.customer_registrations}</td>
                    <td className="px-3 py-2 text-right">{w.plans}</td>
                    <td className="px-3 py-2 text-right">{w.follow_ups}</td>
                    <td className="px-3 py-2 text-right">{w.business_registrations}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => loadWeekIntoForm(w.week)} className="text-xs underline underline-offset-2">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {registrationsByMonth.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Registrations by month</h2>
          <p className="mb-2 text-xs text-black/50 dark:text-white/50">Summed from the weekly log above.</p>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {registrationsByMonth.map(([month, total]) => (
              <li key={month} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{formatMonthLabel(month)}</span>
                <span className="font-semibold">{total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allMonths.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">History</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {allMonths.map((m) => (
              <li key={m}>
                <Link
                  href={`/business?month=${m}`}
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
