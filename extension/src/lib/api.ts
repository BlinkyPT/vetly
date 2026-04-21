import type { AssessRequest, DomainReputation, PageAssessment, FeedbackRequest } from "@vetly/shared";
import { getDeviceId } from "./device-id";

const API = __VETLY_API_URL__;

async function headers(): Promise<HeadersInit> {
  const deviceId = await getDeviceId();
  return {
    "Content-Type": "application/json",
    "X-Vetly-Device-Id": deviceId,
  };
}

export async function fetchDomainReputations(domains: string[]): Promise<DomainReputation[]> {
  const res = await fetch(`${API}/api/domain-reputation`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify({ domains }),
  });
  if (!res.ok) throw new Error(`domain-reputation ${res.status}`);
  const data = (await res.json()) as { reputations: DomainReputation[] };
  return data.reputations;
}

export async function fetchPageAssessment(
  body: AssessRequest,
): Promise<
  | { ok: true; assessment: PageAssessment; cached: boolean; quota: { remaining: number } }
  | { ok: false; error: string; message?: string }
> {
  const res = await fetch(`${API}/api/assess`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    const body = await res.json();
    return { ok: false, error: "rate_limited", message: body.message };
  }
  if (!res.ok) return { ok: false, error: `assess_${res.status}` };
  const data = await res.json();
  return { ok: true, ...data };
}

export async function submitFeedback(body: FeedbackRequest): Promise<boolean> {
  const res = await fetch(`${API}/api/feedback`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(body),
  });
  return res.ok;
}
