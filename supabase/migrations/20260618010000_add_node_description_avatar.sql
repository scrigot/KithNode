-- Node group settings: a description and a group avatar URL. Both additive,
-- defaulted to '' so existing nodes are unaffected. Edited owner-only via
-- PATCH /api/kith/nodes/[id] (description/name) and POST /api/kith/nodes/[id]/avatar
-- (avatar upload -> avatars storage bucket -> avatarUrl). Applied to prod via
-- Supabase MCP migration `add_node_description_avatar`; this is the repo copy.
alter table public."Node" add column if not exists "description" text not null default '';
alter table public."Node" add column if not exists "avatarUrl" text not null default '';
