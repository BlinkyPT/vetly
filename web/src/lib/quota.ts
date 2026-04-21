import { ANTI_ABUSE_LIMITS } from "@vetly/shared";
import { createSupabaseServiceClient } from "./supabase/server";

export type QuotaIdentity =
  | { kind: "user"; userId: string }
  | { kind: "device"; deviceId: string };

/**
 * Anti-abuse rate limit for deep assessments. Vetly is donation-supported —
 * this cap is not about monetisation, it only stops a single bad actor from
 * draining the LLM budget. If it ever bites real users, raise it.
 */
export async function checkDeepAssessmentQuota(identity: QuotaIdentity): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
}> {
  const supabase = createSupabaseServiceClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = ANTI_ABUSE_LIMITS.deep_assessments_per_day;

  const column = identity.kind === "user" ? "user_id" : "device_id";
  const id = identity.kind === "user" ? identity.userId : identity.deviceId;

  const { data: usage } = await supabase
    .from("usage")
    .select("page_assessments_count")
    .eq(column, id)
    .gte("created_at", today.toISOString())
    .maybeSingle();

  const used = usage?.page_assessments_count ?? 0;
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, remaining, used, limit };
}

export async function incrementDeepAssessmentUsage(identity: QuotaIdentity): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const column = identity.kind === "user" ? "user_id" : "device_id";
  const id = identity.kind === "user" ? identity.userId : identity.deviceId;

  const { data: existing } = await supabase
    .from("usage")
    .select("id, page_assessments_count")
    .eq(column, id)
    .gte("created_at", todayIso)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("usage")
      .update({ page_assessments_count: existing.page_assessments_count + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage").insert({
      [column]: id,
      page_assessments_count: 1,
      created_at: todayIso,
    });
  }
}
