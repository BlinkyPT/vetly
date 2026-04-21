/**
 * Content script: Google SERP.
 * Runs on document_idle on supported google TLDs. Detects organic result
 * blocks, looks up each domain in the bundled seed, renders a badge.
 * Unknown domains are batched and posted to /api/domain-reputation.
 */
import { detectResults, type DetectedResult } from "./serp-detect";
import { mountBadge, type BadgeHost } from "./badge";
import { lookupDomain } from "@/lib/seed";
import { sendToBackground } from "@/lib/messaging";
import { openMethodologyPanel } from "./methodology-panel";
import type { TrustTier } from "@vetly/shared";

const annotated = new WeakSet<HTMLElement>();
const badgesByDomain = new Map<string, BadgeHost[]>();

function reasonFor(tier: TrustTier, source: string): string {
  switch (tier) {
    case "high":    return source === "mbfc" ? "Known high-trust publisher (MBFC)." : "Recognised authoritative source.";
    case "medium":  return "Mixed or user-generated content — verify with other sources.";
    case "low":     return "Known low-trust source — treat with scepticism.";
    case "unknown": return "Not in our seed list — running live check.";
  }
}

async function annotate(result: DetectedResult) {
  if (annotated.has(result.container)) return;
  annotated.add(result.container);

  const { tier, source } = await lookupDomain(result.domain);
  const reason = reasonFor(tier, source);

  // On SERP we only show the bundled-tier reason. Deep assessment happens on the
  // actual destination page via the action popup — we can't extract article text
  // from here because we're still on google.com.
  const badge = mountBadge(result.titleEl, {
    tier,
    reason,
    onClick: () => openMethodologyPanel({
      url: result.url,
      domain: result.domain,
      tier,
      seedReason: reason,
      // No onRequestDeepAssessment / onFeedback on the SERP panel by design.
    }),
  });

  const arr = badgesByDomain.get(result.domain) ?? [];
  arr.push(badge);
  badgesByDomain.set(result.domain, arr);
}

async function refreshUnknown(results: DetectedResult[]) {
  const unknowns = new Set<string>();
  for (const r of results) {
    const { tier } = await lookupDomain(r.domain);
    if (tier === "unknown") unknowns.add(r.domain);
  }
  if (unknowns.size === 0) return;
  const res = await sendToBackground<{ kind: "lookupDomains"; reputations: Array<{ domain: string; tier: TrustTier }> }>({
    kind: "lookupDomains",
    domains: [...unknowns],
  });
  for (const r of res.reputations) {
    const arr = badgesByDomain.get(r.domain);
    if (!arr) continue;
    for (const b of arr) {
      b.update({ tier: r.tier, reason: reasonFor(r.tier, "api"), onClick: () => {} });
    }
  }
}

async function run() {
  const results = detectResults();
  for (const r of results) await annotate(r);
  await refreshUnknown(results);
}

// Initial pass.
run();

// Google swaps DOM under our feet when users page through results (SPA-ish navigation).
const mo = new MutationObserver(() => {
  // Debounce.
  (window as any).__vetlyRaf && cancelAnimationFrame((window as any).__vetlyRaf);
  (window as any).__vetlyRaf = requestAnimationFrame(run);
});
mo.observe(document.body, { childList: true, subtree: true });
