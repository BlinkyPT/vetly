# Vetly

Chrome extension that signals source trust on Google SERPs. Green/amber/red badge next to every result, click for a methodology panel with every signal.

## Workspaces

- `extension/` — Chrome MV3 extension (Vite + @crxjs/vite-plugin, React 19, Tailwind).
- `web/` — Next.js 16 App Router dashboard + API (Vercel, Fluid Compute).
- `packages/shared/` — shared TypeScript types and Zod schemas.

## Prerequisites

- Node.js 24 LTS
- pnpm 9

## Setup

```bash
pnpm install
cp .env.example .env.local  # fill in fresh Supabase/Stripe/AI Gateway keys
pnpm dev:web                # http://localhost:3000
pnpm dev:extension          # loads unpacked at extension/dist
```

## Architecture

See the build brief. In short:
1. **Fast path** — SERP content script reads result domains, looks them up in a bundled seed (~100k domains), renders the badge instantly.
2. **Deep path** — on clickthrough, a second content script extracts main content via Readability, POSTs to `/api/assess`, which calls Claude Haiku 4.5 via Vercel AI Gateway with a Zod schema and caches by url-hash.
3. **Feedback loop** — users can thumbs up/down any assessment; feedback is weighted into the next re-evaluation of that domain.

## Signal-not-gate

Vetly never hides or removes results. It only annotates. Methodology is transparent: click any badge to see every signal, its value, and its weight.
