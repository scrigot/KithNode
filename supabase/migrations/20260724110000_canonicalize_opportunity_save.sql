-- Make assistant opportunity saves canonical, non-destructive, and fully
-- reversible. Official listing URLs often differ only by tracking parameters;
-- those variants must resolve to the user's existing Applications record.

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
  v_canonical_url text;
  v_source text;
  v_external_id text;
  v_org_id text;
  v_created boolean := false;
  v_now timestamptz := now();
  v_output jsonb;
  v_relationship jsonb;
  v_new_contact_id text;
  v_new_contact_ids jsonb := '[]'::jsonb;
  v_event_id text;
  v_changed boolean := false;
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

  v_canonical_url := lower(regexp_replace(
    regexp_replace(v_opportunity->>'jobUrl', '[?#].*$', ''),
    '/+$',
    ''
  ));
  v_source := lower(coalesce(v_opportunity->>'source', ''));
  v_external_id := coalesce(v_opportunity->>'externalId', '');

  -- Serialize saves for one user and canonical listing so concurrent clicks
  -- cannot create tracking-parameter variants before either transaction sees
  -- the other's row.
  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id || ':' || v_canonical_url,
    0
  ));

  select * into v_existing
  from public."Opportunity"
  where "userId" = p_user_id
    and (
      (
        v_source <> ''
        and v_external_id <> ''
        and lower(coalesce(source, '')) = v_source
        and coalesce("externalId", '') = v_external_id
      )
      or lower(regexp_replace(
        regexp_replace("jobUrl", '[?#].*$', ''),
        '/+$',
        ''
      )) = v_canonical_url
    )
  order by
    case status
      when 'accepted' then 11
      when 'offer' then 10
      when 'interview' then 9
      when 'assessment' then 8
      when 'applied' then 7
      when 'preparing' then 6
      when 'saved' then 5
      when 'discovered' then 4
      when 'withdrawn' then 3
      when 'rejected' then 2
      when 'archived' then 1
      else 0
    end desc,
    ("jobUrl" = v_opportunity->>'jobUrl') desc,
    (
      v_source <> ''
      and v_external_id <> ''
      and lower(coalesce(source, '')) = v_source
      and coalesce("externalId", '') = v_external_id
    ) desc,
    "updatedAt" desc
  limit 1
  for update;

  if not found then
    v_created := true;
    v_changed := true;

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
    -- A save is not a status transition. Keep the user's richer record exactly
    -- as it is, including stage, priority, notes, deadline, and next action.
    v_saved := v_existing;
  end if;

  if v_created then
    v_event_id := gen_random_uuid()::text;
    insert into public."OpportunityEvent" (
      id, "userId", "opportunityId", type, title, detail, meta, "createdAt"
    ) values (
      v_event_id,
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

  -- Add only verified relationships that are not already attached. Existing
  -- links are left untouched, and only newly inserted IDs enter the undo log.
  for v_relationship in
    select relationship
    from jsonb_array_elements(
      coalesce(v_candidate->'data'->'relationships', '[]'::jsonb)
    ) relationship
    where relationship->>'state' = 'verified'
  loop
    if exists (
      select 1
      from public."AlumniContact" contact
      where contact.id = v_relationship->>'contactId'
        and contact."importedByUserId" = p_user_id
    ) then
      v_new_contact_id := null;
      insert into public."OpportunityContact" (
        id, "userId", "opportunityId", "contactId", score, reason, "createdAt"
      ) values (
        gen_random_uuid()::text,
        p_user_id,
        v_saved.id,
        v_relationship->>'contactId',
        least(100, greatest(0, round(coalesce((v_relationship->>'confidence')::numeric, 0.8) * 100)::integer)),
        coalesce(nullif(v_relationship->'evidence'->>0, ''), 'Verified relationship from the saved assistant result.'),
        v_now
      )
      on conflict ("userId", "opportunityId", "contactId") do nothing
      returning "contactId" into v_new_contact_id;

      if v_new_contact_id is not null then
        v_new_contact_ids := v_new_contact_ids || jsonb_build_array(v_new_contact_id);
        v_changed := true;
      end if;
    end if;
  end loop;

  if not v_created and jsonb_array_length(v_new_contact_ids) > 0 then
    v_event_id := gen_random_uuid()::text;
    insert into public."OpportunityEvent" (
      id, "userId", "opportunityId", type, title, detail, meta, "createdAt"
    ) values (
      v_event_id,
      p_user_id,
      v_saved.id,
      'assistant_linked_contacts',
      'Linked verified warm paths from Career Copilot',
      format(
        'Added %s verified relationship%s to %s at %s',
        jsonb_array_length(v_new_contact_ids),
        case when jsonb_array_length(v_new_contact_ids) = 1 then '' else 's' end,
        v_saved.role,
        v_saved.company
      ),
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
    'existing', not v_created,
    'changed', v_changed,
    'previousStatus', case when v_created then null else v_existing.status end,
    'attachedContactIds', v_new_contact_ids,
    'message', case
      when v_created then 'Saved to Applications. No application or message was sent.'
      when jsonb_array_length(v_new_contact_ids) > 0 then format(
        'Already in Applications. Linked %s new verified warm path%s without changing its stage or details.',
        jsonb_array_length(v_new_contact_ids),
        case when jsonb_array_length(v_new_contact_ids) = 1 then '' else 's' end
      )
      else 'Already in Applications. Its existing stage, priority, notes, and next action were kept.'
    end,
    'undoAvailable', v_changed
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
        'changedStatus', false,
        'previousStatus', case when v_created then null else v_existing.status end,
        'attachedContactIds', v_new_contact_ids,
        'eventId', v_event_id
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
  v_changed_status boolean;
  v_previous_status text;
  v_attached_contact_ids jsonb;
  v_event_id text;
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
  if coalesce((v_action.output->>'undoAvailable')::boolean, true) is not true then
    raise exception using errcode = '55000', message = 'This save did not change the Applications record';
  end if;

  v_opportunity_id := v_action."undoInput"->>'opportunityId';
  v_created := coalesce((v_action."undoInput"->>'created')::boolean, false);
  v_previous_status := v_action."undoInput"->>'previousStatus';
  v_attached_contact_ids := coalesce(v_action."undoInput"->'attachedContactIds', '[]'::jsonb);
  v_event_id := v_action."undoInput"->>'eventId';

  -- New actions explicitly record whether they changed status. For historical
  -- actions, preserve the old undo behavior when previousStatus is present.
  v_changed_status := case
    when v_action."undoInput" ? 'changedStatus'
      then coalesce((v_action."undoInput"->>'changedStatus')::boolean, false)
    else not v_created and v_previous_status is not null
  end;

  if v_created then
    delete from public."Opportunity"
    where id = v_opportunity_id and "userId" = p_user_id;
  else
    if jsonb_array_length(v_attached_contact_ids) > 0 then
      delete from public."OpportunityContact"
      where "userId" = p_user_id
        and "opportunityId" = v_opportunity_id
        and "contactId" in (
          select jsonb_array_elements_text(v_attached_contact_ids)
        );
    end if;

    if v_event_id is not null then
      delete from public."OpportunityEvent"
      where id = v_event_id
        and "userId" = p_user_id
        and "opportunityId" = v_opportunity_id;
    end if;

    if v_changed_status then
      update public."Opportunity"
      set status = coalesce(nullif(v_previous_status, ''), 'discovered'),
          "lastActivityAt" = v_now,
          "updatedAt" = v_now
      where id = v_opportunity_id and "userId" = p_user_id;
    end if;
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

revoke all on function public.execute_save_opportunity_action(text, text) from public, anon, authenticated;
revoke all on function public.undo_assistant_action(text, text) from public, anon, authenticated;
grant execute on function public.execute_save_opportunity_action(text, text) to service_role;
grant execute on function public.undo_assistant_action(text, text) to service_role;
