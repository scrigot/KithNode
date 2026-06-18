-- Per-user pipeline uniqueness: a given (contactId, userId) pair is unique so
-- adding the same Discover contact to a pipeline twice never duplicates a row.
-- Mirrors the `@@unique([contactId, userId])` on PipelineEntry. Prod already has
-- this index (created out-of-band, never checked in — Prisma drift); IF NOT
-- EXISTS makes this a no-op there and reproducible on a fresh DB. RLS untouched.
CREATE UNIQUE INDEX IF NOT EXISTS "PipelineEntry_contactId_userId_key"
  ON "PipelineEntry" ("contactId", "userId");
