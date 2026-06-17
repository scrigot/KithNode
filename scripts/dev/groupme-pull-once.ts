#!/usr/bin/env tsx
/**
 * One-shot manual runner for the GroupMe → beta_feedback pull. Used to verify
 * the pull against the real group and for ad-hoc backfills.
 *
 * Usage:
 *   npm run groupme:pull
 *   # or: npx tsx scripts/dev/groupme-pull-once.ts
 *
 * Env (from .env.local, same loader as scripts/dev/make-test-user.ts):
 *   GROUPME_TOKEN              required — dev.groupme.com → Access Token
 *   GROUPME_GROUP_ID           optional — pin the group; else match name "KithNode Beta"
 *   NEXT_PUBLIC_SUPABASE_URL   + SUPABASE_SERVICE_ROLE_KEY — to write beta_feedback
 *
 * dotenv is loaded BEFORE importing the pull so src/lib/supabase.ts reads the
 * service-role key at module init. The import is dynamic for the same reason.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

async function main() {
  const { pullBetaFeedback } = await import("../../src/lib/groupme");
  const result = await pullBetaFeedback();
  console.log("[groupme:pull] done:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("[groupme:pull] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
