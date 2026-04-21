import type { BgRequest, BgResponse } from "@/lib/messaging";
import { fetchDomainReputations, fetchPageAssessment, submitFeedback } from "@/lib/api";
import { getDeviceId } from "@/lib/device-id";

chrome.runtime.onInstalled.addListener(async () => {
  await getDeviceId();
});

chrome.runtime.onMessage.addListener((req: BgRequest, _sender, sendResponse) => {
  (async () => {
    try {
      if (req.kind === "lookupDomains") {
        const reps = await fetchDomainReputations(req.domains);
        sendResponse({ kind: "lookupDomains", reputations: reps } satisfies BgResponse);
        return;
      }
      if (req.kind === "assessPage") {
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
  return true; // keep the message channel open for the async sendResponse
});
