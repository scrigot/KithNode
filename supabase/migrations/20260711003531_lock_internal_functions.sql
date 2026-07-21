-- Founder KPI refresh is an internal maintenance function. It is SECURITY
-- DEFINER because it refreshes deny-by-default mirror tables, so leaving the
-- default PUBLIC execute grant in place would make it an unauthenticated write
-- endpoint. Keep this migration safe on fresh databases where the optional
-- Menza integration has not been installed.
do $migration$
begin
  if to_regprocedure('public.mz_refresh()') is not null then
    execute 'revoke all on function public.mz_refresh() from public';
    execute 'revoke all on function public.mz_refresh() from anon';
    execute 'revoke all on function public.mz_refresh() from authenticated';
    execute 'grant execute on function public.mz_refresh() to service_role';
    execute 'alter function public.mz_refresh() set search_path = public, pg_catalog';
  end if;
end
$migration$;
