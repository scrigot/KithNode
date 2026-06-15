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
node 24+, npm, bun (optional); `gh`, `vercel` (frontend deploy), `supabase` (DB), `railway` (backend deploy); `jq` (Ralph).

### Env
Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.

### MCP servers (agent sessions)
The global Claude config already provides supabase, sentry, context7, github, firecrawl, playwright. On a fresh clone, copy `.mcp.json.example` to `.mcp.json` and set the referenced env vars.

### Services / related code
- Backend: FastAPI in `backend/` (Railway, separate env); the frontend reaches it via `FASTAPI_URL`.
- Browser extension: `extension/`.
- Founder cockpit: `/dashboard/ops` (gated by `FOUNDER_EMAIL`) — in-app metrics, user feedback, beta codes.
- Deploys: Vercel (frontend) + Railway (backend). See `DEPLOY.md`.

### Custom agents
`.claude/agents/` — kithnode-shipper (deploy gate), kithnode-rls-checker (security). They read the ops spine + `.agents/product-marketing.md` for context.
