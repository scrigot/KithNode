-- NodeEvent: durable per-node activity log that powers the node Feed. The first
-- event kind is 'pipeline_advanced' — written (best-effort, fanned out to every
-- node the actor belongs to) when a member advances a pipeline contact into a
-- tracked universal phase (contacted / engaged / advanced). Read newest-first by
-- (nodeId, createdAt). Identity = the User UUID (actorId), matching the rest of
-- Kith. RLS: all access is via the service-role key inside the kith routes, which
-- scope every read to a node member — deny every client role.
-- Applied to prod via Supabase MCP migration `create_node_event`; repo copy.
create table if not exists public."NodeEvent" (
  id          text primary key,
  "nodeId"    text not null,
  "actorId"   text not null,
  kind        text not null,
  "contactId" text,
  phase       text,
  "createdAt" timestamptz not null default now()
);

create index if not exists "NodeEvent_node_created_idx"
  on public."NodeEvent" ("nodeId", "createdAt" desc);

alter table public."NodeEvent" enable row level security;

create policy "NodeEvent deny client access"
  on public."NodeEvent" for all to anon, authenticated
  using (false) with check (false);
