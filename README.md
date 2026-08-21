# Life Dashboard

A gamified personal life dashboard. Four pillars — Finance, Business, Health,
Relationships — each with a live score out of 100 and a fully transparent
breakdown of how that score was earned. This build covers **Finance**; the
other three pillars are scaffolded as "coming soon" tiles on the home screen.

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

The app talks to a single `FinanceStore` abstraction (`lib/finance/store.ts`)
with two backends:

- **Supabase** (production): used automatically when `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are set. These are server-only env vars — the
  service role key is never exposed to the browser; all reads/writes go
  through Next.js Route Handlers.
- **Local JSON file** (dev fallback): when those env vars are unset, entries
  are read/written to `data/finance-entries.json` (gitignored). This lets you
  run and demo the app immediately without a Supabase project.

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

## Chat-style logging

The **Log with chat** box on `/finance` runs a lightweight keyword/regex
parser (`lib/finance/parseChat.ts`) — not an LLM call — over phrases like
*"saved $1,200 this month, paid $450 on loans, credit card is at $300"*. It
only ever proposes a draft patch for you to review (with the exact snippet
that matched each field) and apply to the form; it never saves data directly.
A future version could swap this for an actual LLM-based parser without
changing the API surface (`POST /api/finance/chat`).

## API

- `GET /api/finance/entries` — list all logged months
- `POST /api/finance/entries` — create or update the entry for a month
- `GET /api/finance/entries/[month]` — fetch one month
- `DELETE /api/finance/entries/[month]` — delete one month
- `GET /api/finance/score?month=YYYY-MM` — computed score breakdown (defaults to the latest logged month)
- `POST /api/finance/chat` — parse a chat message into a draft field patch

## Deploying

Push to a GitHub repo, import into [Vercel](https://vercel.com), set the two
Supabase env vars from `.env.example` on the project, deploy. Both are on
free tiers.

## What's next

- Business, Health, and Relationships pillars (same score-transparency and
  chat-logging patterns as Finance)
- Home-screen tiles for those pillars once built
- Eventually: a native iPhone app, once the web version proves useful day to day
