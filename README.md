# Life Dashboard

A gamified personal life dashboard. Four pillars — Finance, Business, Health,
Relationships — each with a live score out of 100 and a fully transparent
breakdown of how that score was earned. All four pillars are built and live
on the home screen.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel,
data in Supabase (Postgres).

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No setup is required to try it — see
**Data storage** below.

## Data storage

Each pillar has its own store module (`lib/finance/store.ts`,
`lib/business/store.ts`, `lib/health/store.ts`, `lib/relationships/store.ts`)
with two backends:

- **Supabase** (production): used automatically when `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are set. These are server-only env vars — the
  service role key is never exposed to the browser; all reads/writes go
  through Next.js Route Handlers.
- **Local JSON file** (dev fallback): when those env vars are unset, entries
  are read/written to `data/*.json` (gitignored). This lets you run and demo
  the app immediately without a Supabase project.

### Setting up Supabase for real

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` from this repo.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and
   **service role** key (Project Settings → API). Add the same two variables
   to your Vercel project's environment variables for deploys.

## Finance scoring

Implemented in `lib/finance/scoring.ts`, driven entirely by monthly
manually-entered data (`lib/finance/types.ts` → `FinanceEntry`). No bank or
Plaid integration in v1.

100 points total, split across four weighted categories:

| Category | Weight | Tiers |
|---|---|---|
| Savings (monthly growth) | 35 | red `<$1,000`, yellow `$1,000–1,500`, green `$1,500–2,500`, gold `$2,500+` |
| Debt paydown — monthly payment | 23.3 (⅔ of 35) | red `<$400`, green `$400+` |
| Debt paydown — remaining balance | 11.7 (⅓ of 35) | red `>$20k`, yellow `$5k–20k`, green `<$5k` (non-linear: yellow→green is a bigger jump than red→yellow) |
| Income (net cash flow) | 15 | red if negative, green if positive — no middle tier |
| Credit card balance | 15 | red `>$500`, yellow `$200–500`, green `<$200` |

The two loan balances are merged into one "combined loan balance" for the
balance-tier calculation and the net-worth figure; the credit card carries
its own separate balance/tier. Net cash flow = checking deposits − checking
outflows − credit card spend (checking outflows should exclude transfers to
savings). Retirement balance and net worth are shown for context but are
never scored.

Every category on `/finance` shows its weight, the raw value that drove it,
its tier, and the exact points earned — no black box. Categories that aren't
maxed out generate an "areas to improve" suggestion.

## Business scoring

Implemented in `lib/business/scoring.ts`. Everything is logged on one
**weekly** cadence (`lib/business/types.ts` → `BusinessWeekEntry`) —
including business registrations, which are logged per-week like the rest
of the funnel but displayed on the dashboard as a monthly sum (and scored
on that monthly sum), since that's the number that matters day to day.

100 points total:

| Category | Weight | Tiers |
|---|---|---|
| Contacts | 30 | red `0-1`, yellow `2-4`, green `5-7`, gold `8+` (weekly) |
| Business Registrations | 30 | red `0`, green `1-4`, gold `5+` — no yellow (monthly sum of the weekly log) |
| Quality Invites / Overviews | 15 | red `0-1`, yellow `2`, green `3-4`, gold `5+` (weekly) |
| Customer Registrations | 15 | same tiers as Quality Invites (weekly) |
| Plans | 5 | same tiers as Quality Invites (weekly) |
| Follow Ups | 5 | same tiers as Quality Invites (weekly) |

For the five weekly-tiered categories, the monthly score is the average of
each week's tier across every week logged in that month (so a
partially-logged in-progress month is scored fairly on what's been entered
so far, not padded with zeros for missing weeks). Business Registrations is
different — its tier comes from the raw monthly *sum*, not an average,
matching how the spec describes it ("0 red, 1-4 green, 5+ gold" reads as a
total for the month).

Two additional live indicators sit next to the hero score, per the spec:

- **Registration pacing** — a soft-grace daily pacing curve (the first ~5
  days of the month don't get judged against a full month's target) projects
  "on track for N registrations by month end," using that same monthly sum.
- **Contacts gap tile** (equal visual size to the score ring) — contacts
  still needed to reach the next registration, using the trailing 8-week
  contacts-to-registration ratio (both sums come straight off the same 8
  weekly entries — no cross-cadence conversion needed since registrations
  are weekly data too), capped at the 15:1 baseline so a slump never makes
  the ask stricter than baseline while a hot streak (a better ratio) is
  reflected fairly. The same baseline logic (10:1) flags a
  Quality-Invite-to-registration ratio that's slipping, as a suggestion.

## Health scoring

Implemented in `lib/health/scoring.ts`. No wearables — only what a phone and
MyFitnessPal can capture manually. Sleep, hydration, and heart rate are
excluded per the spec (no reliable data source). Two cadences:
steps/nutrition/weight are logged **daily** (`lib/health/types.ts` →
`HealthDailyEntry` — every field independently nullable, since "not logged"
and "logged as 0" are different things), while workouts are logged
**weekly** (`HealthWeekEntry`), matching the spec's own cadence split.

100 points total, spread across Steps/Workouts/Nutrition. The spec doesn't
assign explicit weights the way Finance and Business do — this is a
judgment call, split roughly even with Nutrition a touch lighter since its
own internal structure already spreads credit three ways:

| Category | Weight | Tiers |
|---|---|---|
| Steps | 35 | red `<4,000`, yellow `4,000–6,000`, green `6,000–10,000`, gold `10,000+` (avg/day for the month) |
| Workouts | 35 | frequency red `0-1`, yellow `2`, green `3-4`, gold `5+` per week, then a perceived-intensity bonus multiplier (low ×1, medium ×1.15, high ×1.3, capped at 100%) — tuned so 3 hard sessions can rival 5 easy ones, per the spec |
| Nutrition | 30 | 5% just for logging (scaled by % of applicable days logged) + 47.5% protein tier (red `<150g`, yellow `150–200g`, green `200–230g`, gold `230g+`) + 47.5% calories tier — a sweet-spot curve, not monotonic: green `1,800–2,200`, yellow `1,500–1,800` or `2,200–2,500`, red outside that |

Weight is tracked but shown as a parallel, unscored figure (like Finance's
retirement balance) — an absolute tier (`green <230`, `yellow 230–240`,
`red >240`) plus a binary month-over-month direction (loss = green, gain =
red), both based on the month's *average* weigh-in rather than a single
reading, so one unusual day doesn't swing the number.

The spec describes the overall score as "pacing-adjusted" using the same
soft-grace logic as Business. Business's pacing curve projects a
*cumulative* count (registrations) forward — that doesn't translate
directly to Steps/Nutrition, which are already *rates* (average per day):
averaging only the days actually logged so far in the month already gives
the same "day 2 isn't judged against a full month" grace without needing a
separate projection formula. Workouts, being a weekly count like Business's
categories, reuses that same average-of-weeks-logged approach. Flagging
this interpretation in case a literal reused pacing-projection number was
intended instead.

## Relationships scoring

Implemented in `lib/relationships/scoring.ts`. Built around one monthly
marriage evaluation (`lib/relationships/types.ts` → `RelationshipEntry`),
four equally-weighted (25 each) inputs per the spec:

| Category | Weight | How it's scored |
|---|---|---|
| Finance | 25 | Auto-pulled from the Finance pillar for the same month — "reused, not re-entered." The Finance score's own value flows through directly as a proportion (`25 × financeScore/100`), not re-bucketed into another tier, since it's already a score |
| Communication | 25 | Breanne's 0-5 rating, tiered (see below) |
| Intimacy | 25 | Same 0-5 rating tiers as Communication |
| Action Item Completion | 25 | % of items due this month that are done — red `0-33%`, yellow `33-66%`, green `66-100%`, gold `100%`, exactly per the spec |

The spec gives no thresholds for the 0-5 Communication/Intimacy ratings
(unlike every other tiered value in the app) — a judgment call, kept
consistent with the tiered-fraction convention used everywhere else rather
than a plain linear scale: red `<2`, yellow `2-3.4`, green `3.5-4.4`, gold
`4.5+`.

The overall score still converts to a **grade** (A/B/C/D/F, with +/-) rather
than a raw number for the home screen — the spec specifically calls this
one a "grade" where the other three pillars are a "score."

Action items (will, insurance, etc.) carry an explicit `due_month` rather
than a rigid "always exactly next month" rule, so an item can be given more
runway if needed — next month is just the default when adding one during an
evaluation. Communication and Intimacy each carry their own "what's going
well" / "what needs improvement" free-text notes, captured every month as a
running log (shown chronologically on the page, not just for the selected
month).

## Chat-style logging

All four pillars have a **Log with chat** box running a lightweight
keyword/regex parser — not an LLM call — e.g. *"saved $1,200 this month,
paid $450 on loans"* (`lib/finance/parseChat.ts`), *"did 6 contacts and 2
QIs this week, 3 plans, 1 business registration"* (`lib/business/parseChat.ts`),
*"walked 8000 steps, 180g protein, 2100 calories, weighed 228"*
(`lib/health/parseChat.ts`), or *"communication was a 4, intimacy a 3, add
action item: renew life insurance"* (`lib/relationships/parseChat.ts`). All
of them only ever propose a draft patch for you to review (with the exact
snippet that matched each field) and apply to the form; none save data
directly. A future version could swap any of them for an actual LLM-based
parser without changing the API surface (`POST /api/finance/chat`,
`POST /api/business/chat`, `POST /api/health/chat`, `POST /api/relationships/chat`).

## API

Finance:
- `GET /api/finance/entries` — list all logged months
- `POST /api/finance/entries` — create or update the entry for a month
- `GET /api/finance/entries/[month]` — fetch one month
- `DELETE /api/finance/entries/[month]` — delete one month
- `GET /api/finance/score?month=YYYY-MM` — computed score breakdown (defaults to the latest logged month)
- `POST /api/finance/chat` — parse a chat message into a draft field patch

Business:
- `GET /api/business/week-entries` — list all logged weeks
- `POST /api/business/week-entries` — create or update a week's funnel activity (including that week's registrations)
- `GET|DELETE /api/business/week-entries/[week]` — fetch/delete one week (ISO week key, e.g. `2026-W34`)
- `GET /api/business/score?month=YYYY-MM` — computed score, pacing, and gap tile (defaults to the latest logged month)
- `POST /api/business/chat` — parse a chat message into a draft field patch

Health:
- `GET /api/health/daily-entries` — list all logged days
- `POST /api/health/daily-entries` — create or update a day's steps/nutrition/weight
- `GET|DELETE /api/health/daily-entries/[date]` — fetch/delete one day (`YYYY-MM-DD`)
- `GET /api/health/week-entries` — list all logged weeks of workouts
- `POST /api/health/week-entries` — create or update a week's workout count + intensity
- `GET|DELETE /api/health/week-entries/[week]` — fetch/delete one week (ISO week key)
- `GET /api/health/score?month=YYYY-MM` — computed score + weight status (defaults to the latest logged month)
- `POST /api/health/chat` — parse a chat message into a draft field patch

Relationships:
- `GET /api/relationships/entries` — list all logged monthly evaluations
- `POST /api/relationships/entries` — create or update the evaluation for a month
- `GET|DELETE /api/relationships/entries/[month]` — fetch/delete one month
- `GET /api/relationships/action-items` — list all action items
- `POST /api/relationships/action-items` — create a new action item
- `PATCH|DELETE /api/relationships/action-items/[id]` — update (e.g. toggle done) or delete one item
- `GET /api/relationships/score?month=YYYY-MM` — computed score + grade (defaults to the latest logged month)
- `POST /api/relationships/chat` — parse a chat message into a draft field patch

## Deploying

Push to a GitHub repo, import into [Vercel](https://vercel.com), set the two
Supabase env vars from `.env.example` on the project, deploy. Both are on
free tiers.

## What's next

All four pillars are built. Remaining ideas from the spec, not yet done:

- A few flagged judgment calls (Business/Health/Relationships category
  weights, Health's pacing interpretation, the 0-5 rating tiers) are worth
  revisiting against how the scores feel in practice with real data
- Bank/Apple Health API integration (Plaid, HealthKit) — explicitly out of
  scope for v1 per the spec, manual entry only for now
- A native iPhone app, once the web version proves useful day to day
