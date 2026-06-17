# Tooling, Accounts, and Shared Claude Policy

The full stack, who uses what, the access level interns get, the shared Claude Team policy,
and the monthly cost roll-up. Pricing is as of 2026; sources cited at the bottom.

## The stack

| Service | Purpose | Primary user | Intern access |
|---------|---------|--------------|---------------|
| Slack | Team comms, standups, alerts | All | Member |
| Notion | Command center: wiki, SOPs, OKRs, dashboards | All | Edit own pages, read ops |
| Google Workspace (Sheets/Drive) | All data + tracking sheets | Data + Growth | Edit shared sheets only |
| Attio or HubSpot (CRM) | Institutional pipeline, decision-maker mapping | Sam (sales) | Comment / read |
| Linear | Bug + eng task tracking | I8 files, Sam triages | Create issues |
| Canny | Customer feature requests / feedback | I8 monitors | Admin (I8), public board |
| PostHog | Product analytics (DAU, funnels, events) | I10 + Growth | Read-only (Viewer) |
| Loops | Onboarding + nurture email sequences (not yet wired) | I6 drafts, Sam sends | Editor on drafts |
| Hunter + Apollo | Email/contact enrichment | I2 only | Single capped seat |
| Mercury | Business banking | Sam | None |
| Ramp or Brex | Corporate card + expense tracking | Sam | None (issued card, no admin) |
| Carta or Pulley | Cap table | Sam | None |
| Vanta or Drata | SOC 2 readiness + compliance | Sam | None |
| Stripe Atlas or Clerky | Incorporation + legal docs | Sam | None |
| Stripe | Billing | Sam only | None |
| Supabase | Prod database + RLS | Sam only | None |
| Vercel / Railway | Deploys (frontend / backend) | Sam only | None |
| GitHub | Code | Sam (+ eng later) | None in P0 |
| Granola | Auto-transcribe pilot + user calls | Sam, Growth | Per-meeting share |
| Calendly | Booking onboarding / discovery slots | Growth + sales | Own booking link |
| GroupMe / Discord | Where students live; community + recruiting | Growth | Personal accounts as ambassadors |

The two-plane principle: interns operate on the data and distribution plane (Sheets, Slack,
Notion, CRM read, PostHog read, the campus). Sam alone holds the trust plane (Stripe,
Supabase, prod env, RLS, banking, cap table, deploy). The hand-off is Sam importing a cleaned
sheet, never an intern with a prod or financial credential. See `access-boundary.md`.

## Shared Claude policy (Claude Team plan, mixed seats)

Decision: use the Claude Team plan. It is built for groups of 5 to 150, with central billing,
admin controls, shared Projects, SSO, and domain capture.

Seat allocation:

- 1 Premium seat for Sam (and any future builder). Premium ($100/seat/mo annual, $125
  monthly) bundles the Claude app and Claude Code on one bill, with about 5x the usage of
  Standard. This is the seat that runs Claude Code all day.
- Standard seats for interns who need Claude ($20/seat/mo annual, $25 monthly). Standard
  includes all Claude features plus team features (Slack/M365 integrations, enterprise
  search, SSO, central billing, admin controls), but not Claude Code.
- Team plans let you mix seat types freely, with no minimum number of Premium seats and no
  required ratio. Minimum 5 seats total. Start with 1 Premium + 4 Standard and add as you hire.

Admin controls to set on day one:

- Spending caps at the org level and per-user, so an agent session cannot run up a surprise bill.
- SSO + domain capture so seats are tied to company identity.
- Shared Projects for team knowledge. Create at minimum: a "Procurement Answer Library"
  Project (FERPA, security questionnaire, SSO, DPA answers) that the procurement agent draws
  from, and an "Outreach Voice" Project holding the labeled corpus.

What interns see vs not:

- Interns see only the shared Projects they are added to. The Procurement and any
  legal/financial Projects are Sam-only.
- Never paste customer PII or student educational records into a shared Project. Enterprise
  is the tier to consider later if you need audit logging, custom retention, fine-grained
  RBAC, or HIPAA-style controls; Team is sufficient for now.

If cost is tight at the very start, the fallback is to keep Sam on a personal Max plan and
have interns use their own Pro accounts, then migrate to Team once the first intern is
productive. The recommended path is Team from the start for the admin controls and shared
knowledge.

## Monthly cost roll-up (illustrative, P0 scale)

| Bucket | Est. monthly |
|--------|--------------|
| Claude Team (1 Premium + 4 Standard, annual rates) | ~$180 |
| Slack / Notion / Google Workspace / Linear (small team) | ~$100-250 |
| CRM (Attio/HubSpot starter), Calendly | ~$0-80 |
| Hunter + Apollo (capped) | ~$50-100 |
| PostHog / Canny / Loops (free or startup tiers at P0 volume) | ~$0 |
| Vanta/Drata (SOC 2, starts in P0/P1) | ~$200-500 when started |
| Mercury / Ramp / Carta (mostly free at this stage) | ~$0 |
| Total tools (pre-SOC2) | roughly $400-700/mo |

Intern stipends are a separate line in `financial-model.csv`. Many finance students will work
for credit, a real title, and a reference, so the binding cost early is Sam's management time,
not cash.

## Sources

- Claude Team and Premium seat pricing and admin controls: https://www.grandlinux.com/en/blogs/claude-team-premium.html , https://www.morphllm.com/claude-code-team-pricing , https://tygartmedia.com/claude-team-pricing-2026-standard-premium-seats/
- Claude Team vs Enterprise governance: https://runbear.io/posts/claude-enterprise-pricing-mid-market , https://www.finout.io/blog/claude-pricing-in-2026-for-individuals-organizations-and-developers
- Enrichment vs orchestration tooling (Clay vs n8n/Make/Zapier): https://dev.to/zackrag/clay-vs-n8n-vs-make-vs-apify-which-enrichment-stack-fits-your-team-size-15en , https://www.octavehq.com/post/n8n-vs-zapier-vs-make-complete-2026-comparison-guide
