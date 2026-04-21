import type { AssessRequest, DomainReputation, PageAssessment, FeedbackRequest } from "@vetly/shared";

export type BgRequest =
  | { kind: "lookupDomains"; domains: string[] }
  | { kind: "assessPage"; body: AssessRequest }
  | { kind: "submitFeedback"; body: FeedbackRequest };

export type BgResponse =
  | { kind: "lookupDomains"; reputations: DomainReputation[] }
  | { kind: "assessPage"; ok: true; assessment: PageAssessment; cached: boolean; quota: { remaining: number } }
  | { kind: "assessPage"; ok: false; error: string; message?: string }
  | { kind: "submitFeedback"; ok: boolean };

export function sendToBackground<T extends BgResponse>(req: BgRequest): Promise<T> {
  return chrome.runtime.sendMessage(req) as Promise<T>;
}
