# KithNode Decisions Log

> Product / architecture / business decisions + rationale. Append as decisions are made.

## DATA MODEL: keep the global @unique on AlumniContact.linkedInUrl (shared pool)
- Decision: AlumniContact is a GLOBAL shared pool, one row per linkedInUrl. Do NOT migrate to per-user `@@unique([importedByUserId, linkedInUrl])`.
- Why: fragmenting the pool kills Discover's enrichment reuse, which is the whole point.
- Per-user access to a pool row = a UserDiscover rating of "high_value" (also unlocks PII via `src/lib/contact-access.ts`).
- Long-term (post-beta): split a shared Profile (objective enrichment) from a per-user Relationship overlay (isFriend / lastSpokenAt / speakFrequency / notes). Today those private fields live on the shared row, protected by read-side blanking (`9240068`).

## TENANCY: service-role Supabase client means RLS is bypassed, so app-layer owner-scoping is the ONLY guard
- Every read-then-write path MUST filter `.eq("importedByUserId", userId)`. A missing filter is a cross-tenant takeover (see `c236acb`).
- Owner-private columns, blanked for non-owners: isFriend, lastSpokenAt, speakFrequency, hometown, highSchool, passions, notes, email. Shareable allowlist = `POOL_SAFE_FIELDS` in `src/lib/redact.ts`.

## STRATEGY: do not build ahead of users
- Pre-launch, beta this week, one real user. The shared-pool machine only pays off at multi-user. Make it correct + safe (done); resist building more multi-user machinery before getting users.
