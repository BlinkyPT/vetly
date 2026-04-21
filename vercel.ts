import { type VercelConfig } from "@vercel/config/v1";

/**
 * Root-level Vercel config. This is a pnpm monorepo — Vercel's Root Directory
 * stays at the repo root so it can resolve the `@vetly/shared` workspace
 * dependency. We point the build and output at the `web/` sub-app explicitly.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm --filter @vetly/web build",
  installCommand: "pnpm install --frozen-lockfile",
  outputDirectory: "web/.next",
  crons: [
    {
      path: "/api/cron/refresh-domains",
      schedule: "0 3 * * *",
    },
  ],
};

export default config;
