-- feedback_response: structured beta-feedback survey (one row per user).
-- Written only by /api/feedback/survey via the service-role key; first submit
-- grants FEEDBACK_CREDITS, edits never re-grant (user_email unique = idempotent).
-- Applied to prod via Supabase MCP migration `create_feedback_response`; repo copy.
create table if not exists public.feedback_response (
  id                  uuid primary key default gen_random_uuid(),
  user_email          text not null unique,        -- one row per user (idempotent credit grant)
  pmf                 text,                          -- 'very' | 'somewhat' | 'not'
  accuracy_score      int,                           -- 1..5: did warm paths feel real
  onboarding_score    int,                           -- 1..5: setup smoothness
  furthest_step       text,                          -- imported|discover|saved|drafted|sent
  whoa                text,
  friction            text,
  weekly_use          text,
  willingness_to_pay  text,
  credits_granted     boolean not null default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.feedback_response enable row level security;

-- Internal data, written only by the route via the service-role key (bypasses
-- RLS). Deny every client role so a leaked anon/authenticated key reads nothing.
create policy "feedback_response deny client access"
  on public.feedback_response for all to anon, authenticated
  using (false) with check (false);
