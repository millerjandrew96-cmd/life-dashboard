"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreRing } from "@/components/ScoreRing";
import { TierBadge, TIER_TEXT_COLOR } from "@/components/TierBadge";
import { PageHeader } from "@/components/PageHeader";
import { HeaderScoreBadge } from "@/components/HeaderScoreBadge";
import { formatMonthLabel } from "@/lib/finance/month";
import type { ChatParseField, ChatParseResult } from "@/lib/finance/parseChat";
import { computeFinanceScore } from "@/lib/finance/scoring";
import type { FinanceEntry, FinanceScore } from "@/lib/finance/types";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const NUMERIC_FIELDS = [
  "savings_balance",
  "savings_growth",
  "retirement_balance",
  "loan1_balance",
  "loan2_balance",
  "monthly_debt_payment",
  "credit_card_balance",
  "checking_in",
  "checking_out",
  "credit_card_spend",
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];
type FormState = Record<NumericField, string> & { month: string; notes: string };

const BALANCE_FIELDS: { key: NumericField; label: string }[] = [
  { key: "savings_balance", label: "Savings balance (total)" },
  { key: "retirement_balance", label: "Retirement balance" },
  { key: "loan1_balance", label: "Loan 1 balance" },
  { key: "loan2_balance", label: "Loan 2 balance" },
  { key: "credit_card_balance", label: "Credit card balance" },
];

const ACTIVITY_FIELDS: { key: NumericField; label: string; hint?: string }[] = [
  { key: "savings_growth", label: "Saved this month" },
  { key: "monthly_debt_payment", label: "Loan payment this month", hint: "combined across both loans" },
  { key: "checking_in", label: "Checking deposits this month" },
  { key: "checking_out", label: "Checking outflows this month", hint: "excluding transfers to savings" },
  { key: "credit_card_spend", label: "Credit card spend this month" },
];

function buildFormState(month: string, entry: FinanceEntry | null, carryForward: FinanceEntry | null): FormState {
  const base: Record<NumericField, number> = {
    savings_balance: entry?.savings_balance ?? carryForward?.savings_balance ?? 0,
    savings_growth: entry?.savings_growth ?? 0,
    retirement_balance: entry?.retirement_balance ?? carryForward?.retirement_balance ?? 0,
    loan1_balance: entry?.loan1_balance ?? carryForward?.loan1_balance ?? 0,
    loan2_balance: entry?.loan2_balance ?? carryForward?.loan2_balance ?? 0,
    monthly_debt_payment: entry?.monthly_debt_payment ?? 0,
    credit_card_balance: entry?.credit_card_balance ?? carryForward?.credit_card_balance ?? 0,
    checking_in: entry?.checking_in ?? 0,
    checking_out: entry?.checking_out ?? 0,
    credit_card_spend: entry?.credit_card_spend ?? 0,
  };
  const stringified = Object.fromEntries(NUMERIC_FIELDS.map((f) => [f, String(base[f])])) as Record<NumericField, string>;
  return { ...stringified, month, notes: entry?.notes ?? "" };
}

export function FinanceDashboard({
  entries,
  selectedMonth,
  selectedEntry,
  score,
}: {
  entries: FinanceEntry[];
  selectedMonth: string;
  selectedEntry: FinanceEntry | null;
  score: FinanceScore | null;
}) {
  const router = useRouter();
  const carryForward = entries[entries.length - 1] ?? null;
  const [form, setForm] = useState<FormState>(() => buildFormState(selectedMonth, selectedEntry, carryForward));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatResult, setChatResult] = useState<ChatParseResult | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.month.localeCompare(a.month)), [entries]);

  function updateField(key: NumericField, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        month: form.month,
        notes: form.notes,
        ...Object.fromEntries(NUMERIC_FIELDS.map((f) => [f, Number(form[f]) || 0])),
      };
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save.");
      }
      router.push(`/finance?month=${form.month}`);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleParseChat() {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/finance/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });
      const result = (await res.json()) as ChatParseResult;
      setChatResult(result);
    } finally {
      setChatLoading(false);
    }
  }

  function applyChatPatch() {
    if (!chatResult) return;
    setForm((f) => {
      const next = { ...f };
      for (const [key, value] of Object.entries(chatResult.patch) as [ChatParseField, number][]) {
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
        title="Finance"
        subtitle={formatMonthLabel(selectedMonth)}
        badge={score && <HeaderScoreBadge score={score.totalScore} />}
      />

      {score ? (
        <>
          <section className="mb-8 flex items-center gap-5">
            <ScoreRing score={score.totalScore} />
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Net worth" value={money(score.netWorth)} sub="savings + retirement − debts" />
            <StatCard label="Retirement" value={money(score.retirementBalance)} sub="display only, not scored" />
            <StatCard label="Combined loan balance" value={money(score.combinedLoanBalance)} sub="both loans merged" />
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
                    <span className="text-xs text-black/40 dark:text-white/40">Weight {c.weight.toFixed(1)}</span>
                    <span className={`font-semibold ${c.tier ? TIER_TEXT_COLOR[c.tier] : ""}`}>
                      {c.pointsEarned.toFixed(1)} / {c.maxPoints.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 border-black/20 px-4 py-2.5 font-bold dark:border-white/20">
                <span>Total</span>
                <span>{score.totalScore} / 100</span>
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-black/10 sm:block dark:border-white/10">
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
                      <td className="px-4 py-2 text-right text-black/60 dark:text-white/60">{c.weight.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {c.pointsEarned.toFixed(1)} / {c.maxPoints.toFixed(1)}
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
        <p className="mb-8 text-sm text-black/60 dark:text-white/60">No entry for this month yet — log one below.</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Log with chat</h2>
        <p className="mb-2 text-xs text-black/50 dark:text-white/50">
          e.g. &ldquo;saved $1200 this month, paid $450 on loans, credit card is at $300&rdquo;. Review before applying — this
          is a simple keyword parser, not AI.
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
                  {(Object.entries(chatResult.patch) as [ChatParseField, number][]).map(([field, value]) => (
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
        <h2 className="mb-3 text-lg font-semibold">Log a month</h2>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Month</label>
            <input
              type="month"
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
              required
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">Balances</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BALANCE_FIELDS.map(({ key, label }) => (
                <FieldInput key={key} label={label} value={form[key]} onChange={(v) => updateField(key, v)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">This month&apos;s activity</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ACTIVITY_FIELDS.map(({ key, label, hint }) => (
                <FieldInput key={key} label={label} hint={hint} value={form[key]} onChange={(v) => updateField(key, v)} />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {saving ? "Saving…" : "Save month"}
          </button>
        </form>
      </section>

      {sortedEntries.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">History</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {sortedEntries.map((e) => {
              const s = computeFinanceScore(e);
              return (
                <li key={e.month}>
                  <Link
                    href={`/finance?month=${e.month}`}
                    className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
                      e.month === selectedMonth ? "bg-black/5 dark:bg-white/5" : ""
                    }`}
                  >
                    <span>{formatMonthLabel(e.month)}</span>
                    <span className="font-semibold">{s.totalScore} / 100</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">{sub}</p>}
    </div>
  );
}

function FieldInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
        {label}
        {hint && <span className="ml-1 font-normal text-black/40 dark:text-white/40">({hint})</span>}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
      />
    </div>
  );
}
