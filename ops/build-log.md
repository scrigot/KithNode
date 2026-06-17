# KithNode Build Log

> Append-only. Newest entries at the bottom (auto-appended by the Stop hook from OPS_LOG markers + git commits). What shipped and why.

## 2026-03-08 — MVP foundation (KN-001..008)
- Project init: Next.js 16, TS strict, Tailwind v4, ESLint 9 flat config, Vitest. Health API, landing page.
- DB schema (User, AlumniContact, Connection) + seed (5 users, 20 alumni across IB/PE/Consulting).
- NextAuth v5 Google OAuth + `/dashboard` route protection.
- Alumni contact list view; lead scoring (`scoreConnection`, weighted factors, firm-prestige tiers); outreach draft composer.
- AutoGuard kill-switch (pauses automation on RESPONDED) + AuditLog entries.
- PostHog analytics (signup, contact_viewed, outreach_drafted/sent, autoguard_triggered).

## 2026-06-15 — Contact intelligence + multi-tenant safety (branch feat/contact-intelligence)
- `c236acb` fix: cross-tenant takeover. Import lookups now owner-scoped (`importedByUserId`) + 217-line test.
- `9240068` feat(import): link-on-match to an enriched pool row (reuses enrichment, never overwrites another user's row); read-side privacy scoping of owner-private fields across all 3 contact GETs; CSV linkedInUrl validation; sanitized unique-violation errors.
- `0174e59` / `8b542c1`: waitlist fix + contacts feature (second session, reconciled clean).
- Verified at HEAD `db86844`: 1125 tests pass, tsc clean, working tree clean.

### 2026-06-15 18:39  (branch: feat/contact-intelligence)
- built the ops/ spine + session-log Stop hook + /ops-log command | learned consolidate 4 scattered logs (HANDOFF, progress.txt, .omc) into ops/ | decided ops markdown is the source of truth, richer in-app surface deferred to Subsystem 2
- commits:
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single
    - 0907d5b test(contacts): regression tests for read-side owner-private blanking
    - c1430b6 docs: mark handoff consolidated — tree clean, suite green at HEAD

### 2026-06-15 — Founder OS backbone live (ops-only, non-colliding with the landing session)
- built the Founder OS spine in `ops/`: `roadmap.md` (8 lanes x G0-G4 task tree, KithNode at G0), `ETHOS.md` (protected Iron Laws), `playbook.md` (cross-toolkit chains by lane), `founder-research.md` (8-founder rationale); tagged `tasks.md` lane+gate; added the skill-routing block to `CLAUDE.md`.
- decided: leverage gstack + superpowers + pm-skills via the playbook (ECC deferred); operating model = solo + AI + build-in-public, A->B optional; the org-band CODE is deferred to the session that owns `metrics.ts` (the landing session) to avoid a conflict.

### 2026-06-15 — Founder OS operating commands (.claude-only, non-colliding)
- built the Founder OS command layer: `/kithnode-morning-list` (the "wake up to a list" prioritizer — reads roadmap + tasks + Sentry/PostHog/Supabase signals, ranks toward the nearest gate, emits MORNING_LIST), `/kithnode-content-engine` (build-log -> build-in-public drafts in marketing/queue/, honesty-clamped + separate review pass), `/kithnode-roadmap` (roadmap-keeper: tag-enforce + sync). Wired kithnode-shipper + kithnode-rls-checker into the ops memory loop (read ETHOS + learnings, append on finish). Seeded marketing/queue/.
- learned: this repo gitignores `.claude/`, so commands/agents are local-only (not tracked); marketing/queue/ is the only tracked add.
- decided: ship commands manual-run first (ship->test->fix); overnight cron wiring via the existing notify.sh rail is the follow-up; org-band UI still belongs to the metrics.ts session.

### 2026-06-15 23:21  (branch: feat/contact-intelligence)
- commits:
    - 7483bd2 style(design): unify backgrounds — shared network mesh behind new sections + manifesto
    - daba6ba fix(intro): gate the auto-send email off for beta (you send it yourself)
    - 5d4b41a feat(landing): restructure to Cluely skeleton (wow / objection / FAQ / manifesto)
    - 0ca90c1 docs(landing): implementation plan for the landing remake
    - 4d48a31 feat(ops): agent OS spine + session auto-log + weekly digest + onboarding
    - 298b302 feat(marketing): pre-launch marketing system + product-marketing context
    - ada0d3b docs(landing): design spec for the Cluely-structure landing remake
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single
    - 0907d5b test(contacts): regression tests for read-side owner-private blanking

### 2026-06-15 23:24  (branch: feat/contact-intelligence)
- commits:
    - 7483bd2 style(design): unify backgrounds — shared network mesh behind new sections + manifesto
    - daba6ba fix(intro): gate the auto-send email off for beta (you send it yourself)
    - 5d4b41a feat(landing): restructure to Cluely skeleton (wow / objection / FAQ / manifesto)
    - 0ca90c1 docs(landing): implementation plan for the landing remake
    - 4d48a31 feat(ops): agent OS spine + session auto-log + weekly digest + onboarding
    - 298b302 feat(marketing): pre-launch marketing system + product-marketing context
    - ada0d3b docs(landing): design spec for the Cluely-structure landing remake
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
    - 5182b5f fix(import): findPoolRow uses maybeSingle, not single

### 2026-06-17 16:07  (branch: reconcile/feat-main)
- ` prose entries relevant to your reconciliation topics:
- commits:
    - db8945f Merge pull request #17 from scrigot/fix/userid-uuid
    - cefca01 docs(security): record Phase 1 UUID cutover as completed
    - 45bd5ee test: add user.id to mock sessions for UUID user-key migration
    - 6a55bfe fix(security): migrate user key from email to stable User.id (UUID)
    - 0ad094b feat(feedback): in-app beta feedback form at /dashboard/feedback
    - b6e1f4b feat(feedback): beta survey route + feedback_response table + one-time credits
    - e89a483 chore(groupme): daily Vercel cron + one-shot pull script
    - 1e824c7 feat(groupme): read-only GroupMe client + scheduled pull (cursor dedupe)
    - b07c243 feat(groupme): beta_feedback table + RLS migration
    - 0b2b78c feat(P2-2): Resend event webhook + EmailEvent tracking + bounce/complaint suppression
    - 60f1e45 test(activation): happy-path credit-wall smoke test [CHECK-1]
    - 5e86a45 feat(dev): throwaway test-user script [DX-2]
    - 2af9c5d feat(dev): onboarding-reset endpoint [DX-1]
    - 2f5d8ee fix(onboarding): make clubs a deliberate step with explicit skip [P1-2]
    - 6c40ef6 fix(onboarding): free-text high-school entry persists without dataset match [P2-1]
    - 8c64352 fix(discover): drop the High-Value unlock gate + exclude piped contacts
    - 792bee8 chore(test): exclude .claude worktrees from vitest scan
    - 3b992c2 fix(credits): raise trial/beta credit floor above the activation path
    - 74612f8 Merge remote-tracking branch 'origin/main' into feat/contact-intelligence
    - 31fbf37 feat(outreach): centered Draft Outreach modal
    - 78b98c5 feat(import): 3-tab layout (Manual / Enrich with AI / Bulk) + add-by-hand
    - 1ac34e5 feat(settings): Supabase-style left sub-nav + de-densified panes
    - bb73486 feat(notifications): follow-up reminder emails + digest/follow-up opt-outs
    - bdc409c feat(outreach): user-controlled draft style (tone/length/signature/subject)
    - 3df449c feat(profile): completeness meter + digest cron + shared overdue-leads helper
    - 5d9e08c feat: contact intelligence, Cluely landing rebuild, Founder Cockpit + Supabase-style dashboard shell (#13)
    - a5aefdb feat(dashboard): Supabase-style nav shell — full-width topbar, nav-only sidebar, credits on Usage
    - c5636ae feat(outreach): in-app Draft Outreach popup with mutual-signal highlighting
    - 8184ea2 docs(spec): in-app outreach popup design
    - 5457105 fix(onboarding): give grad year its own column, stop clobbering target date
    - 7a62b2c fix(onboarding): restore beta trial + unblock the onboarding flow
    - fe7f10c docs(ops): landing Cluely-rebuild spec
    - b8d5c51 feat(signup): harden waitlist email + paid-path activation event
    - 7057824 feat(landing): scoring as in-app Mac window + hide demo/sandbox
    - 0ca76d3 feat(landing): widen FAQ 50% + retitle 'Frequently asked questions'
    - c0feaf4 feat(landing): drop founder section + centered animated FAQ accordion
    - 06f7e40 feat(landing): Cluely centered hero — email demo up, network orb down to CTA
    - 51e7ed3 feat(landing): FAQ + final CTA — Cluely two-column / hairline layout
    - 3886513 feat(cockpit): land Founder Cockpit v2 schema + logic + roadmap->DB sync
    - d19f0f4 feat(landing): scoring section — Cluely 'Instant meeting notes' layout
    - 5f91f98 fix(landing): design-review pass — dark footer, uniform headline scale + section rhythm
    - 32000c1 chore(landing): preserve superseded preview drafts (previews.tsx)
    - f2f6b13 chore(ops): add Founder-OS scaffolding + cross-toolkit skill routing
    - 265344e feat(landing): rebuild middle into Cluely-style dashboard-accurate demos
    - 9b2aa0e docs(brand): split DESIGN.md into brand/landing.md + brand/dashboard.md
    - 7483bd2 style(design): unify backgrounds — shared network mesh behind new sections + manifesto
    - daba6ba fix(intro): gate the auto-send email off for beta (you send it yourself)
    - 5d4b41a feat(landing): restructure to Cluely skeleton (wow / objection / FAQ / manifesto)
    - 0ca90c1 docs(landing): implementation plan for the landing remake
    - 4d48a31 feat(ops): agent OS spine + session auto-log + weekly digest + onboarding
    - 298b302 feat(marketing): pre-launch marketing system + product-marketing context
    - ada0d3b docs(landing): design spec for the Cluely-structure landing remake
    - 14f1ae5 fix(landing,waitlist): drop the 'no browser extension' trust line
    - 6af26c2 fix(waitlist): drop the demo-output embed from the request page
    - 99b9240 feat(waitlist): scoring-transparency bullet + clearer data-handling at submit
    - a563c9b feat(landing): plain-English scoring transparency + CRO + de-fabricate for beta
    - 65aaa36 fix(landing): embed real demo output (scoring + outreach) over mockups
    - 0264ac1 fix(landing): real demo proof + authentic copy over fabricated social proof
