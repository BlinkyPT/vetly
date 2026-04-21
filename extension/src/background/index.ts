import type { BgRequest, BgResponse } from "@/lib/messaging";
import { fetchDomainReputations, fetchPageAssessment, submitFeedback } from "@/lib/api";
import { getDeviceId } from "@/lib/device-id";
import { getByokSettings } from "@/lib/byok";
import { lookupDomain } from "@/lib/seed";
import { hashUrl, extractDomain, normaliseUrl } from "@vetly/shared/url-hash";
import { computeHeuristics } from "@vetly/shared/heuristics";
import { scorePage } from "@vetly/shared/scoring";
import { estimateTheta, observationsFromSignals, type IRTModel } from "@vetly/shared/irt";
import { generateCounterfactuals } from "@vetly/shared/counterfactuals";
import irtParamsV01 from "@vetly/shared/irt-params" with { type: "json" };
import { classifyWithUserKey } from "@vetly/shared/byok";
import type { PageAssessment, AssessRequest, FacetKey } from "@vetly/shared";

const IRT_MODEL = irtParamsV01 as unknown as IRTModel;

const API = __VETLY_API_URL__;

chrome.runtime.onInstalled.addListener(async () => {
  await getDeviceId();
});

/**
 * BYOK deep-assessment path. Runs entirely in the extension — page content
 * never touches our server. Checks the shared cache first by URL hash only
 * (no content leaves the browser until we call Anthropic).
 */
async function byokAssess(req: AssessRequest): Promise<
  | { kind: "assessPage"; ok: true; assessment: PageAssessment; cached: boolean; quota: { remaining: number } }
  | { kind: "assessPage"; ok: false; error: string; message?: string }
> {
  const settings = await getByokSettings();
  const urlHash = await hashUrl(req.url);

  // 1. Cache-lookup by hash only.
  try {
    const lookup = await fetch(`${API}/api/cache-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url_hash: urlHash }),
    });
    if (lookup.ok) {
      const data = await lookup.json();
      if (data.hit && data.assessment) {
        return { kind: "assessPage", ok: true, assessment: data.assessment, cached: true, quota: { remaining: Infinity } };
      }
    }
  } catch {
    // Cache miss network error is non-fatal — fall through to LLM call.
  }

  // 2. LLM call direct to Anthropic with the user's key.
  let llm;
  try {
    llm = await classifyWithUserKey({
      apiKey: settings.apiKey,
      model: settings.model,
      url: req.url,
      title: req.title,
      content: req.content,
    });
  } catch (err) {
    return { kind: "assessPage", ok: false, error: "byok_llm_failed", message: (err as Error).message };
  }

  // 3. Heuristic signals: domain tier from bundled seed (no network), rest derived from request body.
  const domain = extractDomain(req.url) ?? "";
  const { tier: bundledTier } = await lookupDomain(domain);
  const heuristic = computeHeuristics(req, bundledTier);

  // 4. Scoring, purely local.
  const { weighted_signals } = scorePage(heuristic, llm, req.word_count);
  const observations = observationsFromSignals(heuristic, llm, req.word_count);
  const irt = estimateTheta(observations, IRT_MODEL);
  const counterfactuals = generateCounterfactuals(observations, IRT_MODEL, irt.score);

  const assessment: PageAssessment = {
    url: normaliseUrl(req.url),
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

  // 5. Optional: contribute back to the shared cache (opt-in).
  if (settings.contributeToSharedCache) {
    fetch(`${API}/api/cache-contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment),
    }).catch(() => { /* best-effort */ });
  }

  return { kind: "assessPage", ok: true, assessment, cached: false, quota: { remaining: Infinity } };
}

chrome.runtime.onMessage.addListener((req: BgRequest, _sender, sendResponse) => {
  (async () => {
    try {
      if (req.kind === "lookupDomains") {
        const reps = await fetchDomainReputations(req.domains);
        sendResponse({ kind: "lookupDomains", reputations: reps } satisfies BgResponse);
        return;
      }
      if (req.kind === "assessPage") {
        const settings = await getByokSettings();
        if (settings.enabled && settings.apiKey) {
          const res = await byokAssess(req.body);
          sendResponse(res);
          return;
        }
        const result = await fetchPageAssessment(req.body);
        if (result.ok) {
          sendResponse({ kind: "assessPage", ok: true, assessment: result.assessment, cached: result.cached, quota: result.quota } satisfies BgResponse);
        } else {
          sendResponse({ kind: "assessPage", ok: false, error: result.error, message: result.message } satisfies BgResponse);
        }
        return;
      }
      if (req.kind === "submitFeedback") {
        const ok = await submitFeedback(req.body);
        sendResponse({ kind: "submitFeedback", ok } satisfies BgResponse);
        return;
      }
    } catch (err) {
      sendResponse({ kind: "assessPage", ok: false, error: (err as Error).message });
    }
  })();
  return true;
});
