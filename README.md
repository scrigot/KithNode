# KithNode — Ralph Dev Workflow

## Prerequisites
- Claude Code CLI installed
- jq installed
- Git initialized in this repo
- Git Bash (Windows) for running ralph.sh

## Quick Start
1. git init && git add -A && git commit -m "initial: scaffold with Ralph"
2. Open Git Bash
3. chmod +x scripts/ralph/ralph.sh
4. ./scripts/ralph/ralph.sh --tool claude 15

## Check Progress
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
cat scripts/ralph/progress.txt
git log --oneline -10

## Adding New Features
1. Write a PRD in tasks/prd-[feature-name].md
2. Convert to prd.json format
3. Run Ralph: ./scripts/ralph/ralph.sh --tool claude 20

---

## Foundation — what this repo needs to run (onboarding)

### Start here: the ops spine
`ops/tasks.md` (what's next) + `ops/build-log.md` (what shipped, auto-logged on session end) + `ops/decisions.md` + `ops/learnings.md`. Read `ops/README.md` first. The Stop hook auto-appends a build-log entry from your `OPS_LOG:` marker.

### Required CLIs
node 24+, npm, bun (optional); `gh`, `vercel` (deploy), `supabase` (DB); `jq` (Ralph).

### Env
Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.
The example is the canonical variable contract; server integrations validate
their required groups before making provider calls.

### MCP servers (agent sessions)
The global Claude config already provides supabase, sentry, context7, github, firecrawl, playwright. On a fresh clone, copy `.mcp.json.example` to `.mcp.json` and set the referenced env vars.

### Services / related code
- Archived shadow backend: FastAPI remains in `backend/` temporarily for
  comparison and rollback evidence, but the product has no runtime callers.
- Browser extension: `extension/`.
- Career Copilot: `/dashboard/assistant` persists grounded conversations,
  recommendations, tool proposals, approvals, audited goal updates, and
  read-only connected-calendar context. Recent conversations can be reopened.
  Apply the checked-in Supabase migrations before enabling it in an environment.
- Connected accounts: `/dashboard/integrations` provides encrypted Google
  Workspace and Microsoft 365 OAuth connections, live credential validation,
  and bounded mail/calendar previews. The assistant treats all provider data as
  untrusted context, and no send or calendar-write scopes are requested.
- LinkedIn Studio: `/dashboard/linkedin` stores private, user-owned profile
  copies with a comprehensive section editor, deterministic recruiter/search
  audit, automatic immutable revisions, duplication, archiving, and restore.
  Profiles can start blank, import structured JSON, or be saved on demand from
  the personal browser extension. KithNode never logs into LinkedIn or publishes
  changes on the user's behalf.
- Founder cockpit: `/dashboard/ops` (gated by `FOUNDER_EMAIL`) — in-app metrics, user feedback, beta codes.
- Deploys: Vercel + Supabase. See `DEPLOY.md`.

### Custom agents
`.claude/agents/` — kithnode-shipper (deploy gate), kithnode-rls-checker (security). They read the ops spine + `.agents/product-marketing.md` for context.
