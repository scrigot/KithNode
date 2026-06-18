-- ════════════════════════════════════════════════════════════════════════
-- Seed Sam's 3 personal pipelines: Funding, Professors, Work.
-- Run AFTER 20260609_my_pipelines.sql (needs the Pipeline table).
-- Apply via Supabase SQL editor. Idempotent (ON CONFLICT DO NOTHING).
--
-- Set the owner email here (must match session.user.email):
--   \set owner 'samrigot31@gmail.com'   -- psql
-- Or just edit the literal below.
-- ════════════════════════════════════════════════════════════════════════
DO $$
DECLARE owner text := 'samrigot31@gmail.com';
BEGIN
  INSERT INTO "Pipeline" ("id","userId","name","kind","stages","cadenceDays","createdAt") VALUES
  (
    'pl_funding_'    || md5(owner), owner, 'Funding', 'FUNDING',
    '[{"key":"sourced","label":"Sourced","color":"zinc","universalPhase":"identified"},
      {"key":"introd","label":"Intro''d","color":"blue","universalPhase":"contacted"},
      {"key":"meeting","label":"Meeting","color":"amber","universalPhase":"engaged"},
      {"key":"diligence","label":"Diligence","color":"sky","universalPhase":"engaged"},
      {"key":"term_sheet","label":"Term Sheet","color":"green","universalPhase":"advanced"}]'::jsonb,
    7, now()
  ),
  (
    'pl_professors_' || md5(owner), owner, 'Professors', 'PROFESSORS',
    '[{"key":"identified","label":"Identified","color":"zinc","universalPhase":"identified"},
      {"key":"reached_out","label":"Reached Out","color":"blue","universalPhase":"contacted"},
      {"key":"office_hours","label":"Office Hours","color":"amber","universalPhase":"engaged"},
      {"key":"working_with","label":"Working With","color":"teal","universalPhase":"advanced"},
      {"key":"advocate","label":"Advocate","color":"green","universalPhase":"advanced"}]'::jsonb,
    30, now()
  ),
  (
    'pl_work_'       || md5(owner), owner, 'Work', 'WORK',
    '[{"key":"met","label":"Met","color":"zinc","universalPhase":"identified"},
      {"key":"connected","label":"Connected","color":"blue","universalPhase":"contacted"},
      {"key":"collaborated","label":"Collaborated","color":"amber","universalPhase":"engaged"},
      {"key":"champion","label":"Champion","color":"green","universalPhase":"advanced"}]'::jsonb,
    14, now()
  )
  ON CONFLICT ("id") DO NOTHING;
END $$;
