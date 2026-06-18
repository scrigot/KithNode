# KithNode Cross-Toolkit Playbook

> For any common task, this says which skill to run from which toolkit, in what order. Four toolkits: **gstack** (ship/qa/review/investigate/plan-*/office-hours), **superpowers** (brainstorming, writing-plans), **pm-skills** (phuryn — PRD/roadmap/metrics/GTM), **ECC** (affaan-m — optional reviewers + skills). Organized by the 8 Founder-OS lanes, so the toolkits are the "staff" of each lane. When a chain proves useful, promote it to a thin `/kithnode-*` command.

## How to use
- Type the skill (e.g. `/write-prd`) and Claude runs that toolkit's workflow. Chain them in the order shown.
- gstack + superpowers work in any session now. pm-skills after the Terminal install. ECC per the install decision.
- Honesty rules carry across every chain: no fabricated metrics (the Cluely lesson), no em dashes, no emojis; authoring and review are separate passes (never self-approve).

## Task -> chain, by lane

### Product / Eng
- **Plan a feature:** `brainstorming` (superpowers) -> `/write-prd` (pm) -> `/red-team-prd` + `/pre-mortem` (pm) -> `/plan-eng-review` (gstack).
- **Ship a feature:** `/ship` (gstack); review pass = `/review` (gstack), optionally ECC code-reviewer / security-reviewer.
- **Fix a bug:** `/investigate` (gstack).
- **QA the app:** `/qa` (gstack).
- **User stories / test scenarios:** `/write-stories`, `/test-scenarios` (pm).

### Growth / Marketing
- **Content / build-in-public:** marketing-skills (social/video) + `/market-product` (pm). Drafts to `marketing/queue/`, never auto-post.
- **Growth strategy:** `/growth-strategy`, `/north-star` (pm).
- **Competitive / user research:** `/competitive-analysis`, `/research-users`, `/analyze-feedback` (pm).

### Sales
- **Pricing / model:** `/pricing`, `/business-model`, `/value-proposition` (pm).
- **Enablement:** `/battlecard` (pm).

### Finance
- **Burn / runway:** read `src/lib/ops/metrics.ts` (`computeTotalBurn`) + the cockpit; a finance helper later.
- **Metrics / experiments:** `/setup-metrics` -> `/analyze-cohorts` / `/analyze-test` / `/write-query` (pm).

### Legal / Compliance
- **Privacy / NDA:** `/privacy-policy`, `/draft-nda` (pm).
- **RLS / security:** `/review` (gstack) + the `kithnode-rls-checker` agent + ECC security-reviewer; `/security-audit-static` (pm).

### People / Hiring
- Manual for now (intern scope, freelancer briefs). No toolkit skill yet -> an honest "manual" lane.

### Fundraising
- Manual for now (the narrative builds passively from the cockpit + traction). No toolkit skill yet.

### Ops / Founder-OS
- **Roadmap / OKRs (feeds the backbone):** `/transform-roadmap`, `/plan-okrs`, `/north-star` (pm) -> feed `ops/roadmap.md`.
- **Big strategy / scope decision:** `/office-hours` or `/plan-ceo-review` (gstack).
- **Weekly review:** the existing `/kithnode-weekly-digest`.

## Promote to a one-keystroke command (later)
When a chain proves useful, wrap it as `.claude/commands/kithnode-<task>.md` that invokes the chain.
- **Shipped:** `/kithnode-landing-fix` = `/design-review` (audit + fix vs brand/landing.md) -> `/qa` (functional) -> before/after screenshots. Run in the session that owns the landing code.
- Next candidate: `/kithnode-new-feature` = `brainstorming` -> `/write-prd` -> `/plan-eng-review`.

## Install status
- **gstack, superpowers:** live now.
- **pm-skills:** `claude plugin marketplace add phuryn/pm-skills` + the subset (pm-execution, pm-product-discovery, pm-data-analytics, pm-marketing-growth, pm-go-to-market). Run in Terminal.
- **ECC:** DEFERRED (Sam's call, 2026-06-15). Not installed — a 270-skill / 67-agent global dump would bury the rest and worsen the over-provisioning the audit found. Revisit only if a concrete gap appears that gstack / superpowers / pm-skills / marketing-skills / Trail of Bits don't fill.
- **taste-skill (Leonxlnx):** INSTALLED 2026-06-15 — 13 design-taste `SKILL.md` styles in `.claude/skills/` (clone at `~/third-party/taste-skill`). Registers in any KithNode-repo session (restart an open session to pick them up).

## Design taste layer (taste-skill) — for UI / landing work
GENERIC taste skills, so ALWAYS frame the invocation with "obey `brand/landing.md`" (landing) or "obey `brand/dashboard.md`" (dashboard) — they enhance fundamentals, they do NOT override your system. Use:
- New or redesigned section -> `high-end-visual-design` (soft) or `redesign-existing-projects`, constrained to the brand doc -> then `/kithnode-landing-fix` (or `/design-review`) to verify against your system + catch slop.
- Need a visual reference (the gstack mockup binary is dead on this Mac) -> `imagegen-frontend-web` / `brandkit`.
- Screenshot or comp -> code -> `image-to-code`.
- Skip for KithNode's identity: `industrial-brutalist-ui`, `minimalist-ui` (wrong aesthetic for the brand).
