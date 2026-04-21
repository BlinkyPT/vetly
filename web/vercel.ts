import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "pnpm --filter @vetly/web build",
  framework: "nextjs",
  installCommand: "pnpm install --frozen-lockfile",
  crons: [
    {
      // Refresh domain reputations older than 30 days, in batches.
      path: "/api/cron/refresh-domains",
      schedule: "0 3 * * *",
    },
  ],
};

export default config;
