-- Durable, server-only state for the agentic career copilot. Model output never
-- writes these tables directly; authenticated Next.js routes validate every
-- proposal and use a privileged server connection.

create table if not exists public."CareerGoal" (
  id text primary key,
  "userId" text not null,
  title text not null,
  status text not null default 'active',
  priority integer not null default 0,
  context jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."AssistantConversation" (
  id text primary key,
  "userId" text not null,
  title text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."AssistantMessage" (
  id text primary key,
  "conversationId" text not null,
  "userId" text not null,
  role text not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."AssistantRun" (
  id text primary key,
  "conversationId" text not null,
  "userId" text not null,
  status text not null default 'running',
  model text not null,
  "inputTokens" integer not null default 0,
  "outputTokens" integer not null default 0,
  error text not null default '',
  "createdAt" timestamptz not null default now(),
  "completedAt" timestamptz
);

create table if not exists public."AssistantToolCall" (
  id text primary key,
  "runId" text not null,
  "userId" text not null,
  "toolName" text not null,
  input jsonb not null,
  output jsonb,
  status text not null default 'proposed',
  "riskLevel" text not null default 'read',
  "requiresApproval" boolean not null default true,
  error text not null default '',
  "createdAt" timestamptz not null default now(),
  "completedAt" timestamptz
);

create table if not exists public."AssistantApproval" (
  id text primary key,
  "toolCallId" text not null unique,
  "userId" text not null,
  status text not null default 'pending',
  reason text not null default '',
  "createdAt" timestamptz not null default now(),
  "decidedAt" timestamptz
);

create table if not exists public."AssistantMemory" (
  id text primary key,
  "userId" text not null,
  kind text not null,
  content jsonb not null,
  "sourceMessageId" text,
  confidence double precision not null default 1,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Recommendation" (
  id text primary key,
  "userId" text not null,
  "goalId" text,
  kind text not null,
  title text not null,
  rationale text not null,
  evidence jsonb not null default '[]'::jsonb,
  confidence double precision not null default 0,
  status text not null default 'open',
  "dueAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "actedAt" timestamptz
);

create index if not exists "CareerGoal_user_status_priority_idx" on public."CareerGoal" ("userId", status, priority);
create index if not exists "AssistantConversation_user_updated_idx" on public."AssistantConversation" ("userId", "updatedAt" desc);
create index if not exists "AssistantMessage_conversation_created_idx" on public."AssistantMessage" ("conversationId", "createdAt");
create index if not exists "AssistantMessage_user_created_idx" on public."AssistantMessage" ("userId", "createdAt" desc);
create index if not exists "AssistantRun_user_created_idx" on public."AssistantRun" ("userId", "createdAt" desc);
create index if not exists "AssistantRun_conversation_created_idx" on public."AssistantRun" ("conversationId", "createdAt");
create index if not exists "AssistantToolCall_user_status_created_idx" on public."AssistantToolCall" ("userId", status, "createdAt" desc);
create index if not exists "AssistantToolCall_run_created_idx" on public."AssistantToolCall" ("runId", "createdAt");
create index if not exists "AssistantApproval_user_status_created_idx" on public."AssistantApproval" ("userId", status, "createdAt" desc);
create index if not exists "AssistantMemory_user_kind_active_idx" on public."AssistantMemory" ("userId", kind, active, "updatedAt" desc);
create index if not exists "Recommendation_user_status_due_idx" on public."Recommendation" ("userId", status, "dueAt", "createdAt" desc);

do $migration$
declare
  table_name text;
begin
  foreach table_name in array array[
    'CareerGoal', 'AssistantConversation', 'AssistantMessage', 'AssistantRun',
    'AssistantToolCall', 'AssistantApproval', 'AssistantMemory', 'Recommendation'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end
$migration$;
