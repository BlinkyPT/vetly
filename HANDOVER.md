# Vetly — handover (Phase 2 complete)

## Where we are

**Three commits pushed** to https://github.com/BlinkyPT/vetly:

1. Initial scaffold (donation model, Chrome MV3 extension, Next.js dashboard, Supabase schema, Stripe donations, Vercel AI Gateway).
2. BYOK Option B — privacy-first direct-to-Anthropic mode in the extension.
3. Phase 2 — Vetly-as-a-website: domain browser, public URL assessment, permalinks, methodology, transparency, explore, disputes.

Total code: ~110 files, roughly 4,500 lines.

## What I've already done for you

- GitHub repo created + code pushed.
- Vercel project `aandj/vetly` created + linked to the GitHub repo. Auto-deploys on every push to `main`.
- Monorepo-aware `vercel.ts` at root so Vercel knows the Next.js app is in `web/`.
- Three database migrations in `supabase/migrations/` ready to paste in.
- One-shot bootstrap script at `scripts/bootstrap.sh` that installs deps + syncs env vars to Vercel + deploys.
- Chrome Web Store listing copy.
- Privacy policy.

## What I can't do on your behalf

Three short, copy-paste tasks. Total ~12 minutes:

| | Task | URL |
|---|---|---|
| 1 | Create a fresh Supabase project called `vetly` | https://supabase.com/dashboard |
| 2 | Grab Stripe **test** keys + create a webhook | https://dashboard.stripe.com/test/apikeys |
| 3 | Grab a Vercel AI Gateway API key | https://vercel.com/dashboard → AI |

---

## The 12-minute checklist

### (1) Supabase — ~5 min

1. https://supabase.com/dashboard → **New project** → name `vetly`, region near UK (London), strong DB password saved in 1Password.
2. Wait ~1 min for provisioning.
3. Left sidebar → **SQL Editor** → **+ New query**. Paste and run each of these in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed_domains.sql`
   - `supabase/migrations/0003_public_and_disputes.sql`  ← **new this round**
4. Left sidebar → **Project Settings → API**. Into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (click to reveal) → `SUPABASE_SERVICE_ROLE_KEY`
5. Left sidebar → **Authentication → Providers → Email** → toggle off "Confirm email" for now (re-enable in prod).

### (2) Stripe — ~2 min

1. Make sure top-left toggle says **Test mode**.
2. https://dashboard.stripe.com/test/apikeys → copy **Secret key** (`sk_test_…`) → `.env.local` as `STRIPE_SECRET_KEY`.
3. https://dashboard.stripe.com/test/webhooks → **Add endpoint** → URL: `https://<your-vercel-url>/api/stripe/webhook`. Events: `checkout.session.completed`, `invoice.paid`. (You'll know the real URL after the first deploy; for now put any URL in — we update it after.)
4. Reveal signing secret → copy `whsec_…` → `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### (3) Vercel AI Gateway — ~1 min

1. https://vercel.com/dashboard → **AI** tab → **Get API Key** (or grab an existing one).
2. Paste into `.env.local` as `AI_GATEWAY_API_KEY`.

### (4) Cron + app URL — ~20 sec

```bash
openssl rand -hex 32  # → paste as CRON_SECRET
```

Put `http://localhost:3000` as `NEXT_PUBLIC_APP_URL` for now — update to the Vercel URL after first deploy.

### (Optional 5) Google OAuth — ~3 min, skippable

Email sign-up works without it. If you want Google sign-in, follow the instructions in `.env.example`.

---

## Once `.env.local` is filled

From the repo root:

```bash
./scripts/bootstrap.sh dev      # local dev (http://localhost:3000)
./scripts/bootstrap.sh deploy   # pushes env to Vercel + deploys to prod
```

Then:
- Note the production URL Vercel prints.
- Update `NEXT_PUBLIC_APP_URL` in `.env.local` + Vercel env vars to the production URL.
- Update the Stripe webhook endpoint URL to `https://<prod-url>/api/stripe/webhook`.
- Re-run `./scripts/bootstrap.sh deploy`.

## Installing the extension in Chrome

```bash
pnpm build:extension   # writes to extension/dist
```

Then `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`.

---

## Golden path to walk before calling Phase 2 done

### Extension flow
1. [ ] Sign up on the web app (email or Google).
2. [ ] Install the extension.
3. [ ] Search Google for `ivermectin covid`. Verify green on `nih.gov`, red on `mercola.com`.
4. [ ] Click a badge → methodology panel opens with tier + reason.
5. [ ] Click a result → click Vetly icon in toolbar → "Assess this page". Panel appears with deep signals.
6. [ ] Thumbs-up the assessment → verify it appears on `/dashboard/feedback`.
7. [ ] In extension Options, paste an Anthropic API key → click "Test key" → should say `✓ key works`. Enable BYOK. Repeat step 5 and confirm the request goes direct to Anthropic (check network tab — no `/api/assess` call).

### Website flow (no extension)
8. [ ] Visit `vetly.app/assess` and paste a URL (e.g. `https://www.nytimes.com/2026/…`). Wait for the assessment. Should redirect to `/a/<hash>`.
9. [ ] Share the `/a/<hash>` link — opens with the full signal breakdown.
10. [ ] Visit `/domain/nytimes.com` — see tier, score, recent assessments, dispute history.
11. [ ] Visit `/explore` — see recent and lowest-trust assessments.
12. [ ] Visit `/transparency` — see live stats.
13. [ ] Visit `/methodology` — read through.
14. [ ] File a test dispute at `/disputes?target_kind=domain&target_value=example.com`. Confirm it appears on the Supabase `disputes` table (and on `/domain/example.com`).

### Billing
15. [ ] `/dashboard/support` → $3 one-off → Stripe test card `4242 4242 4242 4242`. Check thank-you banner + donation history.
16. [ ] Same with the monthly tier.

### RLS safety check
17. [ ] Create a second test user. Verify via SQL editor that user A's donations / feedback are not visible to user B.

---

## Chrome Web Store submission

Listing copy is in `extension/CHROME_WEB_STORE_LISTING.md`.

You still need:
- 5 screenshots at 1280×800.
- Promotional tiles (440×280, 920×680, 1400×560).
- Icons at 16/32/48/128 px PNG (generate from `extension/icons/icon.svg`).
- A Chrome Web Store developer account ($5 one-off).

Submit at https://chrome.google.com/webstore/devconsole.

---

## Architecture summary (for future you)

```
vetly/
├── extension/                     Chrome MV3 extension
│   ├── src/content/               Content scripts (SERP + clickthrough)
│   ├── src/background/            Service worker (API calls, BYOK branching)
│   └── src/options/               Settings page (BYOK UI + allow/deny)
├── web/                           Next.js 16 App Router
│   └── src/app/
│       ├── (public)               /, /assess, /domain, /a/[hash], /methodology,
│       │                          /transparency, /explore, /disputes, /privacy
│       ├── dashboard/             /dashboard/{,feedback,support,settings} (auth-gated)
│       ├── api/
│       │   ├── assess/            Server-side deep assessment (extension path)
│       │   ├── assess-url/        Server-side deep assessment (public website path)
│       │   ├── cache-lookup/      Hash-only cache check (BYOK)
│       │   ├── cache-contribute/  BYOK result contribution
│       │   ├── domain-reputation/ Batch domain lookup (extension SERP path)
│       │   ├── disputes/          Dispute submission
│       │   ├── feedback/          Thumbs up/down
│       │   ├── stripe/            Checkout + portal + webhook
│       │   └── cron/              Refresh domains daily
│       └── auth/                  Sign in / sign up / callback
├── packages/shared/               Isomorphic — imported by extension + web
│   └── src/
│       ├── index.ts               Zod schemas, types, constants
│       ├── scoring.ts             Signal weights → score (pure)
│       ├── heuristics.ts          Extract heuristic signals (pure)
│       ├── url-hash.ts            Canonicalise + SHA-256 (Web Crypto)
│       ├── byok.ts                Direct-to-Anthropic + tool-use schema
│       └── seed.ts                Starter seed of ~50 well-known domains
├── supabase/migrations/           0001_init, 0002_seed_domains, 0003_public_and_disputes
├── scripts/
│   ├── bootstrap.sh               pnpm install + env sync + deploy
│   └── import-seed-domains.mjs    Full ~100k domain seed importer (one-off)
└── vercel.ts                      Monorepo-aware root config
```

## Notes on decisions I made autonomously

- **Anonymous users can use the website** — no login required for `/assess`, `/domain/*`, `/a/*`, etc. An IP-prefix-based quota prevents abuse (signed-in users get a personal quota).
- **Public reads on `domain_reputations` and `page_assessments`** — they're the data the website is for; the previous "deny-all" policies were appropriate when only the extension read them via our API.
- **Transparency page uses a `public_stats` SQL view** — live reads, no manual numbers. LLM cost estimate is hand-tuned to ~$0.002/call; will recalibrate with real billing.
- **Disputes are public by design** — grounds + status + target are visible; submitter name/email are not. The resolution gets published on the target's domain page.
- **USD currency** throughout (Stripe amounts). Flip to GBP in `web/src/app/api/stripe/checkout/route.ts` if you'd prefer.
- **Anti-abuse cap stays at 50/day/device** even after Phase 2. BYOK users are uncapped.
