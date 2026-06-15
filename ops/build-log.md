# KithNode Build Log

> Append-only. Newest entries at the bottom (auto-appended by the Stop hook from OPS_LOG markers + git commits). What shipped and why.

## 2026-03-08 — MVP foundation (KN-001..008)
- Project init: Next.js 16, TS strict, Tailwind v4, ESLint 9 flat config, Vitest. Health API, landing page.
- DB schema (User, AlumniContact, Connection) + seed (5 users, 20 alumni across IB/PE/Consulting).
- NextAuth v5 Google OAuth + `/dashboard` route protection.
- Alumni contact list view; lead scoring (`scoreConnection`, weighted factors, firm-prestige tiers); outreach draft composer.
- AutoGuard kill-switch (pauses automation on RESPONDED) + AuditLog entries.
- PostHog analytics (signup, contact_viewed, outreach_drafted/sent, autoguard_triggered).

## 2026-06-15 — Contact intelligence + multi-tenant safety (branch feat/contact-intelligence)
- `c236acb` fix: cross-tenant takeover. Import lookups now owner-scoped (`importedByUserId`) + 217-line test.
- `9240068` feat(import): link-on-match to an enriched pool row (reuses enrichment, never overwrites another user's row); read-side privacy scoping of owner-private fields across all 3 contact GETs; CSV linkedInUrl validation; sanitized unique-violation errors.
- `0174e59` / `8b542c1`: waitlist fix + contacts feature (second session, reconciled clean).
- Verified at HEAD `db86844`: 1125 tests pass, tsc clean, working tree clean.

### 2026-06-15 18:39  (branch: feat/contact-intelligence)
- built the ops/ spine + session-log Stop hook + /ops-log command | learned consolidate 4 scattered logs (HANDOFF, progress.txt, .omc) into ops/ | decided ops markdown is the source of truth, richer in-app surface deferred to Subsystem 2
- commits:
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single
    - 0907d5b test(contacts): regression tests for read-side owner-private blanking
    - c1430b6 docs: mark handoff consolidated — tree clean, suite green at HEAD
