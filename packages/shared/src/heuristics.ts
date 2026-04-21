import type { AssessRequest, HeuristicSignals, TrustTier } from "./index.js";

/**
 * Pure function: derive heuristic (non-LLM) signals from an AssessRequest
 * plus an optional bundled tier for the domain. Lives in the shared
 * package so both the server-side /api/assess route and the BYOK
 * client-side extension path use identical logic.
 */
export function computeHeuristics(
  req: AssessRequest,
  bundledTier: TrustTier = "unknown",
): HeuristicSignals {
  const publishedAt = req.published_at ?? null;
  const freshnessDays = publishedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const adRatio = req.word_count > 0
    ? req.ad_slot_count / Math.max(1, req.word_count / 100)
    : null;

  return {
    domain_age_years: null, // populated by server-side WHOIS pipeline, not available in-browser
    https_valid: req.url.startsWith("https://"),
    published_at: publishedAt,
    freshness_days: freshnessDays,
    ad_to_content_ratio: adRatio,
    has_byline: !!req.author,
    author_name: req.author ?? null,
    citation_count: req.outlinks.length,
    bundled_tier: bundledTier,
    language_confidence: 0.9,
    locale_consistent: true,
  };
}
