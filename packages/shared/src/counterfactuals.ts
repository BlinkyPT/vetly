import { estimateTheta, thetaToScore, type IRTModel, type Observation } from "./irt.js";

export interface Counterfactual {
  /** Human-readable label for the UI. */
  label: string;
  /** Short suggestion on how the publisher could realise this change. */
  suggestion: string;
  /** Score delta if the signal were replaced by the counterfactual value. */
  delta_score: number;
  /** The signal key that drives this counterfactual. */
  key: string;
}

type CounterfactualSpec = {
  key: string;
  label: string;
  suggestion: string;
  /** Function that returns the replaced observation, or null to skip. */
  ifApplicable(obs: Observation): Observation | null;
};

const SPECS: CounterfactualSpec[] = [
  {
    key: "has_byline",
    label: "Add a verifiable byline",
    suggestion: "Add a named author with an author page or ORCID / LinkedIn reference.",
    ifApplicable: (o) => (o.key === "has_byline" && o.raw === false ? { ...o, raw: true, confidence: 0.9 } : null),
  },
  {
    key: "citation_density",
    label: "Cite more primary sources",
    suggestion: "Add 3+ outbound links to primary sources (studies, official data, named experts).",
    ifApplicable: (o) => (o.key === "citation_density" && typeof o.raw === "number" && o.raw < 1 ? { ...o, raw: 1.5 } : null),
  },
  {
    key: "ad_to_content_ratio",
    label: "Reduce ad density",
    suggestion: "Remove intrusive ad slots or move to a reader-supported model.",
    ifApplicable: (o) => (o.key === "ad_to_content_ratio" && typeof o.raw === "number" && o.raw > 0.15 ? { ...o, raw: 0.1 } : null),
  },
  {
    key: "https_valid",
    label: "Enable HTTPS with a valid certificate",
    suggestion: "Provision a Let's Encrypt or commercial TLS certificate and redirect all HTTP traffic.",
    ifApplicable: (o) => (o.key === "https_valid" && o.raw === false ? { ...o, raw: true } : null),
  },
  {
    key: "bias_markers",
    label: "Remove bias markers",
    suggestion: "Rewrite partisan framing or unsupported claims; source sweeping assertions.",
    ifApplicable: (o) => (o.key === "bias_markers" && typeof o.raw === "number" && o.raw > 0 ? { ...o, raw: 0 } : null),
  },
  {
    key: "ai_probability",
    label: "Reduce AI-like prose patterns",
    suggestion: "Rewrite LLM-flavoured passages — remove superlative-density patterns and add specific nouns, dates, named people.",
    ifApplicable: (o) => (o.key === "ai_probability" && typeof o.raw === "number" && o.raw > 0.4 ? { ...o, raw: 0.15 } : null),
  },
  {
    key: "freshness_days",
    label: "Update the article",
    suggestion: "Add an updated-date stamp with a short revision note. For evergreen content, retimestamp after review.",
    ifApplicable: (o) => (o.key === "freshness_days" && typeof o.raw === "number" && o.raw > 180 ? { ...o, raw: 10 } : null),
  },
];

/**
 * Counterfactual explanations á la Wachter et al. 2018: for each applicable
 * signal, replace its observation with a realistic improved value, re-score,
 * and report the marginal score delta. We surface only the top 3 by |delta|
 * to keep the UI actionable.
 */
export function generateCounterfactuals(
  observations: Observation[],
  model: IRTModel,
  baseScore: number,
  topK: number = 3,
): Counterfactual[] {
  const out: Counterfactual[] = [];
  for (const spec of SPECS) {
    const obs = observations.find((o) => o.key === spec.key);
    if (!obs) continue;
    const replaced = spec.ifApplicable(obs);
    if (!replaced) continue;
    const altObservations = observations.map((o) => (o.key === spec.key ? replaced : o));
    const alt = estimateTheta(altObservations, model);
    const delta = alt.score - baseScore;
    if (Math.abs(delta) < 0.005) continue; // ignore rounding noise
    out.push({
      key: spec.key,
      label: spec.label,
      suggestion: spec.suggestion,
      delta_score: delta,
    });
  }
  return out.sort((a, b) => Math.abs(b.delta_score) - Math.abs(a.delta_score)).slice(0, topK);
}
