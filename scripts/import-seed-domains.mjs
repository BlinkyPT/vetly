#!/usr/bin/env node
/**
 * One-off migration: import a large seed list into the `domain_reputations`
 * table. Reads ./seed-data/domains.tsv where each row is `domain<TAB>tier`.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-seed-domains.mjs
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const TIER_SCORE = { high: 0.85, medium: 0.55, low: 0.25, unknown: 0.5 };

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const raw = await readFile(new URL("../seed-data/domains.tsv", import.meta.url), "utf8");
const rows = raw.split("\n").map((l) => l.trim()).filter(Boolean);

const BATCH = 1_000;
let total = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH).map((line) => {
    const [domain, tier] = line.split("\t");
    return {
      domain: domain.toLowerCase(),
      tier,
      score: TIER_SCORE[tier] ?? 0.5,
      signals: {},
      source: "bundled_seed",
      last_assessed: new Date().toISOString(),
    };
  });
  const { error } = await supabase.from("domain_reputations").upsert(chunk, { onConflict: "domain" });
  if (error) { console.error(error); process.exit(1); }
  total += chunk.length;
  process.stdout.write(`\rImported ${total}/${rows.length}`);
}
console.log("\nDone.");
