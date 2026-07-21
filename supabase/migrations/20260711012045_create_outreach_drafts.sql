create table if not exists public."OutreachDraft" (
  id text primary key,
  "userId" text not null,
  "contactId" text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  channel text not null default 'email',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "sentAt" timestamptz
);

create index if not exists "OutreachDraft_userId_status_updatedAt_idx"
  on public."OutreachDraft" ("userId", status, "updatedAt" desc);
create index if not exists "OutreachDraft_userId_contactId_createdAt_idx"
  on public."OutreachDraft" ("userId", "contactId", "createdAt" desc);

alter table public."OutreachDraft" enable row level security;
revoke all privileges on table public."OutreachDraft" from public, anon, authenticated;
grant all privileges on table public."OutreachDraft" to service_role;
