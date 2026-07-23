-- Trusted warm-path + durable assistant action kernel.
-- Server-only: all reads and writes flow through authenticated route handlers
-- using the service role, with explicit userId predicates.

create table if not exists public."AssistantResult" (
  id text primary key,
  "runId" text not null,
  "userId" text not null,
  "skillId" text not null,
  status text not null default 'ready',
  payload jsonb not null,
  "sourceFreshAt" timestamptz,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AssistantResult_runId_key" unique ("runId"),
  constraint "AssistantResult_status_check"
    check (status in ('ready', 'partial', 'needs_setup', 'expired'))
);

create index if not exists "AssistantResult_userId_skillId_createdAt_idx"
  on public."AssistantResult" ("userId", "skillId", "createdAt" desc);
create index if not exists "AssistantResult_userId_expiresAt_idx"
  on public."AssistantResult" ("userId", "expiresAt");

create table if not exists public."AssistantAction" (
  id text primary key,
  "userId" text not null,
  "runId" text not null,
  "resultId" text references public."AssistantResult"(id) on delete set null,
  "toolCallId" text unique,
  "actionType" text not null,
  status text not null default 'previewed',
  "idempotencyKey" text not null,
  preview jsonb not null,
  input jsonb not null,
  output jsonb,
  "undoInput" jsonb,
  error text not null default '',
  "createdAt" timestamptz not null default now(),
  "approvedAt" timestamptz,
  "completedAt" timestamptz,
  "undoneAt" timestamptz,
  constraint "AssistantAction_userId_idempotencyKey_key"
    unique ("userId", "idempotencyKey"),
  constraint "AssistantAction_status_check"
    check (status in ('previewed', 'approved', 'denied', 'running', 'completed', 'failed', 'undone'))
);

create index if not exists "AssistantAction_userId_status_createdAt_idx"
  on public."AssistantAction" ("userId", status, "createdAt" desc);
create index if not exists "AssistantAction_runId_createdAt_idx"
  on public."AssistantAction" ("runId", "createdAt");

create table if not exists public."RelationshipEvidence" (
  id text primary key,
  "userId" text not null,
  "contactId" text not null,
  state text not null default 'potential',
  "relationshipType" text not null default 'unknown',
  source text not null,
  "sourceId" text not null default '',
  "sourceUrl" text not null default '',
  summary text not null,
  confidence double precision not null default 0,
  "verifiedByUser" boolean not null default false,
  "effectiveAt" timestamptz,
  "expiresAt" timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "RelationshipEvidence_identity_key"
    unique ("userId", "contactId", source, "sourceId", "relationshipType"),
  constraint "RelationshipEvidence_state_check"
    check (state in ('verified', 'potential', 'unavailable')),
  constraint "RelationshipEvidence_confidence_check"
    check (confidence >= 0 and confidence <= 1)
);

create index if not exists "RelationshipEvidence_userId_contactId_state_idx"
  on public."RelationshipEvidence" ("userId", "contactId", state);
create index if not exists "RelationshipEvidence_userId_state_updatedAt_idx"
  on public."RelationshipEvidence" ("userId", state, "updatedAt" desc);

-- The old compound unique constraint made every empty manual document collide.
alter table public."CareerDocument"
  drop constraint if exists "CareerDocument_legacy_key";
drop index if exists public."CareerDocument_userId_legacyType_legacyId_key";
create unique index if not exists "CareerDocument_nonempty_legacy_key"
  on public."CareerDocument" ("userId", "legacyType", "legacyId")
  where "legacyType" <> '' and "legacyId" <> '';
create index if not exists "CareerDocument_userId_legacyType_legacyId_idx"
  on public."CareerDocument" ("userId", "legacyType", "legacyId");

alter table public."AssistantResult" enable row level security;
alter table public."AssistantAction" enable row level security;
alter table public."RelationshipEvidence" enable row level security;

revoke all on table public."AssistantResult" from anon, authenticated;
revoke all on table public."AssistantAction" from anon, authenticated;
revoke all on table public."RelationshipEvidence" from anon, authenticated;

grant all on table public."AssistantResult" to service_role;
grant all on table public."AssistantAction" to service_role;
grant all on table public."RelationshipEvidence" to service_role;

create or replace function public.execute_save_opportunity_action(
  p_user_id text,
  p_tool_call_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public."AssistantAction"%rowtype;
  v_approval public."AssistantApproval"%rowtype;
  v_result public."AssistantResult"%rowtype;
  v_candidate jsonb;
  v_opportunity jsonb;
  v_existing public."Opportunity"%rowtype;
  v_saved public."Opportunity"%rowtype;
  v_company_key text;
  v_org_id text;
  v_created boolean := false;
  v_now timestamptz := now();
  v_output jsonb;
begin
  select * into v_action
  from public."AssistantAction"
  where "toolCallId" = p_tool_call_id and "userId" = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assistant action not found';
  end if;
  if v_action."actionType" <> 'save_opportunity' then
    raise exception using errcode = '22023', message = 'Assistant action type is not supported';
  end if;
  if v_action.status = 'completed' then
    return v_action.output;
  end if;
  if v_action.status not in ('previewed', 'approved', 'failed', 'undone') then
    raise exception using errcode = '55000', message = 'Assistant action cannot be executed from its current state';
  end if;

  select * into v_approval
  from public."AssistantApproval"
  where "toolCallId" = p_tool_call_id and "userId" = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assistant approval not found';
  end if;
  if v_approval.status = 'denied' then
    raise exception using errcode = '55000', message = 'Assistant action was denied';
  end if;

  select * into v_result
  from public."AssistantResult"
  where id = v_action."resultId" and "userId" = p_user_id
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'Stored assistant result not found';
  end if;
  if v_result."expiresAt" is not null and v_result."expiresAt" <= v_now then
    raise exception using errcode = '55000', message = 'Stored assistant result has expired; rerun the search';
  end if;

  select card into v_candidate
  from jsonb_array_elements(coalesce(v_result.payload->'cards', '[]'::jsonb)) card
  where card->>'id' = v_action.input->>'candidateId'
  limit 1;

  if v_candidate is null then
    raise exception using errcode = 'P0002', message = 'Stored candidate not found';
  end if;
  v_opportunity := v_candidate->'data'->'opportunity';
  if v_opportunity is null or coalesce(v_opportunity->>'jobUrl', '') = '' then
    raise exception using errcode = '22023', message = 'Stored candidate is missing its official listing URL';
  end if;

  v_company_key := trim(both '-' from regexp_replace(
    lower(coalesce(v_opportunity->>'company', '')),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
  if v_company_key = '' then
    raise exception using errcode = '22023', message = 'Stored candidate is missing its organization';
  end if;

  insert into public."Organization" (
    id, "userId", name, "nameKey", type, status, source, metadata, "createdAt", "updatedAt"
  ) values (
    gen_random_uuid()::text,
    p_user_id,
    v_opportunity->>'company',
    v_company_key,
    'company',
    'active',
    'assistant_result',
    jsonb_build_object('resultId', v_result.id),
    v_now,
    v_now
  )
  on conflict ("userId", "nameKey") do update
    set "updatedAt" = excluded."updatedAt"
  returning id into v_org_id;

  select * into v_existing
  from public."Opportunity"
  where "userId" = p_user_id and "jobUrl" = v_opportunity->>'jobUrl'
  for update;

  if not found then
    v_created := true;
    insert into public."Opportunity" (
      id, "userId", company, "companyKey", role, location, "workMode",
      "jobUrl", "applyUrl", source, "externalId", description, status,
      priority, "opportunityType", season, "lastActivityAt", "fitScore",
      "networkScore", "matchReasons", "sourceFreshAt", "postedAt",
      "organizationId", details, "createdAt", "updatedAt"
    ) values (
      gen_random_uuid()::text,
      p_user_id,
      v_opportunity->>'company',
      v_company_key,
      v_opportunity->>'role',
      coalesce(v_opportunity->>'location', ''),
      coalesce(v_opportunity->>'workMode', ''),
      v_opportunity->>'jobUrl',
      coalesce(v_opportunity->>'applyUrl', ''),
      coalesce(v_opportunity->>'source', 'assistant'),
      coalesce(v_opportunity->>'externalId', ''),
      coalesce(v_opportunity->>'description', ''),
      'saved',
      'medium',
      coalesce(v_opportunity->>'opportunityType', 'job'),
      coalesce(v_opportunity->>'season', ''),
      v_now,
      coalesce((v_opportunity->>'fitScore')::integer, 0),
      coalesce((v_opportunity->>'networkScore')::integer, 0),
      coalesce(v_opportunity->'matchReasons', '[]'::jsonb),
      v_result."sourceFreshAt",
      nullif(v_opportunity->>'postedAt', '')::timestamptz,
      v_org_id,
      jsonb_build_object('assistantResultId', v_result.id, 'candidateId', v_candidate->>'id'),
      v_now,
      v_now
    )
    returning * into v_saved;
  else
    update public."Opportunity"
    set status = 'saved',
        "lastActivityAt" = v_now,
        "updatedAt" = v_now
    where id = v_existing.id and "userId" = p_user_id
    returning * into v_saved;
  end if;

  if v_created or v_existing.status is distinct from 'saved' then
    insert into public."OpportunityEvent" (
      id, "userId", "opportunityId", type, title, detail, meta, "createdAt"
    ) values (
      gen_random_uuid()::text,
      p_user_id,
      v_saved.id,
      'assistant_saved',
      'Saved from Career Copilot',
      format('%s at %s', v_saved.role, v_saved.company),
      jsonb_build_object(
        'assistantActionId', v_action.id,
        'assistantResultId', v_result.id,
        'candidateId', v_candidate->>'id'
      ),
      v_now
    );
  end if;

  v_output := jsonb_build_object(
    'receiptId', v_action.id,
    'actionId', v_action.id,
    'resultId', v_result.id,
    'candidateId', v_candidate->>'id',
    'opportunityId', v_saved.id,
    'created', v_created,
    'previousStatus', case when v_created then null else v_existing.status end,
    'message', 'Saved to Applications. No application or message was sent.',
    'undoAvailable', true
  );

  update public."AssistantApproval"
  set status = 'approved', "decidedAt" = coalesce("decidedAt", v_now)
  where id = v_approval.id;

  update public."AssistantToolCall"
  set status = 'completed', output = v_output, error = '', "completedAt" = v_now
  where id = p_tool_call_id and "userId" = p_user_id;

  update public."AssistantAction"
  set status = 'completed',
      output = v_output,
      "undoInput" = jsonb_build_object(
        'opportunityId', v_saved.id,
        'created', v_created,
        'previousStatus', case when v_created then null else v_existing.status end
      ),
      "approvedAt" = coalesce("approvedAt", v_now),
      "completedAt" = v_now,
      error = ''
  where id = v_action.id;

  return v_output;
end;
$$;

create or replace function public.undo_assistant_action(
  p_user_id text,
  p_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public."AssistantAction"%rowtype;
  v_opportunity_id text;
  v_created boolean;
  v_previous_status text;
  v_now timestamptz := now();
  v_output jsonb;
begin
  select * into v_action
  from public."AssistantAction"
  where id = p_action_id and "userId" = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assistant action not found';
  end if;
  if v_action.status = 'undone' then
    return v_action.output;
  end if;
  if v_action.status <> 'completed' or v_action."actionType" <> 'save_opportunity' then
    raise exception using errcode = '55000', message = 'This action cannot be undone';
  end if;

  v_opportunity_id := v_action."undoInput"->>'opportunityId';
  v_created := coalesce((v_action."undoInput"->>'created')::boolean, false);
  v_previous_status := v_action."undoInput"->>'previousStatus';

  if v_created then
    delete from public."Opportunity"
    where id = v_opportunity_id and "userId" = p_user_id;
  else
    update public."Opportunity"
    set status = coalesce(nullif(v_previous_status, ''), 'discovered'),
        "lastActivityAt" = v_now,
        "updatedAt" = v_now
    where id = v_opportunity_id and "userId" = p_user_id;
  end if;

  v_output := coalesce(v_action.output, '{}'::jsonb) || jsonb_build_object(
    'undone', true,
    'undoneAt', v_now,
    'message', 'The Applications change was undone.'
  );

  update public."AssistantAction"
  set status = 'undone', output = v_output, "undoneAt" = v_now
  where id = v_action.id;

  return v_output;
end;
$$;

create or replace function public.deny_assistant_action(
  p_user_id text,
  p_tool_call_id text,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public."AssistantAction"%rowtype;
  v_approval public."AssistantApproval"%rowtype;
  v_now timestamptz := now();
  v_output jsonb;
begin
  select * into v_action
  from public."AssistantAction"
  where "toolCallId" = p_tool_call_id and "userId" = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assistant action not found';
  end if;
  if v_action.status = 'denied' then
    return coalesce(v_action.output, jsonb_build_object(
      'actionId', v_action.id,
      'status', 'denied',
      'message', 'The proposed action was not performed.'
    ));
  end if;
  if v_action.status not in ('previewed', 'failed') then
    raise exception using errcode = '55000', message = 'This action can no longer be denied';
  end if;

  select * into v_approval
  from public."AssistantApproval"
  where "toolCallId" = p_tool_call_id and "userId" = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assistant approval not found';
  end if;

  v_output := jsonb_build_object(
    'actionId', v_action.id,
    'status', 'denied',
    'message', 'The proposed action was not performed.'
  );

  update public."AssistantApproval"
  set status = 'denied',
      reason = left(coalesce(p_reason, ''), 500),
      "decidedAt" = coalesce("decidedAt", v_now)
  where id = v_approval.id;

  update public."AssistantToolCall"
  set status = 'denied',
      output = v_output,
      error = '',
      "completedAt" = v_now
  where id = p_tool_call_id and "userId" = p_user_id;

  update public."AssistantAction"
  set status = 'denied',
      output = v_output,
      "completedAt" = v_now,
      error = ''
  where id = v_action.id;

  return v_output;
end;
$$;

revoke all on function public.execute_save_opportunity_action(text, text) from public, anon, authenticated;
revoke all on function public.undo_assistant_action(text, text) from public, anon, authenticated;
revoke all on function public.deny_assistant_action(text, text, text) from public, anon, authenticated;
grant execute on function public.execute_save_opportunity_action(text, text) to service_role;
grant execute on function public.undo_assistant_action(text, text) to service_role;
grant execute on function public.deny_assistant_action(text, text, text) to service_role;
