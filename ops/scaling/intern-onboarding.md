# Intern Onboarding - P0 Pod Structure, Cadence, and SOPs

The doc you hand a new hire on day one. Tuned for the P0 institutional motion: the work is
pilots, student adoption, data, and procurement prep, not just student outreach.

## Day-one checklist (new hire)

- [ ] Read `roadmap-0-to-100k.md` (P0 section) and `automation-map.md`
- [ ] Read and sign `access-boundary.md`
- [ ] Get added to Slack, the Notion command center, and your pod's sheets
- [ ] Find your SOP block below; confirm your accounts and your owned sheet
- [ ] Post your first standup in `#standup`

## Pod structure

You manage four surfaces, not ten: three pods (each with a lead who reports to Sam) plus two
direct reports. Sam owns the institutional close and compliance directly.

| Pod | Members | Lead | Sam hears |
|-----|---------|------|-----------|
| Data | I1, I2 | I1 | rows added, quality flags |
| Growth (student adoption) | I3, I4, I5 | I5 | students onboarded, first-replies, pilot adoption % |
| Product / Quality | I6, I7, I8 | I8 | bugs, content shipped, corpus size |
| Direct | I9 (sales/pilot ops), I10 (ops/analytics) | - | pipeline movement, the daily digest |

## Cadence

- 09:00 async standup: everyone drops 3 lines in `#standup` (yesterday / today / blocked).
  I10 compiles a digest by 09:30.
- 09:30 Growth huddle (15 min): adoption is the renewal lever; it gets daily air.
- 12:30 and 16:30 first-reply / adoption pings: I5 posts wins to `#wins`.
- Friday 15:00 review (30 min): I10 presents the funnel + pilot pipeline; pod leads give 2
  min each; Sam sets one priority per pod.
- Standing 1:1s: Sam meets I10 weekly and rotates the three pod leads. Five conversations,
  not ten.

## SOPs by seat

### I1 - Alumni data (Data lead)
Space: `alumni-master.csv` + LinkedIn + firm sites + alumni directories; Slack `#data`.
Accounts: Google, LinkedIn, Notion. Day: pull verified alumni rows; verify firm tiers against
`src/lib/scoring.ts` (PRESTIGE_TIER_1/2 and FIRM_INDUSTRY); audit titles/grad-years; hand I2
the rows needing enrichment. Owns: dataset quality and the tier truth.

### I2 - Enrichment QA (Data)
Space: `alumni-master.csv` + Hunter + Apollo. Accounts: one capped Hunter/Apollo seat,
Google. Day: run rows through enrichment, mark `email_status`, dedupe, flag dead LinkedIn
URLs, return a clean batch. Never writes to prod; Sam imports. Owns: enrichment columns.

### I3 - Growth / recruiter (Growth)
Space: GroupMe/Discord + finance club channels + campus; Calendly; Granola; `design-partners.csv`.
Day: recruit students into the pilot, run live onboardings, log each. Owns: getting students in.

### I4 - Growth / activation (Growth)
Space: same as I3. Day: chase anyone stuck before first import/draft until they activate;
this is the adoption % that justifies the school paying. Owns: activation.

### I5 - Growth lead / first-reply and adoption
Space: sits with students; `design-partners.csv` + `outreach-corpus.csv`. Day: run the 09:30
huddle, get students to actually send outreach, log replies, post wins. Owns: the North Star
(real replies) and pilot-level adoption reporting.

### I6 - Content and build-in-public (Product/Quality)
Space: Notion calendar + Loops drafts + `../build-log.md` + social. Day: write the lead
magnet, draft a build-in-public post, draft onboarding sequences in Loops (Sam approves
sends). Owns: lead magnet + nurture drafts.

### I7 - Outreach corpus and AI quality (Product/Quality)
Space: `outreach-corpus.csv`; sits in on I5's sessions. Day: collect reply-getting emails,
label why, tag by warm/cold and ask-type; weekly, hand Sam the patterns for `src/lib/outreach.ts`
tuning. Owns: the authenticity training data.

### I8 - QA then support (Product/Quality lead)
Space: the app + Linear + Canny + `bug-feedback-log.csv`; Slack `#bugs`. Accounts: Linear
(create), Canny (admin), a beta test account (never prod admin). Day: run the smoke test
(sign-in, dashboard, contact, draft, Discover), file repro'd bugs, answer support under 1h.
Owns: reliability and the bug log.

### I9 - Sales / pilot ops (Sam-direct)
Space: CRM + `pilot-pipeline.csv` + Granola; email + Calendly. Day: research target schools,
map decision-makers, prep procurement docs, schedule discovery calls, keep the pipeline clean.
Owns: pipeline hygiene and pilot operations. Sam owns the relationship and the close.

### I10 - Ops / analytics (Sam-direct, chief-of-staff)
Space: PostHog (Viewer) + all sheets (read) + the Notion dashboard + `../tasks.md`. Day:
compile the standup digest, maintain the one dashboard (adoption, signups, first-replies,
pilot stages, open bugs, spend from `src/lib/ai-cost.ts`), flag the day's biggest leak, prep
Friday. Owns: the cockpit Sam runs from.

## How this maps to automation

Per `automation-map.md`, much of I1/I2 (data) and I10 (analytics) is already automatable via
existing pipelines, so as the team matures those seats shift from doing the work to curating
and judging it. The human-heavy seats (Growth, Sales/pilot ops) stay human because adoption
and the institutional close are relationship work.
