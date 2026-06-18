-- Finishes the email→uuid identity migration: auth.ts already issues the stable
-- User.id (UUID) as session.user.id, and the Kith subsystem now keys all
-- authorization + joins on it. This backfills the membership/friendship rows that
-- were written before the auth change and still hold emails, so they match.
--
-- Safety: every affected email resolves to a User row; pre-checks for
-- (nodeId,userId) and Friendship-pair unique collisions returned empty.
-- Must run with the deploy (NOT applied automatically by the build) — until it
-- runs, the new code fail-closes on the un-migrated rows (no data leak).

UPDATE "NodeMember" nm
SET "userId" = u.id
FROM "User" u
WHERE lower(u.email) = lower(nm."userId") AND nm."userId" LIKE '%@%';

UPDATE "Friendship" f
SET "requesterId" = u.id
FROM "User" u
WHERE lower(u.email) = lower(f."requesterId") AND f."requesterId" LIKE '%@%';

UPDATE "Friendship" f
SET "addresseeId" = u.id
FROM "User" u
WHERE lower(u.email) = lower(f."addresseeId") AND f."addresseeId" LIKE '%@%';

-- Verification gate (must return 0): no email-shaped identity rows remain.
--   SELECT (SELECT count(*) FROM "NodeMember" WHERE "userId" LIKE '%@%')
--        + (SELECT count(*) FROM "Friendship"
--             WHERE "requesterId" LIKE '%@%' OR "addresseeId" LIKE '%@%') AS remaining;
