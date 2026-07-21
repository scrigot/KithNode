# KithNode data inventory

Last reviewed: 2026-07-10

This is the ownership and access manifest for production data. Every new table
must be added here in the same change as its migration.

## Access classes

- **Tenant:** an authenticated user may access only rows owned by their immutable
  `User.id`; RLS and application queries both enforce ownership.
- **Shared:** authenticated access is intentionally broader than one tenant and
  is constrained by a documented membership or visibility rule.
- **Server-only:** no `anon` or `authenticated` table privileges. Next.js uses the
  service role or direct Prisma connection behind route-level authorization.
- **Retire:** retained temporarily for rollback or migration verification. It has
  no product callers and must receive a deletion date.

## Canonical product tables

| Table family | Class | Owner / authorization | Retention |
|---|---|---|---|
| `User` | Tenant | `User.id`; email is an attribute | Account lifetime + deletion window |
| `AlumniContact` | Shared | Profile visibility plus relationship overlay | While profile has a lawful product purpose |
| `Connection`, `Pipeline`, `PipelineEntry`, `UserDiscover` | Tenant | UUID user columns | Account lifetime |
| `contact_override`, `contact_tags`, `ContactConnection` | Tenant | UUID owner; legacy email tag key must migrate | Account lifetime |
| `Friendship`, `Node`, `NodeMember`, `Message`, `NodeEvent` | Shared | Participant or node membership | Until participant deletion / node retention policy |
| `UsageEvent`, `EmailLog`, `EmailEvent`, `AuditLog` | Server-only | Authorized server routes and provider webhooks | Define operational retention before public beta |
| `waitlist_signups`, `intro_requests`, `Feedback`, `feedback_response`, `beta_feedback` | Server-only | Authorized workflow or narrow public insert route | Define marketing/support retention before public beta |
| `PromoCode`, `phases`, `milestones`, `ops_events`, `api_cost_log`, `mz_*` | Server-only | Founder operations role | Operational need only |
| `Me*` | Server-only | Temporary owner workspace, email-scoped | Migrate to UUID tenant models, then retire |

## Legacy and unowned tables

| Tables | Current decision | Exit gate |
|---|---|---|
| `companies`, `contacts`, `signals`, `scores`, `enrichments`, `affiliations`, `outreach`, `contact_ratings`, `learned_weights`, `user_preferences`, `pipeline_contacts` | Server-only FastAPI schema | Port remaining callers, observe zero traffic, then drop |
| `AgentRoom`, `AgentMessage`, `AgentEvent` | Server-only abandoned assistant prototype | Replace with the typed assistant schema or document an active caller |
| `chat_conversation`, `chat_message`, `discovery_lead`, `resume_doc`, `resume_evidence` | Server-only abandoned/parallel prototype | Reconcile with `Me*` and the canonical assistant/opportunity/artifact models |
| `_phase1_bk_*` | Retire | Export encrypted snapshot, compare row counts/hashes, record restore instructions, then drop |

## Functions and views

- `public.mz_refresh()` is internal. Only `service_role` may execute it. It must
  never regain the PostgreSQL default `PUBLIC` grant.
- Menza views use `security_invoker=on`; retain that setting in every replacement.
- `add_credits` and `spend_credits` are invoker functions. Their table RLS is
  load-bearing; migrate server callers to a private schema in the schema-baseline
  phase.

## Required follow-ups

1. Replace every email ownership key with `User.id`.
2. Generate a reproducible Supabase baseline from production migration history.
3. Add automated RLS tests for anon, authenticated tenant A/B, and service role.
4. Define retention durations and deletion/export workflows before public beta.
5. Review this file during every migration PR and quarterly in production.
# LinkedIn profile workspace

- `LinkedInProfile`: private working copies of a user's own LinkedIn profile.
  The versioned JSON document supports the top card, About, positioning,
  Featured, activity, experience, education, credentials, projects, skills,
  recommendations, courses, honors, languages, organizations, volunteering,
  publications, patents, tests, causes, services, and interests.
- `LinkedInProfileRevision`: immutable per-save history used for auditability
  and restore. A restore creates a new revision instead of deleting history.
- Both tables are server-only: RLS is enabled and `anon`/`authenticated` table
  privileges are revoked. Next.js routes scope every operation to the signed-in
  user ID.
