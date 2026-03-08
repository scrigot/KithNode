# CLAUDE.md — KithNode

## What This Is
KithNode is an AI-driven recruitment networking intelligence platform for high-ambition students in IB, PE, and Consulting.

## Development Workflow
This project uses the Ralph autonomous agent loop. See scripts/ralph/ for the loop, PRD, and prompt files.

## Build & Run
npm install
npm run dev
npm run typecheck
npm run test
npm run lint

## Key Principles
1. Authenticity is the product. Never ship features that make outreach feel robotic.
2. One story at a time. Ralph iterates one user story per context window.
3. Small commits. Commit working code after each meaningful change.
4. Don't break what works. All existing tests must pass before committing.
5. Log everything. Update progress.txt and AGENTS.md with discoveries.

## Architecture
- Next.js 14+ App Router, TypeScript strict, Tailwind CSS
- Prisma ORM (SQLite dev / Postgres prod)
- NextAuth.js (Google OAuth)
- PostHog analytics
- Server components by default; client components only for interactivity
