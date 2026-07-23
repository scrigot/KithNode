#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE_VERSION="20260711004756"
BASELINE="$ROOT/supabase/baseline/${BASELINE_VERSION}_public.sql"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

cd "$ROOT"

if ! npx supabase status >/dev/null 2>&1; then
  npx supabase start
fi

echo "Resetting only the local Supabase database…"
npx supabase db reset --local --no-seed --yes

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BASELINE" >/dev/null
for migration in "$ROOT"/supabase/migrations/*.sql; do
  filename="$(basename "$migration")"
  version="${filename%%_*}"
  if [[ "$version" > "$BASELINE_VERSION" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
  fi
done

eval "$(npx supabase status -o env | sed -n \
  -e 's/^SERVICE_ROLE_KEY=/export SUPABASE_SERVICE_ROLE_KEY=/p')"
export DATABASE_URL
export DIRECT_URL="$DATABASE_URL"
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"

npx tsx scripts/dev/seed-local.ts
echo "Local KithNode data is ready."
