-- Pipelines are per-user: the same contact may sit in many users' pipelines, but
-- a given (contactId, userId) pair must be unique so adding the same Discover
-- contact twice never creates a duplicate PipelineEntry row.
--
-- Prod already has this index (applied out-of-band as
-- 20260612182326_pipeline_entry_unique_per_user, which was never checked in —
-- Prisma drift). This migration is the checked-in, reproducible source of truth:
-- IF NOT EXISTS makes it a no-op where the index already exists, and recreates
-- it on a fresh database. RLS is untouched.
CREATE UNIQUE INDEX IF NOT EXISTS "PipelineEntry_contactId_userId_key"
  ON public."PipelineEntry" ("contactId", "userId");
