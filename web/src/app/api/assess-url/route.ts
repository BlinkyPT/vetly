import { NextResponse } from "next/server";
import { z } from "zod";
import type { HeuristicSignals, PageAssessment, FacetKey } from "@vetly/shared";
import { computeHeuristics } from "@vetly/shared/heuristics";
import { estimateTheta, observationsFromSignals, type IRTModel } from "@vetly/shared/irt";
import { generateCounterfactuals } from "@vetly/shared/counterfactuals";
import irtParamsV01 from "@vetly/shared/irt-params" with { type: "json" };
import { hashUrl, extractDomain, normaliseUrl } from "@/lib/url-hash";
import { scorePage } from "@/lib/scoring";
import { classifyContentLLM } from "@/lib/ai";
import { safeFetch } from "@/lib/safe-fetch";
import { extractFromHtml } from "@/lib/extract";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { checkDeepAssessmentQuota, incrementDeepAssessmentUsage } from "@/lib/quota";

const IRT_MODEL = irtParamsV01 as unknown as IRTModel;

export const runtime = "nodejs";
export const maxDuration = 60;

const ASSESSMENT_STALE_DAYS = 30;
const Req = z.object({ url: z.string().url() });

/**
 * Public URL-assessment endpoint. Takes a URL, fetches the page server-side
 * (with SSRF protection), runs Readability, scores it. Used by /assess web page.
 * For authenticated users this counts against their daily anti-abuse quota;
 * anonymous users get an IP-based quota (light — a separate concern we defer).
 */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = Req.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  // Identify + quota (user-authed preferred; else IP fallback).
  const authed = await createSupabaseServerClient();
  const { data: { user } } = await authed.auth.getUser();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";

  if (user) {
    const quota = await checkDeepAssessmentQuota({ kind: "user", userId: user.id });
    if (!quota.allowed) {
      return NextResponse.json({ error: "rate_limited", message: "Daily assessment cap reached." }, { status: 429 });
    }
  } else {
    // Lightweight anonymous limit via a synthetic device-id derived from IP prefix.
    // Not strong identity, but enough to keep casual abuse off the LLM bill.
    const ipPrefix = ip.split(".").slice(0, 3).join(".");
    const syntheticId = `ip-${ipPrefix}`;
    const quota = await checkDeepAssessmentQuota({ kind: "device", deviceId: syntheticId });
    if (!quota.allowed) {
      return NextResponse.json({ error: "rate_limited", message: "Daily assessment cap reached for your network. Sign in for personal quota." }, { status: 429 });
    }
  }

  // Check cache first.
  const service = createSupabaseServiceClient();
  const urlHash = await hashUrl(parsed.data.url);
  const { data: cached } = await service
    .from("page_assessments")
    .select("*")
    .eq("url_hash", urlHash)
    .maybeSingle();
  if (cached) {
    const ageDays = (Date.now() - new Date(cached.assessed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < ASSESSMENT_STALE_DAYS) {
      return NextResponse.json({ assessment: cached.full as PageAssessment, cached: true });
    }
  }

  // Fetch + extract.
  let html: string;
  let finalUrl: string;
  try {
    const fetched = await safeFetch(parsed.data.url);
    html = fetched.html;
    finalUrl = fetched.url;
  } catch (err) {
    return NextResponse.json({ error: "fetch_failed", message: (err as Error).message }, { status: 400 });
  }
  const assessRequest = extractFromHtml(finalUrl, html);
  if (!assessRequest) return NextResponse.json({ error: "no_readable_content" }, { status: 400 });
  if (assessRequest.word_count < 80) return NextResponse.json({ error: "too_short" }, { status: 400 });

  // Heuristics + LLM + scoring.
  const domain = extractDomain(finalUrl) ?? "";
  const { data: domainRow } = await service
    .from("domain_reputations")
    .select("tier")
    .eq("domain", domain.replace(/^www\./, ""))
    .maybeSingle();

  const heuristic: HeuristicSignals = computeHeuristics(
    assessRequest,
    (domainRow?.tier as HeuristicSignals["bundled_tier"]) ?? "unknown",
  );

  const llm = await classifyContentLLM({
    url: assessRequest.url,
    title: assessRequest.title,
    content: assessRequest.content,
  });
  const { weighted_signals } = scorePage(heuristic, llm, assessRequest.word_count);
  const observations = observationsFromSignals(heuristic, llm, assessRequest.word_count);
  const irt = estimateTheta(observations, IRT_MODEL);
  const counterfactuals = generateCounterfactuals(observations, IRT_MODEL, irt.score);

  const assessment: PageAssessment = {
    url: normaliseUrl(finalUrl),
    url_hash: urlHash,
    score: irt.score,
    tier: irt.tier,
    heuristic,
    llm,
    weighted_signals,
    assessed_at: new Date().toISOString(),
    theta_mean: irt.theta_mean,
    theta_sem: irt.theta_sem,
    tier_certainty: irt.tier_certainty,
    facets: irt.facets as Record<FacetKey, typeof irt.facets[keyof typeof irt.facets]>,
    counterfactuals,
    algorithm_version: IRT_MODEL.version,
  };

  await service.from("page_assessments").upsert({
    url_hash: urlHash,
    url: assessment.url,
    score: irt.score,
    signals: { heuristic, llm, weighted_signals, irt, observations },
    ai_probability: llm.ai_probability,
    assessed_at: assessment.assessed_at,
    full: assessment,
  });

  // Record the usage.
  if (user) {
    await incrementDeepAssessmentUsage({ kind: "user", userId: user.id });
  } else {
    const ipPrefix = ip.split(".").slice(0, 3).join(".");
    await incrementDeepAssessmentUsage({ kind: "device", deviceId: `ip-${ipPrefix}` });
  }

  return NextResponse.json({ assessment, cached: false });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
