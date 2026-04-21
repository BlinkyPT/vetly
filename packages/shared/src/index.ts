import { z } from "zod";

export const TrustTier = z.enum(["high", "medium", "low", "unknown"]);
export type TrustTier = z.infer<typeof TrustTier>;

export const TIER_SCORE: Record<TrustTier, number> = {
  high: 0.85,
  medium: 0.55,
  low: 0.25,
  unknown: 0.5,
};

export const TIER_COLOUR: Record<TrustTier, "green" | "amber" | "red" | "grey"> = {
  high: "green",
  medium: "amber",
  low: "red",
  unknown: "grey",
};

export const HeuristicSignals = z.object({
  domain_age_years: z.number().nullable(),
  https_valid: z.boolean(),
  published_at: z.string().nullable(),
  freshness_days: z.number().nullable(),
  ad_to_content_ratio: z.number().nullable(),
  has_byline: z.boolean(),
  author_name: z.string().nullable(),
  citation_count: z.number(),
  bundled_tier: TrustTier,
  language_confidence: z.number(),
  locale_consistent: z.boolean(),
});
export type HeuristicSignals = z.infer<typeof HeuristicSignals>;

export const LLMSignals = z.object({
  ai_probability: z.number().min(0).max(1).describe("Probability the content is LLM-generated (0-1)."),
  ai_evidence: z.array(z.string()).describe("Short quotes or patterns that support the AI probability."),
  bias_markers: z.array(z.enum([
    "partisan_framing",
    "unsupported_claim",
    "emotional_loading",
    "straw_man",
    "cherry_picking",
    "none_observed",
  ])),
  bias_notes: z.string(),
  expertise_fit: z.number().min(0).max(1).describe("How well the content matches the claimed topic authority (0-1)."),
  expertise_notes: z.string(),
});
export type LLMSignals = z.infer<typeof LLMSignals>;

export const WeightedSignal = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  weight: z.number(),
  contribution: z.number(),
  evidence: z.string().nullable(),
});
export type WeightedSignal = z.infer<typeof WeightedSignal>;

export const PageAssessment = z.object({
  url: z.string().url(),
  url_hash: z.string(),
  score: z.number().min(0).max(1),
  tier: TrustTier,
  heuristic: HeuristicSignals,
  llm: LLMSignals,
  weighted_signals: z.array(WeightedSignal),
  assessed_at: z.string(),
});
export type PageAssessment = z.infer<typeof PageAssessment>;

export const DomainReputation = z.object({
  domain: z.string(),
  tier: TrustTier,
  score: z.number().min(0).max(1),
  last_assessed: z.string().nullable(),
  source: z.enum(["bundled_seed", "computed", "feedback_adjusted"]),
});
export type DomainReputation = z.infer<typeof DomainReputation>;

export const AssessRequest = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().min(100).max(50_000),
  published_at: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  outlinks: z.array(z.string()).default([]),
  ad_slot_count: z.number().default(0),
  word_count: z.number().default(0),
});
export type AssessRequest = z.infer<typeof AssessRequest>;

export const DomainReputationRequest = z.object({
  domains: z.array(z.string()).min(1).max(50),
});
export type DomainReputationRequest = z.infer<typeof DomainReputationRequest>;

export const FeedbackRequest = z.object({
  url_hash: z.string(),
  thumbs: z.enum(["up", "down"]),
  notes: z.string().max(500).optional(),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;

/**
 * Vetly operates on a donation basis — every feature is free for everyone.
 * The only limit is a per-device anti-abuse cap to prevent a single bad
 * actor from draining the LLM budget for other users. If this ceiling
 * ever bites real users, raise it; it is not a monetisation lever.
 */
export const ANTI_ABUSE_LIMITS = {
  deep_assessments_per_day: 50,
  serp_badges_per_day: Infinity,
} as const;

export const DonationRequest = z.object({
  amount_cents: z.number().int().min(100).max(100_000), // $1 – $1,000
  mode: z.enum(["one_off", "monthly"]).default("one_off"),
});
export type DonationRequest = z.infer<typeof DonationRequest>;

export const SUGGESTED_DONATION_AMOUNTS_CENTS = [300, 700, 2000] as const; // $3 / $7 / $20
