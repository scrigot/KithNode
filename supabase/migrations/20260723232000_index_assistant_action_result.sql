-- Keep result-to-action lookups and AssistantResult deletes efficient.
-- AssistantAction.resultId is nullable and uses ON DELETE SET NULL.
create index if not exists "AssistantAction_resultId_idx"
  on public."AssistantAction" ("resultId");
