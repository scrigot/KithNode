-- Kith & Nodes social layer.
-- User identity is the EMAIL everywhere (matches AlumniContact.importedByUserId,
-- PipelineEntry.userId, intro_requests.from_user_id). All *Id user columns hold emails.
-- RLS mirrors 1777257214_enable_rls: service_role_all (the app path), anon_deny, and
-- authenticated_* which is a future-proof no-op today (auth.email() is NULL under NextAuth
-- → deny). Runtime enforcement is the server authz layer (src/lib/kith/authz.ts).

-- ---- Tables first (so cross-referencing policies resolve) ----
CREATE TABLE IF NOT EXISTS public."Friendship" (
  "id"          text PRIMARY KEY,
  "requesterId" text NOT NULL,
  "addresseeId" text NOT NULL,
  "status"      text NOT NULL DEFAULT 'pending', -- pending | accepted | blocked
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "respondedAt" timestamptz,
  UNIQUE ("requesterId", "addresseeId")
);
CREATE INDEX IF NOT EXISTS "Friendship_addresseeId_status_idx" ON public."Friendship" ("addresseeId", "status");
CREATE INDEX IF NOT EXISTS "Friendship_requesterId_status_idx" ON public."Friendship" ("requesterId", "status");

CREATE TABLE IF NOT EXISTS public."Node" (
  "id"         text PRIMARY KEY,
  "name"       text NOT NULL,
  "ownerId"    text NOT NULL,
  "inviteCode" text NOT NULL UNIQUE,
  "createdAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Node_ownerId_idx" ON public."Node" ("ownerId");

CREATE TABLE IF NOT EXISTS public."NodeMember" (
  "id"       text PRIMARY KEY,
  "nodeId"   text NOT NULL,
  "userId"   text NOT NULL,
  "role"     text NOT NULL DEFAULT 'member', -- owner | member
  "joinedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("nodeId", "userId")
);
CREATE INDEX IF NOT EXISTS "NodeMember_userId_idx" ON public."NodeMember" ("userId");
CREATE INDEX IF NOT EXISTS "NodeMember_nodeId_idx" ON public."NodeMember" ("nodeId");

ALTER TABLE public."AlumniContact" ADD COLUMN IF NOT EXISTS "sharedInNodes" boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "AlumniContact_importedByUserId_idx" ON public."AlumniContact" ("importedByUserId");

-- ---- RLS + policies (idempotent) ----
ALTER TABLE public."Friendship" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public."Friendship";
DROP POLICY IF EXISTS "anon_deny" ON public."Friendship";
DROP POLICY IF EXISTS "authenticated_own" ON public."Friendship";
CREATE POLICY "service_role_all" ON public."Friendship" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON public."Friendship" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "authenticated_own" ON public."Friendship" FOR ALL TO authenticated
  USING (auth.email() = "requesterId" OR auth.email() = "addresseeId")
  WITH CHECK (auth.email() = "requesterId" OR auth.email() = "addresseeId");

ALTER TABLE public."NodeMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public."NodeMember";
DROP POLICY IF EXISTS "anon_deny" ON public."NodeMember";
DROP POLICY IF EXISTS "authenticated_own" ON public."NodeMember";
CREATE POLICY "service_role_all" ON public."NodeMember" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON public."NodeMember" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "authenticated_own" ON public."NodeMember" FOR ALL TO authenticated
  USING (auth.email() = "userId")
  WITH CHECK (auth.email() = "userId");

ALTER TABLE public."Node" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public."Node";
DROP POLICY IF EXISTS "anon_deny" ON public."Node";
DROP POLICY IF EXISTS "authenticated_member" ON public."Node";
CREATE POLICY "service_role_all" ON public."Node" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON public."Node" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "authenticated_member" ON public."Node" FOR ALL TO authenticated
  USING (
    auth.email() = "ownerId"
    OR EXISTS (SELECT 1 FROM public."NodeMember" m WHERE m."nodeId" = "Node".id AND m."userId" = auth.email())
  )
  WITH CHECK (auth.email() = "ownerId");
