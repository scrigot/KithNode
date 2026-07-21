-- Tables in this list are intentionally server-only while their owning product
-- path is retired, rebuilt, or reconciled with the canonical Prisma schema.
-- RLS with no policy already fails closed; explicit privilege revocation also
-- keeps them out of the Data API if project exposure defaults change.
--
-- Do not add Me* tables here. They have explicit deny-client/service-role
-- policies from the personal-workspace migration.
do $migration$
declare
  table_name text;
  server_only_tables constant text[] := array[
    'AgentEvent',
    'AgentMessage',
    'AgentRoom',
    'Pipeline',
    'PromoCode',
    '_phase1_bk_AlumniContact_20260617',
    '_phase1_bk_ContactConnection_20260617',
    '_phase1_bk_EmailLog_20260617',
    '_phase1_bk_Friendship_20260617',
    '_phase1_bk_Message_20260617',
    '_phase1_bk_NodeMember_20260617',
    '_phase1_bk_Node_20260617',
    '_phase1_bk_PipelineEntry_20260617',
    '_phase1_bk_UserDiscover_20260617',
    '_phase1_bk_User_map_20260617',
    'affiliations',
    'chat_conversation',
    'chat_message',
    'companies',
    'contact_ratings',
    'contacts',
    'discovery_lead',
    'enrichments',
    'learned_weights',
    'milestones',
    'ops_events',
    'outreach',
    'phases',
    'pipeline_contacts',
    'resume_doc',
    'resume_evidence',
    'scores',
    'signals',
    'user_preferences'
  ];
begin
  foreach table_name in array server_only_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from anon', table_name);
      execute format('revoke all on table public.%I from authenticated', table_name);
      execute format('grant all on table public.%I to service_role', table_name);
    end if;
  end loop;
end
$migration$;
