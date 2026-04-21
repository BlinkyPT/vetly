#!/usr/bin/env node
/**
 * Nightly trust propagation over the citation graph. Implements a
 * PageRank-style power iteration where a domain's propagated trust is a
 * blend of (1) its direct-evidence trust and (2) the trust of domains
 * that cite it, weighted by citation count.
 *
 *   θ_propagated(d) = (1 - α) · θ_direct(d)
 *                    + α · Σ_{(c,d) ∈ E} w(c,d) · θ_propagated(c) / outdeg(c)
 *
 * Converges in ~10-20 iterations for graphs up to 10^7 edges.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/propagate-trust.mjs
 */
import { createClient } from "@supabase/supabase-js";

const ALPHA = 0.35;           // propagation strength (1 - ALPHA weights the prior)
const MAX_ITER = 20;
const CONVERGENCE = 1e-4;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. Load direct-evidence trust for every known domain.
const { data: domainRows, error: domErr } = await supabase
  .from("domain_reputations")
  .select("domain, score");
if (domErr) { console.error(domErr); process.exit(1); }
const direct = new Map(); // domain -> θ_direct
for (const r of domainRows) {
  // score is in [0,1]; map to latent-trust θ via inverse logistic (rough proxy).
  const s = Math.max(0.01, Math.min(0.99, Number(r.score)));
  direct.set(r.domain, Math.log(s / (1 - s)));
}

// 2. Load edges.
const edges = [];
{
  let from = 0;
  const batch = 5000;
  while (true) {
    const { data, error } = await supabase
      .from("citation_edges")
      .select("from_domain, to_domain, weight")
      .range(from, from + batch - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    edges.push(...data);
    if (data.length < batch) break;
    from += batch;
  }
}

// 3. Build adjacency + outdegree.
const outgoing = new Map(); // from -> [{to, weight}]
const incoming = new Map(); // to   -> [{from, weight}]
for (const { from_domain, to_domain, weight } of edges) {
  if (!outgoing.has(from_domain)) outgoing.set(from_domain, []);
  outgoing.get(from_domain).push({ to: to_domain, weight });
  if (!incoming.has(to_domain)) incoming.set(to_domain, []);
  incoming.get(to_domain).push({ from: from_domain, weight });
}
const outSum = new Map();
for (const [from, arr] of outgoing) outSum.set(from, arr.reduce((s, e) => s + e.weight, 0));

// 4. Power iteration.
const theta = new Map(direct);
let iter = 0;
for (; iter < MAX_ITER; iter++) {
  const next = new Map();
  let maxDelta = 0;
  for (const [domain, thetaDirect] of direct) {
    let propagated = 0;
    const inc = incoming.get(domain);
    if (inc) {
      for (const { from, weight } of inc) {
        const s = outSum.get(from) ?? 1;
        propagated += (theta.get(from) ?? thetaDirect) * (weight / s);
      }
    }
    const newTheta = (1 - ALPHA) * thetaDirect + ALPHA * propagated;
    next.set(domain, newTheta);
    maxDelta = Math.max(maxDelta, Math.abs(newTheta - (theta.get(domain) ?? 0)));
  }
  for (const [d, v] of next) theta.set(d, v);
  if (maxDelta < CONVERGENCE) { iter++; break; }
}

// 5. Upsert results.
const rows = [];
for (const [domain, t] of theta) {
  const inc = incoming.get(domain)?.length ?? 0;
  const out = outgoing.get(domain)?.length ?? 0;
  rows.push({
    domain,
    theta_propagated: t,
    theta_direct: direct.get(domain) ?? 0,
    inbound_edges: inc,
    outbound_edges: out,
    iterations: iter,
    computed_at: new Date().toISOString(),
  });
}
const BATCH = 1000;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("domain_trust_propagated").upsert(chunk, { onConflict: "domain" });
  if (error) { console.error(error); process.exit(1); }
}
console.log(`Propagated trust for ${rows.length} domains in ${iter} iterations.`);
