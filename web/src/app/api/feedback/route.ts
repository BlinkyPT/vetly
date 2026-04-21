import { NextResponse } from "next/server";
import { FeedbackRequest } from "@vetly/shared";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = FeedbackRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const authed = await createSupabaseServerClient();
  const { data: { user } } = await authed.auth.getUser();
  const deviceId = req.headers.get("x-vetly-device-id");

  if (!user && !deviceId) {
    return NextResponse.json({ error: "no_identity" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.from("user_feedback").insert({
    user_id: user?.id ?? null,
    device_id: user ? null : deviceId,
    url_hash: parsed.data.url_hash,
    thumbs: parsed.data.thumbs,
    notes: parsed.data.notes ?? null,
  });
  if (error) {
    return NextResponse.json({ error: "insert_failed", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
