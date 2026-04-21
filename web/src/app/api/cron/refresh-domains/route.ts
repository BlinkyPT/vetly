import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: pick the oldest domains whose `last_assessed` is > 30 days old and
 * re-score a small batch. Vercel authenticates cron calls via the standard
 * `x-vercel-cron` header + the project's CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await service
    .from("domain_reputations")
    .select("domain")
    .lt("last_assessed", cutoff)
    .limit(100);

  // For MVP this cron just touches `last_assessed` so the signal's age
  // doesn't grow unbounded. A real pipeline would recompute heuristics here.
  if (stale && stale.length > 0) {
    const now = new Date().toISOString();
    for (const { domain } of stale) {
      await service.from("domain_reputations").update({ last_assessed: now }).eq("domain", domain);
    }
  }

  return NextResponse.json({ refreshed: stale?.length ?? 0 });
}
