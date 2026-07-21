create table if not exists public."Opportunity" (
  id text primary key,
  "userId" text not null,
  company text not null,
  "companyKey" text not null,
  role text not null,
  location text not null default '',
  "workMode" text not null default '',
  "jobUrl" text not null,
  "applyUrl" text not null default '',
  source text not null default 'manual',
  "externalId" text not null default '',
  description text not null default '',
  status text not null default 'discovered',
  "fitScore" integer not null default 0 check ("fitScore" between 0 and 100),
  "networkScore" integer not null default 0 check ("networkScore" between 0 and 100),
  "matchReasons" jsonb not null default '[]'::jsonb,
  "sourceFreshAt" timestamptz,
  "postedAt" timestamptz,
  deadline timestamptz,
  "resumeId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", "jobUrl")
);

create table if not exists public."OpportunityContact" (
  id text primary key,
  "userId" text not null,
  "opportunityId" text not null references public."Opportunity"(id) on delete cascade,
  "contactId" text not null,
  score integer not null default 0 check (score between 0 and 100),
  reason text not null default '',
  "createdAt" timestamptz not null default now(),
  unique ("userId", "opportunityId", "contactId")
);

create table if not exists public."JobSource" (
  id text primary key,
  "userId" text not null,
  company text not null,
  "companyKey" text not null,
  provider text not null,
  "boardToken" text not null default '',
  "careerUrl" text not null,
  "feedUrl" text not null default '',
  active boolean not null default true,
  "lastCheckedAt" timestamptz,
  "lastError" text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", "companyKey", provider)
);

create table if not exists public."ExtensionToken" (
  id text primary key,
  "userId" text not null,
  name text not null default 'Chrome extension',
  "tokenHash" text not null unique,
  scopes text not null default 'contacts:write profiles:write',
  "expiresAt" timestamptz,
  "revokedAt" timestamptz,
  "lastUsedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."ContactFieldProvenance" (
  id text primary key,
  "userId" text not null,
  "contactId" text not null,
  field text not null,
  source text not null,
  value jsonb not null,
  confidence double precision not null default 1,
  verified boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create index if not exists "Opportunity_userId_status_fitScore_idx"
  on public."Opportunity" ("userId", status, "fitScore" desc);
create index if not exists "Opportunity_userId_companyKey_idx"
  on public."Opportunity" ("userId", "companyKey");
create index if not exists "Opportunity_userId_source_externalId_idx"
  on public."Opportunity" ("userId", source, "externalId");
create index if not exists "OpportunityContact_userId_contactId_idx"
  on public."OpportunityContact" ("userId", "contactId");
create index if not exists "JobSource_userId_active_updatedAt_idx"
  on public."JobSource" ("userId", active, "updatedAt" desc);
create index if not exists "ExtensionToken_userId_revokedAt_createdAt_idx"
  on public."ExtensionToken" ("userId", "revokedAt", "createdAt" desc);
create index if not exists "ContactFieldProvenance_userId_contactId_field_createdAt_idx"
  on public."ContactFieldProvenance" ("userId", "contactId", field, "createdAt" desc);
create index if not exists "ContactFieldProvenance_userId_source_createdAt_idx"
  on public."ContactFieldProvenance" ("userId", source, "createdAt" desc);

-- Backfill owner workspace applications when their email maps to a canonical
-- User row. The original Me* rows remain untouched for compatibility.
insert into public."Opportunity" (
  id, "userId", company, "companyKey", role, location, "jobUrl", source,
  description, status, deadline, "resumeId", "createdAt", "updatedAt"
)
select
  'opp_' || replace(gen_random_uuid()::text, '-', ''),
  u.id,
  m.company,
  lower(regexp_replace(m.company, '[^a-zA-Z0-9]+', '', 'g')),
  m.role,
  m.location,
  case when nullif(m."jobUrl", '') is null then 'legacy://me-application/' || m.id else m."jobUrl" end,
  case when nullif(m.source, '') is null then 'legacy_me' else m.source end,
  m."jobDescription",
  case when m.archived then 'archived' else m.status end,
  m.deadline,
  m."resumeId",
  m."createdAt",
  m."updatedAt"
from public."MeInternshipApplication" m
join public."User" u on lower(u.email) = lower(m."userId")
on conflict ("userId", "jobUrl") do nothing;

alter table public."Opportunity" enable row level security;
alter table public."OpportunityContact" enable row level security;
alter table public."JobSource" enable row level security;
alter table public."ExtensionToken" enable row level security;
alter table public."ContactFieldProvenance" enable row level security;

revoke all privileges on table public."Opportunity" from public, anon, authenticated;
revoke all privileges on table public."OpportunityContact" from public, anon, authenticated;
revoke all privileges on table public."JobSource" from public, anon, authenticated;
revoke all privileges on table public."ExtensionToken" from public, anon, authenticated;
revoke all privileges on table public."ContactFieldProvenance" from public, anon, authenticated;
grant all privileges on table public."Opportunity" to service_role;
grant all privileges on table public."OpportunityContact" to service_role;
grant all privileges on table public."JobSource" to service_role;
grant all privileges on table public."ExtensionToken" to service_role;
grant all privileges on table public."ContactFieldProvenance" to service_role;
