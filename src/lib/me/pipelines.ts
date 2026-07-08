// Org-pipeline definitions for the /me workspace. Seeded once per user; the
// board reads stages from the row (data-driven, no hardcoded vocab in the UI).
//
// Each stage declares which of 4 universal phases it rolls up to, so the "All"
// view can merge stages that differ per pipeline (Identified → Contacted →
// Engaged → Advanced).

import { Prisma } from "@/generated/prisma/client";
import { prisma, meUserEmail } from "./db";

export type UniversalPhase = "identified" | "contacted" | "engaged" | "advanced";

export interface Stage {
  key: string;
  label: string;
  color: string;
  universalPhase: UniversalPhase;
}

export const UNIVERSAL_PHASES: { key: UniversalPhase; label: string }[] = [
  { key: "identified", label: "Identified" },
  { key: "contacted", label: "Contacted" },
  { key: "engaged", label: "Engaged" },
  { key: "advanced", label: "Advanced" },
];

// Relationship-building stages (not recruiting). Shared default across all four
// org pipelines; Sam can diverge them later.
export const DEFAULT_STAGES: Stage[] = [
  { key: "prospect", label: "Prospect", color: "#8A8077", universalPhase: "identified" },
  { key: "reached_out", label: "Reached Out", color: "#6EA8C7", universalPhase: "contacted" },
  { key: "talking", label: "Talking", color: "#E8A23C", universalPhase: "engaged" },
  { key: "met", label: "Met", color: "#7FB069", universalPhase: "engaged" },
  { key: "warm", label: "Warm", color: "#E8643C", universalPhase: "advanced" },
];

export const FIRST_STAGE = DEFAULT_STAGES[0].key;

// The org pipelines Sam tracks. cadenceDays drives the going-cold rail.
const PIPELINE_DEFS: { name: string; cadenceDays: number }[] = [
  { name: "Comfort", cadenceDays: 14 },
  { name: "Anvil", cadenceDays: 14 },
  { name: "UNC", cadenceDays: 30 },
  { name: "AI Consulting", cadenceDays: 7 },
];

/** Idempotently create the four org pipelines for the user if missing. */
export async function ensurePipelines(userId: string = meUserEmail()) {
  const existing = await prisma.mePipeline.findMany({ where: { userId }, select: { name: true } });
  const have = new Set(existing.map((p) => p.name));
  const missing = PIPELINE_DEFS.filter((d) => !have.has(d.name));
  if (missing.length) {
    await prisma.mePipeline.createMany({
      data: missing.map((d) => ({
        userId,
        name: d.name,
        kind: "ORG",
        cadenceDays: d.cadenceDays,
        order: PIPELINE_DEFS.findIndex((x) => x.name === d.name),
        stages: DEFAULT_STAGES as unknown as Prisma.InputJsonValue,
      })),
    });
  }
}

/** Days since a touch; null when never touched. */
export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}
