-- Private Guided Research handoffs shared by the web workspace and the
-- owner's unpacked browser companion. Drafts never become contacts until the
-- signed-in user confirms a field-level preview in KithNode.

create table if not exists public."ResearchDraft" (
  id text primary key,
  "userId" text not null,
  status text not null default 'draft',
  "sourceType" text not null default 'manual',
  "sourceUrl" text not null default '',
  target jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  "selectedFields" jsonb not null default '[]'::jsonb,
  "contactId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "committedAt" timestamptz,
  constraint "ResearchDraft_status_check"
    check (status in ('draft', 'ready', 'committed', 'discarded')),
  constraint "ResearchDraft_sourceType_check"
    check ("sourceType" in ('manual', 'linkedin_manual', 'company_page', 'conversation'))
);

create index if not exists "ResearchDraft_userId_status_updatedAt_idx"
  on public."ResearchDraft" ("userId", status, "updatedAt" desc);
create index if not exists "ResearchDraft_userId_contactId_idx"
  on public."ResearchDraft" ("userId", "contactId");

alter table public."ResearchDraft" enable row level security;
revoke all privileges on table public."ResearchDraft" from public, anon, authenticated;
grant all privileges on table public."ResearchDraft" to service_role;
