# Vetly — handover checklist

The code is complete and in place. The remaining work is **provisioning** — it can't be done without you because it requires account creation and pasting credentials.

## 1. Credentials I need you to create (fresh accounts, per your isolation rule)

| Service | What I need | Where to create it |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | https://supabase.com — new project called `vetly` |
| Vercel | Project linked to a fresh GitHub repo; `AI_GATEWAY_API_KEY` from Vercel AI Gateway | https://vercel.com — new project called `vetly` |
| GitHub | New repo called `vetly` | https://github.com/new |
| Stripe (test mode) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO` | https://dashboard.stripe.com — new account or org, test keys only |
| Google OAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console → OAuth consent + credentials |

Paste them into `.env.local` (copied from `.env.example`). The app will read from there in dev.

## 2. Install + run locally

```bash
cd /Users/jorgecampos/Desktop/Coding/vetly
pnpm install
cp .env.example .env.local   # fill in credentials from step 1
pnpm dev:web                 # http://localhost:3000
pnpm dev:extension           # load extension/dist unpacked in Chrome
```

To install the unpacked extension in Chrome:
1. Open `chrome://extensions`.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** → select `extension/dist`.

## 3. Apply the Supabase schema

Either via the Supabase CLI (`supabase db push`) from the `supabase/` directory, or by pasting the contents of `supabase/migrations/0001_init.sql` and `0002_seed_domains.sql` into the SQL editor in the Supabase dashboard.

## 4. Configure Stripe

1. In Stripe (test mode): create a Product called "Vetly Pro", add a recurring price of $4.99/month. Copy the `price_...` ID into `STRIPE_PRICE_ID_PRO`.
2. Set up the webhook: `https://vetly.app/api/stripe/webhook` (or the preview URL) with events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 5. Deploy

```bash
vercel link            # link to the new Vercel project
vercel env pull        # pull env vars down for local
vercel deploy --prod   # first production deploy
```

`vercel.ts` in `web/` is already set up; the build command is `pnpm --filter @vetly/web build`.

## 6. Golden path to verify

Do this yourself before declaring the MVP done (per your definition of done):

1. [ ] Create an account at https://vetly.app/auth/sign-up.
2. [ ] Install the extension from `extension/dist`.
3. [ ] Run a Google search for something topical (e.g. "ivermectin covid"). Verify:
   - [ ] Green badges next to `nih.gov`, `nejm.org`.
   - [ ] Red badges next to `naturalnews.com`, `mercola.com`.
   - [ ] Amber badges next to `medium.com`, `reddit.com`.
4. [ ] Click a badge. Methodology panel opens with signals. Close it.
5. [ ] Click a result. On the landing page, open the Vetly popup → "Assess this page". Panel returns with AI-probability, citations, byline, etc.
6. [ ] Thumbs-up the assessment. Go to `/dashboard/feedback` — it should appear.
7. [ ] Hit the free-tier limit (11 deep assessments). The next one should return 402 and push you to `/dashboard/subscription`.
8. [ ] Upgrade with Stripe test card `4242 4242 4242 4242`. Deep assessment now works.
9. [ ] Create a second test user. Verify via the SQL editor that user A's `user_feedback` rows are not visible to user B (RLS check).
10. [ ] Screenshot the SERP with badges. Save to `extension/screenshots/`.

## 7. Submit to the Chrome Web Store

The listing copy is in `extension/CHROME_WEB_STORE_LISTING.md`. You still need:
- Screenshots (5x 1280×800)
- Promotional tiles (440×280 small, 920×680 large, 1400×560 marquee)
- The final icon PNGs (16/32/48/128) generated from `extension/icons/icon.svg`
- A Chrome Web Store developer account ($5 one-off)

Submit from https://chrome.google.com/webstore/devconsole.

---

## Notes on decisions the brief left implicit

- **Cron auth**: `/api/cron/refresh-domains` checks `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in Vercel env vars so the daily cron (configured in `web/vercel.ts`) is protected.
- **AI Gateway model**: I used `anthropic/claude-haiku-4-5` as a plain provider/model string per your brief. Volume is high so Haiku keeps cost down; swap to Sonnet only for manual re-evaluation of disputed domains.
- **Domain-reputation live computation**: The MVP's `/api/domain-reputation` returns `unknown` for uncached domains and writes a stub row so the daily cron can enrich it. A full WHOIS + cert pipeline is a follow-up — the signal interfaces are already in place, so it slots in cleanly.
- **Extension icon PNGs**: the SVG master is at `extension/icons/icon.svg`. You need to generate 16/32/48/128 px PNGs before first load; Chrome tolerates the missing files in dev but the build will warn.
