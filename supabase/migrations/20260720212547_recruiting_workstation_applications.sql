-- Canonical KithNode recruiting-workstation application fields.
-- The public tables remain server-only: service_role is the only Data API role
-- with privileges, and RLS stays enabled as defense in depth.

alter table public."Opportunity"
  add column if not exists priority text not null default 'medium',
  add column if not exists season text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists "nextAction" text not null default '',
  add column if not exists "nextActionDue" timestamptz,
  add column if not exists "appliedAt" timestamptz,
  add column if not exists "archivedAt" timestamptz,
  add column if not exists "lastActivityAt" timestamptz not null default now();

update public."Opportunity"
set status = case status
  when 'interested' then 'saved'
  when 'applying' then 'preparing'
  else status
end;

update public."Opportunity"
set status = 'saved'
where status not in (
  'discovered', 'saved', 'preparing', 'applied', 'assessment', 'interview',
  'offer', 'accepted', 'rejected', 'withdrawn', 'archived'
);

update public."Opportunity"
set "lastActivityAt" = "updatedAt"
where "lastActivityAt" is null or "lastActivityAt" < "updatedAt";

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Opportunity_status_check'
  ) then
    alter table public."Opportunity"
      add constraint "Opportunity_status_check"
      check (status in (
        'discovered', 'saved', 'preparing', 'applied', 'assessment', 'interview',
        'offer', 'accepted', 'rejected', 'withdrawn', 'archived'
      ));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'Opportunity_priority_check'
  ) then
    alter table public."Opportunity"
      add constraint "Opportunity_priority_check"
      check (priority in ('low', 'medium', 'high'));
  end if;
end $$;

create table if not exists public."OpportunityEvent" (
  id text primary key,
  "userId" text not null,
  "opportunityId" text not null references public."Opportunity"(id) on delete cascade,
  type text not null default 'note',
  title text not null,
  detail text not null default '',
  meta jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists "Opportunity_userId_priority_deadline_idx"
  on public."Opportunity" ("userId", priority, deadline);
create index if not exists "Opportunity_userId_nextActionDue_idx"
  on public."Opportunity" ("userId", "nextActionDue");
create index if not exists "Opportunity_userId_lastActivityAt_idx"
  on public."Opportunity" ("userId", "lastActivityAt" desc);
create index if not exists "OpportunityEvent_userId_opportunityId_createdAt_idx"
  on public."OpportunityEvent" ("userId", "opportunityId", "createdAt" desc);
create index if not exists "OpportunityEvent_userId_type_createdAt_idx"
  on public."OpportunityEvent" ("userId", type, "createdAt" desc);

-- Recover the richer personal-workspace fields for rows backfilled by the
-- career-skills migration. Original Me* rows remain intact for one release.
update public."Opportunity" o
set
  priority = case when m.priority in ('low', 'medium', 'high') then m.priority else 'medium' end,
  season = coalesce(m.season, ''),
  notes = coalesce(m.notes, ''),
  "nextAction" = coalesce(m."nextAction", ''),
  "nextActionDue" = m."nextActionDue",
  "appliedAt" = m."appliedAt",
  "archivedAt" = case when m.archived then coalesce(m."updatedAt", now()) else null end,
  "lastActivityAt" = greatest(o."updatedAt", m."updatedAt"),
  status = case
    when m.archived then 'archived'
    when m.status = 'interested' then 'saved'
    when m.status = 'applying' then 'preparing'
    when m.status in ('discovered', 'saved', 'preparing', 'applied', 'assessment', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn', 'archived') then m.status
    else o.status
  end
from public."MeInternshipApplication" m
join public."User" u on lower(u.email) = lower(m."userId")
where o."userId" = u.id
  and o."jobUrl" = case
    when nullif(m."jobUrl", '') is null then 'legacy://me-application/' || m.id
    else m."jobUrl"
  end;

insert into public."OpportunityEvent" (
  id, "userId", "opportunityId", type, title, detail, meta, "createdAt"
)
select
  'legacy_created_' || md5(m.id),
  u.id,
  o.id,
  'created',
  'Application imported',
  m.role || ' at ' || m.company,
  jsonb_build_object('source', 'legacy_me', 'legacyApplicationId', m.id),
  m."createdAt"
from public."MeInternshipApplication" m
join public."User" u on lower(u.email) = lower(m."userId")
join public."Opportunity" o
  on o."userId" = u.id
 and o."jobUrl" = case
   when nullif(m."jobUrl", '') is null then 'legacy://me-application/' || m.id
   else m."jobUrl"
 end
on conflict (id) do nothing;

insert into public."OpportunityEvent" (
  id, "userId", "opportunityId", type, title, detail, meta, "createdAt"
)
select
  'legacy_event_' || md5(e.id),
  u.id,
  o.id,
  e.type,
  e.title,
  e.detail,
  e.meta,
  e."createdAt"
from public."MeApplicationEvent" e
join public."MeInternshipApplication" m on m.id = e."applicationId"
join public."User" u on lower(u.email) = lower(m."userId")
join public."Opportunity" o
  on o."userId" = u.id
 and o."jobUrl" = case
   when nullif(m."jobUrl", '') is null then 'legacy://me-application/' || m.id
   else m."jobUrl"
 end
on conflict (id) do nothing;

alter table public."OpportunityEvent" enable row level security;

revoke all privileges on table public."Opportunity" from public, anon, authenticated;
revoke all privileges on table public."OpportunityContact" from public, anon, authenticated;
revoke all privileges on table public."OpportunityEvent" from public, anon, authenticated;
grant all privileges on table public."Opportunity" to service_role;
grant all privileges on table public."OpportunityContact" to service_role;
grant all privileges on table public."OpportunityEvent" to service_role;
