import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { generateMeText } from "@/lib/me/ai";
import {
  buildPrepPrompt,
  parsePrepBrief,
  fallbackBrief,
  memoryHash,
  PROMPT_VERSION,
  type PrepContext,
} from "@/lib/me/coffee-prep";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { contactId, force } = await req.json().catch(() => ({}));
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: {
      memory: true,
      pipelineEntries: { include: { pipeline: { select: { name: true } } } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const touchTimes = [
    ...contact.pipelineEntries.map((e) => e.lastTouchAt),
    contact.lastSpokenAt,
  ].filter(Boolean) as Date[];
  const lastTouch = touchTimes.length ? Math.max(...touchTimes.map((d) => d.getTime())) : null;

  const ctx: PrepContext = {
    name: contact.name,
    firmName: contact.firmName || "",
    title: contact.title || "",
    email: contact.email || "",
    relationshipType: contact.memory?.relationshipType || "",
    strategicValue: contact.memory?.strategicValue || "",
    notes: contact.memory?.notes || contact.notes || "",
    pipelines: contact.pipelineEntries.map((e) => ({ name: e.pipeline.name, stage: e.stage })),
    daysSinceTouch: lastTouch ? Math.floor((Date.now() - lastTouch) / 86_400_000) : null,
  };

  const hash = memoryHash(ctx);

  // Cache: reuse the latest brief unless the inputs changed or force=true.
  if (!force) {
    const cached = await prisma.mePrepBrief.findFirst({
      where: { userId, contactId, promptVersion: PROMPT_VERSION, memoryHash: hash },
      orderBy: { createdAt: "desc" },
    });
    if (cached) {
      return NextResponse.json({ brief: cached.brief, ai: cached.model !== "fallback", cached: true });
    }
  }

  const sender = (userId.split("@")[0] || "I").replace(/[._-]/g, " ");
  const gen = await generateMeText(buildPrepPrompt(ctx, "Sam"));
  const parsed = gen.ok ? parsePrepBrief(gen.text) : null;
  const brief = parsed ?? fallbackBrief(ctx);
  const model = parsed ? gen.model : "fallback";

  await prisma.mePrepBrief.create({
    data: {
      userId,
      contactId,
      brief: brief as unknown as Prisma.InputJsonValue,
      model,
      promptVersion: PROMPT_VERSION,
      memoryHash: hash,
    },
  });

  void sender; // (reserved for future per-sender personalization)
  return NextResponse.json({ brief, ai: model !== "fallback", cached: false });
}
