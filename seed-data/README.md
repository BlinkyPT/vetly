# Seed data

`domains.tsv` is a tab-separated list of `domain<TAB>tier` where tier ∈ {high, medium, low}.

The full ~100k-domain seed is not checked into git (too big for sensible diffs). Generate it by running:

```bash
node scripts/build-seed.mjs  # combines MBFC + Wikipedia reliable-sources + spam lists
```

and then import into Supabase with:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-seed-domains.mjs
```

Sources:
- **MediaBiasFactCheck** — publicly downloadable ratings used for high / medium / low classification of news and opinion sources.
- **Wikipedia WP:RSP (Perennial Sources list)** — community consensus on source reliability.
- **Known spam and SEO farm lists** — from OpenDNS, public anti-phishing lists, and academic SEO-spam corpora.

All sources are attributed on the Vetly methodology page.
