# CLAUDE.md — KithNode

> **Inherits from `~/.claude/CLAUDE.md`** (global rules: terse, proactive, ship-fast, fill-the-page, MUST use Context7 + OMC agents + parallel tool calls + verification, never create files unless asked, never expand scope).
>
> **Deep technical reference: `AGENTS.md`** in this repo. That file is the canonical source for codebase patterns, conventions, and gotchas. Read it for any non-trivial change.
>
> The rules below override the global file ONLY where they conflict.

## What This Is
KithNode is an AI-driven recruitment networking intelligence platform for high-ambition students in IB, PE, and Consulting. Active deployment, daily user. Pre-launch. Sam is the only user.

## Active goals (as of 2026-04-08)
- **E-@Ccelerator application due 2026-04-10** — protect this above all other work
- Fix Discover scoring bugs and the vertical pipeline UI
- Backend (FastAPI on Railway) — keep it healthy, it powers enrichment + AI calls
- Ship validated features only — Sam tests every change before it merges

## Build & Run
```bash
npm install
npm run dev          # Next.js dev server
npm run typecheck    # tsc strict
npm run test         # Vitest (run once)
npm run test:watch   # Vitest watch mode
npm run lint         # eslint src  (Next.js 16 removed `next lint`)
npm run db:push      # Push Prisma schema to DB
npm run db:seed      # Seed test data
```

## Key Principles
1. **Authenticity is the product.** Never ship features that make outreach feel robotic.
2. **One story at a time.** Ralph iterates one user story per context window.
3. **Small commits.** Commit working code after each meaningful change. Format: `feat(STORY_ID): description` or `fix(STORY_ID): description`.
4. **Don't break what works.** All existing tests must pass before committing.
5. **Log everything.** Update `progress.txt` and `AGENTS.md` with new discoveries.

## Architecture (current — supersedes any older notes)
- **Frontend:** Next.js **16.1.6** App Router, React 19.2.4, TypeScript 5.9.3 strict, Tailwind v4.2.1
- **ORM:** Prisma v7.4.2 (SQLite dev via `@prisma/adapter-better-sqlite3`, Postgres prod via `@prisma/adapter-pg`)
- **Auth:** NextAuth v5.0.0-beta.30 (Google OAuth) — `src/lib/auth.ts`
- **Database backend:** Supabase Postgres (RLS configured in Supabase dashboard, **not in `prisma/schema.prisma`**)
- **AI (frontend):** **Vercel AI SDK v6.0.149 + AI Gateway v3.0.91** — use these for new LLM calls. Raw `@anthropic-ai/sdk` 0.82 is also installed but prefer AI SDK for unified streaming + provider routing.
- **AI / Enrichment Backend:** **FastAPI on Railway** at `/backend/` — Python, handles Anthropic SDK calls, Hunter, Apollo enrichment. Frontend calls it via `FASTAPI_URL` env var.
- **Billing:** **Stripe v22** (`src/lib/stripe.ts`, `/src/app/api/stripe/`, `/src/app/dashboard/billing/`) — `STRIPE_SECRET_KEY` server, webhooks require signature verification
- **Analytics:** PostHog v1.359 (`NEXT_PUBLIC_POSTHOG_KEY`)
- **Tests:** Vitest 4.0.18
- **UI:** shadcn/ui 4.1.2 components
- **Server components by default;** client components only for interactivity.

## Database conventions
- Schema lives in `prisma/schema.prisma`. Tables: `User`, `AlumniContact`, `Connection`, `AuditLog`.
- **RLS lives in the Supabase dashboard, NOT in the Prisma schema.** Any new table MUST get RLS enabled and at least one policy via the dashboard or a Supabase migration. The Prisma migration alone is insufficient.
- User-scoped data: every policy must filter on the authenticated user.
- Never expose the Supabase service role key to the client — only `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Deploy flow
- **Frontend (Vercel):** `vercel deploy` for previews, `vercel deploy --prod` for prod. Env vars in Vercel dashboard. Pre-deploy: `npm run typecheck && npm run lint && npm run test && npm run build` must pass clean.
- **Backend (Railway):** `cd backend && railway up`. Env vars set in Railway dashboard. NEVER hardcode API keys.
- **Smoke test before promoting prod:** sign-in → dashboard loads → click contact → detail page → draft outreach → Discover swipe cards.
- See `DEPLOY.md` for the full runbook (if it exists; if not, this section IS the runbook).

## Anti-patterns — NEVER do these in this repo
- **NEVER guess at Next.js 16 / Tailwind v4 / NextAuth v5 / Prisma v7 / AI SDK v6 APIs.** All five had breaking changes from your training data. Use Context7 (`resolve-library-id` then `query-docs`) before writing code. In Next.js 16, use `proxy.ts` (not `middleware.ts`), use cache components and `'use cache'` directive, and check `vercel:next-cache-components` skill.
- **NEVER bypass Stripe webhook signature verification** — it's the only thing preventing fake payment confirmations.
- **NEVER add a new LLM call via raw `@anthropic-ai/sdk`** — use the AI SDK v6 + Vercel AI Gateway. Flag any existing direct SDK usage as a migration candidate.
- **NEVER skip the driver adapter** when instantiating `PrismaClient()` — bare `new PrismaClient()` throws.
- **NEVER add a new table** without enabling RLS in Supabase dashboard AND adding a policy.
- **NEVER expose service role keys** to the client. Only `NEXT_PUBLIC_*` vars cross the bundle.
- **NEVER bypass AutoGuard** (`src/lib/autoguard.ts`) — it's the kill-switch for outreach automation when a contact responds. Bypassing it = sending follow-ups to people who already replied = death of authenticity.
- **NEVER ship outreach features that feel robotic.** Authenticity is the product.
- **NEVER add a new outreach channel or tracking event** without checking with Sam — these touch trust and compliance.
- **NEVER use `next lint`** — it's removed in Next.js 16. Use `eslint src`.
- **NEVER import NextAuth v5 in a Vitest test** — it depends on `next/server`. Test callback logic via simulation.
- **NEVER bundle the FastAPI backend into the Next.js deploy.** They are separate services with separate env vars and deploy targets.
- **NEVER commit `.env*` files.** Check `.gitignore`.
- **NEVER auto-resolve a Prisma migration conflict** without showing Sam — schema changes are weight-bearing.

## Where the business logic lives
- **Scoring:** `src/lib/scoring.ts` — `scoreConnection(user, alumni, mutualConnections)`. Pure function. Tests in `scoring.test.ts`.
- **Discover pipeline:** `src/lib/discover/` — 4 stages: `entity-finder.ts` → `contact-finder.ts` → `signal-detector.ts` → `ranker.ts`. UI at `src/app/dashboard/discover/`. API at `src/app/api/discover/`.
- **Outreach draft generation:** `src/lib/outreach.ts` — `generateOutreachDraft(ctx)`. Pure function. API at `src/app/api/outreach/draft`. UI in `src/app/dashboard/contacts/outreach-slide-over.tsx`.
- **Auth:** `src/lib/auth.ts` (NextAuth config). Handler at `src/app/api/auth/[...nextauth]/route.ts`. Middleware at `src/middleware.ts` protects `/dashboard/:path*`.
- **AutoGuard kill-switch:** `src/lib/autoguard.ts` — `triggerAutoGuard()`, `resumeAutomation()`, `isAutomationAllowed()`. Connection model has `automationPaused` field.
- **DB singleton:** `src/lib/db.ts`.
- **PostHog:** `src/lib/posthog.ts` + `src/app/posthog-provider.tsx`.
- **Ralph autonomous loop:** `scripts/ralph/` — PRD at `prd.json`, prompt at `CLAUDE.md`, log at `progress.txt`.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## What to do FIRST in any session here
1. Read `AGENTS.md` for the latest gotchas (Sam updates this as he hits new ones)
2. Read `scripts/ralph/progress.txt` to see what the autonomous loop most recently learned
3. If the task touches Next.js 16 / Tailwind v4 / NextAuth v5 / Prisma v7 — Context7 first
4. If the task touches DB schema — read `prisma/schema.prisma` AND remember to set RLS in Supabase dashboard separately
5. If the task touches the backend — that's `cd backend/`, FastAPI, Python, Railway. Different deploy, different env vars, different dependencies.
6. Run `npm run typecheck && npm run lint` BEFORE committing — both must pass clean
