import { z } from "zod";

export const careerSkillIds = [
  "find_jobs",
  "enrichment_gaps",
  "firm_coverage",
  "who_to_contact",
  "follow_ups",
  "draft_outreach",
  "meeting_prep",
  "tailor_resume",
  "update_goal",
] as const;

export const careerSkillIdSchema = z.enum(careerSkillIds);
export type CareerSkillId = z.infer<typeof careerSkillIdSchema>;

export interface CareerSkillDefinition {
  id: CareerSkillId;
  command: `/${string}`;
  label: string;
  description: string;
  category: "discover" | "network" | "prepare" | "manage";
  approval: "none" | "proposes_write" | "proposes_external";
}

export const CAREER_SKILLS: readonly CareerSkillDefinition[] = [
  { id: "find_jobs", command: "/find-jobs", label: "Find jobs", description: "Find and rank five official job listings using your profile and network.", category: "discover", approval: "none" },
  { id: "enrichment_gaps", command: "/enrichment-gaps", label: "Enrichment gaps", description: "Prioritize contacts whose missing data is blocking useful next actions.", category: "network", approval: "proposes_write" },
  { id: "firm_coverage", command: "/firm-coverage", label: "Firm coverage", description: "Find target firms where your network is thin, cold, junior, or stale.", category: "network", approval: "none" },
  { id: "who_to_contact", command: "/who-to-contact", label: "Who to contact", description: "Rank the best people to contact today and explain why.", category: "network", approval: "none" },
  { id: "follow_ups", command: "/follow-ups", label: "Follow-ups", description: "Surface overdue and high-value relationship follow-ups.", category: "manage", approval: "proposes_write" },
  { id: "draft_outreach", command: "/draft-outreach", label: "Draft outreach", description: "Draft grounded outreach for a selected contact; never sends automatically.", category: "prepare", approval: "proposes_external" },
  { id: "meeting_prep", command: "/meeting-prep", label: "Meeting prep", description: "Build a one-screen brief from your contact and relationship history.", category: "prepare", approval: "none" },
  { id: "tailor_resume", command: "/tailor-resume", label: "Tailor resume", description: "Create an evidence-backed resume variant for a job description.", category: "prepare", approval: "proposes_write" },
  { id: "update_goal", command: "/update-goal", label: "Update goal", description: "Propose a new or revised career goal for your approval.", category: "manage", approval: "proposes_write" },
] as const;

const byCommand = new Map(CAREER_SKILLS.map((skill) => [skill.command, skill]));

export function parseSlashSkill(message: string): CareerSkillDefinition | undefined {
  const command = message.trim().split(/\s+/, 1)[0]?.toLowerCase();
  return byCommand.get(command as CareerSkillDefinition["command"]);
}

export function getCareerSkill(id: CareerSkillId) {
  return CAREER_SKILLS.find((skill) => skill.id === id)!;
}

const deterministicSkillIds = new Set<CareerSkillId>([
  "find_jobs",
  "enrichment_gaps",
  "firm_coverage",
  "who_to_contact",
  "follow_ups",
]);

export function isDeterministicCareerSkill(id: CareerSkillId) {
  return deterministicSkillIds.has(id);
}

export const skillParametersSchema = z.record(z.string(), z.union([
  z.string().max(5_000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(1_000)).max(100),
  z.null(),
])).default({});
