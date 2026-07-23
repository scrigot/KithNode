# KithNode Tasks (canonical)

> Agents: read at session start, update before you finish. This is the source of truth for "what's next." Full shipped history is in build-log.md.
> Gate backbone (lanes x gates, the Founder OS): `ops/roadmap.md`. KithNode is at **G0**. Tag new tasks `[Lane][Gn]`.

## Now (active)
- [ ] [Product/Eng][G0] Beta launch prep (one real user today; beta this week)
- [ ] [Product/Eng][G0] Deploy the DeepTutor-inspired product cutover, then run authenticated production smoke tests for Home, Companies, Applications, Documents, OAuth, AI, and browser-companion recovery.
- [ ] [Product/Eng][G0] WA-00: Make local KithNode fixture-first and secret-free, with a guarded live mode and ≤15-minute golden-path setup.
- [ ] [Product/Eng][G0] WA-01: Add user-owned relationship evidence, backfill private facts, and enforce two-user tenant isolation.

## Next
- [ ] [Product/Eng][G0] WA-02: Replace warm-tier, warmth-score, affiliation-only, and same-firm heuristics with one canonical relationship classifier.
- [ ] [Product/Eng][G0] WA-03: Add durable assistant runs and server-stored internship candidates.
- [ ] [Product/Eng][G0] WA-04: Add idempotent preview, approval, atomic save, completion receipt, and ten-minute undo.
- [ ] [Product/Eng][G0] WA-05: Integrate the safe Phase 0 workflow into Home and pass authenticated desktop/mobile/accessibility E2E.
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
- [x] [Product/Strategy][G0] Complete `/autoplan` CEO, product-design, engineering, and connector/DX reviews for the personal AI recruiting agent; lock the warm-path internship Phase 0 plan and implementation gates (2026-07-23)
- [x] [Product/Eng][G0] Make People saved views truthful and visibly distinct: alphabetical All people, relationship-only Warm paths, missing-data Needs context, with counts and explanations (2026-07-23; focused tests, typecheck, and lint passed)
- [x] [Product/Eng][G0] DeepTutor-to-KithNode product transplant: light application shell, full Home Copilot, linked People/Companies/Applications/Documents/Research workspaces, functional Memory and Knowledge Center, category-card Settings, public demo/auth/error states, compatibility redirects, additive canonical-record migration, live organization backfill, and desktop/mobile QA (2026-07-23; 1,252 tests, typecheck, lint, migration verification, production build, and authenticated browser QA passed)
- [x] [Product/Eng][G0] Guided Network Research release zero: intent-first Discover desk, private draft queue, transactional field-level commits with provenance, owner-safe shared overlays, removal of automated LinkedIn reads, and an owner-only no-DOM Chrome companion (2026-07-21; 1,191 tests, migration verification, lint, production build, and authenticated desktop/mobile visual QA passed)
- [x] [Product/Eng][G0] Recruiting workstation: canonical Applications + timeline APIs, five-hub navigation, nested Settings, action-first Overview, Career Toolkit, responsive mobile pipeline, DESIGN.md, and fixture-only `/demo` (2026-07-20; 1,191 tests, migration verification, lint, and production build passed locally)
- [x] KN-FU1: GET privacy-blanking regression tests (0907d5b)
- [x] KN-FU2: findPoolRow `.single()` to `.maybeSingle()` (5182b5f)
- [x] Cross-tenant takeover fix + link-on-match + read-side privacy scoping (c236acb, 9240068)
- [x] KN-001..008 MVP stories
