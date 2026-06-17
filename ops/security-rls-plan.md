# Security Plan — Kill the Service-Role RLS Bypass

> Owner: Sam (trust plane — interns never touch RLS). Status: planned, not started.
> Evidence gathered 2026-06-17 from the live project (`jyjpitagxtdzedtooedw`) + code.

## Problem

Every server query uses one client keyed with the **service-role key** ([src/lib/supabase.ts](../src/lib/supabase.ts)), which **bypasses RLS entirely**. Tenant isolation is enforced only by app-layer `.eq("userId", …)` filters + the `POOL_SAFE_FIELDS` projection in [src/lib/redact.ts](../src/lib/redact.ts). One forgotten filter = cross-tenant data leak, with no database backstop. A cross-tenant takeover bug of exactly this class was already hit once.

Compounding issues (live advisor results):
- **11 tables RLS-disabled, exposed to anon:** companies, contacts, signals, scores, enrichments, affiliations, outreach, contact_ratings, learned_weights, user_preferences, pipeline_contacts.
- **~13 tables RLS-enabled but no policy** (dormant; app uses service-role anyway).
- **`userId` = email** ([src/lib/auth.ts:42](../src/lib/auth.ts)) — mutable, must become stable UUID first.
- Functions `spend_credits`/`add_credits` have mutable `search_path`; `avatars` bucket allows listing.

## Target architecture

- **Per-request user-scoped client** for all user-facing reads/writes: mint a short-lived JWT with `sub = <user UUID>` and `role = "authenticated"`, signed with `SUPABASE_JWT_SECRET`; attach as `Authorization: Bearer` on a per-request `createClient`. RLS policies then enforce `auth.uid() = "userId"` at the database.
- **Service-role reserved** for genuine cross-tenant admin only: the shared AlumniContact pool, cron jobs (GroupMe pull, digests, reminders), seeding, Stripe webhooks.
- NextAuth stays the auth system; we just sign a Supabase-compatible JWT from the session (Supabase "Third-Party Auth" doesn't cleanly cover NextAuth, so the signed-JWT pattern is the fit).

## Plan (staged, each shippable independently)

### Phase 0 — Close the open doors (low risk, do first)
App uses service-role, so enabling RLS with no policy does NOT break it (service-role bypasses). This instantly removes the "exposed to anon" holes.
- [ ] `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on all 11 disabled tables.
- [ ] Set `search_path = ''` (or `pg_catalog, public`) on `spend_credits`, `add_credits`.
- [ ] Tighten the `avatars` bucket SELECT policy (object-access only, no listing).
- [ ] Confirm `waitlist_signups` anon-INSERT-only policy is intended (it is — public form).
- [ ] Re-run `get_advisors` → all ERROR-level findings clear.

### Phase 1 — Stable user id (unblocks real RLS)
- [x] Add/confirm `User.id` UUID PK (already `@default(cuid())`/uuid on the User table).
- [x] `jwt` callback: resolves `token.userId = User.id` by email lookup, and force-re-resolves legacy `@`-containing tokens (`src/lib/auth.ts`).
- [x] **Code flip done on branch `fix/userid-uuid`** (typecheck + lint + tests + adversarial review all green; NOT committed, NOT deployed). 20 files. The critical finding: this is a **split key space**, not a uniform rename. Two key families coexist:
  - **FLIP → `session.user.id` (UUID):** call-sites against the 14 backfilled columns — `AlumniContact.importedByUserId`, `UserDiscover.userId`, `PipelineEntry.userId`, `Connection.userId`, `ContactConnection.ownerUserId` (+ AgentEvent/AgentRoom/AuditLog/EmailLog/Node.ownerId/NodeMember/Friendship/Message). `findWarmPaths` callers flip too (it filters `importedByUserId`).
  - **KEEP → `session.user.email`:** `User`-by-email lookups, the `spend_credits`/`add_credits` RPCs, `requireSubscription`, `getUserPrefs`, `loadContactTags`, and the **raw snake_case/lowercase tables that are NOT in the backfill and stay email-keyed**: `contact_tags.user_id`, `UsageEvent.userEmail`, `feedback_response.user_email`, `Feedback.userEmail`, `waitlist_signups.email`, `intro_requests.from_user_id`, plus Stripe customer/metadata, promo `redeemedByEmail`, email-send fields, and the FastAPI forwards.
  - MIXED handlers carry BOTH a `userId` (UUID) and a `userEmail` (email) local.
- [ ] **Prod cutover (pending Sam's snapshot):** run `ops/migrations/phase1-userid-email-to-uuid.sql` (14-column backfill) AND deploy the branch together. Sequence backfill before/with deploy; legacy JWTs self-heal via the `includes("@")` re-resolve, missing User rows fail closed (401).

### Phase 2 — User-scoped Supabase client
- [ ] Add `SUPABASE_JWT_SECRET` env (from Supabase dashboard → API settings).
- [ ] New `src/lib/supabase-user.ts`: `getUserClient(userId)` → mints JWT `{ sub: userId, role: "authenticated", exp: +1h }`, returns a `createClient` with that bearer token.
- [ ] Keep `src/lib/supabase.ts` (service-role) but rename export to `supabaseAdmin` and restrict imports to cron/webhook/pool code.

### Phase 3 — Real per-user RLS policies
For each user-scoped table (User, PipelineEntry, UserDiscover, Connection, Friendship, Node/NodeMember/Message, EmailLog, UsageEvent, Feedback, contact_tags, user_preferences, pipeline_contacts, contact_ratings, outreach, intro_requests, beta_feedback, feedback_response, AuditLog):
- [ ] `CREATE POLICY user_isolation ON <table> USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");`
- [ ] AlumniContact pool: keep service-role + the redact projection (intentionally cross-tenant read of safe fields).

**Discover pooling / sharing semantics (must be preserved by the policies):**
The product intentionally shares some contacts beyond the owner:
- A user can view a **friend's** contacts once a `Friendship` exists (mutual/accepted).
- A user can view **club (Node) members'** contacts when they share a `Node` (via `NodeMember`).
So read policies on shared contact tables are NOT owner-only — they must be `owner OR friend-of-owner OR co-member-of-a-node`. Model this as a SQL helper, e.g.:
```sql
-- can the current user see rows owned by ownerId?
CREATE FUNCTION can_view_owner(owner text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT owner = auth.uid()::text
      OR EXISTS (SELECT 1 FROM "Friendship" f
                 WHERE f.status = 'accepted'
                   AND ((f."userId" = auth.uid()::text AND f."friendId" = owner)
                     OR (f."friendId" = auth.uid()::text AND f."userId" = owner)))
      OR EXISTS (SELECT 1 FROM "NodeMember" a JOIN "NodeMember" b USING ("nodeId")
                 WHERE a."userId" = auth.uid()::text AND b."userId" = owner);
$$;
```
Then SELECT policy = `USING (can_view_owner("userId"))`, but WRITE policies stay owner-only (`WITH CHECK (auth.uid()::text = "userId")`). Verify against the existing app-layer sharing in `src/lib/warm-paths.ts` + the `POOL_SAFE_FIELDS` projection so RLS matches today's behavior exactly (friends see friends' contacts when added; club members see club contacts when in the club).
- [ ] Reference/seed tables (companies, signals, scores, phases, milestones…): owner-or-admin read policy as appropriate.

**Split key space (consequence of Phase 1):** the backfilled tables are keyed by UUID, but the raw email-keyed tables left untouched in Phase 1 (`contact_tags.user_id`, `UsageEvent.userEmail`, `feedback_response.user_email`, `Feedback.userEmail`, `waitlist_signups.email`, `intro_requests.from_user_id`) are still keyed by email. The minted JWT must therefore carry BOTH a `sub` = User.id UUID (for `auth.uid()` on UUID tables) AND an `email` claim. RLS on the email-keyed tables uses `auth.jwt()->>'email' = "<email col>"` instead of `auth.uid()`. (Alternative: a later migration flips these to UUID too for a uniform key space — deferred; not required for Phase 1.)

### Phase 4 — Cutover + prove it
- [ ] Switch user-facing routes/libs from `supabaseAdmin` → `getUserClient(session.user.id)`, table group by table group.
- [ ] **Cross-tenant tests**: as User A, attempt to read/write User B's contacts/pipeline/outreach → must return 0 rows / denied at the DB.
- [ ] Smoke test full flow; `get_advisors` clean; remove dead service-role imports.

## Effort / risk
- Phase 0: ~30 min, near-zero risk — **do this now.**
- Phases 1–4: ~1–2 focused days. Phase 1 (userId migration) is the riskiest (data migration); do it on a branch with a DB backup. Phases 2–4 are additive and table-by-table, so cutover is incremental and reversible.

## Anti-patterns to avoid
- Do NOT enable RLS on a table that the app reads via the *user* client without first adding a policy — that blocks all access (Phase 0 is safe only because the app still uses service-role until Phase 4).
- Do NOT auto-apply the advisor's bulk `ENABLE RLS` without sequencing against the cutover.
- Keep the AlumniContact pool on service-role + projection; do not try to RLS-scope a deliberately shared table.
