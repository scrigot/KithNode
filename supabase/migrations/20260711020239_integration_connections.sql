create table if not exists public."IntegrationConnection" (
  id text primary key,
  "userId" text not null,
  provider text not null,
  "providerAccountId" text not null default '',
  email text not null default '',
  "accessTokenEncrypted" text not null,
  "refreshTokenEncrypted" text not null default '',
  "expiresAt" timestamptz,
  scopes text not null default '',
  status text not null default 'connected',
  "lastCheckedAt" timestamptz,
  "lastError" text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index if not exists "IntegrationConnection_userId_provider_key"
  on public."IntegrationConnection" ("userId", provider);
create index if not exists "IntegrationConnection_userId_status_updatedAt_idx"
  on public."IntegrationConnection" ("userId", status, "updatedAt" desc);

alter table public."IntegrationConnection" enable row level security;
revoke all privileges on table public."IntegrationConnection" from public, anon, authenticated;
grant all privileges on table public."IntegrationConnection" to service_role;
