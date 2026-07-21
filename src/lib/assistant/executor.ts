import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

const updateGoalInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  priority: z.number().int().min(0).max(100).default(0),
  context: z.record(z.string(), z.unknown()).default({}),
  label: z.string().optional(),
});

export function parseUpdateGoalInput(input: unknown) {
  const parsed = updateGoalInputSchema.parse(input);
  return {
    title: parsed.title,
    priority: parsed.priority,
    context: parsed.context as Prisma.InputJsonValue,
  };
}
