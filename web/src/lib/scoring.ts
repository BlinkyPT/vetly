import {
  type HeuristicSignals,
  type LLMSignals,
  type TrustTier,
  type WeightedSignal,
  TIER_SCORE,
} from "@vetly/shared";

/**
 * Turn raw signals into a 0-1 trust score + tier + a weighted-signals
 * array for the methodology panel. Pure function; deterministic.
 *
 * Weights sum to 1.0. A signal's `contribution` is `weight * normalised_value`,
 * where normalised_value is in [0, 1] with 1 = "more trustworthy".
 */
const WEIGHTS = {
  bundled_tier: 0.22,
  ai_probability: 0.18,
  expertise_fit: 0.12,
  bias: 0.1,
  citation_density: 0.1,
  byline: 0.06,
  freshness: 0.06,
  ad_density: 0.06,
  https_valid: 0.04,
  domain_age: 0.03,
  language_confidence: 0.03,
} as const;

const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function tierFromScore(score: number): TrustTier {
  if (score >= 0.7) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function scorePage(h: HeuristicSignals, llm: LLMSignals, wordCount: number): {
  score: number;
  tier: TrustTier;
  weighted_signals: WeightedSignal[];
} {
  const bundled = clamp01(TIER_SCORE[h.bundled_tier]);
  const aiInverted = clamp01(1 - llm.ai_probability);
  const expertise = clamp01(llm.expertise_fit);

  const observedBias = llm.bias_markers.filter((m) => m !== "none_observed");
  const bias = clamp01(1 - observedBias.length * 0.2);

  const citationDensity = wordCount > 0
    ? clamp01(h.citation_count / Math.max(1, wordCount / 400))
    : 0.5;

  const byline = h.has_byline ? 1 : 0.3;

  const freshness = h.freshness_days == null
    ? 0.5
    : h.freshness_days < 30 ? 1
    : h.freshness_days < 180 ? 0.75
    : h.freshness_days < 365 ? 0.5
    : 0.3;

  const adRatio = h.ad_to_content_ratio == null
    ? 0.5
    : clamp01(1 - h.ad_to_content_ratio * 4);

  const https = h.https_valid ? 1 : 0;

  const domainAge = h.domain_age_years == null
    ? 0.5
    : h.domain_age_years >= 10 ? 1
    : h.domain_age_years >= 3 ? 0.7
    : h.domain_age_years >= 1 ? 0.45
    : 0.2;

  const lang = clamp01(h.language_confidence) * (h.locale_consistent ? 1 : 0.8);

  const signalValues: Array<{
    key: string;
    label: string;
    value: string | number | boolean | null;
    weight: number;
    normalised: number;
    evidence: string | null;
  }> = [
    { key: "bundled_tier", label: "Known publisher reputation", value: h.bundled_tier, weight: WEIGHTS.bundled_tier, normalised: bundled, evidence: `Tier from bundled seed: ${h.bundled_tier}` },
    { key: "ai_probability", label: "AI-generated-content probability", value: llm.ai_probability, weight: WEIGHTS.ai_probability, normalised: aiInverted, evidence: llm.ai_evidence.join(" · ") || null },
    { key: "expertise_fit", label: "Topic / expertise fit", value: llm.expertise_fit, weight: WEIGHTS.expertise_fit, normalised: expertise, evidence: llm.expertise_notes || null },
    { key: "bias_markers", label: "Editorial bias markers", value: observedBias.join(", ") || "none", weight: WEIGHTS.bias, normalised: bias, evidence: llm.bias_notes || null },
    { key: "citation_density", label: "Citation density", value: h.citation_count, weight: WEIGHTS.citation_density, normalised: citationDensity, evidence: `${h.citation_count} outlinks to primary sources in ~${wordCount} words.` },
    { key: "byline", label: "Author byline present", value: h.has_byline, weight: WEIGHTS.byline, normalised: byline, evidence: h.author_name ?? null },
    { key: "freshness", label: "Publication freshness", value: h.freshness_days, weight: WEIGHTS.freshness, normalised: freshness, evidence: h.freshness_days == null ? "No publication date found." : `${h.freshness_days} days old.` },
    { key: "ad_density", label: "Ad-to-content ratio", value: h.ad_to_content_ratio, weight: WEIGHTS.ad_density, normalised: adRatio, evidence: h.ad_to_content_ratio == null ? null : `${(h.ad_to_content_ratio * 100).toFixed(1)}% of page is ad slots.` },
    { key: "https_valid", label: "Valid HTTPS certificate", value: h.https_valid, weight: WEIGHTS.https_valid, normalised: https, evidence: null },
    { key: "domain_age", label: "Domain age (years)", value: h.domain_age_years, weight: WEIGHTS.domain_age, normalised: domainAge, evidence: null },
    { key: "language_confidence", label: "Language / locale consistency", value: h.language_confidence, weight: WEIGHTS.language_confidence, normalised: lang, evidence: h.locale_consistent ? "Locale matches expectation." : "Locale mismatch." },
  ];

  let score = 0;
  const weighted_signals: WeightedSignal[] = signalValues.map((s) => {
    const contribution = (s.weight / totalWeight) * s.normalised;
    score += contribution;
    return {
      key: s.key,
      label: s.label,
      value: s.value,
      weight: s.weight,
      contribution,
      evidence: s.evidence,
    };
  });

  score = clamp01(score);
  return { score, tier: tierFromScore(score), weighted_signals };
}
