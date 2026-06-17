-- ════════════════════════════════════════════════════════════════════════
-- My Pipelines — manual migration
-- ════════════════════════════════════════════════════════════════════════
-- APPLY VIA SUPABASE (apply_migration / SQL editor), **NOT** `prisma db push`.
-- Reason: db push treats a column RENAME as DROP + ADD = data loss (confirmed
-- via Prisma docs). This file does additive ALTERs to preserve data, then the
-- Prisma schema is aligned so a later `db push` is a no-op.
--
-- NOTE: production keeps the contact firm column as "firmName" (no organization
-- rename). This migration only adds the multi-pipeline tables/columns.
--
-- Order matters. Run top to bottom in ONE transaction (Supabase SQL editor wraps
-- a single run in a tx). Review on a Supabase BRANCH before prod.
-- Down-migration at the bottom.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Pipeline table. userId holds the stable User.id UUID (matches PipelineEntry
--    after the email->UUID user-key cutover).
CREATE TABLE IF NOT EXISTS "Pipeline" (
  "id"          text PRIMARY KEY,
  "userId"      text NOT NULL,
  "name"        text NOT NULL,
  "kind"        text NOT NULL,                 -- FUNDING | PROFESSORS | WORK | RECRUITING
  "stages"      jsonb NOT NULL DEFAULT '[]',   -- [{key,label,color,universalPhase}]
  "cadenceDays" integer,                       -- nurture threshold (days)
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Pipeline_userId_idx" ON "Pipeline" ("userId");

-- RLS: defense-in-depth only (service-role bypasses it; real guard is route-handler
-- userId scoping via src/lib/pipeline-auth.ts). No permissive policy => deny-by-default
-- for the anon key, matching the existing _enable_rls pattern.
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;

-- 2) PipelineEntry: per-pipeline membership + nurture timestamp.
--    Left NULLABLE in v1 (legacy rows may have userId='' and can't be safely owned).
ALTER TABLE "PipelineEntry" ADD COLUMN IF NOT EXISTS "pipelineId"  text;
ALTER TABLE "PipelineEntry" ADD COLUMN IF NOT EXISTS "lastTouchAt" timestamptz;

-- 3) Backfill: one RECRUITING pipeline per existing user, point their entries at it,
--    seed lastTouchAt from addedAt so the "going cold" rail works on day one (F7).
DO $$
DECLARE u text;
DECLARE pid text;
BEGIN
  FOR u IN SELECT DISTINCT "userId" FROM "PipelineEntry" WHERE "userId" <> '' LOOP
    pid := 'pl_recruiting_' || md5(u);
    INSERT INTO "Pipeline" ("id","userId","name","kind","stages","cadenceDays","createdAt")
    VALUES (
      pid, u, 'Recruiting', 'RECRUITING',
      '[{"key":"researched","label":"Researched","color":"zinc","universalPhase":"identified"},
        {"key":"connected","label":"Connected","color":"blue","universalPhase":"contacted"},
        {"key":"email_sent","label":"Email Sent","color":"sky","universalPhase":"contacted"},
        {"key":"follow_up","label":"Follow Up","color":"amber","universalPhase":"engaged"},
        {"key":"responded","label":"Responded","color":"green","universalPhase":"engaged"},
        {"key":"meeting_set","label":"Meeting Set","color":"teal","universalPhase":"advanced"}]'::jsonb,
      14, now()
    )
    ON CONFLICT ("id") DO NOTHING;
    UPDATE "PipelineEntry" SET "pipelineId" = pid WHERE "userId" = u AND "pipelineId" IS NULL;
  END LOOP;
  UPDATE "PipelineEntry" SET "lastTouchAt" = "addedAt" WHERE "lastTouchAt" IS NULL;
END $$;

-- Verify before committing the tx:
--   SELECT count(*) FROM "PipelineEntry" WHERE "pipelineId" IS NULL AND "userId" <> '';  -- expect 0

-- ════════════════════════════════════════════════════════════════════════
-- DOWN MIGRATION (paste separately to revert)
-- ════════════════════════════════════════════════════════════════════════
-- ALTER TABLE "PipelineEntry" DROP COLUMN IF EXISTS "lastTouchAt";
-- ALTER TABLE "PipelineEntry" DROP COLUMN IF EXISTS "pipelineId";
-- DROP TABLE IF EXISTS "Pipeline";
