# KithNode — AGENTS.md

## Project Overview
KithNode is an AI-driven recruitment networking intelligence platform. Target users are UNC finance students pursuing IB, PE, and Consulting.

## Build & Run
npm install
npm run dev          # Start dev server (Next.js)
npm run typecheck    # TypeScript strict check
npm run test         # Run test suite
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to DB
npm run db:seed      # Seed test data

## Tech Stack
- Framework: Next.js 14+ (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS
- ORM: Prisma (SQLite for dev, Postgres for prod)
- Auth: NextAuth.js (Google OAuth)
- Analytics: PostHog
- Feedback: Canny
- Email Sequencing: Loops

## Architecture Decisions
- App Router with server components by default; client components only when interactivity needed
- All API routes under /app/api/
- Database models in /prisma/schema.prisma
- Shared types in /lib/types.ts
- AI prompts stored in /lib/prompts/ as template literals

## Conventions
- Use server actions for form mutations where possible
- Prefer Zod for runtime validation of API inputs
- All environment variables prefixed with NEXT_PUBLIC_ for client, plain for server
- Commit messages: feat(STORY_ID): description or fix(STORY_ID): description

## Codebase Patterns
- Source code lives in `src/` directory (App Router at `src/app/`)
- Test files co-located with source (e.g. `route.test.ts` next to `route.ts`)
- Test setup at `src/test/setup.ts` using `@testing-library/jest-dom/vitest`
- ESLint uses flat config (`eslint.config.mjs`) with `@eslint/js` + `@typescript-eslint/parser`
- Prisma v7 with `prisma-client` generator — outputs ESM TypeScript to `src/generated/prisma/`
- Import Prisma client from `../generated/prisma/client.js` in app code
- Database singleton in `src/lib/db.ts` using `@prisma/adapter-better-sqlite3`
- Seed script at `prisma/seed.ts` — run with `npm run db:seed` (uses tsx with dynamic import)
- Auth config in `src/lib/auth.ts` — exports `auth`, `signIn`, `signOut`, `handlers`
- Auth API route at `src/app/api/auth/[...nextauth]/route.ts`
- Middleware at `src/middleware.ts` protects `/dashboard/:path*`
- SessionProvider in `src/app/providers.tsx` wraps app layout

## Gotchas
- Next.js 16 removed `next lint` — use `eslint src` instead
- Tailwind v4 uses `@import "tailwindcss"` not `@tailwind base/components/utilities`
- `create-next-app` refuses to run in directories with existing files
- FlatCompat + eslint-config-next causes circular JSON errors — use plain flat config
- Prisma v7 requires driver adapter — `new PrismaClient()` alone throws; must pass `{ adapter }`
- Adapter class is `PrismaBetterSqlite3` (lowercase "qlite"), not `PrismaBetterSQLite3`
- SQLite dev.db lives at project root (`file:./dev.db`), not in prisma/
- `src/generated/` is excluded from ESLint via `eslint.config.mjs` ignores
- NextAuth v5 beta can't be imported in Vitest jsdom (depends on `next/server`) — test callback logic via simulation
- NextAuth v5 uses `AUTH_SECRET` env var; Google OAuth uses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- ESLint flat config needs explicit globals for browser APIs (fetch, document, global) — no env presets
- @testing-library/react: add `afterEach(cleanup)` in test files to prevent multiple render accumulation
- Lead scoring logic in `src/lib/scoring.ts` — pure function `scoreConnection(user, alumni, mutualConnections)`
- Score endpoint at `POST /api/contacts/score` — scores all user connections and persists to DB
- Outreach draft generation in `src/lib/outreach.ts` — pure function `generateOutreachDraft(ctx)` builds personalized email
- Draft API at `POST /api/outreach/draft` — takes `connectionId`, returns `{ draft, subject, alumniName, alumniEmail }`
- OutreachSlideOver component at `src/app/dashboard/contacts/outreach-slide-over.tsx` — slide-over panel for editing/sending drafts
- ESLint globals: added `Request`, `HTMLTextAreaElement`, `HTMLAnchorElement` to flat config
