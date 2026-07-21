# KithNode end-to-end audit and implementation plan

Audit date: 2026-07-10  
Repository: `scrigot/KithNode`  
Baseline: `origin/main` at `2b14e87`

## Executive call

KithNode has a substantial working product: authentication, onboarding, contact import and enrichment, discovery, scoring, pipelines, outreach drafting, network graphs, nodes/friends/messages, a personal `/me` workspace, resume tooling, application tracking, Stripe, email, analytics, error monitoring, a Chrome extension, and an operations cockpit.

The product is not yet an end-to-end agentic career system. The main problem is fragmentation, not a lack of screens. There are overlapping data and execution paths across the main Next.js app, `/me`, a legacy FastAPI service, Supabase-only tables, and the extension. AI is implemented as isolated generators. There is no unified assistant loop that observes the user's goals and history, recommends a next action, asks for approval, performs the action, and learns from the result.

The recommended architecture is:

1. Make Next.js + Postgres/Supabase the single product and data plane.
2. Retire the legacy FastAPI path after porting the few remaining callers, or secure and tenant-scope it before any continued production use.
3. Merge the best `/me` workflows into one user-scoped product model instead of maintaining a permanent owner-only fork.
4. Add an assistant kernel with typed tools, durable memory, approval gates, audit logs, and outcome feedback.
5. Close the real-world loops through email, calendar, and job-source integrations.

Call the experience an **agentic career copilot**, not AGI. The useful promise is concrete: it remembers the user's career goals and relationships, proposes the right next step, prepares the work, executes approved actions, and updates its plan from results.

## Evidence and verification

- 706 tracked files; 525 TypeScript/TSX source files.
- 91 Next.js API routes and 45 pages.
- 115 frontend test files; 1,135 tests pass.
- TypeScript, ESLint, Vitest, and the production Next build pass.
- 91 API routes exist, but 66 have no co-located route test.
- The FastAPI backend has 34 test functions across 6 files, but `pytest` is not installed in the current Python environment and GitHub Actions does not run backend tests.
- The production site is healthy and unauthenticated `/dashboard` and `/me` requests redirect to sign-in.
- GitHub has no open issues, so the actual backlog lives in markdown and cannot be triaged, assigned, or tracked through PRs.
- `npm audit --omit=dev` reports 23 production dependency findings: 1 high, 21 moderate, and 1 low.
- The build emits a deprecated Next.js middleware warning, a deprecated Sentry configuration warning, and invalid Recharts container-size warnings during static generation.
- Supabase production is healthy on Postgres 17. Production has many migrations not represented in the checked-in migration directories.

## Confirmed defects and missing implementation

### P0: security and data integrity

1. **The FastAPI service has no authentication or tenant boundary.** Its contact, pipeline, dashboard, discovery, preference, and outreach routes directly read and mutate a shared database. `src/lib/api.ts` sends no service credential. If the service is publicly reachable, a caller can enumerate contact data, generate drafts at the owner's expense, and mutate pipeline/outreach state. The current documented Railway health URL returns 404, but Vercel has a production `FASTAPI_URL`, so the actual target must be verified.

2. **A production `SECURITY DEFINER` function is public.** `public.mz_refresh()` deletes and rebuilds founder KPI mirror tables and can currently be executed by `anon` and `authenticated`. Revoke it immediately from `PUBLIC`, `anon`, and `authenticated`; move it to a private schema or grant only `service_role`/an operations role.

3. **Production schema history is not reproducible from the repository.** Supabase reports roughly 60 applied migrations, while the repo contains only a small subset split between `prisma/migrations`, `supabase/migrations`, and manual `ops/migrations`. A clean environment cannot be trusted to reproduce production.

4. **Thirty-four RLS-enabled production tables have no policy.** Some are intentionally server-only and therefore fail closed, but legacy FastAPI tables, assistant tables, founder tables, and temporary backup tables are mixed together. Classify each table as client-owned, server-only, or obsolete, then encode the decision in migrations.

5. **Legacy backup tables remain in `public`.** `_phase1_bk_*` tables should be exported to encrypted backup storage and dropped after verification, not left indefinitely in the Data API schema.

### P0: broken or misleading product paths

1. `src/app/dashboard/_components/quick-action-rail.tsx` links the next-best-action card to `/dashboard/contacts/[id]`, but no such page exists. The actual detail route is `/contact/[id]`.
2. The same quick-action tier selector never applies its selected tiers; it always navigates to `/dashboard/contacts` without query state.
3. The weekly goal controls explicitly say “Local only — persistence coming soon” despite `User.weeklyGoalTarget` existing.
4. `src/app/api/dashboard/coverage/route.ts` and `reminders/route.ts` silently turn backend failures into valid-looking empty data. The UI cannot distinguish “nothing to do” from “integration is down.”
5. The Chrome extension documentation says it posts to `/api/import/linkedin`, but `extension/background.js` posts to the owner-only `/api/me/discover/leads`. Its documented/default localhost ports also disagree. It is not a reliable general-user integration.
6. Live `chat_conversation`/`chat_message` and `AgentRoom`/`AgentMessage`/`AgentEvent` tables have no corresponding application code. They are abandoned schema, not a functioning assistant.

### P1: reliability and maintainability

1. The checked-in `.env.example` covers only a subset of environment variables used by the application. Missing entries include cron/dev secrets, Microsoft OAuth, Sentry, feature flags, personal mode, GroupMe, Supabase JWT, public app URL, Resend webhook signing, and several compatibility aliases.
2. Runtime env validation does not exist. Misconfiguration is discovered only when a route is called.
3. Fifty-seven routes parse JSON request bodies; only a small fraction use Zod. Several AI-output helpers import Zod even though it is not a direct dependency.
4. The backend requirements use lower bounds instead of a lockfile, making deployments non-reproducible.
5. `README.md`, `DEPLOY.md`, `HANDOFF.md`, `AGENTS.md`, and the extension README disagree with current architecture and deployed behavior. `AGENTS.md` claims Loops and Canny integrations that do not exist in code.
6. Errors are frequently swallowed or converted to empty arrays. Best-effort behavior is appropriate for analytics, but not for user-visible data and action paths.
7. Identity still mixes UUIDs and email strings across product subsystems. This is explicitly visible in Stripe metadata, tag ownership, intro requests, legacy FastAPI data, and `/me`.
8. There is no automated browser E2E suite for sign-in, onboarding, import, discover, pipeline, outreach, resume, and application flows.

## Target architecture

### One data model

- `User.id` is the immutable tenant key everywhere.
- Email is an attribute and delivery address, never an ownership key.
- Shared professional identity lives in `PersonProfile` (the successor to globally shared `AlumniContact`).
- Private relationship data lives in `Relationship`: owner, person, notes, warmth, last contact, follow-up policy, source, and consent/provenance.
- `Opportunity` represents jobs, internships, fellowships, and recruiting processes.
- `Pipeline` and `PipelineEntry` support both relationships and opportunities through typed pipeline kinds.
- `Interaction` is the canonical timeline for email, message, call, meeting, note, intro, pipeline movement, and outcome.
- `Artifact` stores resumes, cover letters, outreach drafts, prep briefs, and job-specific variants.
- `Goal`, `Task`, and `Recommendation` power planning and next-best actions.
- `AssistantConversation`, `AssistantMessage`, `AssistantRun`, `ToolCall`, `Approval`, and `Memory` power the copilot with a complete audit trail.

Do not rename all existing tables in one migration. Add the new boundaries, backfill them, dual-read behind flags, verify, then remove legacy tables.

### One execution plane

Keep user-facing orchestration in Next.js route handlers and server modules. Use a queue/worker only for long-running enrichment, batch discovery, webhook processing, and scheduled recommendations. Do not keep a second public API with an independent schema.

Recommended new boundaries:

- `src/lib/domain/` — canonical domain types and invariants.
- `src/lib/repositories/` — tenant-scoped data access; no route talks directly to the service-role client.
- `src/lib/assistant/` — context builder, planner, tool registry, approvals, memory, evaluations.
- `src/lib/integrations/` — Gmail/Outlook, calendars, job sources, enrichment, messaging, storage.
- `src/lib/jobs/` — idempotent background job definitions and retry policy.
- `src/app/api/assistant/` — chat, recommendations, approvals, and tool execution.
- `src/app/api/integrations/` — OAuth callbacks, sync status, and webhooks.

### Assistant control loop

Every assistant run should follow this state machine:

1. Load the user's goal, profile, opportunity pipeline, relationship graph, recent interactions, deadlines, and preferences.
2. Produce structured recommendations with evidence and confidence.
3. Convert an accepted recommendation into typed tool calls.
4. Require explicit approval for external sends, introductions, application submission, calendar writes, data deletion, money, or bulk actions.
5. Execute idempotently, record the result, and surface failures.
6. Update tasks, interaction history, and durable memory from the verified outcome.
7. Evaluate the recommendation against the eventual result so ranking improves over time.

The model must never directly write memory or arbitrary database fields. It returns a typed proposal; deterministic code validates and applies it.

## Implementation phases

## Phase 0 — make the current product trustworthy

Target: 3–5 days.

### Security hotfixes

- Add a Supabase migration that revokes `EXECUTE` on `public.mz_refresh()` from `PUBLIC`, `anon`, and `authenticated`; move it to an internal schema or grant only the service role.
- Inventory every public table and add a checked-in manifest: owner, access class, retention, RLS policy, and deletion date.
- Export and drop `_phase1_bk_*` tables after row-count/hash verification.
- Decide the FastAPI fate immediately:
  - Recommended: block public ingress, port remaining live behavior, then delete it.
  - Temporary fallback: require `Authorization: Bearer <INTERNAL_API_SECRET>`, validate a signed user/tenant claim, enforce tenant predicates in every query, add rate limits and audit logs, and rotate the secret.
- Verify the actual Vercel `FASTAPI_URL` target and record health/deploy ownership.

Files:

- New `supabase/migrations/<generated>_lock_internal_functions.sql`
- New `supabase/migrations/<generated>_classify_legacy_tables.sql`
- New `docs/DATA_INVENTORY.md`
- If retained: `backend/app/core/auth.py`, `backend/app/main.py`, every `backend/app/routers/*.py`, `src/lib/api.ts`

### Fix current UX defects

- Fix next-best-action route and preserve tier filters in URL state.
- Persist `weeklyGoalTarget` through a validated user-preferences endpoint.
- Replace empty-success fallbacks for coverage/reminders with typed degraded responses and visible UI status.
- Update the extension to use one supported ingest endpoint for every authenticated user; add an extension token/OAuth flow instead of relying on third-party cookie behavior.

Files:

- `src/app/dashboard/_components/quick-action-rail.tsx`
- `src/app/api/user/preferences/route.ts`
- `src/app/api/dashboard/coverage/route.ts`
- `src/app/api/dashboard/reminders/route.ts`
- `src/app/dashboard/page.tsx`
- `extension/background.js`, `extension/panel.js`, `extension/manifest.json`, `extension/README.md`
- New `src/app/api/extension/token/route.ts`

### Make configuration fail fast

- Add `src/lib/env/server.ts` and `src/lib/env/client.ts` with Zod schemas.
- Add `zod` as a direct dependency.
- Validate only the variables required for the current runtime/feature flags, but make each enabled integration fail startup with a clear message when incomplete.
- Replace aliases (`SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`) with one canonical name and a temporary compatibility warning.

Files:

- `package.json`, `package-lock.json`
- `.env.example`, `backend/.env.example`
- `src/lib/env/server.ts`, `src/lib/env/client.ts`
- `src/lib/supabase.ts`, `src/lib/db.ts`, `src/lib/stripe.ts`, `src/lib/auth.config.ts`
- `DEPLOY.md`, `README.md`

## Phase 1 — consolidate the product and schema

Target: 1–2 weeks.

### Retire FastAPI duplication

- Port the remaining coverage/reminder logic into `src/lib/dashboard/` using canonical Postgres tables.
- Replace backend `rateContact` and `updateOutreachStatus` calls with tenant-scoped Next.js services.
- Confirm no production caller remains with code search, access logs, and a two-week shadow period.
- Remove `FASTAPI_URL`, the Vercel experimental backend service, Railway documentation, Python pricing duplication, and eventually `backend/`.

Files:

- New `src/lib/dashboard/coverage.ts`, `src/lib/dashboard/reminders.ts`
- New `src/lib/outreach/status.ts`, `src/lib/discover/rating.ts`
- `src/app/api/dashboard/coverage/route.ts`, `reminders/route.ts`
- `src/app/api/contacts/[id]/status/route.ts`, `rate/route.ts`
- `src/lib/api.ts`, `src/lib/autoguard.ts`, `src/lib/ai-cost.ts`
- `vercel.json`, `DEPLOY.md`, `README.md`, `.env.example`
- Delete `backend/` only after the shadow verification gate passes.

### Unify `/dashboard` and `/me`

- Treat `/me` as the product incubator, not a permanent second app.
- Migrate its resume, applications, prep, memory, discovery leads, and richer outreach features into normal authenticated routes.
- Replace `meUserEmail()` with `requireUser()` returning the session UUID.
- Add a backfill from `Me*` tables to the canonical models; maintain redirects from `/me/*` during rollout.
- Keep owner-only founder operations under `/dashboard/ops`, not mixed with career features.

Files:

- `src/lib/me/config.ts`, `src/lib/me/db.ts`, `src/app/me/**`, `src/app/api/me/**`
- New `src/lib/auth/require-user.ts`
- New canonical pages under `src/app/dashboard/applications`, `resume`, `prep`, and `assistant`
- New Supabase migrations for canonical opportunity, relationship, interaction, artifact, and assistant tables

### Reconcile migration history

- Pull a production schema snapshot into a disposable branch/environment.
- Create a baseline migration for existing production state and verify a new local Supabase instance can reproduce it.
- Choose Supabase migrations as the sole DDL history. Prisma schema remains the application model; `prisma db push` is never used against production.
- Add CI schema drift detection and generated-type drift detection.

Files:

- `supabase/migrations/**`
- `prisma/schema.prisma`, `prisma.config.ts`
- New `scripts/db/check-drift.sh`
- `.github/workflows/ci.yml`
- `AGENTS.md`, `WORKFLOW.md`, `DEPLOY.md`

## Phase 2 — build the agentic career copilot

Target: 2–4 weeks for the first complete loop.

### Assistant kernel

Build one assistant surface that can answer:

- “Who should I contact today and why?”
- “What is blocking each application?”
- “Draft the next follow-up in my voice.”
- “Prepare me for tomorrow’s calls.”
- “Which relationships are going cold?”
- “Tailor my resume for this role and show every claim’s evidence.”
- “Make a plan for landing this job, then keep it current.”

New files:

- `src/lib/assistant/context.ts`
- `src/lib/assistant/planner.ts`
- `src/lib/assistant/schemas.ts`
- `src/lib/assistant/tools/registry.ts`
- `src/lib/assistant/tools/contacts.ts`
- `src/lib/assistant/tools/opportunities.ts`
- `src/lib/assistant/tools/outreach.ts`
- `src/lib/assistant/tools/calendar.ts`
- `src/lib/assistant/tools/resume.ts`
- `src/lib/assistant/approvals.ts`
- `src/lib/assistant/memory.ts`
- `src/lib/assistant/audit.ts`
- `src/app/api/assistant/chat/route.ts`
- `src/app/api/assistant/recommendations/route.ts`
- `src/app/api/assistant/approve/route.ts`
- `src/app/dashboard/assistant/page.tsx`

Requirements:

- Stream responses, but persist complete runs and structured tool events.
- Use JSON schema/Zod for every model output.
- Treat contact notes, emails, resumes, scraped pages, and job descriptions as untrusted prompt content.
- Apply per-user cost and rate limits.
- Add prompt/model versioning and an offline evaluation dataset.
- Show “why this recommendation,” data freshness, and the exact records used.
- Require approval before any external side effect.

### Recommendation engine

Start deterministic, then let the model explain and sequence:

- Deadlines and overdue follow-ups.
- High-value warm paths.
- Relationship decay and reciprocity.
- Application-stage blockers.
- Resume/job-description gaps backed by real evidence.
- Upcoming meetings without a prep brief.
- Contacts with positive replies but no scheduled next step.

Files:

- New `src/lib/recommendations/rules.ts`
- New `src/lib/recommendations/rank.ts`
- New `src/lib/recommendations/explain.ts`
- New `src/app/api/recommendations/route.ts`
- Replace the hard-coded quick-action logic in `quick-action-rail.tsx`.

## Phase 3 — close the real-world loops

Target: staged integration work after the assistant kernel is stable.

### Email: highest value

- OAuth Gmail and Microsoft Graph mail access with least-privilege scopes.
- Import thread metadata for known contacts; do not ingest the entire mailbox.
- Detect sent outreach, replies, bounces, and meeting intent.
- Update `Interaction`, pipeline state, and AutoGuard automatically.
- Draft replies, but require user approval before sending.
- Preserve Resend for transactional product email; add Loops only if lifecycle marketing needs exceed the existing cron emails.

New envs:

- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (or explicitly reuse the auth client after scope review)
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- `OAUTH_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_PUBSUB_VERIFICATION_TOKEN` or the selected webhook verification secret
- `MICROSOFT_WEBHOOK_CLIENT_STATE`
- Optional `LOOPS_API_KEY`

### Calendar

- Read upcoming recruiting/networking meetings.
- Link events to contacts and opportunities.
- Generate cached prep briefs automatically.
- Suggest times and create events only after approval.
- Create follow-up tasks immediately after meetings.

New files:

- `src/lib/integrations/google/calendar.ts`
- `src/lib/integrations/microsoft/calendar.ts`
- `src/app/api/integrations/calendar/callback/route.ts`
- `src/app/api/integrations/calendar/webhook/route.ts`

### Job sources

- Support user-added URLs first.
- Add parsers/connectors for public Greenhouse and Lever postings.
- Add email-based application-status ingestion.
- Treat Workday and LinkedIn as user-assisted capture unless an authorized API/partnership exists; do not build brittle credential automation.
- Normalize job requirements, deadlines, people, and application status into `Opportunity`.

New files:

- `src/lib/integrations/jobs/greenhouse.ts`
- `src/lib/integrations/jobs/lever.ts`
- `src/lib/integrations/jobs/email-status.ts`
- `src/app/api/opportunities/import/route.ts`
- Extension support for “Save this job to KithNode.”

### Documents

- Store canonical resumes and generated variants with lineage.
- Add DOCX and PDF export with render verification.
- Optionally sync approved artifacts to Google Drive or OneDrive.
- Never invent resume claims; every generated bullet links to evidence or is marked as a user assertion.

## Phase 4 — quality, evaluation, and scale

### Test pyramid

- Unit: domain invariants, parsers, ranking, memory merges, approval policy.
- Route: every mutation, tenant boundary, validation failure, idempotency, and provider failure.
- Contract: Google/Microsoft/Stripe/Resend/Hunter/PDL webhook fixtures.
- Database: migration-from-zero, RLS tests for anon/authenticated/service roles, schema drift.
- E2E: sign in → onboard → import → discover → pipeline → draft → mark sent → reply webhook → AutoGuard → meeting prep → application update.
- Extension: DOM parser fixtures and mocked authenticated ingest.
- AI evals: prompt-injection resistance, factual grounding, tool selection, approval compliance, memory precision, and resume-claim faithfulness.

### CI changes

Update `.github/workflows/ci.yml` to run:

1. `npm ci` and Prisma generation.
2. typecheck, lint, Vitest, and production build.
3. `npm audit`/Dependabot review with an explicit severity policy.
4. Python environment from a lockfile, Ruff/mypy if adopted, and all 34 backend tests until backend retirement.
5. Extension lint/tests.
6. Local Supabase start, migrations from zero, RLS verification, and schema drift.
7. Playwright critical-path tests.
8. secret scanning and migration SQL checks.

### Observability

- One correlation ID across browser, Next route, job, provider webhook, and assistant tool call.
- Sentry alerts on route error rate, webhook failures, queue age, and assistant tool failures.
- PostHog funnel: signup → onboarding complete → first import → first useful recommendation → first outreach → first reply → first meeting → application outcome.
- Cost budgets by user, feature, provider, and model.
- Health endpoints report dependency status without revealing secrets.

## Environment-variable contract

### Required for core production

- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Microsoft auth variables only when Microsoft sign-in is enabled
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (migrate from legacy anon naming)
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SUPABASE_JWT_SECRET` only while custom Realtime JWT signing remains

### AI and enrichment

- `AI_GATEWAY_API_KEY` for the canonical AI path
- `ANTHROPIC_API_KEY` only for any remaining direct Anthropic caller/backend
- `PDL_API_KEY`, `HUNTER_API_KEY`, optional `APOLLO_API_KEY`
- Add `AI_DEFAULT_MODEL`, `AI_FALLBACK_MODEL`, `AI_DAILY_BUDGET_USD`, `AI_MAX_RUN_STEPS`

### Billing, email, jobs, and telemetry

- Stripe secret, publishable key, price IDs, and webhook secret
- Resend API key, from address, and webhook secret
- `CRON_SECRET`
- Sentry DSN/org/project/auth token as appropriate per environment
- PostHog key/host
- Slack webhook for founder alerts
- Optional GroupMe variables only if the beta-feedback importer remains

### Feature flags and owner tools

- Replace scattered booleans with a typed feature registry.
- Keep `FOUNDER_EMAIL`/`ALLOWED_EMAILS` only as temporary bootstrap controls; move roles/allowlists into database authorization.
- Remove `PERSONAL_MODE`, `ME_USER_EMAIL`, and `ME_REQUIRE_AUTH` after `/me` consolidation.
- Remove `FASTAPI_URL` after backend retirement.
- Never put secrets under `NEXT_PUBLIC_`.

### Environment policy

- `.env.example` lists every supported variable with required/optional, scope, owner, and setup link.
- Vercel Development/Preview/Production values are reviewed separately; current coverage is inconsistent across environments.
- Provider secrets rotate on a schedule and after any suspected exposure.
- OAuth refresh tokens are encrypted at rest with a dedicated versioned key.
- CI uses mocked providers and a disposable database, never production credentials.

## Dependency remediation

Do not run `npm audit fix --force` blindly. Create a dependency-upgrade branch and:

1. Upgrade direct dependencies with known advisories, prioritizing the transitive `undici` high finding and direct Anthropic/Sentry/PostHog packages.
2. Verify Next/PostCSS resolution against the current lockfile; the audit's suggested Next downgrade is not an acceptable fix.
3. Align Prisma CLI and client versions exactly.
4. Pin the Python environment with `uv.lock` or an equivalent lockfile.
5. Add Renovate or Dependabot with grouped weekly updates and required CI.

## Backlog packaging

Create GitHub milestones and issues from this document; do not keep the execution backlog only in markdown.

- Milestone 0: Security and beta trustworthiness.
- Milestone 1: One product/data plane.
- Milestone 2: Assistant kernel and next-best actions.
- Milestone 3: Email/calendar/job-source loops.
- Milestone 4: Evals, E2E reliability, and scale.

Each issue must include user outcome, exact file scope, schema/env changes, security impact, tests, rollout flag, rollback, and acceptance evidence.

## Definition of end-to-end working

KithNode is end-to-end when a new user can:

1. Sign in and complete onboarding without founder intervention.
2. Import or capture contacts and opportunities with provenance and deduplication.
3. Receive a grounded daily plan tied to explicit career goals.
4. Approve a personalized outreach action and send it through a connected account.
5. Have replies and meetings update the relationship/opportunity state automatically.
6. Receive a meeting prep brief and a post-meeting follow-up task.
7. Tailor a factual resume to an opportunity with evidence-linked claims.
8. Track the application through outcome without duplicating data across `/dashboard`, `/me`, and FastAPI.
9. Ask the assistant what to do next and see exactly why it recommended the action.
10. Export/delete their data and revoke integrations.

The engineering system is end-to-end when the same journey passes in Playwright against a disposable production-like environment, all provider webhooks have replayable contract tests, RLS is verified for every table, migrations reproduce production from zero, and failures are visible rather than silently rendered as empty state.
