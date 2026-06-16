# KithNode Roadmap — the Founder OS backbone

> Agent-readable source of truth for goals + tasks, organized by the 8 function lanes x 5 stage gates. The cockpit surfaces (org-band, morning-list, timeline) and the `ops/playbook.md` chains read THIS. Update it as gates clear. KithNode is at **G0** now (1 real user, beta this week).
>
> Operating model: solo + AI + build-in-public + revenue-as-content, raise/exit optional. Iron Laws in `ops/ETHOS.md`; the 8-founder rationale in `ops/founder-research.md`.

## Stage gates (the journey + how you die)
- **G0 Do things that don't scale (NOW)** — recruit users by hand, talk to them, start the build-in-public audience. Die by: building in a vacuum.
- **G1 PMF signal (-> ~$1k MRR)** — retention flattens (PostHog day-30 ~25% consumer / 35% B2B), Sean Ellis 40% test, pricing live. Die by: vanity growth mistaken for PMF.
- **G2 $1k -> $10k MRR** — make ONE channel repeatable + a founder sales playbook. Die by: scaling a channel before it is proven.
- **G3 $10k -> $100k MRR** — systems over tribal knowledge; the toolkits/agents run the repeatable work. Die by: founder stays the bottleneck.
- **G4 $100k -> $1M+ ARR** — hire behind a proven playbook or stay solo+AI; know default-alive vs default-dead. Die by: premature-hire burn.
- **North star: $1B mentality** — concentrated non-consensus bets, built-in distribution. A->B optionality (raise from strength, or exit) lives here.

## Phases (the timeline ladder the cockpit renders)
> Co-authored with Sam, locked 2026-06-15. Exactly one phase is ACTIVE; the next ~10 tasks below hang under it. Each phase maps to a gate.
- [x] Foundation — repo, MVP, ops spine, Founder OS backbone (shipped).
- [ ] **P0 — Beta with 5 users [G0] (ACTIVE)** — 5 real users onboarded by hand and watched.
- [ ] P1 — Beta with my PC / wider closed beta [G0 -> G1].
- [ ] P2 — Public beta + pricing live [G1].
- [ ] P3 — First $1k MRR [G1 -> G2].
- [ ] P4 — $10k MRR [G2].

## Tasks by lane x gate
Each task carries its gate `[G0]..[G4]`; lane = section. Check off as shipped (`build-log.md` has detail). Prune/expand toward ~100 with Sam.

### Product/Eng
- [ ] [G0] Onboard the first real beta user end-to-end; watch them use it without helping.
- [ ] [G0] Fix Discover scoring + the vertical pipeline UI.
- [ ] [G0] Ship the Founder Cockpit + org-band (one surface of this backbone).
- [ ] [G0] Instrument retention events in PostHog (day 1/7/30; activation = first swipe/connect).
- [ ] [G1] Define + shorten time-to-aha (first valuable contact/draft).
- [ ] [G1] Structure the repo so AI agents build reliably (AGENTS.md patterns, test scaffolds).
- [ ] [G2] Ship a shareable product loop (a result users want to post).
- [ ] [G3] Reliability/perf SLO via Sentry; agents handle routine fixes.
- [ ] [G4] Multi-user scale hardening.

### Growth/Marketing
- [ ] [G0] Start the named-founder build-in-public audience NOW (ship-log + revenue cadence).
- [ ] [G0] Marketing Phase 0 live (Reddit + faceless TikTok -> waitlist).
- [ ] [G0] Source-tag /waitlist (`?source=`) + lead-magnet download on /waitlist/thanks.
- [ ] [G1] Revenue-as-content: post the first paying-member milestone.
- [ ] [G1] Commit ONE primary channel to double down.
- [ ] [G2] Referral loop (founding members skip the line).
- [ ] [G2] LinkedIn founder lane + intern for IG.
- [x] [G2] Content-engine = `/kithnode-content-engine` (built, manual; overnight cron pending) — build-log -> drafts in marketing/queue/.
- [ ] [G3] SEO compounding.

### Sales
- [ ] [G0] Define the ICP precisely + talk to 10 by hand.
- [ ] [G1] Decide pricing + Stripe checkout live.
- [ ] [G1] Founder sales playbook v1 (script / objections / demo).
- [ ] [G2] Waitlist -> founding-member sequence; hit $1k MRR (KPI).
- [ ] [G3] Instrumented repeatable conversion.
- [ ] [G4] First sales hire only behind the proven playbook.

### Finance
- [ ] [G0] Set real FIXED_SUBSCRIPTIONS in the cockpit (true burn/runway).
- [ ] [G0] Entity (LLC?) + business bank account.
- [ ] [G1] Unit economics (CAC / LTV / margin; AI cost-per-draft already tracked).
- [ ] [G1] Bookkeeping ritual (Era/Monarch MCP).
- [ ] [G2] Track deductible expenses + quarterly-estimate awareness.
- [ ] [G3] Default-alive runway model.

### Legal/Compliance
- [ ] [G0] ToS + Privacy live (you hold alumni CONTACT data = real exposure).
- [ ] [G0] RLS audit on every table (rls-checker agent).
- [ ] [G1] Outreach/anti-spam review (CAN-SPAM, LinkedIn ToS for enrichment).
- [ ] [G1] Contact-data consent + deletion flow.
- [ ] [G2] IP assignment + trademark "KithNode" if worth it.
- [ ] [G3] Paid-member terms + refund policy.

### People/Hiring
- [ ] [G0] Define the "team" = the toolkits + custom agents (the org-band roster).
- [ ] [G1] Intern scope doc (IG/TikTok production + scheduling).
- [ ] [G2] First freelancer, high-trust delegation.
- [ ] [G3] Hire only behind a proven playbook.

### Fundraising
- [ ] [G0] Decide bootstrap-now, raise-later-from-strength; no raise pre-traction.
- [ ] [G1] Investor narrative builds passively (cockpit + traction + build-in-public IS the deck).
- [ ] [G2] Angel/pre-seed optionality once traction.
- [ ] [G3] Seed from strength if flipping to B.

### Ops/Founder-OS
- [x] [G0] Roadmap backbone live (this file) + operating model + cross-toolkit playbook (`ops/playbook.md`).
- [ ] [G0] Cockpit surfaces (org-band) + morning-list/timeline read this backbone.
- [x] [G0] Roadmap-keeper = `/kithnode-roadmap` (built) — enforces lane+gate tags + syncs this file.
- [x] [G1] Prioritizer = `/kithnode-morning-list` (built, manual; overnight cron push pending) — the "wake up to a list" dream.
- [ ] [G2] Automate-the-business pass (which recurring ops a toolkit/agent owns).
- [ ] [G3] Full agent org operating; org-band shows each lane manual -> copilot -> autonomous.

## Open inputs (only Sam has these; some gates are hollow without them)
- [ ] GitHub-stars target number + the OSS surface (which repo earns stars).
- [ ] NC idea pitch date.
- [ ] KithNode pricing (gates Sales G1).
