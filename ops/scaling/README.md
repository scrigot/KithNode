# ops/scaling - The Intern-Ready Operating Kit

This directory is the operator kit for scaling KithNode from solo to a small team on the
path to $100k MRR. It exists so the business is "intern-ready out of the box": the
processes, access rules, financial model, tooling decisions, and templates are already
made, so onboarding a new hire is a half-day, not a week.

It is docs and templates only. Nothing here is wired into the product. The trust plane
(Stripe, Supabase, prod env, RLS, AutoGuard, deploy) stays with Sam. See `access-boundary.md`.

## Start here (read in this order)

1. `roadmap-0-to-100k.md` - the canonical phase plan (P0 to P3). Everything else
   operationalizes this. Cross-references `../roadmap.md` (the 8-lane x G0-G4 backbone).
2. `automation-map.md` - the core answer to "what can AI/automation do vs what stays
   human", pinned to real files in this codebase.
3. `tooling-and-accounts.md` - the full stack, the shared Claude Team policy, the access
   matrix, and the monthly cost roll-up.
4. `access-boundary.md` - the one-pager every intern signs before touching anything.
5. `intern-onboarding.md` - pod structure, daily/weekly cadence, and an SOP per seat.
6. `financial-model.md` + `templates/financial-model.csv` - the deal-based model to $100k MRR.

## Templates (`templates/`)

| File | What it is | Who owns it |
|------|------------|-------------|
| `financial-model.csv` | Deal-based driver model (logos x seats x $20 + self-serve) | Sam |
| `alumni-master.csv` | Alumni/contact dataset, mirrors the `AlumniContact` model | Data pod |
| `pilot-pipeline.csv` | Institutional sales pipeline + procurement gates | Sam (sales) |
| `design-partners.csv` | Student-side activation funnel | Growth pod |
| `outreach-corpus.csv` | Reply-getting outreach, labeled (authenticity training data) | I7 |
| `bug-feedback-log.csv` | Bug + feedback log, mirrors Linear/Canny and `/api/feedback` | I8 |
| `standup.md` | Daily async standup template | All |
| `weekly-review.md` | Friday pipeline + metrics + retro template | I10 / Sam |

## Week-1 setup checklist (Sam runs these once, before interns start)

- [ ] Create the Slack workspace; channels `#standup #data #growth #bugs #wins #sales`
- [ ] Create the Notion command center; one SOP page per seat (copy from `intern-onboarding.md`)
- [ ] Stand up the CRM (Attio or HubSpot) and import `pilot-pipeline.csv`
- [ ] Create the 5 Google Sheets from `templates/` and share edit access per pod only
- [ ] Add interns to PostHog as Viewers (read-only)
- [ ] Set Linear (I8 create, others comment) and Canny (I8 admin) roles
- [ ] Provision one Hunter/Apollo seat for I2 with a hard monthly lookup cap
- [ ] Buy Claude Team seats per `tooling-and-accounts.md` (1 Premium, N Standard)
- [ ] Have every intern read and sign `access-boundary.md`

## Conventions

This kit follows the repo ops conventions: tasks tagged `[Lane][Gate]` live in `../tasks.md`;
substantive sessions end with an `OPS_LOG:` marker (auto-appended to `../build-log.md`);
honesty-clamped writing (no fabricated metric without a source or an "(illustrative)" tag);
no em dashes, no emojis (per `../ETHOS.md`).
