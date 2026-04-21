import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Req = z.object({
  target_kind: z.enum(["domain", "page"]),
  target_value: z.string().min(1).max(500),
  submitter_email: z.string().email().optional(),
  submitter_name: z.string().max(200).optional(),
  relationship: z.enum(["publisher", "author", "reader", "other"]),
  grounds: z.string().min(20).max(4000),
  evidence_url: z.string().url().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = Req.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });

  const service = createSupabaseServiceClient();
  const { data, error } = await service.from("disputes").insert({
    target_kind: parsed.data.target_kind,
    target_value: parsed.data.target_value.toLowerCase(),
    submitter_email: parsed.data.submitter_email ?? null,
    submitter_name: parsed.data.submitter_name ?? null,
    relationship: parsed.data.relationship,
    grounds: parsed.data.grounds,
    evidence_url: parsed.data.evidence_url ?? null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
