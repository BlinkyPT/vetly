import { NextResponse } from "next/server";
import { AssessRequest, type HeuristicSignals, type PageAssessment } from "@vetly/shared";
import { hashUrl, extractDomain, normaliseUrl } from "@/lib/url-hash";
import { scorePage } from "@/lib/scoring";
import { computeHeuristics } from "@vetly/shared/heuristics";
import { classifyContentLLM } from "@/lib/ai";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkDeepAssessmentQuota, incrementDeepAssessmentUsage } from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 30;

const ASSESSMENT_STALE_DAYS = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = AssessRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  // Identify caller: authed user preferred, else device-id from extension header.
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const deviceId = req.headers.get("x-vetly-device-id");

  const identity = user
    ? ({ kind: "user", userId: user.id } as const)
    : deviceId
      ? ({ kind: "device", deviceId } as const)
      : null;

  if (!identity) {
    return NextResponse.json({ error: "no_identity", message: "Sign in or send X-Vetly-Device-Id header." }, { status: 401 });
  }

  const quota = await checkDeepAssessmentQuota(identity);
  if (!quota.allowed) {
    // Anti-abuse rate limit, not a paywall. Surface it as a 429 with a human-readable
    // message explaining it's a daily per-device cap, not a plan restriction.
    return NextResponse.json({
      error: "rate_limited",
      message: `You've hit today's limit of ${quota.limit} deep assessments. Resets at midnight UTC. Vetly is free — this cap only exists to stop abuse.`,
      used: quota.used,
      limit: quota.limit,
    }, { status: 429 });
  }

  const service = createSupabaseServiceClient();
  const urlHash = await hashUrl(parsed.data.url);

  // Check cache first — shared across users.
  const { data: cached } = await service
    .from("page_assessments")
    .select("*")
    .eq("url_hash", urlHash)
    .maybeSingle();

  if (cached) {
    const ageDays = (Date.now() - new Date(cached.assessed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < ASSESSMENT_STALE_DAYS) {
      return NextResponse.json({
        assessment: cached.full as PageAssessment,
        cached: true,
        quota: { remaining: quota.remaining },
      });
    }
  }

  const domain = extractDomain(parsed.data.url) ?? "";
  const { data: domainRow } = await service
    .from("domain_reputations")
    .select("tier")
    .eq("domain", domain.replace(/^www\./, ""))
    .maybeSingle();

  const heuristic: HeuristicSignals = computeHeuristics(
    parsed.data,
    (domainRow?.tier as HeuristicSignals["bundled_tier"]) ?? "unknown",
  );

  const llm = await classifyContentLLM({
    url: parsed.data.url,
    title: parsed.data.title,
    content: parsed.data.content,
  });

  const { score, tier, weighted_signals } = scorePage(heuristic, llm, parsed.data.word_count);

  const assessment: PageAssessment = {
    url: normaliseUrl(parsed.data.url),
    url_hash: urlHash,
    score,
    tier,
    heuristic,
    llm,
    weighted_signals,
    assessed_at: new Date().toISOString(),
  };

  await service.from("page_assessments").upsert({
    url_hash: urlHash,
    url: assessment.url,
    score,
    signals: { heuristic, llm, weighted_signals },
    ai_probability: llm.ai_probability,
    assessed_at: assessment.assessed_at,
    full: assessment,
  });

  await incrementDeepAssessmentUsage(identity);

  return NextResponse.json({
    assessment,
    cached: false,
    quota: { remaining: quota.remaining - 1 },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
