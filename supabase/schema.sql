-- Longevity Combine: one table, locked down.
-- Paste into Supabase: SQL Editor > New query > Run.
-- RLS is on with no policies, so the public (publishable) key can read or
-- write nothing. The app talks to the database only from its server, using
-- the secret key stored in Vercel.

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- short random code in the report QR
  name text not null,                      -- first name + last initial
  age int not null check (age between 18 and 105),
  sex text not null check (sex in ('F', 'M')),
  opt_in boolean not null default true,    -- show on leaderboard
  giveaway boolean not null default false, -- speaker giveaway entry
  email text,
  company text,
  title text,
  aspire text,                             -- preset key or 'other'
  aspire_text text,                        -- free text when 'other'
  role text,                               -- what do you do (follow-up tag)
  scores jsonb not null default '{}'::jsonb,       -- { grip: 27, balance: 4.5, ... }
  floor_detail jsonb,                      -- { dn, dw, un, uw } tallies
  email_source text,                       -- 'coach' | 'giveaway' | 'report'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visitors_created_idx on public.visitors (created_at desc);
create index if not exists visitors_name_idx on public.visitors (lower(name));

alter table public.visitors enable row level security;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists visitors_touch on public.visitors;
create trigger visitors_touch before update on public.visitors
for each row execute function public.touch_updated_at();
