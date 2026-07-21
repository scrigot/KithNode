create table if not exists public."LinkedInProfile" (
  id text primary key,
  "userId" text not null,
  name text not null default 'Untitled LinkedIn profile',
  "linkedInUrl" text not null default '',
  source text not null default 'manual',
  status text not null default 'draft',
  "isPrimary" boolean not null default false,
  "docVersion" integer not null default 1,
  content jsonb not null default '{}'::jsonb,
  audit jsonb not null default '{}'::jsonb,
  score integer not null default 0 check (score between 0 and 100),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."LinkedInProfileRevision" (
  id text primary key,
  "profileId" text not null references public."LinkedInProfile"(id) on delete cascade,
  "userId" text not null,
  version integer not null check (version > 0),
  content jsonb not null,
  audit jsonb not null default '{}'::jsonb,
  score integer not null default 0 check (score between 0 and 100),
  "changeSummary" text not null default '',
  source text not null default 'save',
  "createdAt" timestamptz not null default now()
);

create index if not exists "LinkedInProfile_userId_updatedAt_idx"
  on public."LinkedInProfile" ("userId", "updatedAt" desc);
create index if not exists "LinkedInProfile_userId_status_isPrimary_idx"
  on public."LinkedInProfile" ("userId", status, "isPrimary");
create unique index if not exists "LinkedInProfileRevision_profileId_version_key"
  on public."LinkedInProfileRevision" ("profileId", version);
create index if not exists "LinkedInProfileRevision_userId_createdAt_idx"
  on public."LinkedInProfileRevision" ("userId", "createdAt" desc);
create index if not exists "LinkedInProfileRevision_profileId_createdAt_idx"
  on public."LinkedInProfileRevision" ("profileId", "createdAt" desc);

alter table public."LinkedInProfile" enable row level security;
alter table public."LinkedInProfileRevision" enable row level security;
revoke all privileges on table public."LinkedInProfile" from public, anon, authenticated;
revoke all privileges on table public."LinkedInProfileRevision" from public, anon, authenticated;
grant all privileges on table public."LinkedInProfile" to service_role;
grant all privileges on table public."LinkedInProfileRevision" to service_role;
