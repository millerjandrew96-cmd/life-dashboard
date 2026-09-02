-- Life Dashboard — Finance pillar schema
-- Run this in the Supabase SQL editor for your project.

create table if not exists finance_entries (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  savings_balance numeric not null default 0,
  savings_growth numeric not null default 0,
  retirement_balance numeric not null default 0,
  loan1_balance numeric not null default 0,
  loan2_balance numeric not null default 0,
  monthly_debt_payment numeric not null default 0,
  credit_card_balance numeric not null default 0,
  checking_in numeric not null default 0,
  checking_out numeric not null default 0,
  credit_card_spend numeric not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

-- Single-user app: this table is only ever touched from server-side Route Handlers
-- using the Supabase service role key, so RLS stays enabled with no policies
-- (i.e. the anon/public key can never read or write it).
alter table finance_entries enable row level security;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists finance_entries_set_updated_at on finance_entries;
create trigger finance_entries_set_updated_at
  before update on finance_entries
  for each row execute function set_updated_at();

-- Life Dashboard — Business pillar schema
--
-- Everything is logged weekly, including business registrations — the dashboard displays
-- registrations summed to a monthly figure, but the underlying data (and the rolling 8-week
-- contacts:registration / QI:registration ratios) all live at weekly grain.

create table if not exists business_week_entries (
  week text primary key check (week ~ '^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$'),
  contacts integer not null default 0,
  quality_invites integer not null default 0,
  customer_registrations integer not null default 0,
  plans integer not null default 0,
  follow_ups integer not null default 0,
  business_registrations integer not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

alter table business_week_entries enable row level security;

drop trigger if exists business_week_entries_set_updated_at on business_week_entries;
create trigger business_week_entries_set_updated_at
  before update on business_week_entries
  for each row execute function set_updated_at();

-- Life Dashboard — Health pillar schema
--
-- Steps/nutrition/weight are logged daily (each column independently nullable — "not logged"
-- must stay distinguishable from "logged as 0"); workouts are logged weekly per the spec.

create table if not exists health_daily_entries (
  date date primary key,
  steps integer,
  protein_g numeric,
  calories numeric,
  weight_lbs numeric,
  notes text,
  updated_at timestamptz not null default now()
);

alter table health_daily_entries enable row level security;

drop trigger if exists health_daily_entries_set_updated_at on health_daily_entries;
create trigger health_daily_entries_set_updated_at
  before update on health_daily_entries
  for each row execute function set_updated_at();

create table if not exists health_week_entries (
  week text primary key check (week ~ '^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$'),
  workouts integer not null default 0,
  intensity text not null default 'low' check (intensity in ('low', 'medium', 'high')),
  notes text,
  updated_at timestamptz not null default now()
);

alter table health_week_entries enable row level security;

drop trigger if exists health_week_entries_set_updated_at on health_week_entries;
create trigger health_week_entries_set_updated_at
  before update on health_week_entries
  for each row execute function set_updated_at();

-- Life Dashboard — Relationships pillar schema
--
-- Finance score is deliberately NOT duplicated here — it's pulled live from finance_entries
-- at read time, per the spec ("auto-pulled from Finance pillar — reused, not re-entered").

create table if not exists relationship_entries (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  communication_rating numeric not null default 0 check (communication_rating between 0 and 5),
  communication_going_well text,
  communication_improve text,
  intimacy_rating numeric not null default 0 check (intimacy_rating between 0 and 5),
  intimacy_going_well text,
  intimacy_improve text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table relationship_entries enable row level security;

drop trigger if exists relationship_entries_set_updated_at on relationship_entries;
create trigger relationship_entries_set_updated_at
  before update on relationship_entries
  for each row execute function set_updated_at();

create table if not exists relationship_action_items (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  due_month text not null check (due_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table relationship_action_items enable row level security;

drop trigger if exists relationship_action_items_set_updated_at on relationship_action_items;
create trigger relationship_action_items_set_updated_at
  before update on relationship_action_items
  for each row execute function set_updated_at();

-- Cross-pillar monthly priorities, shown on the home screen below the four pillar tiles.
create table if not exists priorities (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  description text not null,
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table priorities enable row level security;

drop trigger if exists priorities_set_updated_at on priorities;
create trigger priorities_set_updated_at
  before update on priorities
  for each row execute function set_updated_at();
