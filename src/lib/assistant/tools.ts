import "server-only";

export const ASSISTANT_TOOL_POLICIES = {
  draft_outreach: { riskLevel: "write", requiresApproval: true, executable: false },
  create_follow_up_task: { riskLevel: "write", requiresApproval: true, executable: false },
  prepare_meeting: { riskLevel: "write", requiresApproval: true, executable: false },
  tailor_resume: { riskLevel: "write", requiresApproval: true, executable: false },
  update_goal: { riskLevel: "write", requiresApproval: true, executable: true },
  enrich_contacts: { riskLevel: "external", requiresApproval: true, executable: true },
  save_opportunity: { riskLevel: "write", requiresApproval: true, executable: true },
} as const;

export type AssistantToolName = keyof typeof ASSISTANT_TOOL_POLICIES;

export function isAssistantToolName(value: string): value is AssistantToolName {
  return value in ASSISTANT_TOOL_POLICIES;
}

export function assistantToolPolicy(toolName: AssistantToolName) {
  return ASSISTANT_TOOL_POLICIES[toolName];
}
