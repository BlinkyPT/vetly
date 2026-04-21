#!/usr/bin/env bash
# Vetly one-shot bootstrap.
# Prereq: .env.local is filled in with Supabase / AI Gateway / Stripe keys.
# Behaviour:
#   ./scripts/bootstrap.sh dev     — install deps, start the web dev server.
#   ./scripts/bootstrap.sh deploy  — push every .env.local var to Vercel, deploy to production.

set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-dev}"

if [ ! -f .env.local ]; then
  echo "✗ .env.local not found. Copy .env.example to .env.local and fill in the three sections (Supabase / AI Gateway / Stripe)." >&2
  exit 1
fi

echo "→ pnpm install"
pnpm install

if [ "$MODE" = "dev" ]; then
  echo "→ starting web dev server on http://localhost:3000"
  exec pnpm dev:web
fi

if [ "$MODE" = "deploy" ]; then
  echo "→ syncing .env.local to Vercel (production + preview + development)"
  # Strip comments + blank lines, then push each KEY=VALUE.
  while IFS='=' read -r key value; do
    [ -z "$key" ] && continue
    [[ "$key" =~ ^# ]] && continue
    # strip surrounding quotes if any
    value="${value%\"}"
    value="${value#\"}"
    [ -z "$value" ] && continue
    echo "  · $key"
    printf '%s' "$value" | vercel env rm "$key" production --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env rm "$key" preview    --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env rm "$key" development --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$key" production  >/dev/null
    printf '%s' "$value" | vercel env add "$key" preview     >/dev/null
    printf '%s' "$value" | vercel env add "$key" development >/dev/null
  done < <(grep -vE '^(#|$)' .env.local)

  echo "→ vercel deploy --prod"
  vercel deploy --prod
  exit 0
fi

echo "unknown mode: $MODE (use 'dev' or 'deploy')" >&2
exit 1
