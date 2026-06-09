# KithNode — 2-Week Beta Sprint

**Window:** 2026-06-09 → 2026-06-22  ·  **Goal:** production-ready + beta cohort onboarded.
**Source of truth for this sprint.** Update checkboxes as items land. Audit detail: `~/Documents/SamOS/01 - Projects/KithNode/audit-findings-2026-06-09.md`. Market research: `…/Research/2026-06-beta-research/_SYNTHESIS-want-vs-hate.md`.

---

## Status board

| # | Item | Track | State | PR |
|---|------|-------|-------|----|
| A | Repo hygiene + file sorting (leak closed, build cache untracked, 10 clean commits) | A | ✅ shipped | #2 |
| B1 | Test suite green (10 failing → 262/262) | B | ✅ shipped | #3 |
| B2 | RLS verified (11 tables) + full correctness/security audit | B | ✅ done | — |
| B3 | Security: IDOR + SSRF + injection; correctness blockers; 26 CVEs; Next 16.2.7 | B | ✅ shipped | #4 |
| C | This sprint tracker | C | ✅ in repo | this file |
| D | CRM redesign (Contacts/Pipeline/Discover + empty states) | D | ⏳ design-shotgun → pick → build | — |
| E | Market research corpus (~100 briefs) + "Want vs. Hate" matrix | E | 🔄 running | — |

Merge order for the stacked PRs: **#2 → #3 → #4**.

---

## Week 1 (Jun 9–15) — Foundation & hardening

- [x] Close `.env` backup leak; untrack build cache; sort working tree into logical commits (PR #2)
- [x] Fix failing tests → 262/262 (PR #3)
- [x] Run parallel correctness + security audit; verify RLS
- [x] Land security blocker/highs: IDOR, SSRF, PostgREST injection (PR #4)
- [x] Dependency CVEs: 32 → 6; Next 16.1.6 → 16.2.7; full build verified
- [ ] **Merge PRs #2 → #3 → #4** after review (Sam tests each)
- [ ] **Decide AutoGuard ownership** → delete dead `src/lib/autoguard.ts` (confirmed: backend-owned, nothing to guard yet)
- [ ] Confirm Sentry is receiving events in prod (instrumentation shipped in PR #2)
- [ ] Review research "Want vs. Hate" matrix; lock beta feature priorities
- [ ] Run `/design-shotgun`; pick a CRM visual direction

## Week 2 (Jun 16–22) — Polish, beta gate, ship

- [ ] Implement chosen CRM redesign (Contacts, Pipeline, Discover, empty/cold-start states)
- [ ] Cold-start/onboarding pass (first-run when there's no data — a top research pain point)
- [ ] Address remaining audit mediums (below) per priority
- [ ] Beta access path: waitlist → invite → onboarding (throttle anon waitlist inserts)
- [ ] Full smoke test: sign-in → dashboard → contact → outreach draft → Discover swipe
- [ ] `vercel deploy --prod` via `kithnode-shipper`; canary watch post-deploy
- [ ] Onboard beta cohort

---

## Security/correctness backlog (from audit — not yet done)

**Needs Sam's judgment / product decision:**
- [ ] AutoGuard: delete dead `src/lib/autoguard.ts`; build real kill-switch into the backend sender loop **when** automated follow-ups ship
- [ ] Stored-XSS / header injection in intro email (security M1) — sanitize interpolated contact fields
- [ ] LLM prompt-injection hardening in outreach/enrich (security M2) — untrusted contact data flows into prompts
- [ ] Cron digest endpoint: static-bearer only, no replay/scope protection (security M4)
- [ ] Numeric ID coercion to FastAPI without validation (security M5)
- [ ] Add route tests for `intro/` and `pipeline/[id]/` (guards currently typecheck-verified only)

**Lower priority:**
- [ ] Ranker "monitor" floor for zero-signal contacts (correctness M3)
- [ ] `findWarmPaths` duplicate intermediaries on double-import (correctness M2)
- [ ] Throttle/captcha the public `waitlist_signups` anon insert (RLS advisor WARN)
- [ ] 6 residual `postcss`-via-`next` moderate CVEs — clear when Next ships the patch (do NOT `--force` downgrade)

---

## Beta-readiness checklist (gate for prod)

- [ ] Auth works end-to-end (Google OAuth → dashboard)
- [ ] Billing/trial gating correct (the 402 subscription gate is live + tested)
- [ ] No IDOR — contact access is own-or-rated everywhere (PR #4)
- [ ] No 5xx in Sentry across the core flow
- [ ] Core flows pass QA (`/qa`)
- [ ] Legal/privacy/terms linked + reachable (shipped PR #2)
- [ ] Onboarding + empty states polished (Track D)
- [ ] Production deploy green; canary clean for 24h

---

## Notes
- **Architecture reality:** Supabase access uses the service-role key (RLS bypassed) + NextAuth → **route-layer authorization is the only access control**. Every new user-scoped route MUST scope by the authed user (this is what the IDOR fixes enforced).
- **Tracker:** this file is primary. Mirror to Linear ("Opus solutions" team) only if Sam wants it.
