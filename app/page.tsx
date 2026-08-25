import { Tile } from "@/components/Tile";
import { ScoreRing } from "@/components/ScoreRing";
import { CounterRing } from "@/components/CounterRing";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";
import { getBusinessScoreForMonth } from "@/lib/business/composeScore";
import { getHealthScoreForMonth } from "@/lib/health/composeScore";

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

        <Tile title="Relationships" disabled>
          <p className="text-sm text-black/50 dark:text-white/50">Overall grade · areas to improve · action items due</p>
        </Tile>
      </div>
    </div>
  );
}
