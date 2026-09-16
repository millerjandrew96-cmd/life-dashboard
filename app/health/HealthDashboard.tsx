"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreRing } from "@/components/ScoreRing";
import { TierBadge, TIER_TEXT_COLOR } from "@/components/TierBadge";
import { LogRowCard } from "@/components/LogRowCard";
import { PageHeader } from "@/components/PageHeader";
import { formatMonthLabel } from "@/lib/finance/month";
import { currentWeekKey, mondayDateString, monthOfWeek, weekKeyFromDateString, weekLabel } from "@/lib/business/week";
import { currentDayKey, dayLabel } from "@/lib/health/day";
import type { DailyField, HealthChatParseResult } from "@/lib/health/parseChat";
import type { HealthDailyEntry, HealthScore, HealthWeekEntry, Intensity } from "@/lib/health/types";

const DAILY_NUM_FIELDS = ["steps", "protein_g", "calories", "weight_lbs"] as const;
type DailyNumField = (typeof DAILY_NUM_FIELDS)[number];

const DAILY_FIELD_LABELS: Record<DailyNumField, string> = {
  steps: "Steps",
  protein_g: "Protein (g)",
  calories: "Calories",
  weight_lbs: "Weight (lbs)",
};

type DailyFormState = Record<DailyNumField, string> & { date: string; notes: string };
type WeekFormState = { week: string; workouts: string; intensity: Intensity; notes: string };

function toFieldString(value: number | null): string {
  return value === null ? "" : String(value);
}

function emptyDailyForm(date: string, existing: HealthDailyEntry | null): DailyFormState {
  return {
    date,
    steps: toFieldString(existing?.steps ?? null),
    protein_g: toFieldString(existing?.protein_g ?? null),
    calories: toFieldString(existing?.calories ?? null),
    weight_lbs: toFieldString(existing?.weight_lbs ?? null),
    notes: existing?.notes ?? "",
  };
}

function emptyWeekForm(week: string, existing: HealthWeekEntry | null): WeekFormState {
  return {
    week,
    workouts: String(existing?.workouts ?? 0),
    intensity: existing?.intensity ?? "low",
    notes: existing?.notes ?? "",
  };
}

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function HealthDashboard({
  selectedMonth,
  score,
  dailyEntries,
  weekEntries,
}: {
  selectedMonth: string;
  score: HealthScore | null;
  dailyEntries: HealthDailyEntry[];
  weekEntries: HealthWeekEntry[];
}) {
  const router = useRouter();

  const initialDay = currentDayKey();
  const [dailyForm, setDailyForm] = useState<DailyFormState>(() =>
    emptyDailyForm(initialDay, dailyEntries.find((d) => d.date === initialDay) ?? null),
  );
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const initialWeek = currentWeekKey();
  const [weekForm, setWeekForm] = useState<WeekFormState>(() =>
    emptyWeekForm(initialWeek, weekEntries.find((w) => w.week === initialWeek) ?? null),
  );
  const [weekSaving, setWeekSaving] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chatResult, setChatResult] = useState<HealthChatParseResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedDays = useMemo(() => [...dailyEntries].sort((a, b) => b.date.localeCompare(a.date)), [dailyEntries]);
  const sortedWeeks = useMemo(() => [...weekEntries].sort((a, b) => b.week.localeCompare(a.week)), [weekEntries]);
  const allMonths = useMemo(() => {
    const set = new Set<string>([...dailyEntries.map((d) => d.date.slice(0, 7)), ...weekEntries.map((w) => monthOfWeek(w.week))]);
    return [...set].sort().reverse();
  }, [dailyEntries, weekEntries]);

  function loadDayIntoForm(date: string) {
    setDailyForm(emptyDailyForm(date, dailyEntries.find((d) => d.date === date) ?? null));
    setDailyError(null);
  }

  function loadWeekIntoForm(week: string) {
    setWeekForm(emptyWeekForm(week, weekEntries.find((w) => w.week === week) ?? null));
    setWeekError(null);
  }

  async function handleDailySave(e: React.FormEvent) {
    e.preventDefault();
    setDailySaving(true);
    setDailyError(null);
    try {
      const payload = {
        date: dailyForm.date,
        notes: dailyForm.notes,
        ...Object.fromEntries(DAILY_NUM_FIELDS.map((f) => [f, dailyForm[f] === "" ? null : Number(dailyForm[f])])),
      };
      const res = await fetch("/api/health/daily-entries", {
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
      setDailyError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setDailySaving(false);
    }
  }

  async function handleWeekSave(e: React.FormEvent) {
    e.preventDefault();
    setWeekSaving(true);
    setWeekError(null);
    try {
      const res = await fetch("/api/health/week-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekForm.week, workouts: Number(weekForm.workouts) || 0, intensity: weekForm.intensity, notes: weekForm.notes }),
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
      const res = await fetch("/api/health/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });
      setChatResult((await res.json()) as HealthChatParseResult);
    } finally {
      setChatLoading(false);
    }
  }

  function applyChatPatch() {
    if (!chatResult) return;
    if (Object.keys(chatResult.daily).length > 0) {
      setDailyForm((f) => {
        const next = { ...f };
        for (const [key, value] of Object.entries(chatResult.daily) as [DailyField, number][]) {
          next[key] = String(value);
        }
        return next;
      });
    }
    if (chatResult.weekly.workouts !== undefined || chatResult.weekly.intensity !== undefined) {
      setWeekForm((f) => ({
        ...f,
        workouts: chatResult.weekly.workouts !== undefined ? String(chatResult.weekly.workouts) : f.workouts,
        intensity: chatResult.weekly.intensity ?? f.intensity,
      }));
    }
    setChatResult(null);
    setChatMessage("");
  }

  const weight = score?.weight;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <PageHeader
        title="Health"
        subtitle={formatMonthLabel(selectedMonth)}
        badge={score && <ScoreRing score={score.totalScore} size={40} />}
      />

      {score ? (
        <>
          <section className="mb-8 flex flex-wrap items-center gap-8">
            <ScoreRing score={score.totalScore} />
            <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
              <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">Weight (avg this month)</p>
              <p className="mt-1 text-xl font-bold">{weight?.currentMonthAvg !== null && weight?.currentMonthAvg !== undefined ? `${money(weight.currentMonthAvg)} lbs` : "—"}</p>
              {weight?.changeVsLastMonth !== null && weight?.changeVsLastMonth !== undefined && (
                <p className={`mt-0.5 text-xs ${weight.direction === "gain" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {weight.changeVsLastMonth > 0 ? "+" : ""}
                  {money(weight.changeVsLastMonth)} lbs vs last month
                </p>
              )}
              {weight?.tier && (
                <div className="mt-2">
                  <TierBadge tier={weight.tier} />
                </div>
              )}
            </div>
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
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">No entries logged yet for this month — log a day or week below.</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log with chat</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">
          e.g. &ldquo;walked 8000 steps, 180g protein, 2100 calories, weighed 228&rdquo; or &ldquo;3 workouts this week at
          high intensity&rdquo;. Review before applying — this is a simple keyword parser, not AI.
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
                  {Object.entries({ ...chatResult.daily, ...chatResult.weekly }).map(([field, value]) => (
                    <li key={field}>
                      <span className="font-medium">{field}</span>: {String(value)}{" "}
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
        <h2 className="mb-3 text-lg font-semibold">Log a day</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">Leave a field blank if it wasn&apos;t tracked that day.</p>
        <form onSubmit={handleDailySave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Date</label>
            <input
              type="date"
              value={dailyForm.date}
              onChange={(e) => loadDayIntoForm(e.target.value)}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DAILY_NUM_FIELDS.map((field) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">{DAILY_FIELD_LABELS[field]}</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="not logged"
                  value={dailyForm[field]}
                  onChange={(e) => setDailyForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
            <textarea
              value={dailyForm.notes}
              onChange={(e) => setDailyForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>

          {dailyError && <p className="text-sm text-red-600 dark:text-red-400">{dailyError}</p>}

          <button
            type="submit"
            disabled={dailySaving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {dailySaving ? "Saving…" : "Save day"}
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log a week of workouts</h2>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Workouts this week</label>
              <input
                type="number"
                min={0}
                step="1"
                value={weekForm.workouts}
                onChange={(e) => setWeekForm((f) => ({ ...f, workouts: e.target.value }))}
                className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Perceived intensity</label>
              <select
                value={weekForm.intensity}
                onChange={(e) => setWeekForm((f) => ({ ...f, intensity: e.target.value as Intensity }))}
                className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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

      {sortedDays.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Daily log</h2>

          {/* Below sm: six columns doesn't fit a phone screen without horizontal scrolling. */}
          <div className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10 sm:hidden">
            {sortedDays.map((d) => (
              <LogRowCard
                key={d.date}
                title={dayLabel(d.date)}
                onEdit={() => loadDayIntoForm(d.date)}
                stats={[
                  { label: "Steps", value: String(d.steps ?? "—") },
                  { label: "Protein", value: String(d.protein_g ?? "—") },
                  { label: "Calories", value: String(d.calories ?? "—") },
                  { label: "Weight", value: String(d.weight_lbs ?? "—") },
                ]}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-black/10 sm:block dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Steps</th>
                  <th className="px-3 py-2 text-right font-medium">Protein</th>
                  <th className="px-3 py-2 text-right font-medium">Calories</th>
                  <th className="px-3 py-2 text-right font-medium">Weight</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedDays.map((d) => (
                  <tr key={d.date} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-3 py-2">{dayLabel(d.date)}</td>
                    <td className="px-3 py-2 text-right">{d.steps ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{d.protein_g ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{d.calories ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{d.weight_lbs ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => loadDayIntoForm(d.date)} className="text-xs underline underline-offset-2">
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

      {sortedWeeks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Workout log</h2>

          {/* Below sm: the week label is long enough that four columns still won't fit. */}
          <div className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10 sm:hidden">
            {sortedWeeks.map((w) => (
              <LogRowCard
                key={w.week}
                title={weekLabel(w.week)}
                onEdit={() => loadWeekIntoForm(w.week)}
                stats={[
                  { label: "Workouts", value: String(w.workouts) },
                  { label: "Intensity", value: w.intensity.charAt(0).toUpperCase() + w.intensity.slice(1) },
                ]}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-black/10 sm:block dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/5 text-left dark:bg-white/5">
                <tr>
                  <th className="px-3 py-2 font-medium">Week</th>
                  <th className="px-3 py-2 text-right font-medium">Workouts</th>
                  <th className="px-3 py-2 text-right font-medium">Intensity</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedWeeks.map((w) => (
                  <tr key={w.week} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-3 py-2">{weekLabel(w.week)}</td>
                    <td className="px-3 py-2 text-right">{w.workouts}</td>
                    <td className="px-3 py-2 text-right capitalize">{w.intensity}</td>
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

      {allMonths.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">History</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {allMonths.map((m) => (
              <li key={m}>
                <Link
                  href={`/health?month=${m}`}
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
