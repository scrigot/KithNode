-- Phase 3 — correct + complete the per-user RLS policies (applied to prod 2026-06-17).
--
-- WHY: the pre-existing authenticated policies keyed on auth.email() = "userId",
-- written for the OLD email-keyed model. Phase 1 migrated those columns to UUID,
-- so those policies silently became deny-all (email != uuid). The app never
-- noticed because it runs on the service-role client (bypasses RLS).
--
-- This rewrites the migrated-column policies to auth.uid() and adds owner
-- policies to the user-scoped tables that had none. Email-keyed RAW tables
-- (contact_tags.user_id, UsageEvent.userEmail, Feedback.userEmail) stay on
-- auth.email(). The minted JWT (src/lib/supabase-user.ts) carries sub=User.id
-- (=> auth.uid()) AND the email claim (=> auth.email()), so both work.
--
-- SAFE TO APPLY before the route cutover: dormant until a route uses
-- getUserClient (Phase 4). Kith tables (Friendship/NodeMember/Node/Message) are
-- deliberately NOT touched here — they stay on auth.email() and are owned by the
-- flag-gated Phase 1b kith work (which must also flip the realtime-token sub).
--
-- AlumniContact stays the shared pool on the service-role client + redact
-- projection (src/lib/redact.ts) — NOT RLS-scoped. Reference/seed + FastAPI
-- backend tables (companies, signals, scores, contacts, enrichments,
-- affiliations, learned_weights, milestones, phases, outreach, pipeline_contacts,
-- contact_ratings, user_preferences) keep RLS-on/deny-all-to-anon; the backend
-- reaches them via direct Postgres (bypasses RLS).

-- UUID-keyed (auth.uid) — rewrite existing
DROP POLICY IF EXISTS authenticated_own ON "PipelineEntry";
CREATE POLICY authenticated_own ON "PipelineEntry" FOR ALL TO authenticated
  USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");
DROP POLICY IF EXISTS authenticated_own ON "UserDiscover";
CREATE POLICY authenticated_own ON "UserDiscover" FOR ALL TO authenticated
  USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");
DROP POLICY IF EXISTS authenticated_own ON "Connection";
CREATE POLICY authenticated_own ON "Connection" FOR ALL TO authenticated
  USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");
DROP POLICY IF EXISTS authenticated_own ON "AuditLog";
CREATE POLICY authenticated_own ON "AuditLog" FOR ALL TO authenticated
  USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");

-- UUID-keyed (auth.uid) — new on 0-policy tables (incl. anon_deny + service_role_all)
DROP POLICY IF EXISTS anon_deny ON "ContactConnection";
CREATE POLICY anon_deny ON "ContactConnection" FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS authenticated_own ON "ContactConnection";
CREATE POLICY authenticated_own ON "ContactConnection" FOR ALL TO authenticated
  USING ((auth.uid())::text = "ownerUserId") WITH CHECK ((auth.uid())::text = "ownerUserId");
DROP POLICY IF EXISTS service_role_all ON "ContactConnection";
CREATE POLICY service_role_all ON "ContactConnection" FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny ON "EmailLog";
CREATE POLICY anon_deny ON "EmailLog" FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS authenticated_own ON "EmailLog";
CREATE POLICY authenticated_own ON "EmailLog" FOR ALL TO authenticated
  USING ((auth.uid())::text = "userId") WITH CHECK ((auth.uid())::text = "userId");
DROP POLICY IF EXISTS service_role_all ON "EmailLog";
CREATE POLICY service_role_all ON "EmailLog" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Email-keyed (auth.email) — new on 0-policy raw tables
DROP POLICY IF EXISTS anon_deny ON contact_tags;
CREATE POLICY anon_deny ON contact_tags FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS authenticated_own ON contact_tags;
CREATE POLICY authenticated_own ON contact_tags FOR ALL TO authenticated
  USING (auth.email() = user_id) WITH CHECK (auth.email() = user_id);
DROP POLICY IF EXISTS service_role_all ON contact_tags;
CREATE POLICY service_role_all ON contact_tags FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny ON "UsageEvent";
CREATE POLICY anon_deny ON "UsageEvent" FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS authenticated_own ON "UsageEvent";
CREATE POLICY authenticated_own ON "UsageEvent" FOR ALL TO authenticated
  USING (auth.email() = "userEmail") WITH CHECK (auth.email() = "userEmail");
DROP POLICY IF EXISTS service_role_all ON "UsageEvent";
CREATE POLICY service_role_all ON "UsageEvent" FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny ON "Feedback";
CREATE POLICY anon_deny ON "Feedback" FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS authenticated_own ON "Feedback";
CREATE POLICY authenticated_own ON "Feedback" FOR ALL TO authenticated
  USING (auth.email() = "userEmail") WITH CHECK (auth.email() = "userEmail");
DROP POLICY IF EXISTS service_role_all ON "Feedback";
CREATE POLICY service_role_all ON "Feedback" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== ISOLATION TEST (rolled back; run per simulated user) =====
-- Proven 2026-06-17: user 030182d1 -> PE 9 / UD 149; user 141dcb72 -> PE 5 / CC 16 / EmailLog 1;
-- fake uuid -> all 0; email nobody@nowhere -> contact_tags 0.
-- BEGIN; SET LOCAL role authenticated;
-- SELECT set_config('request.jwt.claims','{"sub":"<uuid>","email":"<email>","role":"authenticated"}', true);
-- SELECT count(*) FROM "PipelineEntry"; ROLLBACK;
