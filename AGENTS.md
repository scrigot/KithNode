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
(Patterns discovered during Ralph iterations will be added here)

## Gotchas
(Known issues and workarounds will be added here)
