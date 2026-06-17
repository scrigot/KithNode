# KithNode: Zero to $100k MRR - The Complete Operating Roadmap

Canonical phase plan. This is the source of truth for the path; the rest of `ops/scaling/`
operationalizes it. Cross-reference `../roadmap.md` (the 8-lane x G0-G4 backbone). Authored
in a prior planning session; reformatted here to honor ETHOS (no em dashes, no emojis).

## North star and how to use this

Target: $100k MRR at $20 / student / mo.

- $100k MRR / $20 = ~5,000 active paid seats.
- Primary path: ~15 institutional site-license deals (career center buys for its finance
  cohort), avg ~350 seats ~= ~$7k MRR per logo.
- Secondary path: self-serve student subs at $20/mo, a bottom-up adoption wedge and demand
  proof, not the spine.

How to use it:

- Work top-down by phase; within a phase, the workstreams run in parallel.
- Each phase ends with exit criteria. Do not advance until they are true.
- The Always-on section lists cadences that never stop, every phase.

Three rules baked into the sequencing:

1. Pre-revenue, the constraint is proof plus procurement-readiness, not outbound volume.
2. Buyer is not the user. Career center pays; students must adopt or you do not renew.
3. Founder-led sales through P1. No one else closes a $7k institutional deal cold.

## Phase map

| Phase | Exit MRR | Paid logos | Spine of the work |
|-------|----------|------------|-------------------|
| P0 Foundation | $0 | 0 (2-3 free pilots) | Entity, MVP, Intelligence Layer v1, design partners, procurement-ready |
| P1 First Revenue | ~$15k | 1-3 | Founder-led close, case studies, SSO, pre-seed raise |
| P2 Repeatable | ~$45k | 5-8 | Sales playbook, scaled CS, SOC 2, first hires, renewals |
| P3 Scale | $100k | ~15-20 | Multi-rep sales, renewal engine, seed raise, FTE org |

## P0 - Foundation ($0, 2-3 design-partner pilots)

Founder and strategy: write the one-page thesis (who, the recruiting-outcomes problem, why
warm-signal scoring, why now); decide what to cut to make KithNode primary; define the ICP
(finance-track IB/PE/consulting students at target B-schools; buyer = career services);
pick the beachhead (UNC Kenan-Flagler); set the 0-to-100k operating plan; establish a weekly
operating rhythm.

Legal and corporate: incorporate as a Delaware C-corp; sign founder IP-assignment; confirm
UNC has no IP claim on student work before raising; file 83(b) within 30 days; set up the
cap table; file the KithNode trademark; draft ToS + Privacy Policy (student data); draft
customer contract templates (pilot agreement, MSA, order form, DPA).

Finance and ops foundation: open a business bank account (Mercury); set up bookkeeping day
one; corporate card + expense tracking (Ramp or Brex); build a runway and burn model;
finalize pricing ($20/student/mo, institutional site-license tiers, annual contracts);
decide billing mechanics (invoicing for institutional, Stripe Billing for self-serve).

Product and engineering: lock MVP scope (student app + career-center dashboard); set up
repo, CI/CD, Vercel envs; build auth keyed to a stable UUID, not a mutable email; fix RLS
(remove the service-role-key bypass, enforce real row-level security); move the hardcoded
Supabase URL to env config; build student onboarding, warm-signal capture, lead list +
score display, career-center dashboard v0 (cohort + placement tracking); model
multi-tenancy (school = tenant); wire Sentry + structured logging; add feature flags.

ML / intelligence layer: define the warm-signal taxonomy; build ingestion + enrichment;
stylometric fingerprinting v1; XGBoost lead-scoring v1; build the eval set + offline eval
harness; define the labeling process; add score explainability for career-center trust; set
up data + model versioning.

Design / UX: build the design system; design student app, career-center dashboard, and
onboarding flows; design real empty/loading/error states; brand identity v1.

Data privacy, security, compliance: do a FERPA review; classify all PII and where it lives;
ship privacy policy + DPA template; set the security baseline (encryption in transit/at
rest, access controls, secrets management); start SOC 2 readiness (Vanta or Drata); begin
the vendor security-questionnaire answer library; write the data retention + deletion policy.

Pilots and partnerships: define pilot success metrics (offer-rate lift, adoption %,
time-to-offer); write the pilot agreement + runbook; sign UNC Kenan-Flagler as design
partner #1; sign 1-2 more; recruit faculty + finance-club champions; set the cadence.

Sales pipeline (build it, do not sell yet): build the TAM model; build a tiered
target-account list (200+ schools); map decision-makers per account; stand up the CRM (Attio
or HubSpot); map every warm-intro path; book 10+ discovery conversations; write the
discovery-call script.

Customer success / onboarding (build the machine): write the onboarding playbook + flows;
build the adoption-tracking dashboard; stand up a help center v1; define account-health
metrics; embed in pilots to drive student sign-ups.

Growth / student adoption / community: launch a campus ambassador program v1; recruit a
student beta panel; sign finance-club channel partnerships; stand up the TikTok/IG content
engine; build the referral loop; ship a waitlist landing page.

Marketing / brand / outcomes: build the outcomes-measurement framework; ship the marketing
site; write core messaging and positioning; publish first thought-leadership content; set up
web analytics.

Analytics / RevOps: stand up the metrics stack + master dashboard; define the North Star
metric + inputs; build the Notion command center; set the standup + cadence system; set P0
OKRs.

People / hiring: decide which roles you actually need now; recruit core interns/contractors;
write onboarding docs + first SOPs; set up Slack.

Exit P0 when: MVP is live and stable; the Intelligence Layer produces scored leads; 2-3
design partners actively use it; FERPA posture + procurement pack ready; entity, banking,
and legal templates done; case-study baseline data is collecting.

## P1 - First Revenue ($0 to ~$15k MRR, 1-3 paid logos)

Founder personally closes the first 1-3 deals and leads the pre-seed raise end to end.
Finalize MSA/order form/DPA from real negotiations; prepare pre-seed instruments. Stand up
billing (institutional invoicing + Stripe self-serve), MRR/ARR tracking, revenue recognition.
Ship pilot-feedback fixes; build SSO (SAML, a hard university gate); roster/SIS import;
career-center reporting + exports; harden security. Retrain ML on real pilot data, calibrate
scores to outcomes, ship explainability into the dashboard. Clear the first schools'
procurement and security reviews; produce an accessibility VPAT; advance SOC 2 toward Type I.
Convert design partners to paid; produce 1-3 case studies with hard numbers; build an ROI
calculator; build the data room and pitch deck; close the pre-seed.

Exit P1 when: 1-3 paying logos at ~$15k MRR; at least one hard case study; pre-seed closed;
SSO + procurement are repeatable; adoption proven inside accounts.

## P2 - Repeatable (~$15k to ~$45k MRR, 5-8 logos)

Founder shifts from doing to designing systems; promote pod leads; write the repeatable GTM
motion. Ship self-serve admin, polish multi-tenant, build integrations (Handshake, LinkedIn,
calendar), in-app analytics, infra scaling. Build the ML retraining loop + drift monitoring,
per-school adaptation, a feature store, a model-quality dashboard. Move SOC 2 to Type II,
build the RFP-response machine, codify procurement, get cyber + E&O insurance. Codify the
sales playbook so a rep can run it solo; hire and onboard the first rep(s); design quota and
comp; scale to 5-8 logos. Build the renewals process and CS playbook; attack churn. Scale
content, community (Discord), and the ambassador program. Convert best interns to FTE; define
org structure and comp bands.

Exit P2 when: 5-8 logos at ~$45k MRR; a rep-runnable sales playbook; SOC 2 in progress or
done; first renewals secured; a predictable funnel.

## P3 - Scale (~$45k to $100k MRR, ~15-20 logos)

Founder in CEO mode (manage leads, not individuals); run the seed raise; land big
partnerships (career-services associations, multi-school systems); own positioning and the
moat. Drive reliability and perf at scale (SLAs); build feature depth from the customer
roadmap; mature the platform (audit logs, admin controls). Automate ML retraining end to end;
add new warm-signal sources; productize outcomes data as a feature. Reach full compliance
posture with fast procurement turnaround. Build a multi-rep sales team under a sales lead;
segment by territory/school tier; drive to 15-20 logos. Run a renewal + expansion engine and
an NPS program. Build a national ambassador network, the content machine, PR, an annual
outcomes report. Build the seed-stage financial model and board reporting; build out the
team and culture.

Exit P3 when: ~15-20 logos at $100k MRR; a working renewal engine; seed raised (or
default-alive); the org runs without you in every meeting.

## Always-on (every phase, never stops)

- Daily: async standup (yesterday / today / blockers).
- Weekly: pipeline review, metrics review, demo + retro, pod planning.
- Monthly: financial close, board/investor update, OKR check.
- Continuous: security + compliance upkeep, content cadence, CRM hygiene, customer-feedback
  loop, talk to 3+ users/buyers.
- Personal: protect training and sleep. Burnout kills the company faster than any competitor.

## The hard decisions

- What to permanently cut to make this primary.
- Self-serve vs institutional-primary: how much energy to each.
- When to raise vs stay default-alive on revenue.
- When to convert an intern to FTE vs keep hiring cheap.
- Build vs buy on infra (SSO, billing, SOC 2 tooling).
- Whether to expand the ICP beyond finance/B-school once the motion works.
- When KithNode forces a real decision about UNC enrollment and timing.
