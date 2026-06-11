# KithNode

Warm-path finance recruiting for students. KithNode helps ambitious students break into
investment banking, private equity, and consulting by mapping alumni and contacts, scoring
the warmest paths to each one, and drafting outreach that actually sounds like the student
sending it.

The product has two faces:

- **Landing** (`/`) - a cinematic marketing site: a dark starfield hero that opens into a
  light, rounded product story.
- **Dashboard** (`/dashboard`, auth-gated) - a dark, dense instrument. Discover ranks
  contacts by warmth into HOT / WARM / MONITOR / COLD tiers; Contacts holds the book and the
  outreach drafter; Pipeline, Network, Billing, and Settings round it out.

Design language is documented in `DESIGN.md`. Deeper architecture and conventions live in
`AGENTS.md`. Project rules for AI contributors live in `CLAUDE.md`.

## Stack

- **Frontend:** Next.js 16 (App Router, React 19, TypeScript strict), Tailwind v4,
  shadcn/ui. Server components by default; client components for interactivity.
- **Auth:** NextAuth v5 (Google OAuth). Session is a JWT; the dashboard is gated by
  middleware on `/dashboard/:path*`.
- **ORM / DB:** Prisma v7 over Supabase Postgres (SQLite for local dev via the
  better-sqlite3 driver adapter). Row-level security is configured in the Supabase
  dashboard, not in `prisma/schema.prisma`.
- **AI (frontend):** Vercel AI SDK v6 + AI Gateway for LLM calls (scoring enrichment,
  outreach drafts).
- **AI / Enrichment (backend):** a separate FastAPI service in `backend/` (Python, deployed
  to Railway) that handles Anthropic calls and Hunter / Apollo enrichment. The frontend
  reaches it via the `FASTAPI_URL` env var. It is a separate service with its own deploy
  and env, never bundled into the Next.js build.
- **Billing:** Stripe (webhook signature verification required).
- **Analytics:** PostHog.
- **Tests:** Vitest.

## Getting started

```bash
npm install
npm run dev          # Next.js dev server
```

You will need a `.env` with at least the auth, database, AI gateway, and (for billing)
Stripe keys. Never commit `.env*` files. See `CLAUDE.md` and `DEPLOY.md` for the full env
and deploy details.

## Scripts

```bash
npm run dev          # Next.js dev server
npm run typecheck    # tsc, strict
npm run test         # Vitest (run once)
npm run test:watch   # Vitest watch
npm run lint         # eslint src   (Next.js 16 removed `next lint`)
npm run db:push      # push the Prisma schema to the database
npm run db:seed      # seed test data
npm run build        # production build
```

Run `npm run typecheck && npm run lint && npm run test` clean before committing.

## Backend (FastAPI)

```bash
cd backend
# Python service: enrichment + Anthropic calls. Deployed to Railway (railway up).
# Separate dependencies, separate env vars from the Next.js app.
```

## Repository layout

```
src/app/                 Next.js App Router
  page.tsx, _landing/    public marketing site (landing context)
  dashboard/             auth-gated product (instrument context)
  api/                   route handlers (contacts import, enrich, discover, stripe, ...)
src/lib/                 scoring, outreach, auth, discover pipeline, autoguard, db
src/components/           UI (shadcn/ui in ui/), logo
prisma/schema.prisma     data model (User, AlumniContact, Connection, AuditLog)
backend/                 FastAPI enrichment service (Python, Railway)
docs/                    specs and design notes
DESIGN.md                design system (what is actually shipped)
AGENTS.md                architecture, patterns, gotchas
CLAUDE.md                rules for AI contributors
```

## Principles

- **Authenticity is the product.** Outreach is built from real common ground, never a
  template. Automation stops the moment a contact replies (the AutoGuard kill-switch in
  `src/lib/autoguard.ts`). Anything that makes outreach feel robotic does not ship.
- **Validated changes only.** Features are tested before they merge.
