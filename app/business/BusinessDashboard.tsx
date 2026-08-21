"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreRing } from "@/components/ScoreRing";
import { CounterRing } from "@/components/CounterRing";
import { TierBadge } from "@/components/TierBadge";
import { formatMonthLabel } from "@/lib/finance/month";
import { currentWeekKey, mondayDateString, monthOfWeek, weekKeyFromDateString, weekLabel } from "@/lib/business/week";
import type { BusinessChatParseResult, WeeklyField } from "@/lib/business/parseChat";
import type { BusinessMonthEntry, BusinessScore, BusinessWeekEntry } from "@/lib/business/types";

const WEEKLY_NUM_FIELDS = ["contacts", "quality_invites", "customer_registrations", "plans", "follow_ups"] as const;
type WeeklyNumField = (typeof WEEKLY_NUM_FIELDS)[number];

const WEEKLY_FIELD_LABELS: Record<WeeklyNumField, string> = {
  contacts: "Contacts",
  quality_invites: "Quality invites / overviews",
  customer_registrations: "Customer registrations",
  plans: "Plans",
  follow_ups: "Follow ups",
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
  monthEntries,
}: {
  selectedMonth: string;
  score: BusinessScore | null;
  weekEntries: BusinessWeekEntry[];
  monthEntries: BusinessMonthEntry[];
}) {
  const router = useRouter();

  const initialWeek = currentWeekKey();
  const [weekForm, setWeekForm] = useState<WeekFormState>(() =>
    emptyWeekForm(initialWeek, weekEntries.find((w) => w.week === initialWeek) ?? null),
  );
  const [weekSaving, setWeekSaving] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  const currentRegistrationEntry = monthEntries.find((m) => m.month === selectedMonth) ?? null;
  const [regValue, setRegValue] = useState(String(currentRegistrationEntry?.business_registrations ?? 0));
  const [regNotes, setRegNotes] = useState(currentRegistrationEntry?.notes ?? "");
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chatResult, setChatResult] = useState<BusinessChatParseResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedWeeks = useMemo(() => [...weekEntries].sort((a, b) => b.week.localeCompare(a.week)), [weekEntries]);
  const sortedMonths = useMemo(() => [...monthEntries].sort((a, b) => b.month.localeCompare(a.month)), [monthEntries]);
  const allMonths = useMemo(() => {
    const set = new Set<string>([...weekEntries.map((w) => monthOfWeek(w.week)), ...monthEntries.map((m) => m.month)]);
    return [...set].sort().reverse();
  }, [weekEntries, monthEntries]);

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

  async function handleRegistrationSave(e: React.FormEvent) {
    e.preventDefault();
    setRegSaving(true);
    setRegError(null);
    try {
      const res = await fetch("/api/business/month-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, business_registrations: Number(regValue) || 0, notes: regNotes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save.");
      }
      router.refresh();
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setRegSaving(false);
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
    if (Object.keys(chatResult.weekly).length > 0) {
      setWeekForm((f) => {
        const next = { ...f };
        for (const [key, value] of Object.entries(chatResult.weekly) as [WeeklyField, number][]) {
          next[key] = String(value);
        }
        return next;
      });
    }
    if (chatResult.monthly.business_registrations !== undefined) {
      setRegValue(String(chatResult.monthly.business_registrations));
    }
    setChatResult(null);
    setChatMessage("");
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80">
        ← Home
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Business</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{formatMonthLabel(selectedMonth)}</p>
      </div>

      {score ? (
        <>
          <section className="mb-6 flex flex-wrap items-center gap-8">
            <ScoreRing score={score.totalScore} />
            <CounterRing value={score.gap.contactsNeeded} label="contacts needed for next registration" />
            <p className="max-w-xs text-sm text-black/60 dark:text-white/60">{score.pacing.message}</p>
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
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">No entries logged yet for this month — log a week or registrations below.</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log with chat</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">
          e.g. &ldquo;did 6 contacts and 2 QIs this week, 3 plans, 1 follow up&rdquo; or &ldquo;2 business registrations this
          month&rdquo;. Review before applying — this is a simple keyword parser, not AI.
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
                  {Object.entries({ ...chatResult.weekly, ...chatResult.monthly }).map(([field, value]) => (
                    <li key={field}>
                      <span className="font-medium">{field}</span>: {value}{" "}
                      <span className="text-black/40 dark:text-white/40">
                        (&ldquo;{chatResult.matchedText[field as keyof typeof chatResult.matchedText]}&rdquo;)
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={applyChatPatch}
                  className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/20"
                >
                  Apply to forms below
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log business registrations — {formatMonthLabel(selectedMonth)}</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">Tracked monthly, not weekly.</p>
        <form onSubmit={handleRegistrationSave} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Registrations this month</label>
            <input
              type="number"
              min={0}
              step="1"
              value={regValue}
              onChange={(e) => setRegValue(e.target.value)}
              className="w-32 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
            <input
              type="text"
              value={regNotes}
              onChange={(e) => setRegNotes(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>
          <button
            type="submit"
            disabled={regSaving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {regSaving ? "Saving…" : "Save"}
          </button>
        </form>
        {regError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{regError}</p>}
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
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 text-right font-medium">Contacts</th>
                  <th className="px-3 py-2 text-right font-medium">QI</th>
                  <th className="px-3 py-2 text-right font-medium">Cust. Regs</th>
                  <th className="px-3 py-2 text-right font-medium">Plans</th>
                  <th className="px-3 py-2 text-right font-medium">Follow Ups</th>
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

      {sortedMonths.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Registrations by month</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {sortedMonths.map((m) => (
              <li key={m.month} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{formatMonthLabel(m.month)}</span>
                <span className="font-semibold">{m.business_registrations}</span>
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
