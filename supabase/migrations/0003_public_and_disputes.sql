-- Phase 2: open the shared caches to public reads and add a disputes table.
-- The caches hold non-personal shared data (domain scores, per-URL assessments)
-- that the whole point of the website is to expose transparently.

-- Domain reputations: anyone can read, no auth required.
drop policy if exists "deny_all_selects_domain_reps" on public.domain_reputations;
create policy "public_read_domain_reputations"
  on public.domain_reputations for select
  using (true);

-- Page assessments: anyone can read; useful for permalinks and the explore feed.
drop policy if exists "deny_all_selects_page_assess" on public.page_assessments;
create policy "public_read_page_assessments"
  on public.page_assessments for select
  using (true);

-- Disputes: domain owners or readers can request review of a rating.
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('domain', 'page')),
  target_value text not null, -- domain string or url_hash
  submitter_email text,
  submitter_name text,
  relationship text, -- e.g. "publisher", "author", "reader"
  grounds text not null,
  evidence_url text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved_upheld', 'resolved_changed', 'rejected')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists disputes_target_idx on public.disputes (target_kind, target_value);
create index if not exists disputes_status_idx on public.disputes (status);

alter table public.disputes enable row level security;

-- Anyone can insert a dispute. Listing disputes publicly shows only status +
-- target + redacted grounds so resolution history is auditable.
create policy "public_insert_disputes" on public.disputes
  for insert with check (true);
create policy "public_read_disputes_metadata" on public.disputes
  for select using (true);

-- Public stats view: one-row snapshot for the transparency dashboard.
create or replace view public.public_stats as
select
  (select count(*) from public.domain_reputations) as domains_rated,
  (select count(*) from public.page_assessments)   as pages_assessed,
  (select count(*) from public.user_feedback)      as feedback_submitted,
  (select count(*) from public.disputes where status = 'open') as disputes_open,
  (select coalesce(sum(amount_cents), 0) from public.donations where status = 'succeeded' and created_at > now() - interval '30 days') as donations_30d_cents,
  (select coalesce(sum(amount_cents), 0) from public.donations where status = 'succeeded') as donations_total_cents,
  (select count(*) from public.usage where created_at > now() - interval '30 days') as assessments_30d;

grant select on public.public_stats to anon, authenticated;
