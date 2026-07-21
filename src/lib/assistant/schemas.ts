import { z } from "zod";
import { careerSkillIdSchema, skillParametersSchema } from "@/lib/assistant/skills";

export const assistantRequestSchema = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string().trim().min(1).max(4_000),
  skillId: careerSkillIdSchema.optional(),
  parameters: skillParametersSchema.optional(),
});

export const recommendationSchema = z.object({
  kind: z.enum(["networking", "follow_up", "meeting_prep", "application", "resume", "goal"]),
  title: z.string().min(1).max(160),
  rationale: z.string().min(1).max(1_000),
  evidence: z.array(z.string().max(300)).max(8).default([]),
  confidence: z.number().min(0).max(1),
  dueAt: z.string().datetime().nullable().default(null),
});

export const proposedActionSchema = z.object({
  toolName: z.enum([
    "draft_outreach",
    "create_follow_up_task",
    "prepare_meeting",
    "tailor_resume",
    "update_goal",
    "enrich_contacts",
    "save_opportunity",
  ]),
  label: z.string().min(1).max(160),
  input: z.record(z.string(), z.unknown()),
  riskLevel: z.enum(["read", "write", "external", "destructive"]),
});

export const assistantPlanSchema = z.object({
  reply: z.string().min(1).max(4_000),
  recommendations: z.array(recommendationSchema).max(5).default([]),
  proposedActions: z.array(proposedActionSchema).max(5).default([]),
});

export type AssistantPlan = z.infer<typeof assistantPlanSchema>;
