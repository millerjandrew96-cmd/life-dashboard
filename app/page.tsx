import { Tile } from "@/components/Tile";
import { ScoreRing } from "@/components/ScoreRing";
import { CounterRing } from "@/components/CounterRing";
import { PrioritiesList } from "@/components/PrioritiesList";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import { getBusinessScoreForMonth } from "@/lib/business/composeScore";
import { getHealthScoreForMonth } from "@/lib/health/composeScore";
import { getRelationshipScoreForMonth } from "@/lib/relationships/composeScore";
import { listPriorities } from "@/lib/priorities/store";
import { addMonths, currentMonthKey, formatMonthLabel } from "@/lib/finance/month";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Finance data changes via user actions in the DB, not at build time — never prerender this.
export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listFinanceEntries();
  const latest = entries[entries.length - 1] ?? null;
  const score = latest ? computeFinanceScore(latest) : null;

  const { score: businessScore } = await getBusinessScoreForMonth(null);
  const { score: healthScore } = await getHealthScoreForMonth(null);

  const { score: relationshipScore, actionItems } = await getRelationshipScoreForMonth(null);
  const nextMonth = addMonths(currentMonthKey(), 1);
  const itemsDueNextMonth = actionItems.filter((i) => i.due_month === nextMonth && !i.done).length;

  const thisMonth = currentMonthKey();
  const priorities = (await listPriorities()).filter((p) => p.month === thisMonth);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Life Dashboard</h1>
      <p className="mb-8 text-sm text-black/60 dark:text-white/60">Finance, Business, Health, Relationships — one score each.</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Tile title="Finance" href="/finance">
          {score ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={score.totalScore} size={96} />
              <dl className="grid grid-cols-1 gap-1 text-sm">
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Retirement: </dt>
                  <dd className="inline font-medium">{money(score.retirementBalance)}</dd>
                </div>
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Savings: </dt>
                  <dd className="inline font-medium">{money(score.savingsBalance)}</dd>
                </div>
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Net worth: </dt>
                  <dd className="inline font-medium">{money(score.netWorth)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No entries logged yet — click in to log your first month.</p>
          )}
        </Tile>

        <Tile title="Business" href="/business">
          {businessScore ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={businessScore.totalScore} size={96} />
              <CounterRing value={businessScore.gap.contactsNeeded} label="contacts needed for next registration" size={96} />
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No entries logged yet — click in to log your first week.</p>
          )}
        </Tile>

        <Tile title="Health" href="/health">
          {healthScore ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={healthScore.totalScore} size={96} />
              <dl className="grid grid-cols-1 gap-1 text-sm">
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Weight: </dt>
                  <dd className="inline font-medium">
                    {healthScore.weight.currentMonthAvg !== null ? `${healthScore.weight.currentMonthAvg.toFixed(1)} lbs` : "—"}
                  </dd>
                </div>
                {healthScore.weight.changeVsLastMonth !== null && (
                  <div>
                    <dt className="inline text-black/50 dark:text-white/50">vs last month: </dt>
                    <dd className="inline font-medium">
                      {healthScore.weight.changeVsLastMonth > 0 ? "+" : ""}
                      {healthScore.weight.changeVsLastMonth.toFixed(1)} lbs
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No entries logged yet — click in to log your first day.</p>
          )}
        </Tile>

        <Tile title="Relationships" href="/relationships">
          {relationshipScore ? (
            <div className="flex items-center gap-5">
              <div
                className={`text-4xl font-black ${
                  relationshipScore.grade.startsWith("A")
                    ? "text-emerald-600 dark:text-emerald-400"
                    : relationshipScore.grade.startsWith("B")
                      ? "text-green-600 dark:text-green-400"
                      : relationshipScore.grade.startsWith("C")
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                }`}
              >
                {relationshipScore.grade}
              </div>
              <dl className="grid grid-cols-1 gap-1 text-sm">
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Areas to improve: </dt>
                  <dd className="inline font-medium">{relationshipScore.suggestions.length}</dd>
                </div>
                <div>
                  <dt className="inline text-black/50 dark:text-white/50">Action items due by {formatMonthLabel(nextMonth)}: </dt>
                  <dd className="inline font-medium">{itemsDueNextMonth}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No evaluations logged yet — click in to log this month&apos;s.</p>
          )}
        </Tile>
      </div>

      <PrioritiesList month={thisMonth} priorities={priorities} />
    </div>
  );
}
