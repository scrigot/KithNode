#!/usr/bin/env bash
# Bring up the isolated LOCAL stack for the /me personal workspace, then sync its
# schema. Idempotent — safe to re-run after a reboot/sleep. Touches local only;
# never prod. After this finishes: `npm run dev:me` → http://localhost:3030/me
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54322/kithnode_me"

echo "→ colima (docker daemon)"
colima status >/dev/null 2>&1 || colima start --cpu 2 --memory 4

echo "→ supabase local stack"
if ! docker ps --format '{{.Names}}' | grep -q supabase_db; then
  supabase start
fi

DBC=$(docker ps --format '{{.Names}}' | grep supabase_db | head -1)
if [ -z "$DBC" ]; then echo "✗ supabase db container not found" >&2; exit 1; fi

echo "→ ensure kithnode_me database"
docker exec "$DBC" psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='kithnode_me'" | grep -q 1 \
  || docker exec "$DBC" psql -U postgres -d postgres -c "CREATE DATABASE kithnode_me"

echo "→ prisma db push (kithnode_me, local only)"
npx prisma db push --url "$LOCAL_DB"

echo "✓ local stack ready → run: npm run dev:me → http://localhost:3030/me"
