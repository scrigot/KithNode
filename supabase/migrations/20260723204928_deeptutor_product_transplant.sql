-- DeepTutor-to-KithNode product transplant.
-- Additive only: existing contacts, Opportunities, resumes, LinkedIn profiles,
-- outreach drafts, and research records remain authoritative and untouched.

create extension if not exists pgcrypto;

alter table public."Opportunity"
  add column if not exists "organizationId" text,
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public."Opportunity"
  drop constraint if exists "Opportunity_opportunityType_check";

alter table public."Opportunity"
  add constraint "Opportunity_opportunityType_check"
  check ("opportunityType" in (
    'job', 'internship', 'co_op', 'externship', 'off_cycle',
    'summer_analyst', 'insight_program', 'leadership_program',
    'club', 'mba', 'undergraduate', 'scholarship', 'fellowship', 'custom'
  ));

create table if not exists public."Organization" (
  id text primary key,
  "userId" text not null,
  name text not null,
  "nameKey" text not null,
  type text not null default 'company',
  domain text not null default '',
  website text not null default '',
  "logoUrl" text not null default '',
  location text not null default '',
  industry text not null default '',
  description text not null default '',
  status text not null default 'active',
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Organization_userId_nameKey_key" unique ("userId", "nameKey")
);

create index if not exists "Organization_userId_type_updatedAt_idx"
  on public."Organization" ("userId", type, "updatedAt" desc);
create index if not exists "Organization_userId_status_name_idx"
  on public."Organization" ("userId", status, name);

create table if not exists public."PersonOrganization" (
  id text primary key,
  "userId" text not null,
  "contactId" text not null,
  "organizationId" text not null references public."Organization"(id) on delete cascade,
  "relationshipType" text not null default 'employment',
  title text not null default '',
  "isCurrent" boolean not null default false,
  "startedAt" timestamptz,
  "endedAt" timestamptz,
  source text not null default 'manual',
  confidence double precision not null default 1,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "PersonOrganization_identity_key"
    unique ("userId", "contactId", "organizationId", "relationshipType", title)
);

create index if not exists "PersonOrganization_userId_contactId_idx"
  on public."PersonOrganization" ("userId", "contactId");
create index if not exists "PersonOrganization_userId_organizationId_isCurrent_idx"
  on public."PersonOrganization" ("userId", "organizationId", "isCurrent");

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Opportunity_organizationId_fkey'
  ) then
    alter table public."Opportunity"
      add constraint "Opportunity_organizationId_fkey"
      foreign key ("organizationId") references public."Organization"(id)
      on delete set null;
  end if;
end $$;

create index if not exists "Opportunity_userId_organizationId_idx"
  on public."Opportunity" ("userId", "organizationId");

create table if not exists public."CareerDocument" (
  id text primary key,
  "userId" text not null,
  type text not null default 'custom',
  title text not null,
  status text not null default 'draft',
  "variantType" text not null default '',
  "legacyType" text not null default '',
  "legacyId" text not null default '',
  content jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "CareerDocument_legacy_key" unique ("userId", "legacyType", "legacyId")
);

create index if not exists "CareerDocument_userId_type_updatedAt_idx"
  on public."CareerDocument" ("userId", type, "updatedAt" desc);
create index if not exists "CareerDocument_userId_status_updatedAt_idx"
  on public."CareerDocument" ("userId", status, "updatedAt" desc);

create table if not exists public."CareerDocumentRevision" (
  id text primary key,
  "documentId" text not null references public."CareerDocument"(id) on delete cascade,
  "userId" text not null,
  version integer not null,
  content jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  "changeSummary" text not null default '',
  source text not null default 'save',
  "createdAt" timestamptz not null default now(),
  constraint "CareerDocumentRevision_documentId_version_key"
    unique ("documentId", version)
);

create index if not exists "CareerDocumentRevision_userId_createdAt_idx"
  on public."CareerDocumentRevision" ("userId", "createdAt" desc);

create table if not exists public."CareerDocumentLink" (
  id text primary key,
  "documentId" text not null references public."CareerDocument"(id) on delete cascade,
  "userId" text not null,
  "entityType" text not null,
  "entityId" text not null,
  relation text not null default 'reference',
  "createdAt" timestamptz not null default now(),
  constraint "CareerDocumentLink_identity_key"
    unique ("userId", "documentId", "entityType", "entityId", relation)
);

create index if not exists "CareerDocumentLink_userId_entityType_entityId_idx"
  on public."CareerDocumentLink" ("userId", "entityType", "entityId");

create table if not exists public."SavedCrmView" (
  id text primary key,
  "userId" text not null,
  workspace text not null,
  name text not null,
  "isDefault" boolean not null default false,
  filters jsonb not null default '{}'::jsonb,
  sort jsonb not null default '[]'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "SavedCrmView_userId_workspace_name_key"
    unique ("userId", workspace, name)
);

create index if not exists "SavedCrmView_userId_workspace_updatedAt_idx"
  on public."SavedCrmView" ("userId", workspace, "updatedAt" desc);

create table if not exists public."MemoryCorrection" (
  id text primary key,
  "memoryId" text not null references public."AssistantMemory"(id) on delete cascade,
  "userId" text not null,
  action text not null,
  "beforeValue" jsonb not null,
  "afterValue" jsonb,
  reason text not null default '',
  "createdAt" timestamptz not null default now()
);

create index if not exists "MemoryCorrection_userId_memoryId_createdAt_idx"
  on public."MemoryCorrection" ("userId", "memoryId", "createdAt" desc);
create index if not exists "MemoryCorrection_userId_action_createdAt_idx"
  on public."MemoryCorrection" ("userId", action, "createdAt" desc);

create table if not exists public."KnowledgeSource" (
  id text primary key,
  "userId" text not null,
  "entityType" text not null,
  "entityId" text not null,
  title text not null,
  status text not null default 'ready',
  provenance text not null default '',
  "freshnessAt" timestamptz,
  "indexedAt" timestamptz,
  "lastCheckedAt" timestamptz,
  "safeErrorCode" text not null default '',
  "recoveryAction" text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "KnowledgeSource_identity_key"
    unique ("userId", "entityType", "entityId")
);

create index if not exists "KnowledgeSource_userId_status_updatedAt_idx"
  on public."KnowledgeSource" ("userId", status, "updatedAt" desc);
create index if not exists "KnowledgeSource_userId_entityType_updatedAt_idx"
  on public."KnowledgeSource" ("userId", "entityType", "updatedAt" desc);

create table if not exists public."AutomatedAssociationAudit" (
  id text primary key,
  "userId" text not null,
  "sourceType" text not null,
  "sourceId" text not null,
  "targetType" text not null,
  "targetId" text not null,
  action text not null,
  evidence jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AutomatedAssociationAudit_userId_source_idx"
  on public."AutomatedAssociationAudit" ("userId", "sourceType", "sourceId");
create index if not exists "AutomatedAssociationAudit_userId_target_idx"
  on public."AutomatedAssociationAudit" ("userId", "targetType", "targetId");

-- Duplicate-safe organization backfill from canonical Applications.
insert into public."Organization" (
  id, "userId", name, "nameKey", type, source, "createdAt", "updatedAt"
)
select
  gen_random_uuid()::text,
  o."userId",
  min(trim(o.company)),
  regexp_replace(lower(trim(o.company)), '[^a-z0-9]+', '', 'g'),
  case
    when o."opportunityType" in ('mba', 'undergraduate') then 'school'
    when o."opportunityType" = 'club' then 'club'
    when o."opportunityType" in ('scholarship', 'fellowship', 'insight_program', 'leadership_program') then 'program'
    else 'company'
  end,
  'application_backfill',
  min(o."createdAt"),
  max(o."updatedAt")
from public."Opportunity" o
where trim(coalesce(o.company, '')) <> ''
  and trim(coalesce(o."userId", '')) <> ''
group by o."userId", regexp_replace(lower(trim(o.company)), '[^a-z0-9]+', '', 'g'),
  case
    when o."opportunityType" in ('mba', 'undergraduate') then 'school'
    when o."opportunityType" = 'club' then 'club'
    when o."opportunityType" in ('scholarship', 'fellowship', 'insight_program', 'leadership_program') then 'program'
    else 'company'
  end
on conflict ("userId", "nameKey") do nothing;

-- Bring employer names from People into the same canonical identity layer.
insert into public."Organization" (
  id, "userId", name, "nameKey", type, industry, source, "createdAt", "updatedAt"
)
select
  gen_random_uuid()::text,
  c."importedByUserId",
  min(trim(c."firmName")),
  regexp_replace(lower(trim(c."firmName")), '[^a-z0-9]+', '', 'g'),
  'company',
  min(coalesce(c.industry, '')),
  'people_backfill',
  min(c."createdAt"),
  now()
from public."AlumniContact" c
where trim(coalesce(c."firmName", '')) <> ''
  and trim(coalesce(c."importedByUserId", '')) <> ''
group by c."importedByUserId",
  regexp_replace(lower(trim(c."firmName")), '[^a-z0-9]+', '', 'g')
on conflict ("userId", "nameKey") do update
  set industry = case
    when public."Organization".industry = '' then excluded.industry
    else public."Organization".industry
  end;

update public."Opportunity" o
set "organizationId" = org.id
from public."Organization" org
where o."organizationId" is null
  and org."userId" = o."userId"
  and org."nameKey" = regexp_replace(lower(trim(o.company)), '[^a-z0-9]+', '', 'g');

insert into public."PersonOrganization" (
  id, "userId", "contactId", "organizationId", "relationshipType",
  title, "isCurrent", source, confidence, "createdAt", "updatedAt"
)
select
  gen_random_uuid()::text,
  c."importedByUserId",
  c.id,
  org.id,
  'employment',
  coalesce(c.title, ''),
  true,
  'people_backfill',
  1,
  c."createdAt",
  now()
from public."AlumniContact" c
join public."Organization" org
  on org."userId" = c."importedByUserId"
 and org."nameKey" = regexp_replace(lower(trim(c."firmName")), '[^a-z0-9]+', '', 'g')
where trim(coalesce(c."firmName", '')) <> ''
  and trim(coalesce(c."importedByUserId", '')) <> ''
on conflict ("userId", "contactId", "organizationId", "relationshipType", title)
do nothing;

-- Catalog existing LinkedIn and outreach records without replacing them.
insert into public."CareerDocument" (
  id, "userId", type, title, status, "variantType", "legacyType", "legacyId",
  content, evidence, metadata, source, "createdAt", "updatedAt"
)
select
  gen_random_uuid()::text, p."userId", 'linkedin', p.name, p.status, '',
  'LinkedInProfile', p.id, p.content, '[]'::jsonb,
  jsonb_build_object('score', p.score, 'isPrimary', p."isPrimary"),
  'legacy_catalog', p."createdAt", p."updatedAt"
from public."LinkedInProfile" p
on conflict ("userId", "legacyType", "legacyId") do nothing;

insert into public."CareerDocument" (
  id, "userId", type, title, status, "variantType", "legacyType", "legacyId",
  content, evidence, metadata, source, "createdAt", "updatedAt"
)
select
  gen_random_uuid()::text, d."userId", 'outreach',
  case when trim(d.subject) = '' then 'Outreach draft' else d.subject end,
  d.status, '', 'OutreachDraft', d.id,
  jsonb_build_object('subject', d.subject, 'body', d.body),
  '[]'::jsonb,
  jsonb_build_object('contactId', d."contactId", 'channel', d.channel),
  'legacy_catalog', d."createdAt", d."updatedAt"
from public."OutreachDraft" d
on conflict ("userId", "legacyType", "legacyId") do nothing;

-- Every new product-layer table is server-only. Browser clients cannot bypass
-- the authenticated application routes; service_role is used on the server.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'Organization',
    'PersonOrganization',
    'CareerDocument',
    'CareerDocumentRevision',
    'CareerDocumentLink',
    'SavedCrmView',
    'MemoryCorrection',
    'KnowledgeSource',
    'AutomatedAssociationAudit'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);
  end loop;
end $$;

alter table public."Opportunity" enable row level security;
revoke all privileges on table public."Opportunity" from public, anon, authenticated;
grant all privileges on table public."Opportunity" to service_role;
