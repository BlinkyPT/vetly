# Vetly — handover (donation model)

## What I've already done for you

- **Code**: full scaffold, 80 files — monorepo, Chrome MV3 extension with shadow-DOM badge injection, Next.js 16 web app, Supabase schema + RLS, Stripe donation checkout, Vercel AI Gateway integration, Chrome Web Store listing copy, privacy policy.
- **GitHub**: repo created at https://github.com/BlinkyPT/vetly, two commits pushed.
- **Vercel**: project `aandj/vetly` created and linked to the GitHub repo. Auto-deploys on every push to `main`. Root-level `vercel.ts` tells it this is a monorepo with the Next.js app in `web/`.
- **Donation pivot**: no paid tier. All features free. Stripe Checkout now runs in one-off `payment` mode (default) or `subscription` mode for monthly supporters — but nothing is gated behind payment. Rate limit of 50 deep assessments/day per device is a cost-protection measure, not a paywall.

## What I can't do on your behalf (and why)

Three things genuinely require you, not code, to sign off on:

| | What I need | Why I can't do it |
|---|---|---|
| 1 | A fresh **Supabase project** called `vetly` | Needs you clicking "New project" in your Supabase dashboard; project-creation API keys are scoped to you, not me. |
| 2 | A **Stripe test secret key** + **webhook signing secret** | Stripe requires legal identity verification on the account owner — not bypassable. |
| 3 | A **Vercel AI Gateway API key** | Personal key, scoped to your Vercel account. |

Optional: **Google OAuth** (only if you want Google sign-in as well as email). Email sign-up works without it.

Your total clicking: **about 10 minutes**, all copy-paste.

---

## The 10-minute checklist

### (1) Supabase — ~4 min

1. Go to https://supabase.com/dashboard.
2. Click **New project**. Name it `vetly`. Pick any region near the UK (e.g. London). Set a strong DB password and save it in 1Password.
3. Wait ~1 min for the project to provision.
4. In the left sidebar: **SQL Editor** → **+ New query**.
5. Open `supabase/migrations/0001_init.sql` from this repo, copy the whole file, paste it into the SQL editor, click **Run**. Repeat with `0002_seed_domains.sql`.
6. Left sidebar: **Project Settings → API**. Copy three values into `.env.local` (see section below):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon / public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key (click to reveal) → `SUPABASE_SERVICE_ROLE_KEY`
7. Left sidebar: **Authentication → Providers → Email**. Toggle off "Confirm email" for dev ease (you can re-enable later).

### (2) Vercel AI Gateway — ~1 min

1. Go to https://vercel.com/dashboard → **AI** tab in the top nav.
2. Click **Get API Key** (or use an existing one scoped to vetly).
3. Copy the key into `.env.local` as `AI_GATEWAY_API_KEY`.

### (3) Stripe test keys — ~2 min

1. Go to https://dashboard.stripe.com/test/apikeys (make sure the top-left toggle says **Test mode**).
2. Copy the **Secret key** (`sk_test_…`) into `.env.local` as `STRIPE_SECRET_KEY`.
3. For the webhook, go to https://dashboard.stripe.com/test/webhooks → **Add endpoint**. Endpoint URL: `https://vetly.vercel.app/api/stripe/webhook` (or whatever Vercel gives you after first deploy — come back and update this). Events to send: `checkout.session.completed`, `invoice.paid`.
4. After creating: click **Reveal signing secret** → copy `whsec_…` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### (4) Cron secret — 10 sec

Generate any random string:
```
openssl rand -hex 32
```
Paste it into `.env.local` as `CRON_SECRET`. Vercel Cron will send this as a Bearer token to `/api/cron/refresh-domains`.

### (5) App URL — 10 sec

Once Vercel has given you a URL, put it in `.env.local` as `NEXT_PUBLIC_APP_URL`. For now, `http://localhost:3000` is fine — we update to the Vercel URL after first deploy.

### (Optional 6) Google OAuth — ~3 min, skippable

If you want Google sign-in in addition to email:
1. https://console.cloud.google.com → new project `vetly` → **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. Application type: **Web application**. Authorised redirect URIs: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`.
3. Copy the client ID + client secret.
4. Back in Supabase → **Authentication → Providers → Google** → paste both + enable.

---

## Once `.env.local` is filled in

Run the bootstrap. From the repo root:

```bash
# Local dev
./scripts/bootstrap.sh dev
# → installs deps, starts http://localhost:3000

# Production deploy
./scripts/bootstrap.sh deploy
# → uploads every var in .env.local to Vercel (prod + preview + dev)
# → runs `vercel deploy --prod`
```

Give me the production URL when the first deploy finishes and I'll update `NEXT_PUBLIC_APP_URL` + the Stripe webhook endpoint URL.

---

## Installing the extension in Chrome

```bash
pnpm build:extension
# → writes to extension/dist
```

Then:
1. Chrome → `chrome://extensions`
2. Toggle **Developer mode** top-right.
3. **Load unpacked** → select `extension/dist`.
4. Pin the Vetly icon to the toolbar.
5. Open https://www.google.com/search?q=ivermectin+covid. You should see green badges on `nih.gov`, red badges on `mercola.com`.

---

## Golden path to walk before calling it done

1. [ ] Sign up on the web app. Complete email flow.
2. [ ] Install the extension. Search `ivermectin covid` — verify badges.
3. [ ] Click a badge. Methodology panel opens with tier + reason.
4. [ ] Click through to an article. Click Vetly toolbar icon → "Assess this page". Panel appears on that page with deep signals (AI-probability, citations, byline, freshness).
5. [ ] Thumbs-up the assessment. Go to `/dashboard/feedback` on the web app — it should appear.
6. [ ] Go to `/dashboard/support`. Donate $3 with Stripe test card `4242 4242 4242 4242`. Check that the thank-you banner shows and your donation appears in the history.
7. [ ] Sign out, sign in as a second test user. Verify via Supabase SQL editor that the first user's donations and feedback are not visible (RLS check).
8. [ ] Screenshot the SERP with badges. Save to `extension/screenshots/` for the Chrome Web Store listing.

## Chrome Web Store submission

The listing copy is in `extension/CHROME_WEB_STORE_LISTING.md` (already updated to reflect the donation model). You still need:
- 5 screenshots at 1280×800.
- A small promotional tile (440×280), large tile (920×680), and marquee (1400×560).
- PNG icons at 16/32/48/128 px (generate from `extension/icons/icon.svg`).
- A Chrome Web Store developer account ($5 one-off).

Submit at https://chrome.google.com/webstore/devconsole.

---

## Notes on decisions I had to make

- **Stripe amounts** are in **USD** (cents) because Stripe AI Gateway suggested USD for global reach. If you'd rather quote in GBP, change `currency: "usd"` in `web/src/app/api/stripe/checkout/route.ts` — it's a two-line change.
- **50 deep assessments per day per device** as the anti-abuse cap. Generous for individual users; tight enough that a scraper can't blow the LLM budget overnight. Edit `ANTI_ABUSE_LIMITS` in `packages/shared/src/index.ts` if it's ever wrong.
- **No Pro-tier custom allow/deny lists**: everyone gets them. The options page already has the UI.
- **Suggested donation amounts**: $3, $7, $20 (one-off); $3, $5, $10/mo (monthly). All pulled from `SUGGESTED_DONATION_AMOUNTS_CENTS` in shared.
