import { NextResponse } from "next/server";
import { DomainReputationRequest, type DomainReputation, type TrustTier, TIER_SCORE } from "@vetly/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

// Server-side cache: if a domain was last assessed within this window, return it unchanged.
const DOMAIN_STALE_DAYS = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = DomainReputationRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const domains = Array.from(new Set(parsed.data.domains.map((d) => d.toLowerCase().replace(/^www\./, ""))));
  const supabase = createSupabaseServiceClient();

  const { data: rows } = await supabase
    .from("domain_reputations")
    .select("domain, tier, score, last_assessed")
    .in("domain", domains);

  const byDomain = new Map<string, typeof rows extends Array<infer R> ? R : never>();
  for (const r of rows ?? []) byDomain.set(r.domain, r as typeof rows extends Array<infer R> ? R : never);

  const now = Date.now();
  const result: DomainReputation[] = [];
  const toCompute: string[] = [];

  for (const domain of domains) {
    const row = byDomain.get(domain);
    if (row) {
      const assessedAt = row.last_assessed ? new Date(row.last_assessed).getTime() : 0;
      const ageDays = (now - assessedAt) / (1000 * 60 * 60 * 24);
      if (ageDays < DOMAIN_STALE_DAYS) {
        result.push({
          domain,
          tier: row.tier as TrustTier,
          score: Number(row.score),
          last_assessed: row.last_assessed,
          source: row.source ?? "computed",
        });
        continue;
      }
    }
    toCompute.push(domain);
  }

  // For MVP: treat unknown domains as "unknown" tier until the refresh cron backfills them.
  // A real implementation would kick off the heuristic pipeline here (WHOIS, cert, etc.).
  for (const domain of toCompute) {
    const tier: TrustTier = "unknown";
    const score = TIER_SCORE[tier];
    result.push({ domain, tier, score, last_assessed: null, source: "computed" });

    await supabase.from("domain_reputations").upsert({
      domain,
      tier,
      score,
      signals: {},
      last_assessed: new Date().toISOString(),
      source: "computed",
    });
  }

  return NextResponse.json({ reputations: result });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
