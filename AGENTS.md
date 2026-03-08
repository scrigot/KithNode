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

## Gotchas
- Next.js 16 removed `next lint` — use `eslint src` instead
- Tailwind v4 uses `@import "tailwindcss"` not `@tailwind base/components/utilities`
- `create-next-app` refuses to run in directories with existing files
- FlatCompat + eslint-config-next causes circular JSON errors — use plain flat config
