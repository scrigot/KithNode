# KithNode Learnings (patterns + gotchas)

> Read before non-trivial work; append what you discover. Stable patterns graduate into AGENTS.md.

## Stack gotchas
- Next.js 16 removed `next lint` — use `eslint src`. Use `proxy.ts` (not `middleware.ts`), cache components + `'use cache'`.
- Tailwind v4: `@import "tailwindcss"`, PostCSS plugin is `@tailwindcss/postcss`.
- ESLint 9 flat config: FlatCompat conflicts with eslint-config-next; use `@eslint/js` + `@typescript-eslint/parser`. Add `src/generated/` to ignores. Add browser globals manually (use `globalThis.` prefix).
- Vitest v4 + `@vitejs/plugin-react` + jsdom. NextAuth v5 can't be imported in jsdom tests (needs `next/server`) — test callback logic via simulation.
- Prisma v7: `prisma-client` generator (ESM-only), requires a driver adapter (`PrismaBetterSqlite3`, lowercase "qlite"); bare `new PrismaClient()` throws. Seed via dynamic `import()`.
- NextAuth v5: `AUTH_SECRET` (not `NEXTAUTH_SECRET`); export `auth as middleware`.
- `DATABASE_URL=file:./dev.db` creates the db at project root, not prisma/.

## Architecture facts
- AlumniContact = global shared pool; `importedByUserId` = owner. Per-user access via UserDiscover "high_value".
- Supabase uses the SERVICE-ROLE key, so RLS is bypassed — app-layer `.eq("importedByUserId")` is the only tenant guard.
- Per-user overlays: UserDiscover, PipelineEntry, contact_tags, ContactConnection.
- Redaction: `POOL_SAFE_FIELDS` / `poolSafeContact` / `redactContact` in `src/lib/redact.ts`.
- Two services deploy separately: frontend (Vercel), backend FastAPI in `/backend` (Railway).
