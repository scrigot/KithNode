-- beta_feedback: messages pulled from the beta-testers GroupMe (v1 scheduled pull).
-- Applied to prod via Supabase MCP migration `create_beta_feedback`; this file is the
-- reviewable repo copy. Dedupe key is the GroupMe message id (text pk).
create table if not exists public.beta_feedback (
  id         text primary key,                 -- GroupMe message id (dedupe key)
  author     text,                             -- message.name
  text       text,                             -- message.text (may be empty)
  source     text not null default 'groupme',
  created_at timestamptz                        -- message.created_at (epoch -> tz)
);

create index if not exists beta_feedback_source_created_idx
  on public.beta_feedback (source, created_at desc);

alter table public.beta_feedback enable row level security;

-- Internal founder data. The cron writes via the service-role key (bypasses RLS);
-- deny every client role so a leaked anon/authenticated key can't read feedback.
create policy "beta_feedback deny client access"
  on public.beta_feedback for all to anon, authenticated
  using (false) with check (false);
