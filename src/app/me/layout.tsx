import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { PERSONAL_MODE } from "@/lib/me/config";
import { prisma, meUserEmail } from "@/lib/me/db";
import MeShell from "./me-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Conductor-look shell for the personal networking OS. Warm-dark, minimal,
// sidebar + main — deliberately distinct from the KithNode dashboard's dense
// 0px Bloomberg theme, because /me is its own isolated space. Styled with inline
// arbitrary values so it never touches the shared @theme tokens.
//
// PERSONAL_MODE gate: when off (i.e. production), the whole subtree 404s.

export default async function MeLayout({ children }: { children: ReactNode }) {
  if (!PERSONAL_MODE) notFound();

  const userId = meUserEmail();
  const pipelines = await prisma.mePipeline.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  const profile = await prisma.meProfile.findUnique({ where: { userId } });
  const outreachDefaults = {
    style: profile?.outreachStyle || "",
    length: profile?.outreachLength || "",
    signoff: profile?.outreachSignoff || "",
    positioning: profile?.outreachPositioning || "",
    goals: profile?.outreachGoals || "",
    preferredEmailClient: profile?.preferredEmailClient || "",
  };

  return <MeShell pipelines={pipelines} outreachDefaults={outreachDefaults}>{children}</MeShell>;
}
