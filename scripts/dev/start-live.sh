#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERCEL_ENV="${TMPDIR:-/tmp}/kithnode-vercel-development.env"

cd "$ROOT"

# Hosted development is deliberately opt-in. The default dev command is fully
# local so a routine restart cannot accidentally read or mutate production-like
# data.
npx vercel env pull "$VERCEL_ENV" --environment=development --yes >/dev/null
set -a
# shellcheck disable=SC1090
source "$VERCEL_ENV"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Vercel Development is missing DATABASE_URL." >&2
  exit 1
fi

export DIRECT_URL="${DATABASE_URL/:6543\//:5432/}"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export ENABLE_CAREER_SKILLS="${ENABLE_CAREER_SKILLS:-true}"
export ENABLE_JOB_DISCOVERY="${ENABLE_JOB_DISCOVERY:-true}"

exec npx next dev -p 3000
