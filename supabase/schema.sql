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
