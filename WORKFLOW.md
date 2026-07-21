# KithNode — How I work (so it never gets cluttered again)

A dead-simple loop. Follow it every time and the repo stays clean, and "works on
localhost but breaks in prod" mostly disappears.

## The golden rule: ONE branch at a time
Finish and merge one thing before starting the next. Juggling 6 branches is what caused
the mess (18 branches, half already dead).

## The loop
```bash
# 1. Always start fresh from production
git switch main
git pull                       # main now == what's live on kithnode.ai

# 2. Make ONE focused branch
git switch -c feat/the-thing   # feat/… for features, fix/… for bugfixes, chore/… for cleanup

# 3. Build. Commit small, commit often.
git add -A && git commit -m "feat(thing): what changed"

# 4. Push → this auto-creates a PREVIEW link on Vercel. Test there.
git push -u origin feat/the-thing

# 5. Open a PR on GitHub, let checks go green, then "Squash and merge".
#    → merging into main auto-deploys to PRODUCTION (kithnode.ai).

# 6. Delete the branch (GitHub does it automatically once the setting below is on).
#    Then go back to step 1 for the next thing.
```

## Why each step matters
- **Step 1 (pull main first):** if you branch off a stale main, you're building on a fossil.
  This is the #1 cause of weird merge conflicts and "it worked yesterday."
- **Step 4 (preview):** the preview link is the real app, safely. If it breaks here, no real
  user ever saw it. Never test only on localhost and assume prod is fine.
- **Step 5 (squash):** collapses your messy work-in-progress commits into ONE clean line on main.
- **Step 6 (delete):** peel the sticky note. No delete = the clutter comes back.

## The other "works local / breaks prod" cause: ENV VARS
- Localhost reads `.env.local` (your secrets). Production reads the **Vercel dashboard**
  (Settings → Environment Variables). They are SEPARATE.
- If a key exists on your laptop but is missing/wrong on Vercel, it works locally and breaks
  in prod. (This bit us: missing `SUPABASE_JWT_SECRET` + a stale anon key after the UUID migration.)
- Rule: when you add or change a secret locally, add/change it on Vercel too — for the right
  environment (Development / Preview / Production). Never assume they match.

## Before promoting anything to prod
```bash
npm run db:history:check && npm run db:verify
npm run typecheck && npm run lint && npm run test && npm run build
```
Every check must be green locally before you merge.

## Database rule: baseline plus forward-only migrations

- `supabase/baseline/20260711004756_public.sql` is the reproducible schema
  snapshot. Regenerate it only as an intentional reviewed maintenance change.
- `scripts/db/production-migrations.json` mirrors the migration versions already
  recorded in production. Historical marker files must not acquire new DDL.
- Create schema changes with `supabase migration new <name>`, then write an
  additive, idempotent, forward-only migration.
- `npm run db:verify` restores the baseline into an ephemeral database, applies
  newer migrations, and checks required tables, RLS, and grants.
- Prisma describes application models. Supabase migrations are the only
  production DDL mechanism.

## Branch naming
- `feat/…` new feature · `fix/…` bugfix · `chore/…` cleanup/infra · `docs/…` docs only.
- Short and specific: `feat/multi-pipeline`, not `feat/stuff`.

## Cleanup hygiene (so 18 branches never happens again)
- Delete a branch the moment its PR merges (the GitHub setting below automates this).
- Once a month: `git fetch --prune` then `git branch` — if you see a branch you don't recognize,
  it's probably already merged; delete it.
