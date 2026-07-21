-- contact_override: per-user private edits layered over a shared AlumniContact.
-- The Discover pool keeps ONE canonical row per person (global-unique, Option A);
-- a user who adds a pool contact to their network can personalize it WITHOUT
-- mutating the canonical row (which is shared across every user). The GET route
-- merges these overrides over the canonical row for the editing user only; the
-- PATCH route writes here (instead of AlumniContact) for non-owner editors.
--
-- `overrides` is a partial map of AlumniContact column names -> value (camelCase
-- keys mirroring EDITABLE_FIELDS in /api/contacts/[id]/route.ts). Profile keys
-- (title, firmName, ...) fall back to the canonical value when absent; personal
-- keys (notes, hometown, isFriend, ...) are overlay-only for a non-owner so the
-- canonical owner's private data is never surfaced.
--
-- Applied to prod via Supabase MCP migration `create_contact_override`; this
-- file is the reviewable repo copy. user_id is User.id (cuid), matching the
-- ownership checks in the contacts routes (UserDiscover / PipelineEntry).
create table if not exists public.contact_override (
  id         uuid primary key default gen_random_uuid(),
  user_id    text        not null,                         -- editor's User.id
  contact_id text        not null,                         -- AlumniContact.id
  overrides  jsonb       not null default '{}'::jsonb,     -- partial field map
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contact_id)
);

create index if not exists contact_override_user_idx
  on public.contact_override (user_id);

alter table public.contact_override enable row level security;

-- All access is via the service-role key inside the API routes, which scope
-- every read/write to the session user. Deny every client role so a leaked
-- anon/authenticated key can't read or write another user's private edits.
create policy "contact_override deny client access"
  on public.contact_override for all to anon, authenticated
  using (false) with check (false);
