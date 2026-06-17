-- Kith messaging: in-app DMs + Node group chat, plus Friendship provenance.
-- Identity = email everywhere (matches 1781740800_kith_nodes). All *Id columns hold emails.
-- The app talks to Supabase with the service-role key (bypasses RLS); runtime authz is
-- the server layer (src/lib/kith/messaging.ts). RLS here is deny-all defense in depth,
-- mirroring 1781740800_kith_nodes: service_role_all + anon_deny.

-- ---- Message table (one row per chat message, DM or Node) ----
CREATE TABLE IF NOT EXISTS public."Message" (
  "id"         text PRIMARY KEY,
  "threadType" text NOT NULL,              -- 'dm' | 'node'
  "threadId"   text NOT NULL,              -- dm: sorted 'a@x|b@y'; node: the Node id
  "senderId"   text NOT NULL,              -- email
  "body"       text NOT NULL,
  "createdAt"  timestamptz NOT NULL DEFAULT now()
);
-- Thread reads are always (threadType, threadId) ordered by time; this index serves
-- both the history fetch and the since-cursor poll.
CREATE INDEX IF NOT EXISTS "Message_thread_idx" ON public."Message" ("threadType", "threadId", "createdAt");

ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public."Message";
DROP POLICY IF EXISTS "anon_deny" ON public."Message";
CREATE POLICY "service_role_all" ON public."Message" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON public."Message" FOR ALL TO anon USING (false) WITH CHECK (false);

-- ---- Friendship provenance ----
-- How the friendship came to be, for the Friends "provenance" UI. Existing rows
-- default to 'direct'; the invite auto-friend path will set 'invite'.
ALTER TABLE public."Friendship" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'direct'; -- direct | invite | suggestion

-- ---- Realtime authorization ----
-- Clients subscribe ONLY to their own private per-user topic 'kith:user:{email}';
-- the server broadcasts each message to its recipients' topics. This SELECT policy
-- on realtime.messages is what lets an authenticated socket (JWT minted by
-- /api/kith/realtime-token, claim email=...) read its own topic and nobody else's.
-- Additive/idempotent: realtime.messages may already carry policies from other features.
DROP POLICY IF EXISTS "kith_user_reads_own_topic" ON realtime.messages;
CREATE POLICY "kith_user_reads_own_topic" ON realtime.messages FOR SELECT TO authenticated
  USING ( realtime.topic() = 'kith:user:' || (auth.jwt() ->> 'email') );
