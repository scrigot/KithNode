# Automation Map - What AI/Automation Does vs What Stays Human

The core answer to "how much of the team's work can be replaced or augmented by automation
or AI agents." Every row is pinned to a real hook in this codebase so it is buildable, not
aspirational. Classification:

- Automate: deterministic, already has API/cron surface. A script or scheduled job does it.
- AI-agent: needs judgment + language, but a Claude command/Project can draft it; a human reviews.
- Human-only: relationship, trust, or compliance judgment that must not be delegated to a model.

The big realization from the codebase audit: KithNode is already heavily API-driven, so a
large share of the "intern work" is automatable today.

## The map

| Workstream | Class | Hook (real path) | Residual human task |
|------------|-------|------------------|---------------------|
| Alumni / contact data collection | Automate | `POST /api/import/linkedin`, `POST /api/discover/run` (6-stage), `parseLinkedInCSV` in `src/lib/linkedin-csv.ts` | Choose which firms/cohorts to target |
| Enrichment QA | Mostly automate | `src/lib/discover/email-finder.ts` (Hunter), `/api/contacts/score`, `backend/app/core/preference_learner.py` | Tier-3 manual email verification on low-confidence rows |
| Student activation (first outreach) | Automate | `POST /api/outreach/draft` (`src/lib/outreach.ts`), follow-up cron `src/app/api/cron/followups/route.ts` | Spot-check tone before batch enabling |
| First-reply tracking / kill-switch | Automate | `src/lib/autoguard.ts`, `PATCH /api/contacts/[id]/status` | None once the inbound webhook exists (see backlog) |
| Outreach corpus (authenticity data) | AI-agent | Feeds `src/lib/outreach.ts`; logged in `templates/outreach-corpus.csv` | Human collects real replies; AI labels why they worked |
| Content / build-in-public | AI-agent | Extend `/kithnode-content-engine`; drafts land in `marketing/queue/` | Human approves every post; honesty-clamp numbers |
| Procurement / security questionnaires / RFPs | AI-agent | Claude Project holding the answer library (see `tooling-and-accounts.md`) | Human reviews and signs; never auto-submit |
| FERPA / DPA / contract redlines | AI-agent | Drafts from the legal templates (P0 legal workstream) | Founder + counsel approve |
| Sales pipeline research | AI-agent | Account + decision-maker mapping into `templates/pilot-pipeline.csv` | Founder owns the relationship and the close (founder-led through P1) |
| CS / onboarding / support | Automate + AI | Smoke-test checklist + `/api/feedback` inbox; AI triages feedback by keyword | Human handles account-health calls and escalations |
| Analytics / ops digest | Automate | Extend `/kithnode-morning-list`; PostHog events + `UsageEvent` + `src/lib/ai-cost.ts` | Decide what the numbers mean and what to do |
| Cost / budget reconciliation | Automate | `src/lib/ai-cost.ts` (Anthropic token pricing) + `UsageEvent` table | Set budget caps and review monthly |

## What this means per phase

- P0: automation covers most data and analytics work, so the few humans focus on pilots,
  student activation, and procurement prep. One person plus the existing pipelines does the
  work of a small data team.
- P1: the procurement answer-library agent and the contract-draft agent are the highest
  leverage, because founder-led selling is bottlenecked by paperwork, not conviction.
- P2-P3: automation handles the repeatable middle (enrichment, content, reporting, support
  triage), so headcount goes to sales reps and CS who do the irreducibly human work.

## What stays human, and why

- The institutional close. A $7k/year career-services deal is founder-led through P1. A model
  can research the account and draft the email; it cannot build the trust that signs.
- Authenticity of outreach. Authenticity is the product (see `../ETHOS.md`). AI assists
  drafting from the human corpus, but the voice and the judgment of when to send stay human.
  AutoGuard exists precisely to stop robotic follow-ups; never bypass it.
- FERPA and student-record judgment. Compliance decisions about student educational records
  are not delegated to a model. AI drafts; humans (and counsel) decide.
- Anything on the trust plane. See `access-boundary.md`.

## Highest-ROI automations to build next (ranked)

Trust-plane items are Sam-owned because they touch prod, customer data, or money. These are
specs, not built in this kit.

1. Procurement / security-questionnaire answer-library agent (Claude Project). Unblocks
   founder-led sales. No prod access needed; safe to build first.
2. Email-inbound reply webhook -> auto-update `Connection.status` + trigger AutoGuard.
   Closes the first-reply tracking loop. Trust-plane (Sam-owned).
3. Loops wiring for onboarding + activation sequences. Referenced in `AGENTS.md` but not yet
   wired in the codebase. Trust-plane (Sam-owned).
4. Batch enrichment runner (scheduled `discover/run` + import over a target list). Builds the
   dataset without a human in the loop. Trust-plane (Sam-owned, capped spend).
5. Daily ops digest: extend `/kithnode-morning-list` to read PostHog + `UsageEvent` and post
   to Slack. Low risk, high daily value.
