# KithNode — Session Handoff (2026-06-15)

> Single source of truth for consolidating to ONE working session. Read this first.
> As of HEAD `db86844` on branch `feat/contact-intelligence`. Both sessions' work is
> now committed, the working tree is CLEAN, and the full suite is green at HEAD.

## 0. Where the repo lives now
- Repo was **MOVED**: `/Users/scrigot/projects/kithnode` → **`/Users/scrigot/projects/apps/kithnode`** (the whole `projects/` tree was reorganized into `apps/` on 2026-06-15, mid-session).
- Active branch: **`feat/contact-intelligence`**.
- The old path is a dead stub (only locked `.next`/`.omc` left). Do not use it.
- Stale worktree registration remains: `.../kithnode/.claude/worktrees/my-pipelines` (branch `feat/my-pipelines`, marked prunable). Run `git worktree prune` if unused.

## 1. What shipped this session (committed)
- **`c236acb`** — `fix: scope LinkedIn import lookups to the contact owner (cross-tenant)` + 217-line test. Closes a cross-tenant **takeover**: the importer looked up `AlumniContact` by `linkedInUrl`/`email` without owner-scoping, then overwrote + reassigned the row. Now all lookups filter `importedByUserId`.
- **`9240068`** — `feat(import): link to enriched pool row on match + scope owner-private fields`:
  - **Link-on-match (the beta feature):** import (CSV + URL) now links the caller to an existing enriched `AlumniContact` via a `UserDiscover` `high_value` row instead of failing on the global unique — reuses enrichment, never overwrites another user's row.
  - **Privacy scoping:** contacts list + detail no longer surface the owner's private fields (`isFriend`, `lastSpokenAt`, `speakFrequency`, `notes`, `hometown`, `highSchool`, `passions`) to a non-owner viewing a pooled contact — in both the JSON and the relationship-class/engagement/dormant inputs.
  - CSV `linkedInUrl` validation (rejects `javascript:`/malformed before storage).
  - Sanitized unique-violation errors (no raw DB/constraint-name leak).

## 2. Verification status
- Re-verified at consolidated HEAD `db86844` (after the other session's commits landed): **1125 tests / 103 files PASS**, `tsc --noEmit` clean, working tree clean.
- Independent review of `9240068`: **PASS-WITH-NITS** (no CRITICAL/HIGH). Confirmed: no takeover reintroduced, link-on-match correct, privacy scoping complete across all 3 GETs, tests non-tautological. `UserDiscover_userId_contactId_key` confirmed against the live DB.

## 3. Open follow-ups (all LOW / non-blocking)
1. **[LOW] No regression test for the read-side privacy blanking** (the Part 2 contacts change). Add GET tests:
   - `src/app/api/contacts/route.test.ts` (list) — safe to add.
   - `src/app/api/contacts/[id]/route.test.ts` (detail) — was being edited by the other session; reconcile first (see §4).
   - Assert: a non-owner viewing a `high_value`-linked foreign row gets the private fields blanked AND `relationship_class` is not promoted by the owner's data.
2. **[LOW]** `src/app/api/import/linkedin/route.ts` `findPoolRow` uses `.single()` → switch to `.maybeSingle()`. The 0-row "no pool match" case is the common path; `.single()` logs a PGRST116 each time. Behavior is already correct (error ignored).
3. **[INFO, pre-existing]** `prisma/schema.prisma` `UserDiscover` lacks the `@@unique([userId, contactId])` the DB actually has. Matches this repo's "Supabase owns constraints" convention — not a bug.

## 4. Multi-session reconciliation — DONE (verified)
A second session was editing the same working tree during handoff; it has since committed everything (`0174e59 fix(waitlist)`, `8b542c1 feat(contacts)`). State now:
- Working tree is **clean** — nothing stranded, nothing to reconcile.
- Full suite **green at HEAD `db86844` (1125 pass)** — confirms the other session's `contacts/[id]/route.test.ts` edits pass against the privacy change in `9240068` (no collision).

Only residual: `git worktree prune` the stale `my-pipelines` worktree registration if you're done with it.

## 5. Architecture facts for building features
- **`AlumniContact` = GLOBAL shared pool**, one row per `linkedInUrl` (globally `@unique`). `importedByUserId` = canonical owner. Intentional — Discover reuses enrichment across users.
- **Per-user access to a pool row = `UserDiscover` rating `"high_value"`.** The contacts list = owned rows + `high_value`-linked rows; `high_value` also unlocks PII (`isUnlocked` in `src/lib/contact-access.ts`). The rate route is `src/app/api/discover/rate/route.ts`.
- **The supabase client uses the SERVICE-ROLE key → RLS is bypassed.** Application-layer `.eq("importedByUserId", userId)` is the ONLY tenant guard. Never write a read-then-write path without owner-scoping.
- **Owner-private columns** (blank for non-owners): `isFriend, lastSpokenAt, speakFrequency, hometown, highSchool, passions, notes, email`. Canonical allowlist of *shareable* fields: `POOL_SAFE_FIELDS` in `src/lib/redact.ts` (`poolSafeContact` / `redactContact`).
- Per-user overlay tables: `UserDiscover`, `PipelineEntry`, `contact_tags`, `ContactConnection` (mutuals).

## 6. Parked decision — data model (resolved for now)
- **KEEP the global `@unique` on `linkedInUrl`** (shared pool). Do NOT migrate to per-user `@@unique([importedByUserId, linkedInUrl])` — it fragments the pool and kills enrichment reuse, which is the whole point of Discover.
- **Long-term (post-beta):** split a shared **Profile** (objective enrichment) from a per-user **Relationship overlay** (`isFriend`/`lastSpokenAt`/`speakFrequency`/`notes`). Today those private fields live on the shared row and are protected by read-side blanking (`9240068`). The split is the proper fix once per-user relationship-tracking on pooled contacts matters.

## 7. Strategic note
Pre-launch, beta this week, currently one real user (you). The shared pool only pays off at multi-user — the work above makes it correct + safe for that moment. Resist building more of the multi-user machine ahead of getting users.
