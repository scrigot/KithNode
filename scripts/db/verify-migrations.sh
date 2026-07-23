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
    ('AssistantToolCall'), ('AssistantApproval'), ('Recommendation'),
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
end
$verify$;
select 'migration verification passed';
SQL

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
