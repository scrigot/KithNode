#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT"

if ! npx supabase status >/dev/null 2>&1; then
  echo "Starting KithNode's local database…"
  npx supabase start
fi

eval "$(npx supabase status -o env | sed -n \
  -e 's/^SERVICE_ROLE_KEY=/export SUPABASE_SERVICE_ROLE_KEY=/p')"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "The local Supabase service-role key could not be resolved." >&2
  exit 1
fi

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
export DIRECT_URL="$DATABASE_URL"
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export AUTH_SECRET="${AUTH_SECRET:-kithnode-local-only-auth-secret-change-before-deploy}"
export ENABLE_CAREER_SKILLS="${ENABLE_CAREER_SKILLS:-true}"
export ENABLE_JOB_DISCOVERY="${ENABLE_JOB_DISCOVERY:-true}"

exec npx next dev -p 3000
