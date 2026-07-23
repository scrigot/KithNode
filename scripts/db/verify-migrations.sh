#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE_VERSION="20260711004756"
BASELINE="$ROOT/supabase/baseline/${BASELINE_VERSION}_public.sql"
VERIFY_DB="kithnode_verify_${$}"

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=54322}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:=postgres}"
export PGHOST PGPORT PGUSER PGPASSWORD

cleanup() {
  dropdb --if-exists "$VERIFY_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

node "$ROOT/scripts/db/materialize-production-history.mjs" --check
cleanup
createdb "$VERIFY_DB"

# A plain CI Postgres service does not include Supabase's global API roles.
# Create only the no-login roles needed to validate grants in the schema dump.
psql -d postgres -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;
SQL

psql -d "$VERIFY_DB" -v ON_ERROR_STOP=1 -f "$BASELINE" >/dev/null

# Apply only migrations created after the snapshot. Historical marker files
# align Supabase's remote history but their resulting DDL is already in baseline.
for migration in "$ROOT"/supabase/migrations/*.sql; do
  filename="$(basename "$migration")"
  version="${filename%%_*}"
  if [[ "$version" > "$BASELINE_VERSION" ]]; then
    psql -d "$VERIFY_DB" -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
  fi
done

psql -d "$VERIFY_DB" -v ON_ERROR_STOP=1 -At <<'SQL'
do $verify$
declare
  missing text[];
  rls_disabled integer;
begin
  select array_agg(required.name)
  into missing
  from (values
    ('User'), ('AlumniContact'), ('PipelineEntry'), ('Pipeline'),
    ('MeContact'), ('MeResume'), ('MeInternshipApplication'),
    ('CareerGoal'), ('AssistantConversation'), ('AssistantRun'),
    ('AssistantToolCall'), ('AssistantApproval'), ('AssistantResult'), ('AssistantAction'),
    ('RelationshipEvidence'), ('Recommendation'),
    ('OutreachDraft'), ('IntegrationConnection'), ('LinkedInProfile'), ('LinkedInProfileRevision'),
    ('Opportunity'), ('OpportunityContact'), ('OpportunityEvent'), ('ResearchDraft')
  ) as required(name)
  where to_regclass(format('public.%I', required.name)) is null;

  if missing is not null then
    raise exception 'baseline is missing required tables: %', missing;
  end if;

  select count(*) into rls_disabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if rls_disabled <> 0 then
    raise exception '% public tables do not have RLS enabled', rls_disabled;
  end if;

  if has_table_privilege('anon', 'public."User"', 'select') then
    raise exception 'anon unexpectedly has User select privilege';
  end if;
  if not has_table_privilege('service_role', 'public."User"', 'select') then
    raise exception 'service_role is missing User select privilege';
  end if;
  if has_table_privilege('authenticated', 'public."OpportunityEvent"', 'select') then
    raise exception 'authenticated unexpectedly has OpportunityEvent select privilege';
  end if;
  if not has_table_privilege('service_role', 'public."OpportunityEvent"', 'select') then
    raise exception 'service_role is missing OpportunityEvent select privilege';
  end if;
  if to_regprocedure('public.execute_save_opportunity_action(text,text)') is null
    or to_regprocedure('public.undo_assistant_action(text,text)') is null
    or to_regprocedure('public.deny_assistant_action(text,text,text)') is null then
    raise exception 'assistant action functions are missing';
  end if;
  if has_function_privilege('authenticated', 'public.execute_save_opportunity_action(text,text)', 'execute') then
    raise exception 'authenticated unexpectedly can execute assistant actions';
  end if;
  if not has_function_privilege('service_role', 'public.execute_save_opportunity_action(text,text)', 'execute') then
    raise exception 'service_role cannot execute assistant actions';
  end if;
end
$verify$;
select 'migration verification passed';
SQL

# Prove the golden-path mutation is server-owned, idempotent, and reversible.
psql -d "$VERIFY_DB" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
begin;

insert into public."AlumniContact" (
  id, name, "firmName", title, "linkedInUrl", university, "graduationYear",
  "importedByUserId", source
) values (
  'verify-contact',
  'Verified Contact',
  'Scale AI',
  'Applied AI Engineer',
  'https://www.linkedin.com/in/kithnode-verify-contact',
  'UNC Chapel Hill',
  2024,
  'verify-user',
  'manual'
);

insert into public."AssistantResult" (
  id, "runId", "userId", "skillId", status, payload, "sourceFreshAt", "expiresAt"
) values (
  'verify-result',
  'verify-run',
  'verify-user',
  'find_internships',
  'ready',
  jsonb_build_object(
    'cards',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'greenhouse:scale-ai:verify-job',
        'data', jsonb_build_object(
          'opportunity', jsonb_build_object(
            'company', 'Scale AI',
            'role', 'Applied AI Intern',
            'location', 'San Francisco, CA',
            'workMode', 'hybrid',
            'jobUrl', 'https://job-boards.greenhouse.io/scaleai/jobs/verify-job',
            'applyUrl', 'https://job-boards.greenhouse.io/scaleai/jobs/verify-job',
            'source', 'greenhouse',
            'externalId', 'verify-job',
            'description', 'Fixture listing used only inside a rolled-back migration test.',
            'fitScore', 91,
            'networkScore', 14,
            'matchReasons', jsonb_build_array('Applied AI matches approved evidence'),
            'postedAt', now(),
            'opportunityType', 'internship',
            'season', 'Summer 2027'
          ),
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'contactId', 'verify-contact',
              'state', 'verified',
              'confidence', 1,
              'evidence', jsonb_build_array('User confirmed this relationship.')
            )
          )
        )
      )
    )
  ),
  now(),
  now() + interval '1 day'
);

insert into public."AssistantToolCall" (
  id, "runId", "userId", "toolName", input, status, "riskLevel", "requiresApproval"
) values (
  'verify-tool',
  'verify-run',
  'verify-user',
  'save_opportunity',
  jsonb_build_object('resultId', 'verify-result', 'candidateId', 'greenhouse:scale-ai:verify-job'),
  'proposed',
  'write',
  true
);

insert into public."AssistantApproval" (
  id, "toolCallId", "userId", status
) values (
  'verify-approval',
  'verify-tool',
  'verify-user',
  'pending'
);

insert into public."AssistantAction" (
  id, "userId", "runId", "resultId", "toolCallId", "actionType",
  status, "idempotencyKey", preview, input
) values (
  'verify-action',
  'verify-user',
  'verify-run',
  'verify-result',
  'verify-tool',
  'save_opportunity',
  'previewed',
  'verify-run:save-opportunity:verify-job',
  jsonb_build_object('consequence', 'Creates one Applications record.'),
  jsonb_build_object('resultId', 'verify-result', 'candidateId', 'greenhouse:scale-ai:verify-job')
);

do $action_test$
declare
  first_receipt jsonb;
  retry_receipt jsonb;
  undo_receipt jsonb;
  opportunity_count integer;
  action_status text;
begin
  first_receipt := public.execute_save_opportunity_action('verify-user', 'verify-tool');
  retry_receipt := public.execute_save_opportunity_action('verify-user', 'verify-tool');
  if first_receipt <> retry_receipt then
    raise exception 'save action retry returned a different receipt';
  end if;

  select count(*) into opportunity_count
  from public."Opportunity"
  where "userId" = 'verify-user';
  if opportunity_count <> 1 then
    raise exception 'save action created % opportunities, expected 1', opportunity_count;
  end if;
  if (
    select count(*)
    from public."OpportunityContact"
    where "userId" = 'verify-user' and "contactId" = 'verify-contact'
  ) <> 1 then
    raise exception 'verified relationship was not attached to the saved opportunity';
  end if;

  undo_receipt := public.undo_assistant_action('verify-user', 'verify-action');
  if coalesce((undo_receipt->>'undone')::boolean, false) is not true then
    raise exception 'undo receipt is missing undone=true';
  end if;
  select count(*) into opportunity_count
  from public."Opportunity"
  where "userId" = 'verify-user';
  if opportunity_count <> 0 then
    raise exception 'undo left % opportunities, expected 0', opportunity_count;
  end if;

  perform public.undo_assistant_action('verify-user', 'verify-action');
  perform public.execute_save_opportunity_action('verify-user', 'verify-tool');
  select status into action_status
  from public."AssistantAction"
  where id = 'verify-action';
  if action_status <> 'completed' then
    raise exception 'save after undo ended in status %', action_status;
  end if;
end
$action_test$;

rollback;
SQL
echo "assistant action transaction passed"

DRIFT_FILE="${TMPDIR:-/tmp}/kithnode-prisma-drift-${$}.sql"
DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${VERIFY_DB}" \
  npx prisma migrate diff --from-config-datasource --to-schema "$ROOT/prisma/schema.prisma" --script >"$DRIFT_FILE"
if grep -Eq '^CREATE TABLE|ADD COLUMN' "$DRIFT_FILE"; then
  echo "Prisma models contain tables or columns missing from the migration baseline:" >&2
  grep -E '^CREATE TABLE|ADD COLUMN' "$DRIFT_FILE" >&2
  rm -f "$DRIFT_FILE"
  exit 1
fi
rm -f "$DRIFT_FILE"
echo "Prisma model coverage passed"
