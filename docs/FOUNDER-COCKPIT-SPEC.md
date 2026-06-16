# Founder Cockpit — Subsystem 2 Spec

*Date: 2026-06-15. Extends the existing `/dashboard/ops` cockpit. Implement in a KithNode session (Context7 for Next 16 / Prisma v7 / Supabase; typecheck + lint + test must pass).*

## Context
`/dashboard/ops` (founder-gated via `isFounder`) already renders signups-velocity, active-users, cost-burn, activation-funnel, revenue stub, a persisted tasks tile, recent-signups, beta-codes, and tester-feedback, all brand/dashboard.md-compliant with pure logic in `src/lib/ops/metrics.ts`. Three gaps remain: a real roadmap, a content-marketing view, and real expense numbers.

## Governing principle (non-negotiable)
The cockpit is a **live read view of self-maintaining data.** The founder is never in the update loop (the failure mode that rots Notion). Data sources:
- Metrics (velocity, funnel, active users, burn, waitlist-by-channel): auto-derived from the DB.
- Roadmap + "what's next": maintained by AGENTS as a side effect of shipping (the Subsystem-1 ops spine + a `Milestone` table), never hand-curated by the founder.
- The only value ever set by hand: real fixed-cost numbers, once (they change ~monthly at most, not the treadmill).

## The three upgrades

### 1. Content-marketing tile (auto; ship first)
- Waitlist-by-channel: `select source, count(*) from waitlist_signups group by source`. Depends on the `WaitlistSignup.source` column (see the separate "Marketing Phase 0 wiring" task). No manual entry.
- Posts-shipped (optional): parse a `## Content log` section from `ops/build-log.md` if present; auto-zero if absent. Never blocks.
- Surface: a `ContentTile` in the cockpit, fed via `/api/ops/overview`. Shows posts-by-channel this week + waitlist-by-channel bars (the conversion view) with cadence health (posts/week vs target).

### 2. Roadmap timeline (agent-maintained, replaces the hardcoded strip)
- Remove the hardcoded `MILESTONES` const in `ops-cockpit.tsx`.
- New `Milestone` model (Prisma + Supabase RLS, founder-only): `label`, `due` (date), `status` (planned | in_progress | done | at_risk), `order`, `note?`.
- Maintenance = agents, not the founder. A server action `upsertMilestone` / `setMilestoneStatus` (mirrors the existing `addOpsTask` / `toggleOpsTask` pattern in `actions.ts`). CLAUDE.md instructs agents to update a milestone when they ship or when a date shifts, and to keep `ops/roadmap.md` (the git-versioned, agent-readable mirror) in sync in the same step. An in-cockpit editor is optional, not required.
- Why a DB table and not runtime-read of `ops/roadmap.md`: Vercel serverless cannot reliably read arbitrary repo files at request time, and the deployed cockpit must be live. The markdown stays as the agent/git mirror; the DB is what the cockpit reads. The founder still never edits it.
- Component: `RoadmapTimeline` with a Days/Weeks zoom toggle (client state): days = next ~14 days, weeks = next ~12 weeks. Milestones positioned by date offset on a horizontal axis, status-colored via the existing `healthChip` / `healthColor`. Sharp corners, teal, monospace dates (brand/dashboard.md).

### 3. Expenses — real fixed costs (smallest)
- Fill `FIXED_SUBSCRIPTIONS` in `metrics.ts` with real monthly numbers (Vercel, Supabase, Railway, Domain, PostHog, Sentry, Anthropic min). `computeTotalBurn` already consumes the array, so Total Burn shows true runway immediately. Variable burn is already auto from `api_cost_log`. (Move fixed costs to a DB table later only if editing-without-deploy becomes a need.)

## Files
- New: `src/lib/ops/roadmap.ts` (`parseRoadmap`, pure, unit-tested like `metrics.ts`); `Milestone` Prisma model + Supabase RLS migration; `RoadmapTimeline` + `ContentTile` components; seed `ops/roadmap.md`.
- Edit: `src/app/api/ops/overview/route.ts` (extend `OpsOverview` with `content` + `roadmap`; add the waitlist-by-source query + Milestone fetch); `src/app/dashboard/ops/_components/ops-cockpit.tsx` (replace `RoadmapStrip` with `RoadmapTimeline`, add `ContentTile`); `src/app/dashboard/ops/actions.ts` (`upsertMilestone`, `setMilestoneStatus`); `src/lib/ops/metrics.ts` (real `FIXED_SUBSCRIPTIONS`; content cadence-health helper); `CLAUDE.md` (agent protocol: maintain `Milestone` + `ops/roadmap.md` on ship).
- Depends on: the `WaitlistSignup.source` column from "Marketing Phase 0 wiring."

## Build order
1. Content tile (auto waitlist-by-channel; ships value immediately once source-tagging lands).
2. Roadmap (Milestone model + RLS + `upsertMilestone` + `RoadmapTimeline` + `roadmap.ts` tests + agent protocol).
3. Expenses (real `FIXED_SUBSCRIPTIONS`).

## Verification
- Agent-maintained: running `upsertMilestone` (or an agent shipping a milestone) updates the DB AND `ops/roadmap.md`, and the cockpit timeline reflects it. The founder edits nothing.
- Content: waitlist-by-channel in the tile matches `select source, count(*) from waitlist_signups group by source`.
- Expenses: Total Burn = sum(real fixed) + variable-30d vs budget.
- Gate: non-founder gets 404; RLS enforced on `Milestone` (founder-only); `npm run typecheck && npm run lint && npm run test` green; pure logic in `roadmap.ts` has unit tests.

## Out of scope (later subsystems)
- Era-finance personal/business spend (Subsystem 2 fast-follow; an MCP, not a runtime API, so a scheduled agent would push it into a table).
- Social-platform API integrations for reach/impressions (manual-or-auto content log only for v1).

## CEO Review hardening (HOLD scope, 2026-06-15)
Run via `/plan-ceo-review`. Scope held; the following make the full spec bulletproof. Fold each into implementation.

### Write path (resolves a two-writer ambiguity)
- `upsertMilestone` / `setMilestoneStatus` server actions are the CANONICAL write path to the `Milestone` table.
- `ops/roadmap.md` is a ONE-WAY generated mirror (export from the DB), for git history + agent-readability. Agents call the action; the mirror is regenerated, not hand-edited as a second source.
- `parseRoadmap` (in `roadmap.ts`) is used ONLY for the initial seed import of the existing milestones, not as a runtime read path. The cockpit reads the `Milestone` table via `/api/ops/overview`.

### Data model + security
- `Milestone.status` is a validated string (planned | in_progress | done | at_risk), NOT a Prisma enum. SQLite (dev) has no enums; matches `Connection.status`. Validate in the action.
- `upsertMilestone` / `setMilestoneStatus` (and any content mutation) MUST enforce `isFounder` server-side. They are privileged writes; a non-founder calling the action is a privilege-escalation vector.
- Enable RLS + at least one policy on `Milestone` and `ContentPost` per repo rule, even though the service-role client bypasses RLS and the real guard is the `isFounder` app gate (defense in depth).

### Graceful degradation (no 500s)
- All new `OpsOverview` fields (`content`, `roadmap`) are optional. The route degrades per-tile.
- If `WaitlistSignup.source` is not live yet (task A not shipped) or a query fails, the content tile shows an empty / "source tracking not live yet" state. Never throw. Matches the existing keep-stale-on-transient-failure pattern in `ops-cockpit.tsx`.

### Timeline edge cases (Section 4)
- 0 milestones -> empty state ("no milestones yet").
- A `planned` milestone with a past `due` -> render as overdue (do not hide).
- A milestone beyond the visible window (>+12 weeks in week-zoom) -> clamp to the axis edge, do not overflow the container.
- 15+ milestones -> cap the rendered set or stack labels so they do not collide. `parseRoadmap` + the positioning math are pure -> unit-test clamp + zoom + overlap.

### Deployment sequencing
- Ship task A (`WaitlistSignup.source` migration) first, or the content tile degrades to its empty state.
- `Milestone` + `ContentPost` are additive, backward-compatible migrations. RLS policies are a separate Supabase-dashboard step (the Prisma migration alone is insufficient per repo convention).

### Tests to add
- `parseRoadmap`: malformed line, empty file, bad date, unknown status (each skipped gracefully, never throws).
- Timeline positioning: date-to-x clamp at both window edges; day vs week zoom.
- `upsertMilestone` / route: non-founder gets 404 / rejected; founder write persists.

## Design (plan-design-review, 2026-06-15)
Score 6/10 -> 9/10. Inherit the existing dark-Bloomberg system; invent no new vocabulary.

### Hierarchy (Pass 1)
- The roadmap timeline is the top full-width "north star" band (replaces `RoadmapStrip` at `ops-cockpit.tsx:143`), above the pulse tiles. It is context (where we are headed), read first; the pulse tiles are status, below it.
- Cap the band height (~110px including the Days/Weeks toggle row) so it does not dominate the fold.
- The content tile lives in the tile grid (alongside Funnel/Revenue/Tasks), NOT the top band.

### Interaction states (Pass 2, reuse existing components)
| Piece | Loading | Empty | Error | Hover |
|-------|---------|-------|-------|-------|
| Roadmap timeline | skeleton band (reuse the `animate-pulse` skeleton at `ops-cockpit.tsx:146-152`) | `OpsEmpty`: "No milestones yet. Agents add them as they ship." | keep last-rendered, inline "couldn't load roadmap", never 500 | milestone tooltip: due date + note |
| Content tile | `OpsTile` loading (inherited) | `OpsEmpty`: "No posts yet. Waitlist-by-channel lights up once `?source=` is live." | empty state, never throw | bar hover shows exact count (reuse the `SparkTooltip`/`CostTooltip` pattern) |

### Visual vocabulary (Pass 4 + 5 = no issues, by inheritance)
- Use `OpsTile` (card shell), `OpsEmpty` (empties), the `FunnelBar` teal-bar pattern for waitlist-by-channel, `healthChip`/`healthColor` for milestone status, `relativeTime` for dates.
- Sharp 0px corners, teal-only accent, Geist + JetBrains Mono (tabular-nums for numbers), compact density. No rounded cards, no colored-circle icons, no new colors. Anti-slop by construction (verified against the session mockup).

### Responsive (Pass 6, founder-only, desktop-primary)
- Below ~640px the timeline collapses to a stacked vertical list (date + label + status chip), NOT a horizontal axis (a Gantt is unusable at 375px). Tiles already stack via `grid-cols-1`. Touch targets (Days/Weeks toggle, milestone rows) >= 44px.

### Deferred (fine)
- Animated zoom-toggle transition (instant swap is acceptable for v1).
