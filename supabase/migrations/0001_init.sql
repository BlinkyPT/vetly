-- Vetly initial schema. Designed for Row Level Security from the start.
-- All service-role writes; extension reads via Next.js API only.
--
-- Donation model: Vetly is free for everyone. We record donations for
-- bookkeeping + to show the user their own giving history. Nothing is
-- gated behind payment — see the ANTI_ABUSE_LIMITS constant in code.

create extension if not exists "pgcrypto";

-- Shared domain reputation cache (read-through; service role writes).
create table if not exists public.domain_reputations (
  domain text primary key,
  tier text not null check (tier in ('high', 'medium', 'low', 'unknown')),
  score numeric not null check (score between 0 and 1),
  signals jsonb not null default '{}'::jsonb,
  source text not null default 'computed' check (source in ('bundled_seed', 'computed', 'feedback_adjusted')),
  last_assessed timestamptz not null default now()
);
create index if not exists domain_reputations_last_assessed_idx on public.domain_reputations (last_assessed);

-- Shared per-page assessment cache (read-through; service role writes).
-- `url_hash` is a 32-char prefix of sha256 over the canonicalised URL.
create table if not exists public.page_assessments (
  url_hash text primary key,
  url text not null,
  score numeric not null check (score between 0 and 1),
  signals jsonb not null default '{}'::jsonb,
  full jsonb not null default '{}'::jsonb,
  ai_probability numeric check (ai_probability between 0 and 1),
  assessed_at timestamptz not null default now()
);
create index if not exists page_assessments_assessed_at_idx on public.page_assessments (assessed_at);

-- User feedback on assessments.
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid,
  url_hash text not null,
  thumbs text not null check (thumbs in ('up', 'down')),
  notes text,
  created_at timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);
create index if not exists user_feedback_url_hash_idx on public.user_feedback (url_hash);
create index if not exists user_feedback_user_id_idx on public.user_feedback (user_id);

-- Per-user/device daily usage for anti-abuse rate limiting (not a paywall).
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid,
  page_assessments_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);
create index if not exists usage_user_id_created_at_idx on public.usage (user_id, created_at);
create index if not exists usage_device_id_created_at_idx on public.usage (device_id, created_at);

-- Donations. No paid tier exists — this is just a ledger of who supported us.
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  stripe_session_id text unique,
  stripe_subscription_id text,
  kind text not null check (kind in ('one_off', 'monthly')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'succeeded',
  created_at timestamptz not null default now()
);
create index if not exists donations_user_id_idx on public.donations (user_id);
create index if not exists donations_customer_id_idx on public.donations (stripe_customer_id);

-- ------------------------- RLS ---------------------------
alter table public.domain_reputations enable row level security;
alter table public.page_assessments   enable row level security;
alter table public.user_feedback      enable row level security;
alter table public.usage              enable row level security;
alter table public.donations          enable row level security;

-- Shared caches: service role bypasses RLS; everyone else is denied.
create policy "deny_all_selects_domain_reps" on public.domain_reputations for select using (false);
create policy "deny_all_selects_page_assess" on public.page_assessments   for select using (false);

-- user_feedback: users see only their own rows.
create policy "feedback_select_own" on public.user_feedback for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.user_feedback for insert with check (auth.uid() = user_id or user_id is null);

-- usage: users see only their own rows.
create policy "usage_select_own" on public.usage for select using (auth.uid() = user_id);

-- donations: users see only their own rows.
create policy "donations_select_own" on public.donations for select using (auth.uid() = user_id);
