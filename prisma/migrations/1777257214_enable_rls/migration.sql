-- Enable RLS on all user-scoped public tables
-- Generated: 2026-04-24
-- Idempotent: DROP POLICY IF EXISTS before every CREATE POLICY
--
-- NOTE on auth.email() predicate:
-- KithNode uses NextAuth (Google OAuth) + Supabase service role for all server queries.
-- auth.uid() and auth.email() return NULL in this context (no Supabase Auth JWT).
-- The "authenticated_own" policies are therefore effectively no-ops right now —
-- they exist as defence-in-depth for a future Supabase Auth migration.
-- If auth.email() ever returns NULL, these policies evaluate as: NULL = value → false,
-- which means authenticated Supabase Auth users with no matching email would be denied.
-- Service role bypasses ALL RLS policies regardless.

-- ============================================================
-- User
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."User";
DROP POLICY IF EXISTS "anon_deny" ON public."User";
DROP POLICY IF EXISTS "authenticated_own" ON public."User";

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."User"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."User"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- auth.email() is NULL when using NextAuth; policy is a safe no-op until Supabase Auth is adopted
CREATE POLICY "authenticated_own" ON public."User"
  FOR ALL TO authenticated
  USING (auth.email() = email) WITH CHECK (auth.email() = email);

-- ============================================================
-- AlumniContact
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."AlumniContact";
DROP POLICY IF EXISTS "anon_deny" ON public."AlumniContact";
DROP POLICY IF EXISTS "authenticated_own" ON public."AlumniContact";

ALTER TABLE public."AlumniContact" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."AlumniContact"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."AlumniContact"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- importedByUserId stores the user's email (matches KithNode userId convention)
CREATE POLICY "authenticated_own" ON public."AlumniContact"
  FOR ALL TO authenticated
  USING (auth.email() = "importedByUserId") WITH CHECK (auth.email() = "importedByUserId");

-- ============================================================
-- Connection
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."Connection";
DROP POLICY IF EXISTS "anon_deny" ON public."Connection";
DROP POLICY IF EXISTS "authenticated_own" ON public."Connection";

ALTER TABLE public."Connection" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."Connection"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."Connection"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- userId joins back to User.id which equals the user's email
CREATE POLICY "authenticated_own" ON public."Connection"
  FOR ALL TO authenticated
  USING (auth.email() = "userId") WITH CHECK (auth.email() = "userId");

-- ============================================================
-- AuditLog
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."AuditLog";
DROP POLICY IF EXISTS "anon_deny" ON public."AuditLog";
DROP POLICY IF EXISTS "authenticated_own" ON public."AuditLog";

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."AuditLog"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."AuditLog"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "authenticated_own" ON public."AuditLog"
  FOR ALL TO authenticated
  USING (auth.email() = "userId") WITH CHECK (auth.email() = "userId");

-- ============================================================
-- PipelineEntry
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."PipelineEntry";
DROP POLICY IF EXISTS "anon_deny" ON public."PipelineEntry";
DROP POLICY IF EXISTS "authenticated_own" ON public."PipelineEntry";

ALTER TABLE public."PipelineEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."PipelineEntry"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."PipelineEntry"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "authenticated_own" ON public."PipelineEntry"
  FOR ALL TO authenticated
  USING (auth.email() = "userId") WITH CHECK (auth.email() = "userId");

-- ============================================================
-- UserDiscover
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public."UserDiscover";
DROP POLICY IF EXISTS "anon_deny" ON public."UserDiscover";
DROP POLICY IF EXISTS "authenticated_own" ON public."UserDiscover";

ALTER TABLE public."UserDiscover" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."UserDiscover"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."UserDiscover"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "authenticated_own" ON public."UserDiscover"
  FOR ALL TO authenticated
  USING (auth.email() = "userId") WITH CHECK (auth.email() = "userId");

-- ============================================================
-- waitlist_signups
-- ============================================================
-- Drop the existing permissive policies first, then replace with our pattern
DROP POLICY IF EXISTS "anon can insert waitlist" ON public."waitlist_signups";
DROP POLICY IF EXISTS "no one can read via anon" ON public."waitlist_signups";
DROP POLICY IF EXISTS "service_role_all" ON public."waitlist_signups";
DROP POLICY IF EXISTS "anon_deny" ON public."waitlist_signups";
DROP POLICY IF EXISTS "authenticated_own" ON public."waitlist_signups";

ALTER TABLE public."waitlist_signups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."waitlist_signups"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Anon inserts are intentional for the public waitlist form; reads are blocked
CREATE POLICY "anon_insert_only" ON public."waitlist_signups"
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_deny_read" ON public."waitlist_signups"
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "authenticated_own" ON public."waitlist_signups"
  FOR ALL TO authenticated
  USING (auth.email() = email) WITH CHECK (auth.email() = email);

-- ============================================================
-- intro_requests
-- ============================================================
-- Drop the existing JWT-based policies and replace with our standard pattern
DROP POLICY IF EXISTS "Users can insert their own requests" ON public."intro_requests";
DROP POLICY IF EXISTS "Users can view their own requests" ON public."intro_requests";
DROP POLICY IF EXISTS "service_role_all" ON public."intro_requests";
DROP POLICY IF EXISTS "anon_deny" ON public."intro_requests";
DROP POLICY IF EXISTS "authenticated_own" ON public."intro_requests";

ALTER TABLE public."intro_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."intro_requests"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON public."intro_requests"
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- from_user_id stores the user's email
CREATE POLICY "authenticated_own" ON public."intro_requests"
  FOR ALL TO authenticated
  USING (auth.email() = "from_user_id") WITH CHECK (auth.email() = "from_user_id");
