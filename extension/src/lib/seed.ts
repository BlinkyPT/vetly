import { buildSeedMap, lookupSeed, STARTER_SEED, type SeedEntry } from "@vetly/shared/seed";
import type { TrustTier } from "@vetly/shared";

// The starter seed ships with the extension. The full ~100k list will be
// loaded from `assets/seed.json` at runtime — this function falls back to the
// starter map if the larger file is missing during dev.
let cached: Map<string, SeedEntry> | null = null;

export async function getSeedMap(): Promise<Map<string, SeedEntry>> {
  if (cached) return cached;
  try {
    const url = chrome.runtime.getURL("assets/seed.json");
    const res = await fetch(url);
    if (res.ok) {
      const entries = (await res.json()) as SeedEntry[];
      cached = buildSeedMap(entries);
      return cached;
    }
  } catch {
    // fall through
  }
  cached = buildSeedMap(STARTER_SEED);
  return cached;
}

export async function lookupDomain(domain: string): Promise<{ tier: TrustTier; source: SeedEntry["source"] | "unknown" }> {
  const map = await getSeedMap();
  const hit = lookupSeed(map, domain);
  return hit ? { tier: hit.tier, source: hit.source } : { tier: "unknown", source: "unknown" };
}
