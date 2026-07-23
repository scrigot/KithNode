-- Student-first opportunity typing for the canonical Applications tracker.
-- Existing records remain jobs; internship discovery writes explicit program
-- types so records can be filtered without inferring from mutable titles.

alter table public."Opportunity"
  add column if not exists "opportunityType" text not null default 'job';

update public."Opportunity"
set "opportunityType" = 'job'
where "opportunityType" is null or "opportunityType" = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Opportunity_opportunityType_check'
  ) then
    alter table public."Opportunity"
      add constraint "Opportunity_opportunityType_check"
      check ("opportunityType" in (
        'job', 'internship', 'co_op', 'externship', 'off_cycle',
        'summer_analyst', 'insight_program', 'leadership_program'
      ));
  end if;
end $$;

create index if not exists "Opportunity_userId_opportunityType_status_idx"
  on public."Opportunity" ("userId", "opportunityType", status);

alter table public."Opportunity" enable row level security;
revoke all privileges on table public."Opportunity" from public, anon, authenticated;
grant all privileges on table public."Opportunity" to service_role;
