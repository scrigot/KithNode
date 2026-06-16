# The Edge — Network Gap Analysis → Outreach

Status: **parked / designed** (brainstormed 2026-06-14, build later). Owner: Sam.

## Why
KithNode already tells you *who* to reach. The Edge tells you *what you're missing to belong* — then turns each gap into a reason to reach out. You see the traits the people already in your target track have that you don't (skills, clubs, experiences), and the same people who have them become warm outreach targets ("ask them how they got it"). Insight feeds the core loop instead of being a dead-end report.

## Locked decisions (from brainstorm)
1. **Compare against** people in your **target firms/roles**, pooled at the **track/industry** level (not one firm), with a **minimum-support rule** so thin data never fabricates a gap.
2. **Each gap closes into outreach** — links the specific holders in your network + one-click draft. (Not a solo to-do list, not a passive report.)
3. **Surface:** dedicated dense sidebar tab named **"The Edge."**

## The engine (deterministic, no AI, free to run)
1. **Cohort.** Pool contacts whose `track` matches the user's target track(s). Track classification already exists on every contact (career-track taxonomy, PR #10). If the pool is under ~5 people → empty state ("import more target-track contacts to unlock The Edge"), never a gap.
2. **Gap math, per dimension.** Dimensions are the lists already stored on BOTH `User` and `AlumniContact`: `skills`, `clubMemberships`, `experiences`, `pastFirms`, plus coursework (`major`/`concentration`/`degrees`). For each trait the cohort has:
   - `support = holders / cohort_size`
   - A trait is a **gap** iff: the user lacks it **AND** `holders ≥ 3` **AND** `support ≥ 0.5`.
   - Rank gaps by `support`, then `holders`. Copy: *"4 of 6 (67%) of your IB contacts were in Investment Club — you weren't."*
3. **Canonicalization (the honesty-critical part).** Cluster trait strings against the **vendored option pools** already in the app (the ~151-club pool, the skills pool — per the standing "every input has a pool" rule) so "Investment Club" / "UNC Investment Club" / "Finance Club" collapse to one trait instead of fragmenting into sub-threshold noise. Free-text leftovers that don't map to a pool entry are lower-confidence and shown only if they still clear the threshold exactly.

## The action layer (the KithNode part)
Each gap row expands to the **holders** — the cohort members who have that trait — each with **"Ask how they got it,"** which pre-fills the existing outreach draft referencing that exact trait. Reuses `src/app/api/outreach/draft` + the credit model: **the insight is free (pure set math), the draft spends the normal 1 credit.** Gaps manufacture warm, specific outreach reasons → feeds the loop + revenue.

## Surface
New sidebar tab **"The Edge."** Dense two-pane: left = gaps grouped by dimension, ranked; click a gap → right pane = the holders + draft buttons + the honest sample line ("based on 6 IB contacts in your network"). Bloomberg density, no empty hero.

## Reuse map (why this is cheap)
- **No DB migration.** Every comparison field already exists on `User` and `AlumniContact` (`prisma/schema.prisma`).
- Parse helpers exist: `src/lib/club-memberships.ts`, `src/lib/educations.ts`, skills/experiences parsing in `src/lib/resume-extract.ts` / `linkedin-import.ts`.
- Track classification + target data already on the User and contacts.
- Outreach draft engine + credits already built.
- New code is mostly: one pure `computeEdge(user, cohort)` lib (set math + pool canonicalization) + one tab UI + wiring to the existing draft action.

## MVP cut (when built)
Skills + clubs + experiences only · track-level cohort · the 3-holder/50% rule · ranked list · holders + draft button · honest empty/sample states.

## Deferred
Per-firm drilldown when a single firm clears the threshold · AI "here's how to close your top 3 gaps" summary (paid) · coursework/major dimension · the solo improvement-to-do alternative · "reverse Edge" (what YOU have that they don't — your differentiators).

## Honesty guardrails (hard requirements)
- Never render a gap below the support threshold.
- Always show the sample size next to every claim.
- Cohort < ~5 → empty state, not noise.
- Never invent a trait the data doesn't contain.

## Open questions for build-time
- Exact thresholds (3/50%) may need tuning once tested against a real network — make them constants.
- Whether to also weight by recency/seniority of the holder (a senior who broke in years ago vs a current sophomore).
- Pool coverage: confirm skills pool is rich enough to canonicalize well, or whether a light synonym map is needed.
