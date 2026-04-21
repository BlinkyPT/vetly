/**
 * Isomorphic URL canonicalisation + hashing. Uses the Web Crypto API
 * (available on Node 20+ and in every modern browser) so the extension
 * and the server produce identical hashes for the same canonical URL.
 */

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "mc_cid", "mc_eid", "_ga", "ref", "referer", "source",
  "msclkid", "yclid", "vero_id", "__hstc", "__hssc", "_hsenc", "hsCtaTracking",
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

export async function hashUrl(url: string): Promise<string> {
  const canonical = normaliseUrl(url);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
