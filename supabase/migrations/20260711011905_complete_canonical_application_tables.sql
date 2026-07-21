-- Fill the canonical application tables that existed in production but were
-- absent from older local databases. Every operation is additive/idempotent.
create table if not exists public."MeInternshipApplication" (
  id text primary key,
  "userId" text not null,
  company text not null,
  role text not null,
  location text not null default '',
  season text not null default '',
  "jobUrl" text not null default '',
  source text not null default '',
  deadline timestamp(3),
  status text not null default 'interested',
  priority text not null default 'medium',
  "resumeId" text,
  "jobDescription" text not null default '',
  notes text not null default '',
  "nextAction" text not null default '',
  "nextActionDue" timestamp(3),
  "appliedAt" timestamp(3),
  archived boolean not null default false,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists public."MeApplicationContact" (
  id text primary key,
  "userId" text not null,
  "applicationId" text not null,
  "contactId" text not null,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists public."MeApplicationEvent" (
  id text primary key,
  "userId" text not null,
  "applicationId" text not null,
  type text not null default 'note',
  title text not null,
  detail text not null default '',
  meta jsonb not null default '{}'::jsonb,
  "createdAt" timestamp(3) not null default current_timestamp
);

create index if not exists "MeInternshipApplication_userId_status_idx" on public."MeInternshipApplication" ("userId", status);
create index if not exists "MeInternshipApplication_userId_deadline_idx" on public."MeInternshipApplication" ("userId", deadline);
create index if not exists "MeInternshipApplication_userId_nextActionDue_idx" on public."MeInternshipApplication" ("userId", "nextActionDue");
create index if not exists "MeInternshipApplication_userId_company_idx" on public."MeInternshipApplication" ("userId", company);
create index if not exists "MeInternshipApplication_userId_resumeId_idx" on public."MeInternshipApplication" ("userId", "resumeId");
create index if not exists "MeApplicationContact_userId_applicationId_idx" on public."MeApplicationContact" ("userId", "applicationId");
create index if not exists "MeApplicationContact_userId_contactId_idx" on public."MeApplicationContact" ("userId", "contactId");
create unique index if not exists "MeApplicationContact_userId_applicationId_contactId_key" on public."MeApplicationContact" ("userId", "applicationId", "contactId");
create index if not exists "MeApplicationEvent_userId_applicationId_createdAt_idx" on public."MeApplicationEvent" ("userId", "applicationId", "createdAt");
create index if not exists "MeApplicationEvent_userId_type_createdAt_idx" on public."MeApplicationEvent" ("userId", type, "createdAt");

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'MeInternshipApplication_resumeId_fkey') then
    alter table public."MeInternshipApplication"
      add constraint "MeInternshipApplication_resumeId_fkey"
      foreign key ("resumeId") references public."MeResume"(id) on delete set null on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'MeApplicationContact_applicationId_fkey') then
    alter table public."MeApplicationContact"
      add constraint "MeApplicationContact_applicationId_fkey"
      foreign key ("applicationId") references public."MeInternshipApplication"(id) on delete cascade on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'MeApplicationContact_contactId_fkey') then
    alter table public."MeApplicationContact"
      add constraint "MeApplicationContact_contactId_fkey"
      foreign key ("contactId") references public."MeContact"(id) on delete cascade on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'MeApplicationEvent_applicationId_fkey') then
    alter table public."MeApplicationEvent"
      add constraint "MeApplicationEvent_applicationId_fkey"
      foreign key ("applicationId") references public."MeInternshipApplication"(id) on delete cascade on update cascade;
  end if;
end
$constraints$;

do $security$
declare
  table_name text;
begin
  foreach table_name in array array[
    'MeInternshipApplication', 'MeApplicationContact', 'MeApplicationEvent'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from public', table_name);
    execute format('revoke all privileges on table public.%I from anon', table_name);
    execute format('revoke all privileges on table public.%I from authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);
  end loop;
end
$security$;
