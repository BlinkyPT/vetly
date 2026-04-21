import { NextResponse } from "next/server";
import { z } from "zod";
import type { PageAssessment } from "@vetly/shared";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * BYOK-friendly cache lookup. Takes only `url_hash` — no URL, no content —
 * and returns the shared assessment if one exists and is fresh. Used by
 * BYOK extensions so the user benefits from community caching without
 * sending anything identifying to our server.
 */
const Req = z.object({ url_hash: z.string().length(64) });

const STALE_DAYS = 30;

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = Req.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const service = createSupabaseServiceClient();
  const { data: row } = await service
    .from("page_assessments")
    .select("full, assessed_at")
    .eq("url_hash", parsed.data.url_hash)
    .maybeSingle();

  if (!row) return NextResponse.json({ hit: false });

  const ageDays = (Date.now() - new Date(row.assessed_at).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays >= STALE_DAYS) return NextResponse.json({ hit: false });

  return NextResponse.json({ hit: true, assessment: row.full as PageAssessment });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
