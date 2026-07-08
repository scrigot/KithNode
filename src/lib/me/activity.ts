import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export const ACTIVITY_TYPES = [
  "note",
  "linkedin_connect",
  "linkedin_message",
  "email_draft",
  "email_sent",
  "reply",
  "meeting_scheduled",
  "coffee_chat",
  "follow_up",
  "stage_change",
  "touch",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityInput {
  type?: unknown;
  title?: unknown;
  detail?: unknown;
  occurredAt?: unknown;
  meta?: unknown;
}

export interface ActivityData {
  type: ActivityType;
  title: string;
  detail: string;
  occurredAt: Date;
  meta: Prisma.InputJsonValue;
}

const MAX_TITLE = 160;
const MAX_DETAIL = 4000;
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function activityLabel(type: ActivityType) {
  switch (type) {
    case "linkedin_connect": return "LinkedIn connect";
    case "linkedin_message": return "LinkedIn message";
    case "email_draft": return "Email draft";
    case "email_sent": return "Email sent";
    case "reply": return "Reply";
    case "meeting_scheduled": return "Meeting scheduled";
    case "coffee_chat": return "Coffee chat";
    case "follow_up": return "Follow-up";
    case "stage_change": return "Stage change";
    case "touch": return "Touch";
    default: return "Note";
  }
}

export function sanitizeActivityInput(input: ActivityInput): ActivityData {
  const type = ACTIVITY_TYPES.includes(input.type as ActivityType) ? (input.type as ActivityType) : "note";
  const title = clean(input.title, MAX_TITLE) || activityLabel(type);
  const detail = clean(input.detail, MAX_DETAIL);
  const parsedDate = typeof input.occurredAt === "string" ? new Date(input.occurredAt) : null;
  const occurredAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();
  const meta = input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
    ? (input.meta as Prisma.InputJsonValue)
    : {};
  return { type, title, detail, occurredAt, meta };
}

export async function logContactActivity({
  userId,
  contactId,
  type,
  title,
  detail = "",
  occurredAt,
  meta = {},
}: {
  userId: string;
  contactId: string;
  type: ActivityType;
  title?: string;
  detail?: string;
  occurredAt?: Date;
  meta?: Prisma.InputJsonValue;
}) {
  const data = sanitizeActivityInput({ type, title, detail, occurredAt: occurredAt?.toISOString(), meta });
  return prisma.meContactActivity.create({
    data: {
      userId,
      contactId,
      type: data.type,
      title: data.title,
      detail: data.detail,
      occurredAt: data.occurredAt,
      meta: data.meta,
    },
  });
}
