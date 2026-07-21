-- KithNode accesses public tables only from authenticated server routes using
-- the service role or the direct Prisma connection. Keep the Data API closed by
-- default so a newly added table cannot accidentally become a browser API.
do $migration$
declare
  relation_name text;
begin
  for relation_name in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('revoke all privileges on table public.%I from public', relation_name);
    execute format('revoke all privileges on table public.%I from anon', relation_name);
    execute format('revoke all privileges on table public.%I from authenticated', relation_name);
    execute format('grant all privileges on table public.%I to service_role', relation_name);
  end loop;
end
$migration$;

-- Functions are private unless explicitly exposed by a later, reviewed
-- migration. This closes the default EXECUTE-to-PUBLIC Postgres grant.
do $migration$
declare
  function_identity text;
begin
  for function_identity in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all privileges on function %s from public', function_identity);
    execute format('revoke all privileges on function %s from anon', function_identity);
    execute format('revoke all privileges on function %s from authenticated', function_identity);
    execute format('grant execute on function %s to service_role', function_identity);
  end loop;
end
$migration$;
