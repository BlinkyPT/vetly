import { NextResponse } from "next/server";
import { PageAssessment } from "@vetly/shared";
import { hashUrl } from "@/lib/url-hash";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Optional endpoint for BYOK users who opted in to "contribute back".
 * Accepts a client-computed assessment and stores it in the shared cache
 * so non-BYOK users benefit. We validate the shape but trust the signals —
 * this is a tiny attack surface (a BYOK user can seed the cache with
 * junk), so we flag the row so we can audit if quality drops.
 */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = PageAssessment.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });

  // Re-derive the hash from the URL we were told — don't trust the client's hash.
  const canonicalHash = await hashUrl(parsed.data.url);
  if (canonicalHash !== parsed.data.url_hash) {
    return NextResponse.json({ error: "hash_mismatch" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Don't overwrite a server-computed row with a client-computed one.
  const { data: existing } = await service
    .from("page_assessments")
    .select("url_hash, signals")
    .eq("url_hash", parsed.data.url_hash)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, action: "no_overwrite" });

  await service.from("page_assessments").insert({
    url_hash: parsed.data.url_hash,
    url: parsed.data.url,
    score: parsed.data.score,
    signals: { ...parsed.data, source: "byok_contribution" },
    ai_probability: parsed.data.llm.ai_probability,
    assessed_at: parsed.data.assessed_at,
    full: parsed.data,
  });

  return NextResponse.json({ ok: true, action: "inserted" });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
