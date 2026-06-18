-- Phase 1 backfill: rewrite every user-key column from EMAIL -> User.id (UUID).
--
-- ⚠️ DO NOT RUN BLIND. This is a prod data migration on the trust plane.
-- Cutover procedure (run in this order, all in one sitting):
--   1. Take a Supabase snapshot / PITR checkpoint.
--   2. Run the ORPHAN REPORT below; resolve anything unexpected.
--   3. Run the BACKFILL transaction.
--   4. Deploy the matching code change (auth.ts -> userId = User.id) AT THE SAME TIME.
--      Data and code must cut over together, or the app breaks (queries by UUID
--      won't find email-keyed rows, and vice-versa).
--   5. Run the VERIFY query; smoke-test; then (optionally) add FK constraints.
--
-- Idempotent: re-running is safe. Each UPDATE only touches rows whose value still
-- matches a User.email, so rows already holding a UUID (or the 'anonymous'
-- sentinel in UserDiscover) are left untouched.

-- ============================ ORPHAN REPORT (read-only) ============================
-- Any value that is NOT a UUID and does NOT match a User.email = an orphan to decide on.
SELECT 'UserDiscover' tbl, "userId" val, count(*) n FROM "UserDiscover"
  WHERE "userId" NOT IN (SELECT "id" FROM "User") AND "userId" NOT IN (SELECT "email" FROM "User")
  GROUP BY "userId"
UNION ALL SELECT 'PipelineEntry', "userId", count(*) FROM "PipelineEntry"
  WHERE "userId" NOT IN (SELECT "id" FROM "User") AND "userId" NOT IN (SELECT "email" FROM "User") GROUP BY "userId";
-- (extend per table as needed; 'anonymous' in UserDiscover is the known sentinel.)

-- ============================ BACKFILL ============================
BEGIN;

UPDATE "AgentEvent"      t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "AgentRoom"       t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "AlumniContact"   t SET "importedByUserId" = u."id" FROM "User" u WHERE t."importedByUserId" = u."email";
UPDATE "AuditLog"        t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "Connection"      t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "ContactConnection" t SET "ownerUserId"    = u."id" FROM "User" u WHERE t."ownerUserId"      = u."email";
UPDATE "EmailLog"        t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "Node"            t SET "ownerId"          = u."id" FROM "User" u WHERE t."ownerId"          = u."email";
UPDATE "NodeMember"      t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "PipelineEntry"   t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "UserDiscover"    t SET "userId"           = u."id" FROM "User" u WHERE t."userId"           = u."email";
UPDATE "Friendship"      t SET "requesterId"      = u."id" FROM "User" u WHERE t."requesterId"      = u."email";
UPDATE "Friendship"      t SET "addresseeId"      = u."id" FROM "User" u WHERE t."addresseeId"      = u."email";
UPDATE "Message"         t SET "senderId"         = u."id" FROM "User" u WHERE t."senderId"         = u."email";

COMMIT;

-- ============================ VERIFY (read-only) ============================
-- Expect 0 rows: any remaining value that looks like an email is unmigrated.
SELECT 'PipelineEntry' tbl, count(*) leftover FROM "PipelineEntry" WHERE "userId" LIKE '%@%'
UNION ALL SELECT 'UserDiscover', count(*) FROM "UserDiscover" WHERE "userId" LIKE '%@%' AND "userId" <> 'anonymous'
UNION ALL SELECT 'Friendship.requesterId', count(*) FROM "Friendship" WHERE "requesterId" LIKE '%@%'
UNION ALL SELECT 'Connection', count(*) FROM "Connection" WHERE "userId" LIKE '%@%';

-- ============================ OPTIONAL (after verify + code cutover) ============================
-- Add real FK constraints so the DB enforces userId -> User.id forever.
-- Run only once all values are valid UUIDs (orphans resolved first), e.g.:
--   ALTER TABLE "PipelineEntry" ADD CONSTRAINT pe_user_fk
--     FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
-- (repeat per table; skip UserDiscover if you keep the 'anonymous' sentinel.)
