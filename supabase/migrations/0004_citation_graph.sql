-- Citation graph — the data underlying Pillar 1 (PageRank-style trust
-- propagation over the outlink graph). An edge `(from_domain, to_domain)`
-- records that an article on `from_domain` cites `to_domain`.
--
-- `weight` accumulates citations; `last_seen_at` lets us decay old ones.
-- `domain_trust_propagated` is the nightly output of the propagation job
-- (power iteration on the edge matrix, combined with the direct-evidence
-- trust vector from `domain_reputations`).

create table if not exists public.citation_edges (
  from_domain text not null,
  to_domain text not null,
  weight integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (from_domain, to_domain)
);
create index if not exists citation_edges_to_idx on public.citation_edges (to_domain);
create index if not exists citation_edges_last_seen_idx on public.citation_edges (last_seen_at);

create table if not exists public.domain_trust_propagated (
  domain text primary key references public.domain_reputations(domain) on delete cascade,
  theta_propagated numeric not null,
  theta_direct numeric not null,
  inbound_edges integer not null default 0,
  outbound_edges integer not null default 0,
  iterations integer not null default 0,
  computed_at timestamptz not null default now()
);

alter table public.citation_edges           enable row level security;
alter table public.domain_trust_propagated  enable row level security;
create policy "public_read_citation_edges"           on public.citation_edges           for select using (true);
create policy "public_read_domain_trust_propagated"  on public.domain_trust_propagated  for select using (true);
