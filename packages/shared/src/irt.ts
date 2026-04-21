/**
 * IRT scoring engine (2PL-logistic), parameter-separable.
 *
 * Each signal is treated as an item with:
 *   - discrimination `a`   (how sharply it differentiates trust levels)
 *   - difficulty `b`       (latent-trust level at which the item's
 *                           expected response crosses 0.5)
 *
 * A person (here: a web page) has a latent trust θ. The probability
 * that the page "passes" item i is:
 *
 *   P(x_i = 1 | θ) = 1 / (1 + exp(-a_i * (θ - b_i)))
 *
 * We estimate θ by maximum likelihood via Newton-Raphson. For ordinal
 * or continuous signals the observed value is mapped to the [0,1]
 * interval and treated as a partial-credit probability.
 *
 * When real calibration data exists, `a_i` and `b_i` are refitted in
 * `mirt` (R) or `py-irt`, exported as JSON, and dropped in here
 * without code changes.
 */

import type { HeuristicSignals, LLMSignals, TrustTier } from "./index.js";

export interface IRTItemParams {
  key: string;
  /** 2PL discrimination parameter. Typical range 0.5–3. Higher = steeper item. */
  a: number;
  /** 2PL difficulty parameter in latent-trust units. Typical range -3 to +3. */
  b: number;
  /** Which of the four facets this item loads on (for sub-scores). */
  facet: "factual_rigour" | "editorial_integrity" | "temporal_currency" | "authority_alignment";
  /** How to turn the raw observation into the [0,1] "passed" response. */
  map: SignalMap;
}

export type SignalMap =
  | { kind: "identity" }                 // raw value already in [0,1]
  | { kind: "invert" }                   // 1 - raw
  | { kind: "boolean" }                  // true → 1, false → 0
  | { kind: "bucket"; values: Record<string, number> } // e.g. tier → number
  | { kind: "linear"; min: number; max: number }        // scale into [0,1]
  | { kind: "piecewise"; points: Array<[number, number]> } // value → mapped value, interpolated
  | { kind: "count_soft"; half_saturation: number };       // x / (x + k), saturates

export interface IRTModel {
  version: string;
  items: IRTItemParams[];
  /** Tier thresholds on latent θ, fitted against a reference distribution. */
  tier_thresholds: { high: number; medium: number };
  meta: {
    calibration_n: number;
    calibration_source: string;
    fit_date: string;
    notes?: string;
  };
}

export interface Observation {
  key: string;
  raw: unknown;
  confidence?: number; // 0–1; scales the item's contribution to the likelihood
}

export interface FacetEstimate {
  theta_mean: number;
  theta_sem: number;
  score: number;  // [0,1]
  n_items: number;
}

export interface IRTScoreResult {
  theta_mean: number;
  theta_sem: number;
  score: number;
  tier: TrustTier;
  tier_certainty: number;
  log_likelihood: number;
  fisher_information: number;
  facets: Record<IRTItemParams["facet"], FacetEstimate>;
  item_contributions: Array<{
    key: string;
    raw: unknown;
    mapped: number;
    a: number;
    b: number;
    contribution_to_theta: number;
    information_at_theta: number;
  }>;
}

function applyMap(raw: unknown, map: SignalMap): number | null {
  if (raw === null || raw === undefined) return null;
  switch (map.kind) {
    case "identity":
      return clamp01(Number(raw));
    case "invert":
      return clamp01(1 - Number(raw));
    case "boolean":
      return raw ? 1 : 0;
    case "bucket": {
      const v = map.values[String(raw)];
      return v === undefined ? null : clamp01(v);
    }
    case "linear": {
      const v = (Number(raw) - map.min) / (map.max - map.min);
      return clamp01(v);
    }
    case "piecewise": {
      const x = Number(raw);
      const pts = [...map.points].sort((p, q) => p[0] - q[0]);
      if (x <= pts[0]![0]) return clamp01(pts[0]![1]);
      if (x >= pts.at(-1)![0]) return clamp01(pts.at(-1)![1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[i + 1]!;
        if (x >= x0 && x <= x1) {
          const t = (x - x0) / (x1 - x0);
          return clamp01(y0 + t * (y1 - y0));
        }
      }
      return null;
    }
    case "count_soft": {
      const x = Math.max(0, Number(raw));
      return clamp01(x / (x + map.half_saturation));
    }
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Estimate θ (latent trust) given a vector of observations and an IRT model.
 *
 * Likelihood (partial-credit adaptation of 2PL):
 *   For an observation with mapped probability p_i ∈ [0,1] and confidence c_i,
 *     P(x_i | θ) ∝ P_i^{p_i · c_i} · (1 - P_i)^{(1 - p_i) · c_i}
 *   where P_i = sigmoid(a_i * (θ - b_i)).
 *
 * This generalises dichotomous responses (p_i = 0 or 1) and handles
 * continuous observations without an explicit GRM.
 */
export function estimateTheta(
  observations: Observation[],
  model: IRTModel,
): IRTScoreResult {
  const items = model.items;
  const byKey = new Map(items.map((i) => [i.key, i]));

  const prepared = observations.flatMap((o) => {
    const item = byKey.get(o.key);
    if (!item) return [];
    const mapped = applyMap(o.raw, item.map);
    if (mapped === null) return [];
    const c = o.confidence ?? 1;
    return [{ item, mapped, confidence: clamp01(c) }];
  });

  // Newton-Raphson on the log-likelihood. Start at θ = 0.
  let theta = 0;
  for (let iter = 0; iter < 30; iter++) {
    let d1 = 0; // first derivative
    let d2 = 0; // second derivative (negative of Fisher information)
    for (const { item, mapped, confidence } of prepared) {
      const z = item.a * (theta - item.b);
      const p = sigmoid(z);
      d1 += confidence * item.a * (mapped - p);
      d2 += -confidence * item.a * item.a * p * (1 - p);
    }
    // Regularisation: mild prior θ ~ N(0, 1) to keep estimates bounded.
    d1 += -theta;
    d2 += -1;
    if (Math.abs(d1) < 1e-6) break;
    if (d2 === 0) break;
    const step = -d1 / d2;
    // Damping for stability at early iterations.
    theta = theta + Math.max(-1.5, Math.min(1.5, step));
  }

  // Fisher information at the MLE.
  let information = 1; // prior contribution
  for (const { item, confidence } of prepared) {
    const z = item.a * (theta - item.b);
    const p = sigmoid(z);
    information += confidence * item.a * item.a * p * (1 - p);
  }
  const sem = 1 / Math.sqrt(information);

  // Log-likelihood at θ (for model-fit diagnostics).
  let ll = 0;
  const itemContribs: IRTScoreResult["item_contributions"] = [];
  for (const { item, mapped, confidence } of prepared) {
    const z = item.a * (theta - item.b);
    const p = sigmoid(z);
    const contrib = confidence * (mapped * Math.log(Math.max(p, 1e-9)) + (1 - mapped) * Math.log(Math.max(1 - p, 1e-9)));
    ll += contrib;
    itemContribs.push({
      key: item.key,
      raw: null,
      mapped,
      a: item.a,
      b: item.b,
      contribution_to_theta: contrib,
      information_at_theta: confidence * item.a * item.a * p * (1 - p),
    });
  }

  // Per-facet sub-scores: re-run θ MLE within each facet's item subset.
  const facets: IRTScoreResult["facets"] = {
    factual_rigour:      facetEstimate(prepared, "factual_rigour"),
    editorial_integrity: facetEstimate(prepared, "editorial_integrity"),
    temporal_currency:   facetEstimate(prepared, "temporal_currency"),
    authority_alignment: facetEstimate(prepared, "authority_alignment"),
  };

  // Map θ → [0,1] score via the standard normal CDF approximation.
  const score = thetaToScore(theta);
  const tier = thetaToTier(theta, sem, model.tier_thresholds);
  const tierCertainty = tierCertaintyValue(theta, sem, model.tier_thresholds);

  return {
    theta_mean: theta,
    theta_sem: sem,
    score,
    tier,
    tier_certainty: tierCertainty,
    log_likelihood: ll,
    fisher_information: information,
    facets,
    item_contributions: itemContribs,
  };
}

function facetEstimate(prepared: Array<{ item: IRTItemParams; mapped: number; confidence: number }>, facet: IRTItemParams["facet"]): FacetEstimate {
  const subset = prepared.filter((p) => p.item.facet === facet);
  if (subset.length === 0) return { theta_mean: 0, theta_sem: 1, score: 0.5, n_items: 0 };
  let theta = 0;
  for (let iter = 0; iter < 20; iter++) {
    let d1 = 0, d2 = 0;
    for (const { item, mapped, confidence } of subset) {
      const z = item.a * (theta - item.b);
      const p = sigmoid(z);
      d1 += confidence * item.a * (mapped - p);
      d2 += -confidence * item.a * item.a * p * (1 - p);
    }
    d1 += -theta; d2 += -1;
    if (Math.abs(d1) < 1e-6 || d2 === 0) break;
    theta = theta - d1 / d2;
  }
  let info = 1;
  for (const { item, confidence } of subset) {
    const z = item.a * (theta - item.b);
    const p = sigmoid(z);
    info += confidence * item.a * item.a * p * (1 - p);
  }
  return { theta_mean: theta, theta_sem: 1 / Math.sqrt(info), score: thetaToScore(theta), n_items: subset.length };
}

/** Standard-normal CDF via Abramowitz-Stegun 7.1.26 approximation. */
function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absX);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}

export function thetaToScore(theta: number): number {
  // θ lives on a standard-normal scale (approximately) after IRT fitting.
  // Map it monotonically to [0, 1] via the CDF so the score has a clean
  // probabilistic reading: "estimated percentile of trustworthiness".
  return normCdf(theta);
}

function thetaToTier(theta: number, sem: number, thresh: { high: number; medium: number }): TrustTier {
  // "Mixed" → return whichever side is closer; callers can use tier_certainty.
  if (theta >= thresh.high) return "high";
  if (theta >= thresh.medium) return "medium";
  return "low";
}

function tierCertaintyValue(theta: number, sem: number, thresh: { high: number; medium: number }): number {
  // Approximate P(true tier == reported tier) under Normal(θ, sem).
  const reported = thetaToTier(theta, sem, thresh);
  const within = (lo: number, hi: number) => normCdf((hi - theta) / sem) - normCdf((lo - theta) / sem);
  if (reported === "high") return within(thresh.high, Infinity);
  if (reported === "medium") return within(thresh.medium, thresh.high);
  return within(-Infinity, thresh.medium);
}

/**
 * Build observations from Vetly's canonical signal objects. Keeps callers
 * from having to know the item keys.
 */
export function observationsFromSignals(h: HeuristicSignals, l: LLMSignals, wordCount: number): Observation[] {
  return [
    { key: "bundled_tier",       raw: h.bundled_tier },
    { key: "ai_probability",     raw: l.ai_probability, confidence: l.ai_evidence.length > 0 ? 1 : 0.6 },
    { key: "expertise_fit",      raw: l.expertise_fit, confidence: l.expertise_notes ? 1 : 0.7 },
    { key: "bias_markers",       raw: l.bias_markers.filter((m) => m !== "none_observed").length },
    { key: "citation_density",   raw: wordCount > 0 ? h.citation_count / Math.max(1, wordCount / 400) : null },
    { key: "has_byline",         raw: h.has_byline },
    { key: "freshness_days",     raw: h.freshness_days },
    { key: "ad_to_content_ratio", raw: h.ad_to_content_ratio },
    { key: "https_valid",        raw: h.https_valid },
    { key: "domain_age_years",   raw: h.domain_age_years },
    { key: "language_confidence", raw: h.language_confidence, confidence: h.locale_consistent ? 1 : 0.7 },
  ];
}
