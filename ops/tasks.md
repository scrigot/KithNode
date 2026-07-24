# KithNode Tasks (canonical)

> Agents: read at session start, update before you finish. This is the source of truth for "what's next." Full shipped history is in build-log.md.
> Gate backbone (lanes x gates, the Founder OS): `ops/roadmap.md`. KithNode is at **G0**. Tag new tasks `[Lane][Gn]`.

## Now (active)
- [ ] [Product/Eng][G0] Beta launch prep (one real user today; beta this week)
- [ ] [Product/Eng][G0] WA-00: Make local KithNode fixture-first and secret-free, with a guarded live mode and ≤15-minute golden-path setup.

## Next
- [ ] [Product/Eng][G0] WA-06: Roll out to internal users, then one 10–20-student UNC cohort behind a feature flag.
- [ ] [Growth][G0] Marketing Phase 0 wiring: source-tag the /waitlist (`?source=` capture) + add lead-magnet download to /waitlist/thanks. See `marketing/strategy.md`.
- [ ] [People/Hiring][G0] Stand up the intern-ready ops kit (see `ops/scaling/`): run the week-1 setup checklist in `ops/scaling/README.md`.
- [ ] [Sales][G0] Build the procurement answer-library Claude Project (FERPA / security questionnaire / SSO / DPA) per `ops/scaling/automation-map.md`.
- [ ] [Ops][G0] Trust-plane automation backlog (Sam-owned): email-inbound reply webhook, Loops sequence wiring, batch enrichment runner. See `ops/scaling/automation-map.md`.

## Blocked
- (none)

## Later / demand-gated
- [ ] [Product/Eng][G1] Complete legal/privacy review before distributing the private no-DOM research companion beyond the owner.
- [ ] [Product/Eng][G1] Add persisted cross-device research sessions only if local drafts and same-device handoff prove insufficient.
- [ ] [Product/Eng][G1] Evaluate LinkedIn OIDC beyond basic identity only after product access is approved.

## Done (recent; see build-log.md for detail)
- [x] [Product/Security/Eng][G0] Complete WA-05 signed-in desktop/mobile/accessibility QA and production dependency remediation: exact saved-application questions now use canonical Applications context, student opportunity discovery routing remains separate, Command/Ctrl+Enter works, large People/Companies/Documents views render in bounded groups, and dependency findings fell from 15 (2 critical) to 5 (0 critical; remaining upstream build-tool advisories) (2026-07-24; 1,259 tests, 4 skipped, typecheck, lint, production build, signed-in browser checks, and exact Scale AI application evidence check passed)
- [x] [Product/Eng][G0] Deploy the DeepTutor-inspired product cutover and trusted internship/warm-path agent to production; configure canonical environment readiness, repair large-network relationship lookups, and make Applications saves canonical across tracking URLs without downgrading user-authored stage, priority, notes, deadline, or next action. Production now discovers five official student opportunities, finds verified contacts, reuses the tracked Scale AI record exactly once, and provides recorded reversible mutations (2026-07-24; 1,258 tests, 4 skipped, migration reconstruction and both transaction verifiers, typecheck, lint, production build, readiness, signed-in Home/Applications smoke, and public landing/demo checks passed)
- [x] [Product/Eng][G0] WA-01–04 trusted internship agent kernel: user-owned relationship evidence, one conservative verified/potential classifier shared by People and Copilot, durable server-stored candidates, official-source student eligibility, evidence-backed action previews, idempotent atomic save, verified-contact attachment, receipts, denial, and undo. Additive production migrations deployed with RLS and service-role-only grants (2026-07-23; local reconstruction and transaction verifier, live Scale AI/Databricks smoke, 1,256 tests, typecheck, lint, production build, hosted schema/grant/function/advisor verification passed)
- [x] [Product/Strategy][G0] Complete `/autoplan` CEO, product-design, engineering, and connector/DX reviews for the personal AI recruiting agent; lock the warm-path internship Phase 0 plan and implementation gates (2026-07-23)
- [x] [Product/Eng][G0] Make People saved views truthful and visibly distinct: alphabetical All people, relationship-only Warm paths, missing-data Needs context, with counts and explanations (2026-07-23; focused tests, typecheck, and lint passed)
- [x] [Product/Eng][G0] DeepTutor-to-KithNode product transplant: light application shell, full Home Copilot, linked People/Companies/Applications/Documents/Research workspaces, functional Memory and Knowledge Center, category-card Settings, public demo/auth/error states, compatibility redirects, additive canonical-record migration, live organization backfill, and desktop/mobile QA (2026-07-23; 1,252 tests, typecheck, lint, migration verification, production build, and authenticated browser QA passed)
- [x] [Product/Eng][G0] Guided Network Research release zero: intent-first Discover desk, private draft queue, transactional field-level commits with provenance, owner-safe shared overlays, removal of automated LinkedIn reads, and an owner-only no-DOM Chrome companion (2026-07-21; 1,191 tests, migration verification, lint, production build, and authenticated desktop/mobile visual QA passed)
- [x] [Product/Eng][G0] Recruiting workstation: canonical Applications + timeline APIs, five-hub navigation, nested Settings, action-first Overview, Career Toolkit, responsive mobile pipeline, DESIGN.md, and fixture-only `/demo` (2026-07-20; 1,191 tests, migration verification, lint, and production build passed locally)
- [x] KN-FU1: GET privacy-blanking regression tests (0907d5b)
- [x] KN-FU2: findPoolRow `.single()` to `.maybeSingle()` (5182b5f)
- [x] Cross-tenant takeover fix + link-on-match + read-side privacy scoping (c236acb, 9240068)
- [x] KN-001..008 MVP stories
