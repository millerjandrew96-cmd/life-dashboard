import { Tile } from "@/components/Tile";
import { ScoreRing } from "@/components/ScoreRing";
import { computeFinanceScore } from "@/lib/finance/scoring";
import { listFinanceEntries } from "@/lib/finance/store";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Finance data changes via user actions in the DB, not at build time — never prerender this.
export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listFinanceEntries();
  const latest = entries[entries.length - 1] ?? null;
  const score = latest ? computeFinanceScore(latest) : null;

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

        <Tile title="Business" disabled>
          <p className="text-sm text-black/50 dark:text-white/50">Score /100 · contacts needed until next projected registration</p>
        </Tile>

        <Tile title="Health" disabled>
          <p className="text-sm text-black/50 dark:text-white/50">Pacing-adjusted score /100 · weight + change vs last month</p>
        </Tile>

        <Tile title="Relationships" disabled>
          <p className="text-sm text-black/50 dark:text-white/50">Overall grade · areas to improve · action items due</p>
        </Tile>
      </div>
    </div>
  );
}
