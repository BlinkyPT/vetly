import type { TrustTier } from "./index.js";

/**
 * Starter seed. The full ~100k-domain seed is loaded from a JSON file
 * bundled into the extension at build time. This exports the shape + a
 * starter list of well-known domains as a fallback.
 *
 * Sources (documented for methodology panel):
 * - MediaBiasFactCheck public ratings
 * - Wikipedia "reliable sources" perennial list
 * - Known content-farm and SEO-spam domain lists (public)
 */
export type SeedEntry = {
  domain: string;
  tier: TrustTier;
  source: "mbfc" | "wikipedia" | "community_spam_list" | "manual";
  note?: string;
};

export const STARTER_SEED: SeedEntry[] = [
  { domain: "nytimes.com", tier: "high", source: "mbfc" },
  { domain: "washingtonpost.com", tier: "high", source: "mbfc" },
  { domain: "bbc.co.uk", tier: "high", source: "mbfc" },
  { domain: "bbc.com", tier: "high", source: "mbfc" },
  { domain: "theguardian.com", tier: "high", source: "mbfc" },
  { domain: "reuters.com", tier: "high", source: "mbfc" },
  { domain: "apnews.com", tier: "high", source: "mbfc" },
  { domain: "ft.com", tier: "high", source: "mbfc" },
  { domain: "economist.com", tier: "high", source: "mbfc" },
  { domain: "nature.com", tier: "high", source: "wikipedia" },
  { domain: "science.org", tier: "high", source: "wikipedia" },
  { domain: "nejm.org", tier: "high", source: "wikipedia" },
  { domain: "thelancet.com", tier: "high", source: "wikipedia" },
  { domain: "bmj.com", tier: "high", source: "wikipedia" },
  { domain: "jamanetwork.com", tier: "high", source: "wikipedia" },
  { domain: "cell.com", tier: "high", source: "wikipedia" },
  { domain: "pnas.org", tier: "high", source: "wikipedia" },
  { domain: "pubmed.ncbi.nlm.nih.gov", tier: "high", source: "wikipedia" },
  { domain: "nih.gov", tier: "high", source: "manual" },
  { domain: "cdc.gov", tier: "high", source: "manual" },
  { domain: "who.int", tier: "high", source: "manual" },
  { domain: "nhs.uk", tier: "high", source: "manual" },
  { domain: "mayoclinic.org", tier: "high", source: "manual" },
  { domain: "clevelandclinic.org", tier: "high", source: "manual" },
  { domain: "gov.uk", tier: "high", source: "manual" },
  { domain: "europa.eu", tier: "high", source: "manual" },
  { domain: "wikipedia.org", tier: "high", source: "manual" },
  { domain: "en.wikipedia.org", tier: "high", source: "manual" },
  { domain: "stanford.edu", tier: "high", source: "manual" },
  { domain: "mit.edu", tier: "high", source: "manual" },
  { domain: "harvard.edu", tier: "high", source: "manual" },
  { domain: "ox.ac.uk", tier: "high", source: "manual" },
  { domain: "cam.ac.uk", tier: "high", source: "manual" },
  { domain: "ucl.ac.uk", tier: "high", source: "manual" },

  { domain: "cnn.com", tier: "medium", source: "mbfc" },
  { domain: "foxnews.com", tier: "medium", source: "mbfc" },
  { domain: "msnbc.com", tier: "medium", source: "mbfc" },
  { domain: "nypost.com", tier: "medium", source: "mbfc" },
  { domain: "dailymail.co.uk", tier: "medium", source: "mbfc" },
  { domain: "thesun.co.uk", tier: "medium", source: "mbfc" },
  { domain: "huffpost.com", tier: "medium", source: "mbfc" },
  { domain: "buzzfeednews.com", tier: "medium", source: "mbfc" },
  { domain: "medium.com", tier: "medium", source: "manual", note: "User-generated; treat as medium by default." },
  { domain: "substack.com", tier: "medium", source: "manual", note: "User-generated newsletter platform." },
  { domain: "reddit.com", tier: "medium", source: "manual", note: "User-generated; context-dependent." },
  { domain: "quora.com", tier: "medium", source: "manual", note: "User-generated Q&A." },
  { domain: "stackoverflow.com", tier: "medium", source: "manual", note: "User-generated but moderated." },

  { domain: "infowars.com", tier: "low", source: "mbfc" },
  { domain: "breitbart.com", tier: "low", source: "mbfc" },
  { domain: "naturalnews.com", tier: "low", source: "mbfc" },
  { domain: "zerohedge.com", tier: "low", source: "mbfc" },
  { domain: "dailycaller.com", tier: "low", source: "mbfc" },
  { domain: "rt.com", tier: "low", source: "mbfc" },
  { domain: "sputniknews.com", tier: "low", source: "mbfc" },
  { domain: "theepochtimes.com", tier: "low", source: "mbfc" },
  { domain: "mercola.com", tier: "low", source: "mbfc", note: "Known health misinformation." },
  { domain: "healthline.com", tier: "medium", source: "manual", note: "Commercial health content." },
];

export function buildSeedMap(entries: SeedEntry[] = STARTER_SEED): Map<string, SeedEntry> {
  const map = new Map<string, SeedEntry>();
  for (const entry of entries) {
    map.set(entry.domain.toLowerCase(), entry);
  }
  return map;
}

export function lookupSeed(map: Map<string, SeedEntry>, domain: string): SeedEntry | null {
  const host = domain.toLowerCase();
  const direct = map.get(host);
  if (direct) return direct;
  const parts = host.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join(".");
    const hit = map.get(suffix);
    if (hit) return hit;
  }
  return null;
}
