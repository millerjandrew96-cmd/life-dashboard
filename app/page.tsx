import { Tile } from "@/components/Tile";
import { ScoreRing } from "@/components/ScoreRing";
import { CounterRing } from "@/components/CounterRing";
import { GradeChip } from "@/components/GradeChip";
import { ActionItemsChecklist } from "@/components/ActionItemsChecklist";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import { getBusinessScoreForMonth } from "@/lib/business/composeScore";
import { getHealthScoreForMonth } from "@/lib/health/composeScore";
import { getRelationshipScoreForMonth } from "@/lib/relationships/composeScore";
import { addMonths, currentMonthKey, formatMonthLabel } from "@/lib/finance/month";
import { gradeFor, gradeColor } from "@/lib/grade";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Finance data changes via user actions in the DB, not at build time — never prerender this.
export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listFinanceEntries();
  const latest = entries[entries.length - 1] ?? null;
  const score = latest ? computeFinanceScore(latest) : null;

  // Independent Supabase round trips — run together instead of stacking up sequentially.
  // Relationships gets the Finance entries we already fetched above so it doesn't re-query them.
  const [{ score: businessScore }, { score: healthScore }, { score: relationshipScore, actionItems }] = await Promise.all([
    getBusinessScoreForMonth(null),
    getHealthScoreForMonth(null),
    getRelationshipScoreForMonth(null, entries),
  ]);

  const thisMonth = currentMonthKey();
  const nextMonth = addMonths(thisMonth, 1);
  const itemsDueNextMonth = actionItems.filter((i) => i.due_month === nextMonth && !i.done).length;
  const itemsDueThisMonth = actionItems.filter((i) => i.due_month === thisMonth);

  // "Overall" isn't a pillar — it's the average of whichever pillars have a score logged this
  // month. A pillar with nothing logged is excluded from the average entirely rather than
  // counted as a zero, so not having started Business yet doesn't drag everyone else down.
  const pillarScores = [
    { label: "Finance", score: score?.totalScore ?? null },
    { label: "Business", score: businessScore?.totalScore ?? null },
    { label: "Health", score: healthScore?.totalScore ?? null },
    { label: "Relationships", score: relationshipScore?.totalScore ?? null },
  ];
  const loggedPillars = pillarScores.filter((p): p is { label: string; score: number } => p.score !== null);
  const missingPillars = pillarScores.filter((p) => p.score === null).map((p) => p.label);
  const overallScore =
    loggedPillars.length > 0 ? Math.round(loggedPillars.reduce((sum, p) => sum + p.score, 0) / loggedPillars.length) : null;
  const overallGrade = overallScore !== null ? gradeFor(overallScore) : null;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Life Dashboard</h1>
      <p className="mb-8 text-sm text-black/60 dark:text-white/60">Finance, Business, Health, Relationships — one score each.</p>

      <div className="mb-5">
        <Tile title="Overall">
          {overallScore !== null && overallGrade !== null ? (
            <>
              <div className="flex items-baseline gap-4">
                <span className={`text-6xl font-black leading-none ${gradeColor(overallGrade)}`}>{overallGrade}</span>
                <span className="text-lg text-black/60 dark:text-white/60">{overallScore} / 100</span>
              </div>
              <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                {pillarScores.map((p, i) => (
                  <span key={p.label}>
                    {i > 0 && " · "}
                    <span className="font-medium text-black dark:text-white">{p.label}</span>{" "}
                    {p.score !== null ? gradeFor(p.score) : "—"}
                  </span>
                ))}
              </p>
              {missingPillars.length > 0 && (
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  Based on {loggedPillars.length} of 4 pillars — {missingPillars.join(", ")} not logged this month
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">Log at least one pillar this month to see an overall score.</p>
          )}
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Tile title="Finance" href="/finance" badge={score && <GradeChip score={score.totalScore} />}>
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

        <Tile title="Business" href="/business" badge={businessScore && <GradeChip score={businessScore.totalScore} />}>
          {businessScore ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={businessScore.totalScore} size={96} />
              <CounterRing value={businessScore.gap.contactsNeeded} label="contacts needed for next registration" size={96} />
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No entries logged yet — click in to log your first week.</p>
          )}
        </Tile>

        <Tile title="Health" href="/health" badge={healthScore && <GradeChip score={healthScore.totalScore} />}>
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

        <Tile
          title="Relationships"
          href="/relationships"
          badge={relationshipScore && <GradeChip score={relationshipScore.totalScore} />}
        >
          {relationshipScore ? (
            <div className="flex items-center gap-5">
              <div className={`text-4xl font-black ${gradeColor(relationshipScore.grade)}`}>{relationshipScore.grade}</div>
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

      <section className="mt-8">
        <ActionItemsChecklist
          month={thisMonth}
          items={itemsDueThisMonth}
          defaultDueMonth={thisMonth}
          heading="This month's to-dos"
        />
      </section>
    </div>
  );
}
