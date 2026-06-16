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

### 2026-06-15 — Founder OS backbone live (ops-only, non-colliding with the landing session)
- built the Founder OS spine in `ops/`: `roadmap.md` (8 lanes x G0-G4 task tree, KithNode at G0), `ETHOS.md` (protected Iron Laws), `playbook.md` (cross-toolkit chains by lane), `founder-research.md` (8-founder rationale); tagged `tasks.md` lane+gate; added the skill-routing block to `CLAUDE.md`.
- decided: leverage gstack + superpowers + pm-skills via the playbook (ECC deferred); operating model = solo + AI + build-in-public, A->B optional; the org-band CODE is deferred to the session that owns `metrics.ts` (the landing session) to avoid a conflict.

### 2026-06-15 — Founder OS operating commands (.claude-only, non-colliding)
- built the Founder OS command layer: `/kithnode-morning-list` (the "wake up to a list" prioritizer — reads roadmap + tasks + Sentry/PostHog/Supabase signals, ranks toward the nearest gate, emits MORNING_LIST), `/kithnode-content-engine` (build-log -> build-in-public drafts in marketing/queue/, honesty-clamped + separate review pass), `/kithnode-roadmap` (roadmap-keeper: tag-enforce + sync). Wired kithnode-shipper + kithnode-rls-checker into the ops memory loop (read ETHOS + learnings, append on finish). Seeded marketing/queue/.
- learned: this repo gitignores `.claude/`, so commands/agents are local-only (not tracked); marketing/queue/ is the only tracked add.
- decided: ship commands manual-run first (ship->test->fix); overnight cron wiring via the existing notify.sh rail is the follow-up; org-band UI still belongs to the metrics.ts session.

### 2026-06-15 23:21  (branch: feat/contact-intelligence)
- commits:
    - 7483bd2 style(design): unify backgrounds — shared network mesh behind new sections + manifesto
    - daba6ba fix(intro): gate the auto-send email off for beta (you send it yourself)
    - 5d4b41a feat(landing): restructure to Cluely skeleton (wow / objection / FAQ / manifesto)
    - 0ca90c1 docs(landing): implementation plan for the landing remake
    - 4d48a31 feat(ops): agent OS spine + session auto-log + weekly digest + onboarding
    - 298b302 feat(marketing): pre-launch marketing system + product-marketing context
    - ada0d3b docs(landing): design spec for the Cluely-structure landing remake
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single
    - 0907d5b test(contacts): regression tests for read-side owner-private blanking

### 2026-06-15 23:24  (branch: feat/contact-intelligence)
- commits:
    - 7483bd2 style(design): unify backgrounds — shared network mesh behind new sections + manifesto
    - daba6ba fix(intro): gate the auto-send email off for beta (you send it yourself)
    - 5d4b41a feat(landing): restructure to Cluely skeleton (wow / objection / FAQ / manifesto)
    - 0ca90c1 docs(landing): implementation plan for the landing remake
    - 4d48a31 feat(ops): agent OS spine + session auto-log + weekly digest + onboarding
    - 298b302 feat(marketing): pre-launch marketing system + product-marketing context
    - ada0d3b docs(landing): design spec for the Cluely-structure landing remake
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single
