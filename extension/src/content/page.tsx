/**
 * Content script: clickthrough deep-assessment.
 * Runs on any non-Google page at document_idle. Listens for an `extractAndAssess`
 * message from the popup. Extracts main content with Mozilla Readability in-page,
 * asks the background worker to POST to /api/assess, then opens the methodology
 * panel on this page with the full deep-assessment signals.
 */
import { Readability } from "@mozilla/readability";
import { sendToBackground } from "@/lib/messaging";
import { openMethodologyPanel } from "./methodology-panel";
import type { AssessRequest, TrustTier } from "@vetly/shared";

function extract(): AssessRequest | null {
  try {
    const cloned = document.cloneNode(true) as Document;
    const parsed = new Readability(cloned).parse();
    if (!parsed || !parsed.textContent) return null;

    const doc = document;
    const published = doc.querySelector<HTMLMetaElement>("meta[property='article:published_time']")?.content
                  ?? doc.querySelector<HTMLMetaElement>("meta[name='pubdate']")?.content
                  ?? doc.querySelector<HTMLMetaElement>("meta[name='date']")?.content
                  ?? null;
    const author = doc.querySelector<HTMLMetaElement>("meta[name='author']")?.content
                ?? parsed.byline
                ?? null;

    const adCount = doc.querySelectorAll("[id^='google_ads'], ins.adsbygoogle, [data-ad-slot], iframe[src*='doubleclick']").length;
    const outlinks: string[] = [];
    for (const a of doc.querySelectorAll<HTMLAnchorElement>("article a[href^='http'], main a[href^='http']")) {
      try {
        const u = new URL(a.href);
        if (u.hostname !== location.hostname) outlinks.push(u.toString());
      } catch { /* ignore */ }
    }

    const text = parsed.textContent.trim().replace(/\s+/g, " ");
    const wordCount = text.split(" ").filter(Boolean).length;

    return {
      url: location.href,
      title: parsed.title ?? document.title,
      content: text.slice(0, 50_000),
      published_at: published,
      author,
      outlinks: outlinks.slice(0, 40),
      ad_slot_count: adCount,
      word_count: wordCount,
    };
  } catch {
    return null;
  }
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

async function runAssessment() {
  const body = extract();
  if (!body) {
    openErrorPanel("Couldn't find readable article content on this page.");
    return;
  }
  if (body.word_count < 80) {
    openErrorPanel("Page is too short to assess meaningfully.");
    return;
  }

  // Placeholder panel while we wait.
  openPendingPanel(body.url);

  const res = await sendToBackground<
    | { kind: "assessPage"; ok: true; assessment: any; cached: boolean; quota: { remaining: number } }
    | { kind: "assessPage"; ok: false; error: string; message?: string }
  >({ kind: "assessPage", body });

  if (!res.ok) {
    if (res.error === "rate_limited") {
      openErrorPanel(res.message ?? "You've hit today's deep-assessment cap. Resets at midnight UTC. Vetly is free — this is an anti-abuse limit, not a paywall.");
    } else {
      openErrorPanel(`Assessment failed: ${res.error}`);
    }
    return;
  }

  openMethodologyPanel({
    url: res.assessment.url,
    domain: domainOf(res.assessment.url),
    tier: res.assessment.tier as TrustTier,
    seedReason: `Deep assessment ${res.cached ? "(cached)" : ""} — score ${Math.round(res.assessment.score * 100)}/100.`,
    assessment: res.assessment,
    onFeedback: async (thumbs, notes) => {
      await sendToBackground({
        kind: "submitFeedback",
        body: { url_hash: res.assessment.url_hash, thumbs, notes },
      });
    },
  });
}

function openPendingPanel(url: string) {
  openMethodologyPanel({
    url,
    domain: domainOf(url),
    tier: "unknown",
    seedReason: "Running deep assessment…",
  });
}

function openErrorPanel(msg: string) {
  openMethodologyPanel({
    url: location.href,
    domain: domainOf(location.href),
    tier: "unknown",
    seedReason: msg,
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === "extractAndAssess") {
    runAssessment();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
