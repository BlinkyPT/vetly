import { createHash } from "node:crypto";

/**
 * Normalise a URL for caching. We intentionally keep the path + search
 * but strip common tracking parameters so two users arriving at the same
 * article via different referrals share a cache entry.
 */
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "mc_cid", "mc_eid", "_ga", "ref", "referer", "source",
]);

export function normaliseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const p of Array.from(u.searchParams.keys())) {
      if (TRACKING_PARAMS.has(p.toLowerCase())) u.searchParams.delete(p);
    }
    u.host = u.host.toLowerCase();
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function hashUrl(url: string): string {
  const normalised = normaliseUrl(url);
  return createHash("sha256").update(normalised).digest("hex");
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
